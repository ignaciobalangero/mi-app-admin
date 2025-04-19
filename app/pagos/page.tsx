// Página de Pagos con soporte para Pesos y Dólares
"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Pagos() {
  const [cliente, setCliente] = useState("");
  const [monto, setMonto] = useState(0);
  const [forma, setForma] = useState("");
  const [destino, setDestino] = useState("");
  const [moneda, setMoneda] = useState("ARS");
  const [cotizacion, setCotizacion] = useState(1000);
  const [pagos, setPagos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");

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

  const obtenerPagos = async () => {
    if (!negocioID) return;
    const querySnapshot = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
    const datos = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
    setPagos(
      datos.sort((a, b) => {
        const fechaA = a.fecha?.seconds ? new Date(a.fecha.seconds * 1000) : new Date(a.fecha);
        const fechaB = b.fecha?.seconds ? new Date(b.fecha.seconds * 1000) : new Date(b.fecha);
        return fechaB.getTime() - fechaA.getTime();
      })
    );
  };

  useEffect(() => {
    if (negocioID) obtenerPagos();
  }, [negocioID]);

  const guardarPago = async () => {
    if (!cliente || monto <= 0 || !forma) return;

    const nuevoPago = {
      fecha: format(new Date(), "yyyy-MM-dd"),
      cliente,
      monto: moneda === "USD" ? monto * cotizacion : monto,
      forma,
      destino,
      moneda,
      cotizacion,
      montoUSD: moneda === "USD" ? monto : null,
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, `negocios/${negocioID}/pagos`, editandoId), nuevoPago);
        setEditandoId(null);
      } else {
        await addDoc(collection(db, `negocios/${negocioID}/pagos`), nuevoPago);
      }
      setCliente("");
      setMonto(0);
      setForma("");
      setDestino("");
      setMoneda("ARS");
      obtenerPagos();
    } catch (error) {
      console.error("Error al guardar el pago:", error);
    }
  };

  const eliminarPago = async (id: string) => {
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/pagos`, id));
      obtenerPagos();
    } catch (error) {
      console.error("Error al eliminar el pago:", error);
    }
  };

  const editarPago = (pago: any) => {
    setCliente(pago.cliente);
    setMonto(pago.moneda === "USD" ? pago.montoUSD : pago.monto);
    setForma(pago.forma);
    setDestino(pago.destino || "");
    setMoneda(pago.moneda || "ARS");
    setCotizacion(pago.cotizacion || 1000);
    setEditandoId(pago.id);
  };

  return (
    <>
      <Header />
      <main className="pt-28 p-4 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-4 text-black">Pagos de clientes</h1>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Cliente"
            className="border-2 border-gray-400 text-black p-2 rounded w-1/5"
          />
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            placeholder="Monto"
            className="border-2 border-gray-400 text-black p-2 rounded w-1/5"
          />
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="border-2 border-gray-400 text-black p-2 rounded w-1/6"
          >
            <option value="ARS">Pesos</option>
            <option value="USD">Dólares</option>
          </select>
          <input
            type="number"
            value={cotizacion}
            onChange={(e) => setCotizacion(Number(e.target.value))}
            placeholder="Cotización"
            className="border-2 border-gray-400 text-black p-2 rounded w-1/6"
          />
          <input
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            placeholder="Forma de pago"
            className="border-2 border-gray-400 text-black p-2 rounded w-1/5"
          />
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Destino"
            className="border-2 border-gray-400 text-black p-2 rounded w-1/5"
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={guardarPago} className="bg-blue-600 text-white px-4 py-2 rounded">
            {editandoId ? "Actualizar" : "Guardar pago"}
          </button>

          <Link
            href="/cuenta"
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            Ir a Cuenta Corriente
          </Link>
        </div>

        <table className="w-full bg-white text-black border border-gray-300">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2 border border-gray-400">Fecha</th>
              <th className="p-2 border border-gray-400">Cliente</th>
              <th className="p-2 border border-gray-400">Monto</th>
              <th className="p-2 border border-gray-400">Moneda</th>
              <th className="p-2 border border-gray-400">Forma</th>
              <th className="p-2 border border-gray-400">Destino</th>
              <th className="p-2 border border-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id} className="text-center border-t">
                <td className="p-2 border border-gray-300">
                  {pago.fecha?.seconds
                    ? new Date(pago.fecha.seconds * 1000).toLocaleDateString("es-AR")
                    : pago.fecha}
                </td>
                <td className="border border-gray-300">{pago.cliente}</td>
                <td className="border border-gray-300">
                  ${pago.monto.toLocaleString("es-AR")}
                  {pago.moneda === "USD" && (
                    <span className="text-xs text-gray-500 ml-2">
                      (USD {pago.montoUSD})
                    </span>
                  )}
                </td>
                <td className="border border-gray-300">{pago.moneda}</td>
                <td className="border border-gray-300">{pago.forma}</td>
                <td className="border border-gray-300">{pago.destino}</td>
                <td className="border border-gray-300">
                  <button
                    onClick={() => editarPago(pago)}
                    className="text-yellow-600 hover:underline mr-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarPago(pago.id)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
