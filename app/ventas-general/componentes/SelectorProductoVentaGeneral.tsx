// SelectorProductoVentaGeneral.jsx - CORRECCIÓN COMPLETA para manejar precios USD/ARS

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
  hayTelefono?: boolean; // ✅ PARÁMETRO CLAVE PARA LÓGICA USD/ARS
}

export default function SelectorProductoVentaGeneral({
  productos,
  setProductos,
  hayTelefono = false, // ✅ RECIBIR hayTelefono
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

      // ACCESORIOS - Nueva lógica (detectar USD vs ARS nativos)
      const accesorios: ProductoStock[] = accSnap.docs.map(doc => {
        const data = doc.data();
        
        // DETECTAR si es USD o ARS nativo
        const esUSD = (data.precio1Pesos && data.precio1Pesos > 0) || 
                      (data.precio2Pesos && data.precio2Pesos > 0) || 
                      (data.precio3Pesos && data.precio3Pesos > 0);
        
        if (esUSD) {
          // ACCESORIO USD - Convertir a ARS para display
          const precio1USD = data.precio1 || 0;
          const precio2USD = data.precio2 || 0;
          const precio3USD = data.precio3 || 0;
          
          return {
            id: doc.id,
            producto: data.modelo || data.producto || "",
            modelo: data.modelo || data.producto || "",
            marca: data.marca || "",
            categoria: data.categoria || "",
            color: data.color || "",
            
            // PRECIOS ORIGINALES EN USD
            precio1: precio1USD,
            precio2: precio2USD,
            precio3: precio3USD,
            
            // PRECIOS CONVERTIDOS A ARS (actualizable)
            precio1Pesos: precio1USD * cotizacion,
            precio2Pesos: precio2USD * cotizacion,
            precio3Pesos: precio3USD * cotizacion,
            
            moneda: "USD",
            cantidad: data.cantidad || 0,
            tipo: "accesorio",
          };
        } else {
          // ACCESORIO ARS NATIVO - Mantener precios fijos
          return {
            id: doc.id,
            producto: data.modelo || data.producto || "",
            modelo: data.modelo || data.producto || "",
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
      
      // STOCKEXTRA - Nueva lógica (USD convertido a ARS para display)
      const stockExtra: ProductoStock[] = repSnap.docs.map(doc => {
        const data = doc.data();
        
        // Precios base en USD
        const precio1USD = data.precio1 || data.precioUSD || 0;
        const precio2USD = data.precio2 || 0;
        const precio3USD = data.precio3 || 0;
        
        return {
          id: doc.id,
          codigo: doc.id,
          producto: data.modelo || data.producto || "",
          modelo: data.modelo || data.producto || "",
          marca: data.marca || "",
          categoria: data.hoja || data.categoria || "",
          color: data.color || "",
          
          // PRECIOS ORIGINALES EN USD (para Firebase)
          precio1: precio1USD,
          precio2: precio2USD, 
          precio3: precio3USD,
          
          // PRECIOS CONVERTIDOS A ARS (para display)
          precio1Pesos: precio1USD * cotizacion,
          precio2Pesos: precio2USD * cotizacion,
          precio3Pesos: precio3USD * cotizacion,
          
          moneda: "USD",
          cantidad: data.cantidad || 0,
          tipo: "general",
          hoja: data.hoja || "",
        };
      });

      setTodos([...accesorios, ...stockExtra]);
    };

    cargar();
  }, [rol?.negocioID, cotizacion]);

  const normalizar = (texto: string) =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const filtrados = todos.filter(p => {
    const textoProducto = normalizar(
      `${p.categoria} ${p.modelo} ${p.marca} ${p.color} ${p.hoja || ""}`
    );
  
    return normalizar(busqueda)
      .split(" ")
      .every(palabra => textoProducto.includes(palabra));
  });

  const confirmarAgregar = () => {
    if (!productoSeleccionado) return;
    const yaExiste = productos.find(p => p.id === productoSeleccionado.id);
    if (yaExiste) return;
    
    // 🔥 LÓGICA CORREGIDA - PROBLEMA PRINCIPAL SOLUCIONADO
    const esProductoUSD = productoSeleccionado.moneda === "USD";
    
    // ✅ CORRECCIÓN: Determinar precioUnitario según contexto de venta
    let precioUnitarioFinal: number;
    let precioARS: number | null = null;
    let precioUSD: number | null = null;
    
    if (hayTelefono) {
      // 🔥 CON TELÉFONO: Todo en USD
      if (esProductoUSD) {
        // Producto USD: convertir el precio ARS elegido de vuelta a USD
        precioUnitarioFinal = precioElegido / cotizacion;
        precioUSD = precioUnitarioFinal;
      } else {
        // Producto ARS: convertir a USD
        precioUnitarioFinal = precioElegido / cotizacion;
        precioUSD = precioUnitarioFinal;
        precioARS = precioElegido; // Mantener referencia ARS
      }
    } else {
      // 🔥 SIN TELÉFONO: Todo en ARS
      if (esProductoUSD) {
        // Producto USD: usar el precio ARS convertido
        precioUnitarioFinal = precioElegido;
        precioARS = precioElegido;
        precioUSD = precioElegido / cotizacion; // Mantener referencia USD
      } else {
        // Producto ARS: usar precio ARS directo
        precioUnitarioFinal = precioElegido;
        precioARS = precioElegido;
      }
    }
    
    setProductos([
      ...productos,
      {
        ...productoSeleccionado,
        cantidad,
        codigo: productoSeleccionado.tipo === "general" 
          ? (productoSeleccionado.codigo || productoSeleccionado.id)
          : productoSeleccionado.id,
        
        // ✅ PRECIO UNITARIO CORREGIDO según contexto
        precioUnitario: precioUnitarioFinal,
        
        // ✅ CAMPOS AUXILIARES para referencia
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
          placeholder="Buscar por nombre, marca, color, modelo, categoría..."
          className="w-full p-4 pl-12 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-lg"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <span className="text-[#3498db] text-xl">🔍</span>
        </div>
      </div>

      {/* 🔥 INDICADOR DE MODO DE VENTA */}
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
                setPrecioElegido(p.moneda === "USD" ? p.precio1Pesos || 0 : p.precio1);
              }}
              className="p-4 hover:bg-[#ecf0f1] cursor-pointer border-b border-[#ecf0f1] last:border-b-0 transition-all duration-200 hover:shadow-sm"
            >
              {/* Línea principal del modelo */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-[#2c3e50]">
                  <strong className="text-[#2c3e50] text-base">{p.modelo}</strong>
                  <span className="text-[#7f8c8d] ml-2">— {p.marca}</span>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50]">
                  {p.color}
                </span>
              </div>

              {/* Información de categoría y stock */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    p.tipo === "accesorio" 
                      ? (p.moneda === "USD" ? 'bg-[#3498db] text-white' : 'bg-[#95a5a6] text-white')
                      : p.tipo === "general"
                      ? 'bg-[#9b59b6] text-white'
                      : 'bg-[#f39c12] text-white'
                  }`}>
                    {p.tipo === "general" ? "STOCK" : p.tipo.toUpperCase()}
                  </span>
                  <span className="text-[#7f8c8d] text-xs">{p.categoria}</span>
                  {p.moneda === "USD" && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#f39c12] text-white">
                      USD→ARS
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">📦</span>
                  </span>
                  <span className="text-[#27ae60] font-medium text-xs">Stock: {p.cantidad}</span>
                </div>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((nivel) => {
                  const precio = p.moneda === "USD" 
                    ? p[`precio${nivel}Pesos` as keyof ProductoStock]
                    : p[`precio${nivel}` as keyof ProductoStock];

                  if (typeof precio !== "number" || precio === 0) return null;

                  return (
                    <div key={nivel} className="bg-[#f8f9fa] rounded-lg p-2 text-center">
                      <div className="text-[#7f8c8d] text-xs">Precio {nivel}</div>
                      <div className="text-[#27ae60] font-bold text-sm">
                        ${precio.toLocaleString("es-AR")}
                        {p.moneda === "USD" && (
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
            
            {/* Header del modal */}
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
                    {productoSeleccionado.moneda === "USD" && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20">
                        💱 USD→ARS
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* 🔥 INDICADOR DE MODO EN MODAL */}
              <div className="mt-3 p-2 bg-white/10 rounded-lg text-sm">
                {hayTelefono 
                  ? '💱 Se guardará en USD para esta venta con teléfono'
                  : '💰 Se guardará en ARS para esta venta sin teléfono'
                }
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              
              {/* Información del modelo */}
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
                    const precio = productoSeleccionado.moneda === "USD" 
                      ? productoSeleccionado[`precio${nivel}Pesos` as keyof ProductoStock]
                      : productoSeleccionado[`precio${nivel}` as keyof ProductoStock];

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
                            {productoSeleccionado.moneda === "USD" && (
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

              {/* Total con indicador de conversión */}
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

            {/* Footer con botones */}
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