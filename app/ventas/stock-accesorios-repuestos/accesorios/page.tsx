"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function StockProductosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [cantidad, setCantidad] = useState(1);
  const [cotizacion, setCotizacion] = useState(1000);
  const [productos, setProductos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const obtenerNegocio = async () => {
        const snap = await getDocs(collection(db, "usuarios"));
        snap.forEach((docu) => {
          const data = docu.data();
          if (data.email === user.email && data.negocioID) {
            setNegocioID(data.negocioID);
          }
        });
      };
      obtenerNegocio();
    }
  }, [user]);

  useEffect(() => {
    if (negocioID) cargarProductos();
  }, [negocioID]);

  const cargarProductos = async () => {
    const snap = await getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`));
    const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProductos(lista);
  };

  const guardarProducto = async () => {
    if (!nombre || precio <= 0 || cantidad <= 0) return;
    const data = { nombre, precio, cantidad, moneda, cotizacion };

    if (editandoId) {
      await updateDoc(doc(db, `negocios/${negocioID}/stockAccesorios`, editandoId), data);
      setEditandoId(null);
    } else {
      await addDoc(collection(db, `negocios/${negocioID}/stockAccesorios`), data);
    }

    setNombre("");
    setPrecio(0);
    setCantidad(1);
    setMoneda("ARS");
    cargarProductos();
  };

  const eliminarProducto = async (id: string) => {
    await deleteDoc(doc(db, `negocios/${negocioID}/stockAccesorios`, id));
    cargarProductos();
  };

  const editarProducto = (prod: any) => {
    setNombre(prod.nombre);
    setPrecio(prod.precio);
    setCantidad(prod.cantidad);
    setMoneda(prod.moneda);
    setCotizacion(prod.cotizacion);
    setEditandoId(prod.id);
  };

  const totalPesos = productos.reduce((acc, p) => {
    const valor = p.moneda === "USD" ? p.precio * p.cotizacion : p.precio;
    return acc + valor * p.cantidad;
  }, 0);

  const totalUSD = productos.reduce((acc, p) => {
    const valor = p.moneda === "ARS" ? p.precio / p.cotizacion : p.precio;
    return acc + valor * p.cantidad;
  }, 0);

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-6 text-center">Stock de Accesorios</h1>

        <div className="flex flex-wrap justify-between items-center mb-4 px-2">
          <div className="text-lg font-semibold">Capital en pesos: ${totalPesos.toLocaleString("es-AR")}</div>
          <div className="text-lg font-semibold">Capital en USD: ${totalUSD.toFixed(2)}</div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="p-2 border border-gray-400 rounded w-48" />
          <input type="number" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} placeholder="Precio" className="p-2 border border-gray-400 rounded w-28" />
          <input type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} placeholder="Cantidad" className="p-2 border border-gray-400 rounded w-24" />
          <select value={moneda} onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")} className="p-2 border border-gray-400 rounded w-24">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
          {moneda === "USD" && (
            <input type="number" value={cotizacion} onChange={(e) => setCotizacion(Number(e.target.value))} placeholder="Cotización" className="p-2 border border-gray-400 rounded w-28" />
          )}
          <button onClick={guardarProducto} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            {editandoId ? "Actualizar" : "Agregar"}
          </button>
        </div>

        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-300 text-left">
            <tr>
              <th className="p-2 border border-gray-400">Nombre</th>
              <th className="p-2 border border-gray-400">Precio</th>
              <th className="p-2 border border-gray-400">Cantidad</th>
              <th className="p-2 border border-gray-400">Moneda</th>
              <th className="p-2 border border-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={`border-t border-gray-300 ${p.cantidad === 0 ? "bg-red-100" : p.cantidad <= 3 ? "bg-yellow-100" : "bg-green-100"}`}>
                <td className="p-2 border border-gray-300">{p.nombre}</td>
                <td className="p-2 border border-gray-300">{p.moneda} ${p.precio}</td>
                <td className="p-2 border border-gray-300">{p.cantidad}</td>
                <td className="p-2 border border-gray-300">{p.moneda}</td>
                <td className="p-2 border border-gray-300">
                  <button onClick={() => editarProducto(p)} className="text-blue-600 hover:underline mr-2">Editar</button>
                  <button onClick={() => eliminarProducto(p.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
