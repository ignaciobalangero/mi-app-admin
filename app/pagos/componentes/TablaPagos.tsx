"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PagoConOrigen } from "../page";


interface TablaPagosProps {
  negocioID: string;
  pagos: PagoConOrigen[];
  setPagos: React.Dispatch<React.SetStateAction<PagoConOrigen[]>>;
}


export default function TablaPagos({ negocioID, pagos, setPagos }: TablaPagosProps) {
  const [mensaje, setMensaje] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [pagoAEliminar, setPagoAEliminar] = useState<{ id: string; origen: "pagos" | "pagos" } | null>(null);
  const [pagoEditando, setPagoEditando] = useState<PagoConOrigen | null>(null);
  const [form, setForm] = useState<any>({});

  const obtenerPagos = async () => {
    if (!negocioID) return;
    try {
      const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
      const pagosCargados = pagosSnap.docs.map(doc => ({
        id: doc.id,
        origen: "pagos" as const,
        ...doc.data()
      })) as PagoConOrigen[];

      const ordenados = pagosCargados
      .filter((p) => p.fecha)
      .sort((a, b) => {
        const [diaA, mesA, anioA] = (a.fecha || "").split("/");
        const [diaB, mesB, anioB] = (b.fecha || "").split("/");
    
        const fechaA = new Date(Number(anioA), Number(mesA) - 1, Number(diaA));
        const fechaB = new Date(Number(anioB), Number(mesB) - 1, Number(diaB));
    
        return fechaB.getTime() - fechaA.getTime(); // 👉 más reciente primero
      }); 

      setPagos(ordenados);
    } catch (err) {
      console.error("❌ Error general en obtenerPagos:", err);
    }
  };

  useEffect(() => {
    obtenerPagos();
  }, [negocioID, setPagos]);

  const confirmarEliminar = async () => {
    if (!pagoAEliminar) return;
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/${pagoAEliminar.origen}`, pagoAEliminar.id));
      setMensaje("✅ Pago eliminado");
      obtenerPagos();
    } catch (err) {
      console.error("Error eliminando pago:", err);
    } finally {
      setPagoAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  const abrirEdicion = (pago: PagoConOrigen) => {
    setPagoEditando(pago);
    setForm({
      ...pago,
      fecha: pago.fecha || "", // usamos directamente el string
    });
  };  

  const guardarEdicion = async () => {
    if (!pagoEditando) return;

    try {
      const ref = doc(db, `negocios/${negocioID}/${pagoEditando.origen}`, pagoEditando.id);
      const datosActualizados: any = {
        cliente: form.cliente,
        moneda: form.moneda,
        forma: form.forma,
        destino: form.destino,
        cotizacion: Number(form.cotizacion || 0),
      };

      if (form.moneda === "USD") {
        datosActualizados.montoUSD = Number(form.montoUSD);
        datosActualizados.monto = 0;
      } else {
        datosActualizados.monto = Number(form.monto);
        datosActualizados.montoUSD = 0;
      }

      if (form.fecha) {
        datosActualizados.fecha = Timestamp.fromDate(new Date(form.fecha));
      }

      await updateDoc(ref, datosActualizados);
      setMensaje("✅ Pago editado");
      setPagoEditando(null);
      obtenerPagos();
    } catch (err) {
      console.error("Error editando pago:", err);
    }
  };

  return (
    <>
      {mensaje && (
        <div className="text-green-600 text-center mb-4 font-semibold">{mensaje}</div>
      )}

      {/* Modal de edición */}
      {pagoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-xl max-w-md w-full text-center shadow-xl space-y-4">
            <h2 className="text-lg font-bold">Editar pago</h2>

            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="w-full border p-2 rounded" />
            <input type="text" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} className="w-full border p-2 rounded" placeholder="Cliente" />
            <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))} className="w-full border p-2 rounded">
              <option value="ARS">Pesos</option>
              <option value="USD">Dólares</option>
            </select>
            {form.moneda === "USD" ? (
              <input type="number" value={form.montoUSD} onChange={e => setForm(f => ({ ...f, montoUSD: e.target.value }))} className="w-full border p-2 rounded" placeholder="Monto USD" />
            ) : (
              <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} className="w-full border p-2 rounded" placeholder="Monto $" />
            )}
            <input type="text" value={form.forma} onChange={e => setForm(f => ({ ...f, forma: e.target.value }))} className="w-full border p-2 rounded" placeholder="Forma de pago" />
            <input type="text" value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} className="w-full border p-2 rounded" placeholder="Destino" />
            <input type="number" value={form.cotizacion} onChange={e => setForm(f => ({ ...f, cotizacion: e.target.value }))} className="w-full border p-2 rounded" placeholder="Cotización" />

            <div className="flex justify-end gap-4">
              <button onClick={() => setPagoEditando(null)} className="px-4 py-2 bg-gray-400 text-white rounded">Cancelar</button>
              <button onClick={guardarEdicion} className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="🔍 Filtrar por cliente"
        value={filtroCliente}
        onChange={(e) => setFiltroCliente(e.target.value)}
        className="mb-4 px-3 py-2 border text-black border-gray-400 rounded w-full max-w-sm"
      />

      <table className="w-full bg-white text-black border border-gray-300 mt-2">
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
  {[...pagos]
    .sort((a, b) => {
      const fechaA = a.fecha instanceof Timestamp ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha instanceof Timestamp ? b.fecha.toDate() : new Date(b.fecha);
      return fechaB.getTime() - fechaA.getTime(); // más reciente primero
    })
    .filter(p => (p.cliente || "").toLowerCase().includes(filtroCliente.toLowerCase()))
    .map((pago) => (
      <tr key={`${pago.id}-${pago.origen}`} className="text-center border-t">
        <td className="p-2 border border-gray-300">
      {typeof pago.fecha === "string" ? pago.fecha : "Fecha inválida"}
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
        <td className="border border-gray-300 space-x-2">
          <button
            onClick={() => abrirEdicion(pago)}
            className="text-blue-600 hover:underline"
          >
            Editar
          </button>
          <button
            onClick={() =>
              setPagoAEliminar({ id: pago.id, origen: pago.origen })
            }
            className="text-red-600 hover:underline"
          >
            Eliminar
          </button>
          {pagoAEliminar && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white text-black p-6 rounded-xl max-w-sm w-full text-center shadow-xl space-y-4">
                <p className="text-lg">¿Confirmás eliminar este pago?</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setPagoAEliminar(null)}
                    className="px-4 py-2 bg-gray-400 text-white rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEliminar}
                    className="px-4 py-2 bg-red-600 text-white rounded"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </td>
      </tr>
    ))}
</tbody>

      </table>
    </>
  );
}
