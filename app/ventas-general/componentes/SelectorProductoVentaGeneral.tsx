// SelectorProductoVentaGeneral.jsx - FILTRO CORREGIDO

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import useCotizacion from "@/lib/hooks/useCotizacion";

interface ProductoStock {
  id: string;
  codigo?: string;
  producto: string;
  modelo: string;
  marca?: string;
  categoria?: string;
  color?: string;
  precio1: number;
  precio2: number;
  precio3: number;
  precio1Pesos?: number;
  precio2Pesos?: number;
  precio3Pesos?: number;
  moneda: "ARS" | "USD";
  cantidad?: number;
  tipo: "accesorio" | "repuesto" | "general";
  hoja?: string;
  precioUnitario?: number;
  precioARS?: number | null;
  precioUSD?: number | null; 
}

export type { ProductoStock };

interface Props {
  productos: ProductoStock[];
  setProductos: (productos: ProductoStock[]) => void;
  setPrecio: (valor: number) => void;
  setMarca: (valor: string) => void;
  setModelo: (valor: string) => void;
  setCategoria: (valor: string) => void;
  setColor: (valor: string) => void;
  setCodigo: (valor: string) => void;
  setMoneda: (valor: "ARS" | "USD") => void;
  filtroTexto: string;
  setFiltroTexto: React.Dispatch<React.SetStateAction<string>>;
  hayTelefono?: boolean;
}

