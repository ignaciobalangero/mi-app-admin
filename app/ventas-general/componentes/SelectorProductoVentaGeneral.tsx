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
      <input
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setMostrar(true);
        }}
        onFocus={() => setMostrar(true)}
        onBlur={() => setTimeout(() => setMostrar(false), 200)}
        placeholder="🔍 Buscar por nombre, marca, color, modelo, categoría..."
        className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
      />

      {mostrar && filtrados.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-auto text-sm mt-1">
          {filtrados.map((p, i) => (
            <li
              key={i}
              onClick={() => {
                setProductoSeleccionado(p);
                setPrecioElegido(p.precio1);
              }}
              className="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="text-gray-900">
                <strong className="text-gray-800">{p.producto}</strong>
                <span className="text-gray-700"> — {p.marca} {p.modelo}</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ml-2">
                  {p.color}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                  p.tipo === "accesorio" 
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {p.tipo.toUpperCase()}
                </span>
                <span className="text-gray-600">{p.categoria} · Stock: {p.cantidad}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {hayTelefono ? (
                  <>
                    <span className="text-green-700 font-medium">
                      Precio 1: USD ${p.precio1?.toLocaleString("es-AR") || 0}
                    </span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-green-700">
                      Precio 2: USD ${p.precio2?.toLocaleString("es-AR") || 0}
                    </span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-green-700">
                      Precio 3: USD ${p.precio3?.toLocaleString("es-AR") || 0}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-green-700 font-medium">
                      Precio 1: ARS ${p.precio1Pesos?.toLocaleString("es-AR") || 0}
                    </span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-green-700">
                      Precio 2: ARS ${p.precio2Pesos?.toLocaleString("es-AR") || 0}
                    </span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-green-700">
                      Precio 3: ARS ${p.precio3Pesos?.toLocaleString("es-AR") || 0}
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Mini modal mejorado */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-gray-200 overflow-hidden">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛍️</span>
                <div>
                  <h3 className="text-xl font-bold">{productoSeleccionado.producto}</h3>
                  <p className="text-purple-100 text-sm">
                    {productoSeleccionado.marca} {productoSeleccionado.modelo}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-4">
              {/* Cantidad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Cantidad:
                </label>
                <input
                  type="number"
                  value={cantidad}
                  min={1}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 transition-all"
                />
              </div>

              {/* Selección de precio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  💰 Elegí un precio:
                </label>
                <div className="grid grid-cols-1 gap-2">
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
                        className={`p-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                          precioElegido === precio 
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-600 shadow-lg transform scale-105" 
                            : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>Precio {nivel}</span>
                          <span className="font-bold">
                            {hayTelefono 
                              ? `USD $${precio.toLocaleString("es-AR")}`
                              : `ARS $${precio.toLocaleString("es-AR")}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              {precioElegido > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-green-800 font-medium">Total:</span>
                    <span className="text-green-700 font-bold text-lg">
                      {hayTelefono 
                        ? `USD $${(precioElegido * cantidad).toLocaleString("es-AR")}`
                        : `ARS $${(precioElegido * cantidad).toLocaleString("es-AR")}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setProductoSeleccionado(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAgregar}
                disabled={precioElegido === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none"
              >
                ✅ Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}