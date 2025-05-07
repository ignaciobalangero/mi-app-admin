"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PagoConOrigen } from "../page";

interface PagoConFecha extends PagoConOrigen {
  fechaParseada: Date | null;
}

interface TablaPagosProps {
  negocioID: string;
  pagos: PagoConFecha[];
  setPagos: React.Dispatch<React.SetStateAction<PagoConFecha[]>>;
}

// ✅ Mover fuera del componente
function parseFecha(fecha: any): Date | null {
  if (fecha instanceof Date) return fecha;

  if (fecha?.seconds) return new Date(fecha.seconds * 1000);

  if (typeof fecha === "string") {
    const partes = fecha.split(/[\/\-]/); // Soporta "24/04/2025" o "24-04-2025"
    if (partes.length === 3) {
      const [dia, mes, anio] = partes.map(Number);
      if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio)) {
        return new Date(anio, mes - 1, dia); // enero = 0
      }
    }
  }

  if (typeof fecha === "number") return new Date(fecha);

  return null;
}

export default function TablaPagos({ negocioID, pagos, setPagos }: TablaPagosProps) {
  const [mensaje, setMensaje] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [pagoAEliminar, setPagoAEliminar] = useState<{ id: string; origen: "pagos" | "pagoClientes" } | null>(null);

  useEffect(() => {
    const obtenerPagos = async () => {
      if (!negocioID) return;
      console.log("📌 Cargando pagos para negocioID:", negocioID);

      try {
        const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
        console.log("📦 pagosSnap.docs.length:", pagosSnap.docs.length);

        const pagosCargados = pagosSnap.docs.map(doc => ({
          id: doc.id,
          origen: "pagos" as const,
          ...doc.data()
        })) as PagoConOrigen[];

        let pagosExtras: PagoConOrigen[] = [];
        try {
          const pagosExtraSnap = await getDocs(collection(db, `negocios/${negocioID}/pagoClientes`));
          console.log("📦 pagosExtraSnap.docs.length:", pagosExtraSnap.docs.length);

          pagosExtras = pagosExtraSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              fecha: data.fecha,
              cliente: data.cliente,
              monto: data.monto,
              montoUSD: data.montoUSD,
              moneda: data.moneda,
              forma: data.forma,
              destino: data.destino,
              cotizacion: data.cotizacion,
              origen: "pagoClientes" as const,
            };
          });
        } catch (e) {
          console.error("❌ Error al leer /pagoClientes:", e);
        }

        const todos: PagoConFecha[] = [...pagosCargados, ...pagosExtras].map(p => ({
          ...p,
          fechaParseada: parseFecha(p.fecha)
        }));

        const ordenados = todos
          .filter(p => p.fechaParseada)
          .sort((a, b) => b.fechaParseada!.getTime() - a.fechaParseada!.getTime());

        console.log("✅ Total pagos ordenados:", ordenados.length);
        setPagos(ordenados);
        setMensaje("✅ Pagos actualizados correctamente");
        setTimeout(() => setMensaje(""), 2000);
      } catch (err) {
        console.error("❌ Error general en obtenerPagos:", err);
      }
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

      <input
        type="text"
        placeholder="🔍 Filtrar por cliente"
        value={filtroCliente}
        onChange={(e) => setFiltroCliente(e.target.value)}
        className="mb-4 px-3 py-2 border border-gray-400 rounded w-full max-w-sm"
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
          {pagos
            .filter(p => p.cliente?.toLowerCase().includes(filtroCliente.toLowerCase()))
            .map((pago) => (
              <tr key={pago.id} className="text-center border-t">
                <td className="p-2 border border-gray-300">
                  {pago.fechaParseada
                    ? pago.fechaParseada.toLocaleDateString("es-AR")
                    : "Fecha inválida"}
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
