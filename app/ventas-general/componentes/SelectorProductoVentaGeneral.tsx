// SelectorProductoVentaGeneral.jsx - CON STOCKREPUESTOS INTEGRADO Y MODAL RESPONSIVO

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, increment } from "firebase/firestore";
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
  // ✅ NUEVOS CAMPOS PARA REPUESTOS
  precioCosto?: number;
  precioCostoPesos?: number;
  proveedor?: string;
  // ✅ NUEVOS CAMPOS PARA PRECIO MANUAL
  precioManualUsado?: boolean;
  precioOriginal?: number;
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
  // ✅ NUEVO: Estados para precio manual
  const [precioManual, setPrecioManual] = useState(0);
  const [usandoPrecioManual, setUsandoPrecioManual] = useState(false);

  // ✅ FUNCIÓN PARA NORMALIZAR PRECIOS DE REPUESTOS (IGUAL QUE EN MODAL)
  const normalizarPrecioRepuesto = (repuesto: any) => {
    let precioFinal = 0;

    // Orden de prioridad para encontrar precio
    if (repuesto.precioCostoPesos && repuesto.precioCostoPesos > 0) {
      precioFinal = Number(repuesto.precioCostoPesos);
    } else if (repuesto.precioUSD && repuesto.precioUSD > 0 && cotizacion > 0) {
      precioFinal = Number(repuesto.precioUSD) * cotizacion;
    } else if (repuesto.precioARS && repuesto.precioARS > 0) {
      precioFinal = Number(repuesto.precioARS);
    } else if (repuesto.precioCosto && repuesto.precioCosto > 0) {
      if (repuesto.moneda === "USD" && cotizacion > 0) {
        precioFinal = Number(repuesto.precioCosto) * cotizacion;
      } else {
        precioFinal = Number(repuesto.precioCosto);
      }
    } else if (repuesto.precio && repuesto.precio > 0) {
      precioFinal = Number(repuesto.precio);
    }

    return precioFinal;
  };

  useEffect(() => {
    const cargar = async () => {
      if (!rol?.negocioID) return;

      // ✅ CARGAR ACCESORIOS (existente)
      const accSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockAccesorios`));
      
      // ✅ CARGAR STOCK EXTRA (existente)
      const repSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`));

      // ✅ NUEVO: CARGAR STOCKREPUESTOS
      const stockRepuestosSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));

      // 🔥 ACCESORIOS - EXISTENTE
      const accesorios: ProductoStock[] = accSnap.docs.map(doc => {
        const data = doc.data();
        
        const tieneConversion = (data.precio1 && data.precio1Pesos && data.precio1 !== data.precio1Pesos) ||
                               (data.precio2 && data.precio2Pesos && data.precio2 !== data.precio2Pesos) ||
                               (data.precio3 && data.precio3Pesos && data.precio3 !== data.precio3Pesos);
        
        const esUSD = data.moneda === "USD" || tieneConversion;
        const productoTexto = data.producto || data.modelo || "";
        const modeloTexto = data.modelo || data.producto || "";
        const codigoTexto = data.codigo || doc.id || "";
        
        if (esUSD) {
          const precio1USD = data.precio1 || 0;
          const precio2USD = data.precio2 || 0;
          const precio3USD = data.precio3 || 0;
          
          return {
            id: doc.id,
            codigo: codigoTexto,
            producto: productoTexto,
            modelo: modeloTexto,
            marca: data.marca || "",
            categoria: data.categoria || "",
            color: data.color || "",
            precio1: precio1USD,
            precio2: precio2USD,
            precio3: precio3USD,
            precio1Pesos: precio1USD * cotizacion,
            precio2Pesos: precio2USD * cotizacion,
            precio3Pesos: precio3USD * cotizacion,
            moneda: "USD",
            cantidad: data.cantidad || 0,
            tipo: "accesorio",
          };
        } else {
          return {
            id: doc.id,
            codigo: codigoTexto,
            producto: productoTexto,
            modelo: modeloTexto,
            marca: data.marca || "",
            categoria: data.categoria || "",
            color: data.color || "",
            precio1: data.precio1 || 0,
            precio2: data.precio2 || 0,
            precio3: data.precio3 || 0,
            precio1Pesos: data.precio1 || 0,
            precio2Pesos: data.precio2 || 0,
            precio3Pesos: data.precio3 || 0,
            moneda: "ARS",
            cantidad: data.cantidad || 0,
            tipo: "accesorio",
          };
        }
      });
      
      // STOCKEXTRA - EXISTENTE
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

      // ✅ NUEVO: STOCKREPUESTOS - CONVERTIR A FORMATO COMPATIBLE
      const stockRepuestos: ProductoStock[] = stockRepuestosSnap.docs.map(doc => {
        const data = doc.data();
        
        // Usar función normalizarPrecio para obtener precio principal
        const precioNormalizado = normalizarPrecioRepuesto(data);
        
        // Crear 3 niveles de precio para repuestos (común en ventas)
        const precio1 = precioNormalizado;
        const precio2 = precioNormalizado * 1.2; // 20% más
        const precio3 = precioNormalizado * 1.5; // 50% más (precio público)
        
        return {
          id: doc.id,
          codigo: data.codigo || doc.id,
          producto: data.producto || data.modelo || "Repuesto",
          modelo: data.modelo || data.producto || doc.id,
          marca: data.marca || "",
          categoria: data.categoria || "Repuestos",
          color: data.color || "",
          proveedor: data.proveedor || "",
          
          // ✅ PRECIOS ESCALADOS PARA VENTA
          precio1: precio1,        // Precio costo
          precio2: precio2,        // Precio mayorista  
          precio3: precio3,        // Precio público
          
          precio1Pesos: precio1,
          precio2Pesos: precio2,
          precio3Pesos: precio3,
          
          moneda: "ARS", // Los repuestos se venden en ARS
          cantidad: data.cantidad || 0,
          tipo: "repuesto",
          
          // ✅ MANTENER CAMPOS ORIGINALES
          precioCosto: data.precioCosto,
          precioCostoPesos: data.precioCostoPesos,
          precioARS: data.precioARS,
          precioUSD: data.precioUSD,
        };
      });

      console.log(`📊 DATOS CARGADOS:`, {
        totalAccesorios: accesorios.length,
        totalStockExtra: stockExtra.length,
        totalRepuestos: stockRepuestos.length,
      });
      
      // ✅ INCLUIR REPUESTOS EN LA LISTA
      setTodos([...accesorios, ...stockExtra, ...stockRepuestos]);
    };

    cargar();
  }, [rol?.negocioID, cotizacion]);

  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  
  // ✅ FILTRO ACTUALIZADO - INCLUIR PROVEEDOR PARA REPUESTOS
  const filtrados = todos.filter(p => {
    const textoCompleto = normalizar([
      p.codigo || "",
      p.producto || "",
      p.modelo || "",
      p.marca || "",
      p.color || "",
      p.categoria || "",
      p.hoja || "",
      p.proveedor || ""
    ].join(" "));
    
    const busquedaNormalizada = normalizar(busqueda);
    const palabrasBusqueda = busquedaNormalizada.split(" ").filter(p => p.length > 0);
    
    return palabrasBusqueda.every(palabra => textoCompleto.includes(palabra));
  });

  // ✅ FUNCIÓN PARA DESCONTAR STOCK AL AGREGAR REPUESTO
  const descontarStockRepuesto = async (repuestoId: string, cantidadVendida: number) => {
    try {
      const repuestoRef = doc(db, `negocios/${rol?.negocioID}/stockRepuestos/${repuestoId}`);
      await updateDoc(repuestoRef, {
        cantidad: increment(-cantidadVendida)
      });
      console.log(`✅ Stock descontado: ${cantidadVendida} unidades del repuesto ${repuestoId}`);
    } catch (error) {
      console.error("❌ Error descontando stock:", error);
    }
  };

  const confirmarAgregar = async () => {
    if (!productoSeleccionado) return;
    const yaExiste = productos.find(p => p.id === productoSeleccionado.id);
    if (yaExiste) {
      alert("⚠️ Este producto ya está en el remito");
      return;
    }
    
    const esProductoUSD = productoSeleccionado.moneda === "USD";
    
    // ✅ USAR PRECIO MANUAL SI ESTÁ ACTIVADO
    const precioAUsar = usandoPrecioManual ? precioManual : precioElegido;
    
    if (precioAUsar <= 0) {
      alert("⚠️ El precio debe ser mayor a 0");
      return;
    }
    
    let precioUnitarioFinal: number;
    let precioARS: number | null = null;
    let precioUSD: number | null = null;
    
    if (hayTelefono) {
      // CON TELÉFONO: Todo en USD
      if (esProductoUSD) {
        precioUnitarioFinal = precioAUsar / cotizacion;
        precioUSD = precioUnitarioFinal;
      } else {
        precioUnitarioFinal = precioAUsar / cotizacion;
        precioUSD = precioUnitarioFinal;
        precioARS = precioAUsar;
      }
    } else {
      // SIN TELÉFONO: Todo en ARS
      if (esProductoUSD) {
        precioUnitarioFinal = precioAUsar;
        precioARS = precioAUsar;
        precioUSD = precioAUsar / cotizacion;
      } else {
        precioUnitarioFinal = precioAUsar;
        precioARS = precioAUsar;
      }
    }
    
    // ✅ DESCONTAR STOCK SI ES REPUESTO
    if (productoSeleccionado.tipo === "repuesto") {
      await descontarStockRepuesto(productoSeleccionado.id, cantidad);
      
      // Actualizar stock local también
      setTodos(prev => prev.map(item => 
        item.id === productoSeleccionado.id 
          ? { ...item, cantidad: (item.cantidad || 0) - cantidad }
          : item
      ));
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
        // ✅ AGREGAR INFO DE PRECIO MANUAL
        precioManualUsado: usandoPrecioManual,
        precioOriginal: precioElegido,
      },
    ]);
    
    setProductoSeleccionado(null);
    setCantidad(1);
    setPrecioElegido(0);
    setPrecioManual(0);
    setUsandoPrecioManual(false);
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
          placeholder="Buscar por código, nombre, marca, color, modelo, categoría, proveedor..."
          className="w-full p-4 pl-12 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-lg"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <span className="text-[#3498db] text-xl">🔍</span>
        </div>
      </div>

      {/* Contador de resultados por tipo */}
      {mostrar && busqueda.length > 0 && (
        <div className="mt-2 flex gap-2 text-xs">
          {['accesorio', 'general', 'repuesto'].map(tipo => {
            const count = filtrados.filter(p => p.tipo === tipo).length;
            if (count === 0) return null;
            
            return (
              <span key={tipo} className={`px-2 py-1 rounded-full font-medium ${
                tipo === 'accesorio' ? 'bg-[#3498db] text-white' :
                tipo === 'general' ? 'bg-[#9b59b6] text-white' :
                'bg-[#e67e22] text-white'
              }`}>
                {tipo === 'general' ? 'Stock' : tipo === 'accesorio' ? 'Accesorios' : 'Repuestos'}: {count}
              </span>
            );
          })}
        </div>
      )}

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
                const precioSugerido = p.moneda === "USD" ? p.precio1Pesos || 0 : p.precio1;
                setPrecioElegido(precioSugerido);
                
                // ✅ VERIFICAR SI YA TIENE PRECIO MANUAL CARGADO
                if (p.precioManualUsado && p.precioOriginal && p.precioUnitario) {
                  console.log("🔍 Producto con precio manual detectado:", {
                    precioOriginal: p.precioOriginal,
                    precioManual: p.precioUnitario,
                    precioSugerido: precioSugerido
                  });
                  
                  // Activar precio manual y usar el precio guardado
                  setUsandoPrecioManual(true);
                  setPrecioManual(p.precioUnitario);
                  setPrecioElegido(p.precioOriginal); // Mantener precio original del botón
                } else {
                  // Resetear precio manual si no lo tenía
                  setPrecioManual(0);
                  setUsandoPrecioManual(false);
                }
              }}
              className="p-4 hover:bg-[#ecf0f1] cursor-pointer border-b border-[#ecf0f1] last:border-b-0 transition-all duration-200 hover:shadow-sm"
            >
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {/* CÓDIGO */}
                    {p.codigo && p.codigo !== p.id && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white mb-1">
                        #{p.codigo}
                      </span>
                    )}
                    
                    {/* MODELO/NOMBRE */}
                    <h4 className="text-[#2c3e50] font-bold text-base leading-tight">
                      {p.modelo || p.producto}
                    </h4>
                    
                    {/* DESCRIPCIÓN DEL PRODUCTO */}
                    {p.producto && p.producto !== p.modelo && (
                      <p className="text-[#7f8c8d] text-sm mt-1 leading-snug">
                        {p.producto}
                      </p>
                    )}
                    
                    {/* MARCA Y PROVEEDOR */}
                    <div className="text-[#95a5a6] text-xs mt-1 font-medium">
                      {p.marca && <span>Marca: {p.marca}</span>}
                      {p.tipo === "repuesto" && p.proveedor && (
                        <span className="ml-2">• Proveedor: {p.proveedor}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* COLOR */}
                  {p.color && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50] ml-3">
                      {p.color}
                    </span>
                  )}
                </div>
              </div>

              {/* INFORMACIÓN SECUNDARIA */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* TIPO DE PRODUCTO */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    p.tipo === "accesorio" 
                      ? (p.moneda === "USD" ? 'bg-[#3498db] text-white' : 'bg-[#95a5a6] text-white')
                      : p.tipo === "general"
                      ? 'bg-[#9b59b6] text-white'
                      : 'bg-[#e67e22] text-white'
                  }`}>
                    {p.tipo === "general" ? "STOCK" : 
                     p.tipo === "repuesto" ? "REPUESTO" :
                     p.tipo.toUpperCase()}
                  </span>
                  
                  {/* CATEGORÍA */}
                  {p.categoria && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#f8f9fa] text-[#7f8c8d] border border-[#ecf0f1]">
                      📁 {p.categoria}
                    </span>
                  )}
                </div>
                
                {/* STOCK DISPONIBLE */}
                <div className="flex items-center gap-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    (p.cantidad || 0) > 5 ? 'bg-[#27ae60]' : 
                    (p.cantidad || 0) > 0 ? 'bg-[#f39c12]' : 'bg-[#e74c3c]'
                  }`}>
                    <span className="text-white text-xs">📦</span>
                  </span>
                  <span className={`font-medium text-xs whitespace-nowrap ${
                    (p.cantidad || 0) > 5 ? 'text-[#27ae60]' : 
                    (p.cantidad || 0) > 0 ? 'text-[#f39c12]' : 'text-[#e74c3c]'
                  }`}>
                    Stock: {p.cantidad || 0}
                    {(p.cantidad || 0) <= 5 && (p.cantidad || 0) > 0 && (
                      <span className="ml-1 text-xs">⚠️ Bajo</span>
                    )}
                  </span>
                </div>
              </div>

              {/* PRECIOS */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((nivel) => {
                  const precio = !hayTelefono 
                    ? (p.moneda === "USD" 
                        ? p[`precio${nivel}Pesos` as keyof ProductoStock]
                        : p[`precio${nivel}` as keyof ProductoStock])
                    : (p.moneda === "USD" 
                        ? p[`precio${nivel}Pesos` as keyof ProductoStock]
                        : p[`precio${nivel}` as keyof ProductoStock]);

                  if (typeof precio !== "number" || precio === 0) return null;

                  // Etiquetas especiales para repuestos
                  const etiquetaPrecio = p.tipo === "repuesto" 
                    ? nivel === 1 ? "Costo" : nivel === 2 ? "Mayor" : "Público"
                    : `Precio ${nivel}`;

                  return (
                    <div key={nivel} className="bg-[#f8f9fa] rounded-lg p-2 text-center">
                      <div className="text-[#7f8c8d] text-xs">{etiquetaPrecio}</div>
                      <div className="text-[#27ae60] font-bold text-sm">
                        ${precio.toLocaleString("es-AR")}
                        {/* ✅ MOSTRAR REFERENCIA USD PARA PRODUCTOS USD */}
                        {p.moneda === "USD" && (
                          <div className="text-[#7f8c8d] text-xs mt-1">
                            💱 USD ${(p[`precio${nivel}` as keyof ProductoStock] || 0).toLocaleString("es-AR")}
                          </div>
                        )}
                        {/* ✅ MOSTRAR CONVERSIÓN USD PARA PRODUCTOS ARS */}
                        {p.moneda === "ARS" && cotizacion > 0 && (
                          <div className="text-[#95a5a6] text-xs mt-1">
                            💲 USD ${(precio / cotizacion).toFixed(2)}
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

      {/* Modal de selección - MODAL RESPONSIVO COMPLETO */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto border-2 border-[#ecf0f1] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header fijo */}
            <div className={`bg-gradient-to-r text-white p-4 flex-shrink-0 ${
              productoSeleccionado.tipo === "repuesto" 
                ? 'from-[#e67e22] to-[#d35400]'
                : hayTelefono 
                ? 'from-[#f39c12] to-[#e67e22]' 
                : 'from-[#2c3e50] to-[#3498db]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">
                    {productoSeleccionado.tipo === "repuesto" ? '🔧' :
                     hayTelefono ? '💱' : '🛍️'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold truncate">{productoSeleccionado.modelo}</h3>
                  <p className={`text-sm truncate ${
                    productoSeleccionado.tipo === "repuesto" ? 'text-orange-100' :
                    hayTelefono ? 'text-orange-100' : 'text-blue-100'
                  }`}>
                    {productoSeleccionado.marca}
                    {productoSeleccionado.tipo === "repuesto" && productoSeleccionado.proveedor && (
                      <span className="block text-xs">Proveedor: {productoSeleccionado.proveedor}</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-white/10 rounded-lg text-sm">
                {productoSeleccionado.tipo === "repuesto" 
                  ? '🔧 Repuesto - Stock se descontará automáticamente'
                  : hayTelefono 
                  ? '💱 Se guardará en USD para esta venta con teléfono'
                  : '💰 Se guardará en ARS para esta venta sin teléfono'
                }
              </div>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              <div className="bg-[#f8f9fa] rounded-lg p-3 border border-[#ecf0f1]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    productoSeleccionado.tipo === "repuesto" 
                      ? 'bg-[#e67e22] text-white'
                      : productoSeleccionado.tipo === "accesorio" 
                      ? (productoSeleccionado.moneda === "USD" ? 'bg-[#3498db] text-white' : 'bg-[#95a5a6] text-white')
                      : 'bg-[#9b59b6] text-white'
                  }`}>
                    {productoSeleccionado.tipo === "repuesto" ? "REPUESTO" :
                     productoSeleccionado.tipo === "general" ? "STOCK EXTRA" : 
                     productoSeleccionado.tipo.toUpperCase()}
                    {productoSeleccionado.moneda === "USD" && productoSeleccionado.tipo === "accesorio" && " (USD)"}
                  </span>
                  <span className={`font-medium text-sm ${
                    (productoSeleccionado.cantidad || 0) > 5 ? 'text-[#27ae60]' : 
                    (productoSeleccionado.cantidad || 0) > 0 ? 'text-[#f39c12]' : 'text-[#e74c3c]'
                  }`}>
                    Stock disponible: {productoSeleccionado.cantidad || 0}
                    {(productoSeleccionado.cantidad || 0) <= 5 && (productoSeleccionado.cantidad || 0) > 0 && (
                      <span className="ml-1 text-xs">⚠️</span>
                    )}
                  </span>
                </div>
                <div className="text-[#7f8c8d] text-sm">
                  Categoría: {productoSeleccionado.categoria} • Color: {productoSeleccionado.color}
                </div>
                {productoSeleccionado.tipo === "repuesto" && (
                  <div className="mt-2 p-2 bg-[#fff3cd] border border-[#f39c12] rounded text-xs text-[#856404]">
                    🔧 Al agregar este repuesto, se descontará automáticamente del stock
                  </div>
                )}
                {productoSeleccionado.moneda === "USD" && productoSeleccionado.tipo !== "repuesto" && (
                  <div className="mt-2 p-2 bg-[#fff3cd] border border-[#f39c12] rounded text-xs text-[#856404]">
                    💡 Precios convertidos automáticamente de USD a ARS (cotización: ${cotizacion})
                  </div>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#3498db] rounded-lg flex items-center justify-center text-white text-xs">📦</span>
                  Cantidad:
                </label>
                <input
                  type="number"
                  value={cantidad}
                  min={1}
                  max={productoSeleccionado.cantidad || 1}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full border-2 border-[#bdc3c7] p-2 rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-[#2c3e50] transition-all text-lg font-medium text-center"
                />
                {cantidad > (productoSeleccionado.cantidad || 0) && (
                  <p className="text-[#e74c3c] text-xs mt-1">⚠️ No hay suficiente stock disponible</p>
                )}
              </div>

              {/* Selección de precio */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#27ae60] rounded-lg flex items-center justify-center text-white text-xs">💰</span>
                  Elegí un precio:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[1, 2, 3].map((nivel) => {
                    const precio = !hayTelefono 
                      ? (productoSeleccionado.moneda === "USD" 
                          ? productoSeleccionado[`precio${nivel}Pesos` as keyof ProductoStock]
                          : productoSeleccionado[`precio${nivel}` as keyof ProductoStock])
                      : (productoSeleccionado.moneda === "USD" 
                          ? productoSeleccionado[`precio${nivel}Pesos` as keyof ProductoStock]
                          : productoSeleccionado[`precio${nivel}` as keyof ProductoStock]);

                    if (typeof precio !== "number" || precio === 0) return null;

                    const etiquetaPrecio = productoSeleccionado.tipo === "repuesto" 
                      ? nivel === 1 ? "💰 Precio Costo" : nivel === 2 ? "🏪 Precio Mayorista" : "🏬 Precio Público"
                      : `💵 Precio ${nivel}`;

                    return (
                      <button
                        key={nivel}
                        onClick={() => {
                          setPrecioElegido(precio);
                          setUsandoPrecioManual(false);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 font-medium text-sm ${
                          precioElegido === precio && !usandoPrecioManual
                            ? "bg-[#3498db] text-white border-[#3498db] shadow-lg transform scale-105" 
                            : "bg-white text-[#2c3e50] border-[#bdc3c7] hover:border-[#3498db] hover:bg-[#ecf0f1]"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              precioElegido === precio && !usandoPrecioManual ? 'bg-white text-[#3498db]' : 'bg-[#3498db] text-white'
                            }`}>
                              {nivel}
                            </span>
                            <span className="text-xs">{etiquetaPrecio}</span>
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-base">
                              ${precio.toLocaleString("es-AR")}
                            </span>
                            {productoSeleccionado.moneda === "USD" && (
                              <div className="text-xs text-[#7f8c8d]">
                                💱 USD ${(productoSeleccionado[`precio${nivel}` as keyof ProductoStock] || 0).toLocaleString("es-AR")}
                              </div>
                            )}
                            {productoSeleccionado.moneda === "ARS" && cotizacion > 0 && (
                              <div className="text-xs text-[#95a5a6]">
                                💲 USD ${(precio / cotizacion).toFixed(2)}
                              </div>
                            )}
                            {productoSeleccionado.tipo === "repuesto" && nivel > 1 && (
                              <div className="text-xs text-[#27ae60]">
                                +{((precio / (productoSeleccionado.precio1 || 1) - 1) * 100).toFixed(0)}% margen
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Precio manual */}
              <div className="border-t border-[#ecf0f1] pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="precio-manual"
                    checked={usandoPrecioManual}
                    onChange={(e) => {
                      setUsandoPrecioManual(e.target.checked);
                      if (e.target.checked) {
                        setPrecioManual(precioElegido || 0);
                      }
                    }}
                    className="w-4 h-4 text-[#f39c12] bg-white border-2 border-[#bdc3c7] rounded focus:ring-2 focus:ring-[#f39c12]"
                  />
                  <label htmlFor="precio-manual" className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#f39c12] rounded-lg flex items-center justify-center text-white text-xs">✏️</span>
                    Usar precio manual
                  </label>
                </div>
                
                {usandoPrecioManual && (
                  <div className="bg-[#fff3cd] border border-[#f39c12] rounded-lg p-3">
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-[#856404] mb-1">
                        💰 Precio personalizado:
                      </label>
                      <input
                        type="number"
                        value={precioManual}
                        onChange={(e) => setPrecioManual(Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-full border-2 border-[#f39c12] p-2 rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] text-[#2c3e50] transition-all text-lg font-medium text-center"
                        placeholder="Ingrese el precio personalizado"
                      />
                    </div>
                    
                    <div className="text-xs text-[#856404] bg-[#ffeaa7] rounded p-2 mb-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span>💡</span>
                        <strong>Casos útiles:</strong>
                      </div>
                      <div className="text-xs leading-tight">
                        • Artículos que solo tienen precio costo<br/>
                        • Aplicar descuentos especiales<br/>
                        • Promociones puntuales
                      </div>
                    </div>
                    
                    {precioElegido > 0 && precioManual !== precioElegido && (
                      <div className="p-2 bg-[#e8f5e8] border border-[#27ae60] rounded text-xs text-[#2c3e50]">
                        <div className="flex justify-between items-center">
                          <span>Precio original:</span>
                          <div className="text-right">
                            <span className="font-medium">${precioElegido.toLocaleString("es-AR")}</span>
                            {cotizacion > 0 && (
                              <div className="text-xs text-[#7f8c8d]">USD ${(precioElegido / cotizacion).toFixed(2)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Precio manual:</span>
                          <div className="text-right">
                            <span className="font-bold text-[#f39c12]">${precioManual.toLocaleString("es-AR")}</span>
                            {cotizacion > 0 && (
                              <div className="text-xs text-[#7f8c8d]">USD ${(precioManual / cotizacion).toFixed(2)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#27ae60] pt-1 mt-1">
                          <span>Diferencia:</span>
                          <div className="text-right">
                            <span className={`font-bold ${precioManual > precioElegido ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`}>
                              {precioManual > precioElegido ? '+' : ''}${(precioManual - precioElegido).toLocaleString("es-AR")}
                            </span>
                            {cotizacion > 0 && (
                              <div className="text-xs text-[#7f8c8d]">
                                {precioManual > precioElegido ? '+' : ''}USD ${((precioManual - precioElegido) / cotizacion).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Total */}
              {(precioElegido > 0 || usandoPrecioManual) && (
                <div className={`bg-gradient-to-r rounded-lg p-3 text-white ${
                  productoSeleccionado.tipo === "repuesto" 
                    ? 'from-[#e67e22] to-[#d35400]'
                    : hayTelefono 
                    ? 'from-[#f39c12] to-[#e67e22]' 
                    : 'from-[#27ae60] to-[#2ecc71]'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                        {usandoPrecioManual ? '✏️' : 
                         productoSeleccionado.tipo === "repuesto" ? '🔧' :
                         hayTelefono ? '💱' : '💵'}
                      </span>
                      <span className="text-xs">
                        Total {usandoPrecioManual ? '(precio manual)' :
                               productoSeleccionado.tipo === "repuesto" ? '(repuesto)' :
                               hayTelefono ? '(se guardará en USD)' : '(se guardará en ARS)'}:
                      </span>
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-xl">
                        ${((usandoPrecioManual ? precioManual : precioElegido) * cantidad).toLocaleString("es-AR")}
                      </span>
                      {hayTelefono && productoSeleccionado.tipo !== "repuesto" && (
                        <div className="text-xs opacity-80">
                          Se guardará: USD ${(((usandoPrecioManual ? precioManual : precioElegido) / cotizacion) * cantidad).toFixed(2)}
                        </div>
                      )}
                      {usandoPrecioManual && precioElegido > 0 && precioManual !== precioElegido && (
                        <div className="text-xs opacity-80">
                          {precioManual > precioElegido ? '📈 Precio aumentado' : '📉 Precio con descuento'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botones fijos en la parte inferior */}
            <div className="bg-[#f8f9fa] px-4 py-3 flex justify-end gap-2 border-t border-[#ecf0f1] flex-shrink-0">
              <button
                onClick={() => setProductoSeleccionado(null)}
                className="px-4 py-2 text-[#2c3e50] bg-white border-2 border-[#bdc3c7] rounded-lg hover:bg-[#ecf0f1] hover:border-[#7f8c8d] transition-all duration-200 font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAgregar}
                disabled={(precioElegido === 0 && !usandoPrecioManual) || (usandoPrecioManual && precioManual <= 0) || cantidad > (productoSeleccionado.cantidad || 0)}
                className="px-6 py-2 bg-[#27ae60] hover:bg-[#229954] disabled:bg-[#bdc3c7] text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none flex items-center gap-2 text-sm"
              >
                <span>✅</span>
                {usandoPrecioManual ? "Agregar con precio manual" :
                 productoSeleccionado.tipo === "repuesto" ? "Agregar repuesto" : "Agregar al remito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}