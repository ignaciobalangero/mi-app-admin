"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";

export default function VentaTelefonos() {
  const [fecha, setFecha] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [cliente, setCliente] = useState("");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [gb, setGb] = useState("");
  const [imei, setImei] = useState("");
  const [serie, setSerie] = useState("");
  const [precioCosto, setPrecioCosto] = useState(0);
  const [precioVenta, setPrecioVenta] = useState(0);
  const [ventas, setVentas] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");

  useEffect(() => {
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString("es-AR");
    setFecha(fechaFormateada);
  }, []);

  useEffect(() => {
    if (user) {
      const fetchNegocioID = async () => {
        const snap = await getDocs(collection(db, "usuarios"));
        snap.forEach((docu) => {
          const data = docu.data();
          if (data.email === user.email && data.negocioID) {
            setNegocioID(data.negocioID);
          }
        });
      };
      fetchNegocioID();
    }
  }, [user]);

  useEffect(() => {
    if (negocioID) obtenerVentas();
  }, [negocioID]);

  const obtenerVentas = async () => {
    const querySnapshot = await getDocs(collection(db, `negocios/${negocioID}/ventaTelefonos`));
    const datos = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setVentas(datos);
  };

  const guardarVenta = async () => {
    if (!negocioID) {
      alert("❌ No se pudo identificar el negocio. Por favor, recargá la página.");
      return;
    }

    if (!modelo || !imei || !cliente || precioVenta <= 0) return;

    const nuevaVenta = {
      fecha,
      proveedor,
      cliente,
      modelo,
      color,
      gb,
      imei,
      serie,
      precioCosto,
      precioVenta,
      ganancia: precioVenta - precioCosto,
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, `negocios/${negocioID}/ventaTelefonos`, editandoId), nuevaVenta);
        setEditandoId(null);
      } else {
        await addDoc(collection(db, `negocios/${negocioID}/ventaTelefonos`), nuevaVenta);
      }

      setProveedor("");
      setCliente("");
      setModelo("");
      setColor("");
      setGb("");
      setImei("");
      setSerie("");
      setPrecioCosto(0);
      setPrecioVenta(0);
      obtenerVentas();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const eliminarVenta = async (id: string) => {
    await deleteDoc(doc(db, `negocios/${negocioID}/ventaTelefonos`, id));
    obtenerVentas();
  };

  const editarVenta = (venta: any) => {
    setFecha(venta.fecha);
    setProveedor(venta.proveedor);
    setCliente(venta.cliente);
    setModelo(venta.modelo);
    setColor(venta.color);
    setGb(venta.gb);
    setImei(venta.imei);
    setSerie(venta.serie);
    setPrecioCosto(venta.precioCosto);
    setPrecioVenta(venta.precioVenta);
    setEditandoId(venta.id);
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <div className="mb-4">
          <Link href="/ventas" className="text-blue-600 hover:underline text-sm">
            ← Atrás
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">Venta de Teléfonos</h1>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <input type="text" value={fecha} readOnly className="p-2 border border-gray-400 rounded w-32 bg-gray-200" />
          <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Proveedor" className="p-2 border border-gray-400 rounded w-40" />
          <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente" className="p-2 border border-gray-400 rounded w-40" />
          <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo" className="p-2 border border-gray-400 rounded w-40" />
          <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" className="p-2 border border-gray-400 rounded w-32" />
          <input type="text" value={gb} onChange={(e) => setGb(e.target.value)} placeholder="GB" className="p-2 border border-gray-400 rounded w-20" />
          <input type="text" value={imei} onChange={(e) => setImei(e.target.value)} placeholder="IMEI" className="p-2 border border-gray-400 rounded w-40" />
          <input type="text" value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="N° de serie" className="p-2 border border-gray-400 rounded w-40" />
          <input type="number" value={precioCosto} onChange={(e) => setPrecioCosto(Number(e.target.value))} placeholder="Precio de costo" className="p-2 border border-gray-400 rounded w-32" />
          <input type="number" value={precioVenta} onChange={(e) => setPrecioVenta(Number(e.target.value))} placeholder="Precio de venta" className="p-2 border border-gray-400 rounded w-32" />
          <button onClick={guardarVenta} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            {editandoId ? "Actualizar" : "Guardar"}
          </button>
        </div>

        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-300 text-left">
            <tr>
              <th className="p-2 border border-gray-400">Fecha</th>
              <th className="p-2 border border-gray-400">Proveedor</th>
              <th className="p-2 border border-gray-400">Cliente</th>
              <th className="p-2 border border-gray-400">Modelo</th>
              <th className="p-2 border border-gray-400">Color</th>
              <th className="p-2 border border-gray-400">GB</th>
              <th className="p-2 border border-gray-400">IMEI</th>
              <th className="p-2 border border-gray-400">Serie</th>
              <th className="p-2 border border-gray-400">Costo</th>
              <th className="p-2 border border-gray-400">Venta</th>
              <th className="p-2 border border-gray-400">Ganancia</th>
              <th className="p-2 border border-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-t border-gray-300">
                <td className="p-2 border border-gray-300">{v.fecha}</td>
                <td className="p-2 border border-gray-300">{v.proveedor}</td>
                <td className="p-2 border border-gray-300">{v.cliente}</td>
                <td className="p-2 border border-gray-300">{v.modelo}</td>
                <td className="p-2 border border-gray-300">{v.color}</td>
                <td className="p-2 border border-gray-300">{v.gb}</td>
                <td className="p-2 border border-gray-300">{v.imei}</td>
                <td className="p-2 border border-gray-300">{v.serie}</td>
                <td className="p-2 border border-gray-300">${v.precioCosto?.toLocaleString("es-AR")}</td>
                <td className="p-2 border border-gray-300">${v.precioVenta?.toLocaleString("es-AR")}</td>
                <td className="p-2 border border-gray-300">${(v.precioVenta - v.precioCosto)?.toLocaleString("es-AR")}</td>
                <td className="p-2 border border-gray-300">
                  <button onClick={() => editarVenta(v)} className="text-blue-600 hover:underline mr-2">Editar</button>
                  <button onClick={() => eliminarVenta(v.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
