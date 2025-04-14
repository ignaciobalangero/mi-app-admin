"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import Link from "next/link";

export default function Pagos() {
  const [cliente, setCliente] = useState("");
  const [monto, setMonto] = useState(0);
  const [forma, setForma] = useState("");
  const [destino, setDestino] = useState("");
  const [pagos, setPagos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const obtenerPagos = async () => {
    const querySnapshot = await getDocs(collection(db, "pagos"));
    const datos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    setPagos(
      datos.sort((a, b) => {
        const fechaA = a.fecha?.seconds ? new Date(a.fecha.seconds * 1000) : new Date(a.fecha);
        const fechaB = b.fecha?.seconds ? new Date(b.fecha.seconds * 1000) : new Date(b.fecha);
        return fechaB.getTime() - fechaA.getTime();
      })
    );
  };

  useEffect(() => {
    obtenerPagos();
  }, []);

  const guardarPago = async () => {
    if (!cliente || monto <= 0 || !forma || !destino) return;

    const nuevoPago = {
      fecha: format(new Date(), "yyyy-MM-dd"),
      cliente,
      monto,
      forma,
      destino,
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, "pagos", editandoId), nuevoPago);
        setEditandoId(null);
      } else {
        await addDoc(collection(db, "pagos"), nuevoPago);
      }
      setCliente("");
      setMonto(0);
      setForma("");
      setDestino("");
      obtenerPagos();
    } catch (error) {
      console.error("Error al guardar el pago:", error);
    }
  };

  const eliminarPago = async (id: string) => {
    try {
      await deleteDoc(doc(db, "pagos", id));
      obtenerPagos();
    } catch (error) {
      console.error("Error al eliminar el pago:", error);
    }
  };

  const editarPago = (pago: any) => {
    setCliente(pago.cliente);
    setMonto(pago.monto);
    setForma(pago.forma);
    setDestino(pago.destino);
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
            name="nombreCliente"
            id="nombreCliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Cliente"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="border-2 border-gray-400 text-black placeholder:text-gray-600 p-2 rounded w-1/4"
          />
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            placeholder="Monto"
            className="border-2 border-gray-400 text-black placeholder:text-gray-600 p-2 rounded w-1/4"
          />
          <input
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            placeholder="Forma de pago"
            className="border-2 border-gray-400 text-black placeholder:text-gray-600 p-2 rounded w-1/4"
          />
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Destino"
            className="border-2 border-gray-400 text-black placeholder:text-gray-600 p-2 rounded w-1/4"
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

        <table className="w-full bg-white text-black">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2">Fecha</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Forma</th>
              <th>Destino</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id} className="text-center border-b">
                <td className="p-2">
                  {pago.fecha?.seconds
                    ? new Date(pago.fecha.seconds * 1000).toLocaleDateString("es-AR")
                    : pago.fecha}
                </td>
                <td>{pago.cliente}</td>
                <td>${pago.monto.toLocaleString("es-AR")}</td>
                <td>{pago.forma}</td>
                <td>{pago.destino}</td>
                <td>
                  <button onClick={() => editarPago(pago)} className="text-yellow-600 hover:underline mr-2">
                    Editar
                  </button>
                  <button onClick={() => eliminarPago(pago.id)} className="text-red-600 hover:underline">
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
