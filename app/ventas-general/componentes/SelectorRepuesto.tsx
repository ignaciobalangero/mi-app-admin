"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";

interface Props {
  producto: string;
  setProducto: (valor: string) => void;
  setPrecio: (valor: number) => void;
  setMarca: (valor: string) => void;
  setModelo: (valor: string) => void;
  setCategoria: (valor: string) => void;
  setColor: (valor: string) => void;
  setCodigo: (valor: string) => void;
  setMoneda?: (valor: "ARS" | "USD") => void;
  hojaSeleccionada: string;
}

interface ProductoRepuesto {
  id: string;
  producto: string;
  marca?: string;
  modelo?: string;
  categoria?: string;
  cantidad?: number;
  precioUSD?: number;
  proveedor?: string;
  color?: string;
  moneda?: "ARS" | "USD";
  hoja?: string;
}

export default function SelectorRepuesto({
  producto,
  setProducto,
  setPrecio,
  setMarca,
  setModelo,
  setCategoria,
  setColor,
  setCodigo,
  setMoneda,
  hojaSeleccionada,
}: Props) {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [productos, setProductos] = useState<ProductoRepuesto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const { rol } = useRol();
  

  useEffect(() => {
    if (rol?.negocioID) setNegocioID(rol.negocioID);
  }, [rol]);

  useEffect(() => {
    const cargarProductos = async () => {
      if (!negocioID) return;
      const q = query(
        collection(db, `negocios/${negocioID}/stockExtra`),
        where("hoja", "==", hojaSeleccionada)
      );
      const snap = await getDocs(q);
      const lista: ProductoRepuesto[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          producto: data.producto,
          marca: data.marca,
          modelo: data.modelo,
          categoria: data.categoria,
          cantidad: data.cantidad,
          precioUSD: data.precioUSD,
          proveedor: data.proveedor,
          color: data.color,
          moneda: data.moneda,
          hoja: data.hoja,
        };
      });
      setProductos(lista);
    };
    cargarProductos();
  }, [negocioID, hojaSeleccionada]); // 👈 importante incluir hojaSeleccionada

  const productosFiltrados = productos.filter((p) =>
    p.producto?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const seleccionarProducto = (nombre: string) => {
    const seleccionado = productos.find((p) => p.producto === nombre);
    if (!seleccionado) return;

    setProducto(seleccionado.producto);
    setBusqueda(seleccionado.producto);
    setMostrarOpciones(false);
    setPrecio(seleccionado.precioUSD || 0);
    setMarca(seleccionado.categoria || "");
    setModelo(seleccionado.modelo || "");
    setCategoria(seleccionado.hoja || "");
    setColor(seleccionado.color || "");
    setCodigo(seleccionado.id);
    if (setMoneda && seleccionado.moneda) {
      setMoneda(seleccionado.moneda);
    }
  };

  return (
    <div className="relative w-72">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setProducto(e.target.value);
          setMostrarOpciones(true);
        }}
        placeholder="Buscar o escribir repuesto"
        className="p-2 border border-gray-400 rounded w-full"
        onFocus={() => setMostrarOpciones(true)}
        onBlur={() => setTimeout(() => setMostrarOpciones(false), 200)}
      />

      {mostrarOpciones && productosFiltrados.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-400 rounded shadow max-h-60 overflow-auto text-sm">
          {productosFiltrados.map((p, idx) => (
            <li
              key={idx}
              onClick={() => seleccionarProducto(p.producto)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              <strong>{p.producto}</strong>
              <div className="text-gray-600 text-xs mt-1 leading-tight">
                Marca: {p.categoria || "—"} · Modelo: {p.modelo || "—"} · Categoría: {p.hoja || "—"}<br />
                Stock: {p.cantidad ?? "—"} · Precio: ${p.precioUSD?.toLocaleString("es-AR") ?? "—"}<br />
                Proveedor: {p.proveedor || "—"} · Color: {p.color || "—"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