export default function SelectorProductoVentaGeneral({
  productos,
  setProductos,
  hayTelefono = false,
}: Props) {
  const { rol } = useRol();
  const { cotizacion } = useCotizacion(rol?.negocioID || "");
  const [busqueda, setBusqueda] = useState("");
  const [todos, setTodos] = useState<ProductoStock[]>([]);
  const [mostrar, setMostrar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoStock | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioElegido, setPrecioElegido] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      if (!rol?.negocioID) return;

      const accSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockAccesorios`));
      const repSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`));      

      // 🔥 ACCESORIOS - CORREGIDO: Asegurar que 'producto' esté bien mapeado
      const accesorios: ProductoStock[] = accSnap.docs.map(doc => {
        const data = doc.data();
        
        // ✅ NUEVA DETECCIÓN: Solo es USD si tiene conversión real o moneda explícita
        const tieneConversion = (data.precio1 && data.precio1Pesos && data.precio1 !== data.precio1Pesos) ||
                               (data.precio2 && data.precio2Pesos && data.precio2 !== data.precio2Pesos) ||
                               (data.precio3 && data.precio3Pesos && data.precio3 !== data.precio3Pesos);
        
        const esUSD = data.moneda === "USD" || tieneConversion;
        
        // 🔥 CORRECCIÓN CRÍTICA: Mapear correctamente todos los campos de texto
        const productoTexto = data.producto || data.modelo || "";
        const modeloTexto = data.modelo || data.producto || "";
        const codigoTexto = data.codigo || doc.id || "";
        
        if (esUSD) {
          // ACCESORIO USD - Convertir a ARS para display
          const precio1USD = data.precio1 || 0;
          const precio2USD = data.precio2 || 0;
          const precio3USD = data.precio3 || 0;
          
          return {
            id: doc.id,
            codigo: codigoTexto, // ✅ CORREGIDO: Usar variable para código
            producto: productoTexto, // ✅ CORREGIDO: Campo producto separado
            modelo: modeloTexto, // ✅ CORREGIDO: Campo modelo separado
            marca: data.marca || "",
            categoria: data.categoria || "",
            color: data.color || "",
            
            // PRECIOS ORIGINALES EN USD
            precio1: precio1USD,
            precio2: precio2USD,
            precio3: precio3USD,
            
            // PRECIOS CONVERTIDOS A ARS
            precio1Pesos: precio1USD * cotizacion,
            precio2Pesos: precio2USD * cotizacion,
            precio3Pesos: precio3USD * cotizacion,
            
            moneda: "USD",
            cantidad: data.cantidad || 0,
            tipo: "accesorio",
          };
        } else {
          // ✅ ACCESORIO ARS NATIVO - SIN CONVERSIÓN
          return {
            id: doc.id,
            codigo: codigoTexto, // ✅ CORREGIDO: Usar variable para código
            producto: productoTexto, // ✅ CORREGIDO: Campo producto separado
            modelo: modeloTexto, // ✅ CORREGIDO: Campo modelo separado
            marca: data.marca || "",
            categoria: data.categoria || "",
            color: data.color || "",
            
            // ✅ PRECIOS EN ARS NATIVOS (sin tocar)
            precio1: data.precio1 || 0,
            precio2: data.precio2 || 0,
            precio3: data.precio3 || 0,
            
            // ✅ PRECIOS PESOS = MISMOS (no hay conversión)
            precio1Pesos: data.precio1 || 0,
            precio2Pesos: data.precio2 || 0,
            precio3Pesos: data.precio3 || 0,
            
            moneda: "ARS",
            cantidad: data.cantidad || 0,
            tipo: "accesorio",
          };
        }
      });
      
      // STOCKEXTRA - Siempre USD convertido
      const stockExtra: ProductoStock[] = repSnap.docs.map(doc => {
        const data = doc.data();
        
        const precio1USD = data.precio1 || data.precioUSD || 0;
        const precio2USD = data.precio2 || 0;
        const precio3USD = data.precio3 || 0;
        
        return {
          id: doc.id,
          codigo: doc.id,
          producto: data.producto || data.modelo || "",
          modelo: data.modelo || data.producto || "",
          marca: data.marca || "",
          categoria: data.hoja || data.categoria || "",
          color: data.color || "",
          
          precio1: precio1USD,
          precio2: precio2USD, 
          precio3: precio3USD,
          
          precio1Pesos: precio1USD * cotizacion,
          precio2Pesos: precio2USD * cotizacion,
          precio3Pesos: precio3USD * cotizacion,
          
          moneda: "USD",
          cantidad: data.cantidad || 0,
          tipo: "general",
          hoja: data.hoja || "",
        };
      });

      // 🐛 DEBUG - Verificar qué se está cargando
      console.log(`📊 DATOS CARGADOS:`, {
        totalAccesorios: accesorios.length,
        totalStockExtra: stockExtra.length,
        muestraAccesorios: accesorios.slice(0, 3).map(a => ({
          id: a.id,
          codigo: a.codigo,
          producto: a.producto,
          modelo: a.modelo
        })),
        muestraStockExtra: stockExtra.slice(0, 3).map(s => ({
          id: s.id,
          codigo: s.codigo,
          producto: s.producto,
          modelo: s.modelo
        }))
      });
      
      setTodos([...accesorios, ...stockExtra]);
    };

    cargar();
  }, [rol?.negocioID, cotizacion]);

  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")  // Quitar caracteres especiales
      .replace(/\s+/g, " ")         // Normalizar espacios
      .trim();
  
  // ✅ FILTRO COMPLETAMENTE CORREGIDO - Incluye TODOS los campos de texto
  const filtrados = todos.filter(p => {
    // 🔥 CORRECCIÓN CRÍTICA: Incluir TODOS los campos de texto posibles
    const textoCompleto = normalizar([
      p.codigo || "",           // ✅ CÓDIGO (antes faltaba)
      p.producto || "",         // ✅ PRODUCTO (campo separado)
      p.modelo || "",           // ✅ MODELO
      p.marca || "",            // ✅ MARCA
      p.color || "",            // ✅ COLOR
      p.categoria || "",        // ✅ CATEGORÍA
      p.hoja || ""             // ✅ HOJA (solo stockExtra)
    ].join(" "));
    
    const busquedaNormalizada = normalizar(busqueda);
    const palabrasBusqueda = busquedaNormalizada.split(" ").filter(p => p.length > 0);
    
    // 🐛 DEBUG MEJORADO - Solo mostrar cuando hay búsqueda activa
    if (busqueda.length > 2 && todos.indexOf(p) < 5) {
      console.log(`🔍 FILTRO DEBUG para "${p.modelo || p.producto}":`, {
        id: p.id,
        codigo: p.codigo,
        producto: p.producto,
        modelo: p.modelo,
        marca: p.marca,
        textoCompleto: textoCompleto,
        busquedaOriginal: busqueda,
        busquedaNormalizada: busquedaNormalizada,
        palabrasBusqueda: palabrasBusqueda,
        coincide: palabrasBusqueda.every(palabra => textoCompleto.includes(palabra))
      });
    }
  
    // ✅ CADA palabra de búsqueda debe estar en el texto completo
    return palabrasBusqueda.every(palabra => textoCompleto.includes(palabra));
  });

  const confirmarAgregar = () => {
    if (!productoSeleccionado) return;
    const yaExiste = productos.find(p => p.id === productoSeleccionado.id);
    if (yaExiste) return;
    
    const esProductoUSD = productoSeleccionado.moneda === "USD";
    
    let precioUnitarioFinal: number;
    let precioARS: number | null = null;
    let precioUSD: number | null = null;
    
    if (hayTelefono) {
      // CON TELÉFONO: Todo en USD
      if (esProductoUSD) {
        precioUnitarioFinal = precioElegido / cotizacion;
        precioUSD = precioUnitarioFinal;
      } else {
        precioUnitarioFinal = precioElegido / cotizacion;
        precioUSD = precioUnitarioFinal;
        precioARS = precioElegido;
      }
    } else {
      // SIN TELÉFONO: Todo en ARS
      if (esProductoUSD) {
        precioUnitarioFinal = precioElegido;
        precioARS = precioElegido;
        precioUSD = precioElegido / cotizacion;
      } else {
        precioUnitarioFinal = precioElegido;
        precioARS = precioElegido;
      }
    }
    
    setProductos([
      ...productos,
      {
        ...productoSeleccionado,
        cantidad,
        codigo: productoSeleccionado.codigo || productoSeleccionado.id,
        precioUnitario: precioUnitarioFinal,
        precioARS,
        precioUSD,
        moneda: productoSeleccionado.moneda,
      },
    ]);
    
    setProductoSeleccionado(null);
    setCantidad(1);
    setPrecioElegido(0);
    setBusqueda("");
    setMostrar(false);
  };

  return (
    <div className="relative w-full">
      {/* Input de búsqueda */}
      <div className="relative">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setMostrar(true);
          }}
          onFocus={() => setMostrar(true)}
          onBlur={() => setTimeout(() => setMostrar(false), 200)}
          placeholder="Buscar por código, nombre, marca, color, modelo, categoría, producto..."
          className="w-full p-4 pl-12 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-lg"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <span className="text-[#3498db] text-xl">🔍</span>
        </div>
      </div>

      {/* Indicador de modo */}
      {mostrar && (
        <div className={`mt-2 p-2 rounded-lg text-xs font-medium ${
          hayTelefono 
            ? 'bg-[#f39c12] text-white' 
            : 'bg-[#27ae60] text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span>{hayTelefono ? '💱' : '💰'}</span>
            {hayTelefono 
              ? 'MODO USD: Todos los precios se guardarán en dólares'
              : 'MODO ARS: Todos los precios se guardarán en pesos'
            }
          </div>
        </div>
      )}

      {/* Lista de resultados */}
      {mostrar && filtrados.length > 0 && (
        <div className="absolute z-50 w-full bg-white border-2 border-[#3498db] rounded-lg shadow-2xl max-h-80 overflow-auto text-sm mt-2">
          {filtrados.map((p, i) => (
            <div
              key={i}
              onClick={() => {
                setProductoSeleccionado(p);
                // ✅ CORRECCIÓN: Usar precio correcto según moneda SIN conversión forzada
                setPrecioElegido(p.moneda === "USD" ? p.precio1Pesos || 0 : p.precio1);
              }}
              className="p-4 hover:bg-[#ecf0f1] cursor-pointer border-b border-[#ecf0f1] last:border-b-0 transition-all duration-200 hover:shadow-sm"
            >
              {/* ✅ INFORMACIÓN PRINCIPAL CORREGIDA */}
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {/* CÓDIGO - Prominente al inicio */}
                    {p.codigo && p.codigo !== p.id && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white mb-1">
                        #{p.codigo}
                      </span>
                    )}
                    
                    {/* MODELO/NOMBRE - Título principal */}
                    <h4 className="text-[#2c3e50] font-bold text-base leading-tight">
                      {p.modelo || p.producto}
                    </h4>
                    
                    {/* DESCRIPCIÓN DEL PRODUCTO - Si es diferente del modelo */}
                    {p.producto && p.producto !== p.modelo && (
                      <p className="text-[#7f8c8d] text-sm mt-1 leading-snug">
                        {p.producto}
                      </p>
                    )}
                    
                    {/* MARCA - Si existe */}
                    {p.marca && (
                      <div className="text-[#95a5a6] text-xs mt-1 font-medium">
                        Marca: {p.marca}
                      </div>
                    )}
                  </div>
                  
                  {/* COLOR - Badge a la derecha */}
                  {p.color && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50] ml-3">
                      {p.color}
                    </span>
                  )}
                </div>
              </div>

              {/* ✅ INFORMACIÓN SECUNDARIA REORGANIZADA */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* TIPO DE PRODUCTO */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    p.tipo === "accesorio" 
                      ? (p.moneda === "USD" ? 'bg-[#3498db] text-white' : 'bg-[#95a5a6] text-white')
                      : p.tipo === "general"
                      ? 'bg-[#9b59b6] text-white'
                      : 'bg-[#f39c12] text-white'
                  }`}>
                    {p.tipo === "general" ? "STOCK" : p.tipo.toUpperCase()}
                  </span>
                  
                  {/* CATEGORÍA */}
                  {p.categoria && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#f8f9fa] text-[#7f8c8d] border border-[#ecf0f1]">
                      📁 {p.categoria}
                    </span>
                  )}
                  
                  {/* CONVERSIÓN USD→ARS */}
                  {p.moneda === "USD" && hayTelefono && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#f39c12] text-white">
                      💱 USD→ARS
                    </span>
                  )}
                </div>
                
                {/* STOCK DISPONIBLE */}
                <div className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">📦</span>
                  </span>
                  <span className="text-[#27ae60] font-medium text-xs whitespace-nowrap">
                    Stock: {p.cantidad}
                  </span>
                </div>
              </div>

              {/* ✅ PRECIOS CORREGIDOS */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((nivel) => {
                  // Sin teléfono: mostrar precio directo (ARS para ARS, ARS convertido para USD)
                  // Con teléfono: mostrar precio convertido solo para USD
                  const precio = !hayTelefono 
                    ? (p.moneda === "USD" 
                        ? p[`precio${nivel}Pesos` as keyof ProductoStock] // USD convertido a ARS
                        : p[`precio${nivel}` as keyof ProductoStock])      // ARS nativo
                    : (p.moneda === "USD" 
                        ? p[`precio${nivel}Pesos` as keyof ProductoStock] // USD convertido
                        : p[`precio${nivel}` as keyof ProductoStock]);    // ARS directo

                  if (typeof precio !== "number" || precio === 0) return null;

                  return (
                    <div key={nivel} className="bg-[#f8f9fa] rounded-lg p-2 text-center">
                      <div className="text-[#7f8c8d] text-xs">Precio {nivel}</div>
                      <div className="text-[#27ae60] font-bold text-sm">
                        ${precio.toLocaleString("es-AR")}
                        {/* ✅ Solo mostrar referencia USD cuando hay conversión real */}
                        {p.moneda === "USD" && hayTelefono && (
                          <div className="text-[#7f8c8d] text-xs">
                            (USD ${p[`precio${nivel}` as keyof ProductoStock]})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de selección */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border-2 border-[#ecf0f1] overflow-hidden">
            
            <div className={`bg-gradient-to-r text-white p-6 ${
              hayTelefono 
                ? 'from-[#f39c12] to-[#e67e22]' 
                : 'from-[#2c3e50] to-[#3498db]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">{hayTelefono ? '💱' : '🛍️'}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{productoSeleccionado.modelo}</h3>
                  <p className={`text-sm ${hayTelefono ? 'text-orange-100' : 'text-blue-100'}`}>
                    {productoSeleccionado.marca}
                    {/* ✅ MOSTRAR CÓDIGO en modal también */}
                    {productoSeleccionado.codigo && productoSeleccionado.codigo !== productoSeleccionado.id && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 font-mono">
                        #{productoSeleccionado.codigo}
                      </span>
                    )}
                    {/* ✅ CORRECCIÓN: Solo mostrar conversión cuando corresponde */}
                    {productoSeleccionado.moneda === "USD" && hayTelefono && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20">
                        💱 USD→ARS
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-white/10 rounded-lg text-sm">
                {hayTelefono 
                  ? '💱 Se guardará en USD para esta venta con teléfono'
                  : '💰 Se guardará en ARS para esta venta sin teléfono'
                }
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    productoSeleccionado.tipo === "accesorio" 
                      ? (productoSeleccionado.moneda === "USD" ? 'bg-[#3498db] text-white' : 'bg-[#95a5a6] text-white')
                      : productoSeleccionado.tipo === "general"
                      ? 'bg-[#9b59b6] text-white'
                      : 'bg-[#f39c12] text-white'
                  }`}>
                    {productoSeleccionado.tipo === "general" ? "STOCK EXTRA" : productoSeleccionado.tipo.toUpperCase()}
                    {productoSeleccionado.moneda === "USD" && productoSeleccionado.tipo === "accesorio" && " (USD)"}
                  </span>
                  <span className="text-[#27ae60] font-medium text-sm">
                    Stock disponible: {productoSeleccionado.cantidad}
                  </span>
                </div>
                <div className="text-[#7f8c8d] text-sm">
                  Categoría: {productoSeleccionado.categoria} • Color: {productoSeleccionado.color}
                </div>
                {/* ✅ Solo mostrar aviso de conversión cuando realmente se convierte */}
                {productoSeleccionado.moneda === "USD" && (
                  <div className="mt-2 p-2 bg-[#fff3cd] border border-[#f39c12] rounded text-xs text-[#856404]">
                    💡 Precios convertidos automáticamente de USD a ARS (cotización: ${cotizacion})
                  </div>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#3498db] rounded-lg flex items-center justify-center text-white text-xs">📦</span>
                  Cantidad:
                </label>
                <input
                  type="number"
                  value={cantidad}
                  min={1}
                  max={productoSeleccionado.cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full border-2 border-[#bdc3c7] p-3 rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-[#2c3e50] transition-all text-lg font-medium text-center"
                />
              </div>

              {/* Selección de precio */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#27ae60] rounded-lg flex items-center justify-center text-white text-xs">💰</span>
                  Elegí un precio:
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[1, 2, 3].map((nivel) => {
                    // ✅ MISMO CRITERIO QUE EN LA LISTA
                    const precio = !hayTelefono 
                      ? (productoSeleccionado.moneda === "USD" 
                          ? productoSeleccionado[`precio${nivel}Pesos` as keyof ProductoStock]
                          : productoSeleccionado[`precio${nivel}` as keyof ProductoStock])
                      : (productoSeleccionado.moneda === "USD" 
                          ? productoSeleccionado[`precio${nivel}Pesos` as keyof ProductoStock]
                          : productoSeleccionado[`precio${nivel}` as keyof ProductoStock]);

                    if (typeof precio !== "number" || precio === 0) return null;

                    return (
                      <button
                        key={nivel}
                        onClick={() => setPrecioElegido(precio)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 font-medium ${
                          precioElegido === precio 
                            ? "bg-[#3498db] text-white border-[#3498db] shadow-lg transform scale-105" 
                            : "bg-white text-[#2c3e50] border-[#bdc3c7] hover:border-[#3498db] hover:bg-[#ecf0f1]"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              precioElegido === precio ? 'bg-white text-[#3498db]' : 'bg-[#3498db] text-white'
                            }`}>
                              {nivel}
                            </span>
                            Precio {nivel}
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-lg">
                              ${precio.toLocaleString("es-AR")}
                            </span>
                            {/* ✅ Solo mostrar USD cuando hay conversión real */}
                            {productoSeleccionado.moneda === "USD" && hayTelefono && (
                              <div className="text-xs text-[#7f8c8d]">
                                USD ${productoSeleccionado[`precio${nivel}` as keyof ProductoStock]}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              {precioElegido > 0 && (
                <div className={`bg-gradient-to-r rounded-lg p-4 text-white ${
                  hayTelefono 
                    ? 'from-[#f39c12] to-[#e67e22]' 
                    : 'from-[#27ae60] to-[#2ecc71]'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2">
                      <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        {hayTelefono ? '💱' : '💵'}
                      </span>
                      Total {hayTelefono ? '(se guardará en USD)' : '(se guardará en ARS)'}:
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-2xl">
                        ${(precioElegido * cantidad).toLocaleString("es-AR")}
                      </span>
                      {hayTelefono && (
                        <div className="text-sm opacity-80">
                          Se guardará: USD ${((precioElegido / cotizacion) * cantidad).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#f8f9fa] px-6 py-4 flex justify-end gap-3 border-t border-[#ecf0f1]">
              <button
                onClick={() => setProductoSeleccionado(null)}
                className="px-6 py-3 text-[#2c3e50] bg-white border-2 border-[#bdc3c7] rounded-lg hover:bg-[#ecf0f1] hover:border-[#7f8c8d] transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAgregar}
                disabled={precioElegido === 0}
                className="px-8 py-3 bg-[#27ae60] hover:bg-[#229954] disabled:bg-[#bdc3c7] text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none flex items-center gap-2"
              >
                <span>✅</span>
                Agregar al remito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}