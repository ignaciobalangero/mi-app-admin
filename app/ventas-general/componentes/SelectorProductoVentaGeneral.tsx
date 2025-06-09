"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";

interface ProductoStock {
  id: string;
  codigo?: string;
  producto: string;
  marca?: string;
  modelo?: string;
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
  tipo: "accesorio" | "repuesto";
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
      const repSnap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockExtra`)
      );      

      const accesorios: ProductoStock[] = accSnap.docs.map(doc => ({
        id: doc.id,
        producto: doc.data().producto,
        marca: doc.data().marca || "",
        modelo: doc.data().modelo || "",
        categoria: doc.data().categoria || "",
        color: doc.data().color || "",
        precio1: doc.data().precio1 || 0,
        precio2: doc.data().precio2 || 0,
        precio3: doc.data().precio3 || 0,
        precio1Pesos: doc.data().precio1Pesos || 0,
        precio2Pesos: doc.data().precio2Pesos || 0,
        precio3Pesos: doc.data().precio3Pesos || 0,
        moneda: "ARS",
        cantidad: doc.data().cantidad || 0,
        tipo: "accesorio",
      }));
      
      const repuestos: ProductoStock[] = repSnap.docs.map(doc => ({
        id: doc.id,
        producto: doc.data().producto,
        marca: doc.data().marca || "",
        modelo: doc.data().modelo || "",
        categoria: doc.data().hoja || doc.data().categoria || "",
        color: doc.data().color || "",
        precio1: doc.data().precio1 || 0,
        precio2: doc.data().precio2 || 0,
        precio3: doc.data().precio3 || 0,
        precio1Pesos: doc.data().precio1Pesos || 0,
        precio2Pesos: doc.data().precio2Pesos || 0,
        precio3Pesos: doc.data().precio3Pesos || 0,
        moneda: "ARS",
        cantidad: doc.data().cantidad || 0,
        tipo: "repuesto",
        hoja: doc.data().hoja || "",
      }));

      setTodos([...accesorios, ...repuestos]);
    };

    cargar();
  }, [rol?.negocioID]);

  const normalizar = (texto: string) =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const filtrados = todos.filter(p => {
    const textoProducto = normalizar(
      `${p.categoria} ${p.producto} ${p.marca} ${p.modelo} ${p.color} ${p.hoja || ""}`
    );
  
    return normalizar(busqueda)
      .split(" ")
      .every(palabra => textoProducto.includes(palabra));
  });

  const confirmarAgregar = () => {
    if (!productoSeleccionado) return;
    const yaExiste = productos.find(p => p.id === productoSeleccionado.id);
    if (yaExiste) return;
    setProductos([
      ...productos,
      {
        ...productoSeleccionado,
        cantidad,
        codigo: productoSeleccionado.id, 
        precioUnitario: precioElegido,
        precioARS: hayTelefono ? null : precioElegido,
        precioUSD: hayTelefono ? precioElegido : null,
        moneda: hayTelefono ? "USD" : "ARS",
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
      {/* Input de búsqueda - Estilo GestiOne */}
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

      {/* Lista de resultados - Estilo GestiOne */}
      {mostrar && filtrados.length > 0 && (
        <div className="absolute z-50 w-full bg-white border-2 border-[#3498db] rounded-lg shadow-2xl max-h-80 overflow-auto text-sm mt-2">
          {filtrados.map((p, i) => (
            <div
              key={i}
              onClick={() => {
                setProductoSeleccionado(p);
                setPrecioElegido(p.precio1);
              }}
              className="p-4 hover:bg-[#ecf0f1] cursor-pointer border-b border-[#ecf0f1] last:border-b-0 transition-all duration-200 hover:shadow-sm"
            >
              {/* Línea principal del producto */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-[#2c3e50]">
                  <strong className="text-[#2c3e50] text-base">{p.producto}</strong>
                  <span className="text-[#7f8c8d] ml-2">— {p.marca} {p.modelo}</span>
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
                      ? 'bg-[#3498db] text-white'
                      : 'bg-[#f39c12] text-white'
                  }`}>
                    {p.tipo.toUpperCase()}
                  </span>
                  <span className="text-[#7f8c8d] text-xs">{p.categoria}</span>
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
                  const keyUSD = `precio${nivel}` as keyof ProductoStock;
                  const keyPesos = `precio${nivel}Pesos` as keyof ProductoStock;
                  const precio = hayTelefono 
                    ? p[keyUSD]
                    : p[keyPesos];

                  if (typeof precio !== "number") return null;

                  return (
                    <div key={nivel} className="bg-[#f8f9fa] rounded-lg p-2 text-center">
                      <div className="text-[#7f8c8d] text-xs">Precio {nivel}</div>
                      <div className="text-[#27ae60] font-bold text-sm">
                        {hayTelefono 
                          ? `USD $${precio.toLocaleString("es-AR")}`
                          : `$${precio.toLocaleString("es-AR")}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de selección - Estilo GestiOne */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border-2 border-[#ecf0f1] overflow-hidden">
            
            {/* Header del modal - Estilo GestiOne */}
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🛍️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{productoSeleccionado.producto}</h3>
                  <p className="text-blue-100 text-sm">
                    {productoSeleccionado.marca} {productoSeleccionado.modelo}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              
              {/* Información del producto */}
              <div className="bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    productoSeleccionado.tipo === "accesorio" 
                      ? 'bg-[#3498db] text-white'
                      : 'bg-[#f39c12] text-white'
                  }`}>
                    {productoSeleccionado.tipo.toUpperCase()}
                  </span>
                  <span className="text-[#27ae60] font-medium text-sm">
                    Stock disponible: {productoSeleccionado.cantidad}
                  </span>
                </div>
                <div className="text-[#7f8c8d] text-sm">
                  Categoría: {productoSeleccionado.categoria} • Color: {productoSeleccionado.color}
                </div>
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
                    const keyUSD = `precio${nivel}` as keyof ProductoStock;
                    const keyPesos = `precio${nivel}Pesos` as keyof ProductoStock;

                    const precio = hayTelefono 
                      ? productoSeleccionado[keyUSD]
                      : productoSeleccionado[keyPesos];

                    if (typeof precio !== "number") return null;

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
                          <span className="font-bold text-lg">
                            {hayTelefono 
                              ? `USD $${precio.toLocaleString("es-AR")}`
                              : `$${precio.toLocaleString("es-AR")}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              {precioElegido > 0 && (
                <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-lg p-4 text-white">
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2">
                      <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">💵</span>
                      Total:
                    </span>
                    <span className="font-bold text-2xl">
                      {hayTelefono 
                        ? `USD $${(precioElegido * cantidad).toLocaleString("es-AR")}`
                        : `$${(precioElegido * cantidad).toLocaleString("es-AR")}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con botones - Estilo GestiOne */}
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