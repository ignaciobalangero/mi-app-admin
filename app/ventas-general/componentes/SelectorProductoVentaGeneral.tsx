"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";

interface ProductoStock {
  id: string;
  codigo?: string; // Agregado para manejar el código del producto
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
  precioUnitario?: number; // Agregado para manejar el precio elegido
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
  filtroTexto: string; // 👈 agregá esto
  setFiltroTexto: React.Dispatch<React.SetStateAction<string>>; 
}


export default function SelectorProductoVentaGeneral({
  productos,
  setProductos,
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
        precio1: doc.data().precio1Pesos || 0,
        precio2: doc.data().precio2Pesos || 0,
        precio3: doc.data().precio3Pesos || 0,
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
        placeholder="Buscar por nombre, marca, color, modelo, categoría..."
        className="w-full p-2 border rounded"
      />

      {mostrar && filtrados.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-auto text-sm mt-1">
          {filtrados.map((p, i) => (
            <li
              key={i}
              onClick={() => {
                setProductoSeleccionado(p);
                setPrecioElegido(p.precio1);
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              <strong>{p.producto}</strong> — {p.marca} {p.modelo} ({p.color})<br />
              <span className="text-xs text-gray-500">
              {p.tipo.toUpperCase()} · {p.categoria} · Stock: {p.cantidad} ·
              Precio 1: ARS ${p.precio1Pesos?.toLocaleString("es-AR") || 0} ·
              Precio 2: ARS ${p.precio2Pesos?.toLocaleString("es-AR") || 0} ·
              Precio 3: ARS ${p.precio3Pesos?.toLocaleString("es-AR") || 0}
              </span>

            </li>
          ))}
        </ul>
      )}

      {/* Mini modal */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">{productoSeleccionado.producto}</h3>

            <div className="mb-3">
              <label className="block text-sm mb-1">Cantidad:</label>
              <input
                type="number"
                value={cantidad}
                min={1}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="mb-3">
            <label className="block text-sm mb-1">Elegí un precio:</label>
            <div className="flex gap-2">
  {[1, 2, 3].map((nivel) => {
    const keyUSD = `precio${nivel}` as keyof ProductoStock;
    const keyPesos = `precio${nivel}Pesos` as keyof ProductoStock;

    const precio = 
      productoSeleccionado.tipo === "repuesto" || productoSeleccionado.tipo === "accesorio"
        ? productoSeleccionado[keyPesos]
        : productoSeleccionado[keyUSD];

    if (typeof precio !== "number") return null;

    return (
      <button
        key={nivel}
        onClick={() => setPrecioElegido(precio)}
        className={`border px-3 py-1 rounded ${
          precioElegido === precio ? "bg-blue-600 text-white" : ""
        }`}
      >
        {productoSeleccionado.tipo === "repuesto" || productoSeleccionado.tipo === "accesorio"
          ? `ARS $${precio.toLocaleString("es-AR")}`
          : `USD $${precio.toLocaleString("en-US")}`}
      </button>
    );
  })}
</div>
                 </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setProductoSeleccionado(null)}
                className="text-sm px-3 py-1"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAgregar}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
