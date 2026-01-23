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
  precioCosto?: number;
  precioCostoPesos?: number;
  proveedor?: string;
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
}

export default function SelectorProductoVentaGeneral({
  productos,
  setProductos,
}: Props) {
  const { rol } = useRol();
  const { cotizacion } = useCotizacion(rol?.negocioID || "");
  const [busqueda, setBusqueda] = useState("");
  const [todos, setTodos] = useState<ProductoStock[]>([]);
  const [mostrar, setMostrar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoStock | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioElegido, setPrecioElegido] = useState(0);
  const [precioManual, setPrecioManual] = useState(0);
  const [usandoPrecioManual, setUsandoPrecioManual] = useState(false);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState<"ARS" | "USD">("ARS");


// ✅ REEMPLAZAR TODO EL useEffect POR ESTE:

// ✅ REEMPLAZAR TODO EL useEffect (desde línea ~70 hasta ~190) POR ESTE CÓDIGO LIMPIO:

useEffect(() => {
  const cargar = async () => {
    if (!rol?.negocioID) return;
    
    // ✅ VERIFICAR QUE COTIZACIÓN EXISTA
    if (!cotizacion || cotizacion === 0) {
      console.warn('⚠️ Esperando cotización...');
      return;
    }

    console.log('💱 Cargando productos con cotización:', cotizacion);

    const accSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockAccesorios`));
    const repSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`));
    const stockRepuestosSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));

    // ✅ ACCESORIOS
    const accesorios: ProductoStock[] = accSnap.docs.map(doc => {
      const data = doc.data();
      const esUSD = data.moneda === "USD";
      
      if (esUSD) {
        return {
          id: doc.id,
          codigo: data.codigo || doc.id,
          producto: data.producto || data.modelo || "",
          modelo: data.modelo || data.producto || "",
          marca: data.marca || "",
          categoria: data.categoria || "",
          color: data.color || "",
          precio1: data.precio1 || 0,
          precio2: data.precio2 || 0,
          precio3: data.precio3 || 0,
          precio1Pesos: (data.precio1 || 0) * cotizacion,
          precio2Pesos: (data.precio2 || 0) * cotizacion,
          precio3Pesos: (data.precio3 || 0) * cotizacion,
          moneda: "USD" as const,
          cantidad: data.cantidad || 0,
          tipo: "accesorio" as const,
        } as ProductoStock;
      } else {
        return {
          id: doc.id,
          codigo: data.codigo || doc.id,
          producto: data.producto || data.modelo || "",
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
          moneda: "ARS" as const,
          cantidad: data.cantidad || 0,
          tipo: "accesorio" as const,
        } as ProductoStock;
      }
    });
    
    // ✅ STOCK EXTRA
    const stockExtra: ProductoStock[] = repSnap.docs.map(doc => {
      const data = doc.data();
      const precio1USD = data.precio1 || data.precioUSD || 0;
      
      return {
        id: doc.id,
        codigo: doc.id,
        producto: data.producto || data.modelo || "",
        modelo: data.modelo || data.producto || "",
        marca: data.marca || "",
        categoria: data.categoria || "",
        color: data.color || "",
        precio1: precio1USD,
        precio2: data.precio2 || 0,
        precio3: data.precio3 || 0,
        precio1Pesos: precio1USD * cotizacion,
        precio2Pesos: (data.precio2 || 0) * cotizacion,
        precio3Pesos: (data.precio3 || 0) * cotizacion,
        moneda: "USD" as const,
        cantidad: data.cantidad || 0,
        tipo: "general" as const,
        hoja: data.hoja || "",
      } as ProductoStock;
    });

    // ✅ REPUESTOS
    const stockRepuestos: ProductoStock[] = stockRepuestosSnap.docs.map(doc => {
      const data = doc.data();
      const esUSD = data.moneda === "USD";
      
      const repuesto: ProductoStock = {
        id: doc.id,
        codigo: data.codigo || doc.id,
        producto: data.producto || data.modelo || "Repuesto",
        modelo: data.modelo || data.producto || doc.id,
        marca: data.marca || "",
        categoria: data.categoria || "Repuestos",
        color: data.color || "",
        proveedor: data.proveedor || "",
        
        precio1: data.precio1 || 0,
        precio2: data.precio2 || 0,
        precio3: data.precio3 || 0,
        
        precio1Pesos: esUSD ? (data.precio1 || 0) * cotizacion : (data.precio1 || 0),
        precio2Pesos: esUSD ? (data.precio2 || 0) * cotizacion : (data.precio2 || 0),
        precio3Pesos: esUSD ? (data.precio3 || 0) * cotizacion : (data.precio3 || 0),
        
        moneda: (data.moneda || "ARS") as "ARS" | "USD",
        cantidad: data.cantidad || 0,
        tipo: "repuesto" as const,
        
        precioCosto: data.precioCosto,
        precioCostoPesos: esUSD ? (data.precioCosto || 0) * cotizacion : (data.precioCostoPesos || 0),
        precioARS: data.precioARS,
        precioUSD: data.precioUSD,
      };
      
      console.log('🔧 Repuesto cargado:', {
        producto: repuesto.producto,
        moneda: repuesto.moneda,
        precio1Original: repuesto.precio1,
        precio1Pesos: repuesto.precio1Pesos,
        cotización: cotizacion
      });
      
      return repuesto;
    });

    console.log('📦 Total productos cargados:', {
      accesorios: accesorios.length,
      stockExtra: stockExtra.length,
      repuestos: stockRepuestos.length
    });

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

  const descontarStockRepuesto = async (repuestoId: string, cantidadVendida: number) => {
    try {
      const repuestoRef = doc(db, `negocios/${rol?.negocioID}/stockRepuestos/${repuestoId}`);
      await updateDoc(repuestoRef, {
        cantidad: increment(-cantidadVendida)
      });
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
    
    const precioAUsar = usandoPrecioManual ? precioManual : precioElegido;
    
    if (precioAUsar <= 0) {
      alert("⚠️ El precio debe ser mayor a 0");
      return;
    }
    
    let precioUnitarioFinal: number;
    let precioARS: number | null = null;
    let precioUSD: number | null = null;
    
    if (monedaSeleccionada === "USD") {
      if (productoSeleccionado.moneda === "USD") {
        let precioUSDOriginal;
        if (precioElegido === productoSeleccionado.precio1Pesos) {
          precioUSDOriginal = productoSeleccionado.precio1;
        } else if (precioElegido === productoSeleccionado.precio2Pesos) {
          precioUSDOriginal = productoSeleccionado.precio2;
        } else if (precioElegido === productoSeleccionado.precio3Pesos) {
          precioUSDOriginal = productoSeleccionado.precio3;
        } else {
          precioUSDOriginal = precioAUsar / cotizacion;
        }
        precioUnitarioFinal = precioUSDOriginal;
      } else {
        precioUnitarioFinal = precioAUsar / cotizacion;
      }
      precioUSD = precioUnitarioFinal;
      precioARS = null;
    } else {
      if (productoSeleccionado.moneda === "USD") {
        precioUnitarioFinal = precioAUsar;
      } else {
        precioUnitarioFinal = precioAUsar;
      }
      precioARS = precioUnitarioFinal;
      precioUSD = null;
    }
    
    if (productoSeleccionado.tipo === "repuesto") {
      await descontarStockRepuesto(productoSeleccionado.id, cantidad);
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
        moneda: monedaSeleccionada,
        precioManualUsado: usandoPrecioManual,
        precioOriginal: precioElegido,
      },
    ]);
    
    setProductoSeleccionado(null);
    setCantidad(1);
    setPrecioElegido(0);
    setPrecioManual(0);
    setUsandoPrecioManual(false);
    setMonedaSeleccionada("ARS");
    setBusqueda("");
    setMostrar(false);
  };

  return (
    <div className="relative w-full">
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

      {mostrar && (
        <div className="mt-2 p-2 rounded-lg text-xs font-medium bg-[#27ae60] text-white">
          <div className="flex items-center gap-2">
            <span>💰</span>
            SISTEMA UNIFICADO: Eliges la moneda en cada producto (por defecto ARS)
          </div>
        </div>
      )}

      {mostrar && filtrados.length > 0 && (
        <div 
          className="fixed bg-white border-2 border-[#3498db] rounded-lg shadow-2xl max-h-80 overflow-auto text-sm" 
          style={{ 
            zIndex: 999999,
            width: 'auto',
            minWidth: '300px',
            maxWidth: '800px',
          }}
          ref={(el) => {
            if (el) {
              const input = el.parentElement?.querySelector('input[type="text"]');
              if (input) {
                const inputRect = input.getBoundingClientRect();
                el.style.left = `${inputRect.left}px`;
                el.style.top = `${inputRect.bottom + 4}px`;
                el.style.width = `${inputRect.width}px`;
              }
            }
          }}
        >
          {filtrados.map((p, i) => (
            <div
              key={i}
              onClick={() => {
                setProductoSeleccionado(p);
                const precioSugerido = p.precio1Pesos || p.precio1;
                setPrecioElegido(precioSugerido);
                setPrecioManual(0);
                setUsandoPrecioManual(false);
                setMonedaSeleccionada("ARS");
              }}
              className="p-4 hover:bg-[#ecf0f1] cursor-pointer border-b border-[#ecf0f1] last:border-b-0 transition-all duration-200 hover:shadow-sm"
            >
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {p.codigo && p.codigo !== p.id && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white mb-1">
                        #{p.codigo}
                      </span>
                    )}
                    
                    <h4 className="text-[#2c3e50] font-bold text-base leading-tight">
                      {p.modelo || p.producto}
                    </h4>
                    
                    {p.producto && p.producto !== p.modelo && (
                      <p className="text-[#7f8c8d] text-sm mt-1 leading-snug">
                        {p.producto}
                      </p>
                    )}
                    
                    <div className="text-[#95a5a6] text-xs mt-1 font-medium">
                      {p.marca && <span>Marca: {p.marca}</span>}
                      {p.tipo === "repuesto" && p.proveedor && (
                        <span className="ml-2">• Proveedor: {p.proveedor}</span>
                      )}
                    </div>
                  </div>
                  
                  {p.color && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50] ml-3">
                      {p.color}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
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
                  
                  {p.categoria && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#f8f9fa] text-[#7f8c8d] border border-[#ecf0f1]">
                      📁 {p.categoria}
                    </span>
                  )}
                </div>
                
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

              <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((nivel) => {
  const precioPesos = p[`precio${nivel}Pesos` as keyof ProductoStock];
  const precioOriginal = p[`precio${nivel}` as keyof ProductoStock];
  const precio = precioPesos || precioOriginal;
  
  // 🔍 DEBUG - Ver qué valores tiene
  if (p.tipo === "repuesto") {
    console.log(`🔧 DEBUG Precio nivel ${nivel}:`, {
      producto: p.producto,
      precio1: p.precio1,
      precio2: p.precio2,
      precio3: p.precio3,
      precio1Pesos: p.precio1Pesos,
      precio2Pesos: p.precio2Pesos,
      precio3Pesos: p.precio3Pesos,
      precioPesos,
      precioOriginal,
      precio,
      tipoPrecio: typeof precio
    });
  }
  
  if (typeof precio !== "number" || precio === 0) {
    console.log(`⚠️ Precio ${nivel} es inválido:`, precio, typeof precio);
    return null;
  }

                  const etiquetaPrecio = p.tipo === "repuesto" 
  ? nivel === 1 ? "Precio 1" : nivel === 2 ? "Precio 2" : "Precio 3"
  : `Precio ${nivel}`;

                  return (
                    <div key={nivel} className="bg-[#f8f9fa] rounded-lg p-2 text-center">
                      <div className="text-[#7f8c8d] text-xs">{etiquetaPrecio}</div>
                      <div className="text-[#27ae60] font-bold text-sm">
                        ${precio.toLocaleString("es-AR")}
                        {p.moneda === "USD" && (
                          <div className="text-[#7f8c8d] text-xs mt-1">
                            💱 USD ${(p[`precio${nivel}` as keyof ProductoStock] || 0).toLocaleString("es-AR")}
                          </div>
                        )}
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

      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto border-2 border-[#ecf0f1] overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">
                    {productoSeleccionado.tipo === "repuesto" ? '🔧' : '🛍️'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold truncate">{productoSeleccionado.modelo}</h3>
                  <p className="text-blue-100 text-sm truncate">
                    {productoSeleccionado.marca}
                    {productoSeleccionado.tipo === "repuesto" && productoSeleccionado.proveedor && (
                      <span className="block text-xs">Proveedor: {productoSeleccionado.proveedor}</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-white/10 rounded-lg text-sm">
                💰 Sistema unificado: Eliges en qué moneda guardar este producto
              </div>
            </div>

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
                {productoSeleccionado.moneda === "USD" && productoSeleccionado.tipo !== "repuesto" && (
                  <div className="mt-2 p-2 bg-[#fff3cd] border border-[#f39c12] rounded text-xs text-[#856404]">
                    💡 Producto nativo USD - Precios convertidos automáticamente (cotización: ${cotizacion})
                  </div>
                )}
              </div>

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

              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#f39c12] rounded-lg flex items-center justify-center text-white text-xs">💱</span>
                  Guardar en:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMonedaSeleccionada("ARS")}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all font-medium ${
                      monedaSeleccionada === "ARS" 
                        ? "bg-[#27ae60] text-white border-[#27ae60]"
                        : "bg-white text-[#2c3e50] border-[#bdc3c7] hover:border-[#27ae60]"
                    }`}
                  >
                    💰 Pesos (ARS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonedaSeleccionada("USD")}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all font-medium ${
                      monedaSeleccionada === "USD" 
                        ? "bg-[#3498db] text-white border-[#3498db]"
                        : "bg-white text-[#2c3e50] border-[#bdc3c7] hover:border-[#3498db]"
                    }`}
                  >
                    💵 Dólares (USD)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#27ae60] rounded-lg flex items-center justify-center text-white text-xs">💰</span>
                  Elegí un precio:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[1, 2, 3].map((nivel) => {
                    const precio = productoSeleccionado[`precio${nivel}Pesos` as keyof ProductoStock] || productoSeleccionado[`precio${nivel}` as keyof ProductoStock];
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
                            <span className="font-bold text-base">${precio.toLocaleString("es-AR")}</span>
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
                        placeholder="Precio personalizado"
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

              {(precioElegido > 0 || usandoPrecioManual) && (
                <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-lg p-3 text-white">
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                        {usandoPrecioManual ? '✏️' : 
                         productoSeleccionado.tipo === "repuesto" ? '🔧' : '💵'}
                      </span>
                      <span className="text-xs">
                        Total {usandoPrecioManual ? '(precio manual)' :
                               productoSeleccionado.tipo === "repuesto" ? '(repuesto)' : '(producto)'}:
                      </span>
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-xl">
                        {monedaSeleccionada === "USD" ? "USD $" : "$"}
                        {monedaSeleccionada === "USD" 
                          ? (((usandoPrecioManual ? precioManual : precioElegido) / cotizacion) * cantidad).toFixed(2)
                          : ((usandoPrecioManual ? precioManual : precioElegido) * cantidad).toLocaleString("es-AR")
                        }
                      </span>
                      <div className="text-xs opacity-80">
                        Se guardará en {monedaSeleccionada === "USD" ? "dólares" : "pesos"}
                      </div>
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
                Agregar al remito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}