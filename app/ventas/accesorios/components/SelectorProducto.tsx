"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRol } from "@/lib/useRol";

interface Props {
  producto: string;
  setProducto: (valor: string) => void;
  setPrecio: (valor: number) => void;
  setMarca: (valor: string) => void;
  setCategoria: (valor: string) => void;
  setColor: (valor: string) => void;
  setCodigo: (valor: string) => void;
  setMoneda?: (valor: "ARS" | "USD") => void;
}

interface ProductoStock {
  id: string;
  nombre: string;
  marca?: string;
  categoria?: string;
  cantidad?: number;
  precioVenta?: number;
  proveedor?: string;
  color?: string;
  moneda?: "ARS" | "USD";
}

export default function SelectorProducto({
  producto,
  setProducto,
  setPrecio,
  setMarca,
  setCategoria,
  setColor,
  setCodigo,
  setMoneda,
}: Props) {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const { rol } = useRol();

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);
  

  useEffect(() => {
    const cargarProductos = async () => {
      if (!negocioID) return;
      const snap = await getDocs(
        collection(db, `negocios/${negocioID}/stockAccesorios`)
      );
      const lista: ProductoStock[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.producto) {
          lista.push({
            id: doc.id,
            nombre: data.producto,
            marca: data.marca,
            categoria: data.categoria,
            cantidad: data.cantidad,
            precioVenta: data.precioVenta,
            proveedor: data.proveedor,
            color: data.color,
            moneda: data.moneda,
          });
        }
      });
      setProductos(lista);
    };
    cargarProductos();
  }, [negocioID]);

  const productosFiltrados = productos.filter((p) =>
    p.nombre?.toLowerCase().trim().includes(busqueda.toLowerCase().trim())
  );

  const seleccionarProducto = (nombre: string) => {
    const seleccionado = productos.find((p) => p.nombre === nombre);
    if (!seleccionado) return;

    setProducto(seleccionado.nombre);
    setBusqueda(seleccionado.nombre);
    setMostrarOpciones(false);
    setPrecio(seleccionado.precioVenta || 0);
    setMarca(seleccionado.marca || "");
    setCategoria(seleccionado.categoria || "");
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
        placeholder="Buscar o escribir producto"
        className="p-2 border border-gray-400 rounded w-full"
        onFocus={() => setMostrarOpciones(true)}
        onBlur={() => setTimeout(() => setMostrarOpciones(false), 200)}
      />

      {mostrarOpciones && productosFiltrados.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-400 rounded shadow max-h-60 overflow-auto text-sm">
          {productosFiltrados.map((p, idx) => (
            <li
              key={idx}
              onClick={() => seleccionarProducto(p.nombre)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              <strong>{p.nombre}</strong>
              <div className="text-gray-600 text-xs mt-1 leading-tight">
                Marca: {p.marca || "—"} · Categoría: {p.categoria || "—"}<br />
                Stock: {p.cantidad ?? "—"} · Precio: ${p.precioVenta?.toLocaleString("es-AR") ?? "—"}<br />
                Proveedor: {p.proveedor || "—"} · Color: {p.color || "—"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
