"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PagoConOrigen } from "../page";

interface TablaPagosProps {
  negocioID: string;
  pagos: PagoConOrigen[];
  setPagos: React.Dispatch<React.SetStateAction<PagoConOrigen[]>>;
}

export default function TablaPagos({ negocioID, pagos, setPagos }: TablaPagosProps) {
  const [mensaje, setMensaje] = useState("");
  const [pagoAEliminar, setPagoAEliminar] = useState<{ id: string; origen: "pagos" | "pagoClientes" } | null>(null);

  useEffect(() => {
    const obtenerPagos = async () => {
      if (!negocioID) return;

      const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
      const pagosCargados = pagosSnap.docs.map(doc => ({
        id: doc.id,
        origen: "pagos",
        ...doc.data()
      })) as PagoConOrigen[];

      const pagosExtraSnap = await getDocs(collection(db, `negocios/${negocioID}/pagoClientes`));
      const pagosExtras = pagosExtraSnap.docs.map(doc => ({
        id: doc.id,
        origen: "pagoClientes",
        ...doc.data()
      })) as PagoConOrigen[];

      const todos = [...pagosCargados, ...pagosExtras];
      const ordenados = todos.sort((a, b) => {
        const fechaA = a.fecha?.seconds ? new Date(a.fecha.seconds * 1000) : new Date(a.fecha);
        const fechaB = b.fecha?.seconds ? new Date(b.fecha.seconds * 1000) : new Date(b.fecha);
        return fechaB.getTime() - fechaA.getTime();
      });

      setPagos(ordenados);
      setMensaje("✅ Pagos actualizados correctamente");
      setTimeout(() => setMensaje(""), 2000);
    };

    obtenerPagos();
  }, [negocioID, setPagos]);

  const confirmarEliminar = async () => {
    if (!pagoAEliminar) return;
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/${pagoAEliminar.origen}`, pagoAEliminar.id));
      setPagos((prev) => prev.filter((p) => p.id !== pagoAEliminar.id));
      setMensaje("✅ Pago eliminado");
    } catch (err) {
      console.error("Error eliminando pago:", err);
    } finally {
      setPagoAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  return (
    <>
      {mensaje && (
        <div className="text-green-600 text-center mb-4 font-semibold">{mensaje}</div>
      )}

      {pagoAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-xl max-w-sm w-full text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              ¿Estás seguro que querés eliminar este pago?
            </h2>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setPagoAEliminar(null)}
                className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="w-full bg-white text-black border border-gray-300 mt-6">
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
  {(() => {
    if (pago.fecha instanceof Date) {
      return pago.fecha.toLocaleDateString("es-AR");
    }

    if (pago.fecha?.seconds) {
      const fechaLocal = new Date(pago.fecha.seconds * 1000);
      fechaLocal.setHours(fechaLocal.getHours() + 3); // 👈 ajuste por zona horaria
      return fechaLocal.toLocaleDateString("es-AR");
    }

    const fechaLocal = new Date(pago.fecha);
    fechaLocal.setHours(fechaLocal.getHours() + 3);
    return fechaLocal.toLocaleDateString("es-AR");
  })()}
</td>



              <td className="border border-gray-300">{pago.cliente}</td>
              <td className="border border-gray-300">
                {pago.moneda === "USD"
                  ? `USD ${pago.montoUSD}`
                  : `$${pago.monto}`}
              </td>
              <td className="border border-gray-300">{pago.moneda}</td>
              <td className="border border-gray-300">{pago.forma}</td>
              <td className="border border-gray-300">{pago.destino}</td>
              <td className="border border-gray-300">
                <button
                  onClick={() => setPagoAEliminar({ id: pago.id, origen: pago.origen })}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
