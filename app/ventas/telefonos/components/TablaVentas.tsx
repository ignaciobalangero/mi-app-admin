"use client";

import { useEffect, useState } from "react";
import { deleteDoc, doc, getDocs, collection, getDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";


interface Props {
  negocioID: string;
  onEditar: (venta: any) => void;
  ventas: any[];
  setVentas: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function TablaVentas({ negocioID, onEditar, ventas, setVentas }: Props) {
  const [ventaAEliminar, setVentaAEliminar] = useState<any | null>(null);
  const [mensaje, setMensaje] = useState("");
  const { rol } = useRol();

  const confirmarEliminacion = async () => {
    if (!ventaAEliminar) return;

    try {
      // 🔁 Revertimos el stock si el modelo e imei coinciden
      const stockSnap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const yaExiste = stockSnap.docs.some((docu) => {
        const data = docu.data();
        return data.modelo === ventaAEliminar.modelo && data.imei === ventaAEliminar.imei;
      });

      if (!yaExiste) {
        await addDoc(collection(db, `negocios/${negocioID}/stockTelefonos`), {
          proveedor: ventaAEliminar.proveedor,
          modelo: ventaAEliminar.modelo,
          marca: ventaAEliminar.marca || "",
          estado: ventaAEliminar.estado,
          bateria: ventaAEliminar.bateria,
          color: ventaAEliminar.color,
          gb: ventaAEliminar.gb,
          imei: ventaAEliminar.imei,
          serial: ventaAEliminar.serie,
          precioCompra: ventaAEliminar.precioCosto,
          precioVenta: ventaAEliminar.precioVenta,
          fechaIngreso: ventaAEliminar.fecha,
        });
      }

      await deleteDoc(doc(db, `negocios/${negocioID}/ventaTelefonos/${ventaAEliminar.id}`));

      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/ventaTelefonos`));
      const nuevasVentas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVentas(nuevasVentas);
      setMensaje("✅ Venta eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar venta:", error);
    } finally {
      setVentaAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  return (
    <>
      {mensaje && (
        <div className="text-green-600 text-center mb-4 font-semibold">{mensaje}</div>
      )}

      {ventaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-xl max-w-sm w-full text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              ¿Estás seguro que querés eliminar esta venta?
            </h2>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setVentaAEliminar(null)}
                className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-gray-300 text-left">
          <tr>
            <th className="p-2 border border-gray-400">Fecha</th>
            <th className="p-2 border border-gray-400">Proveedor</th>
            <th className="p-2 border border-gray-400">Cliente</th>
            <th className="p-2 border border-gray-400">Modelo</th>
            <th className="p-2 border border-gray-400">Color</th>
            <th className="p-2 border border-gray-400">Batería</th>
            <th className="p-2 border border-gray-400">GB</th>
            <th className="p-2 border border-gray-400">IMEI</th>
            <th className="p-2 border border-gray-400">Serie</th>
             {rol?.tipo === "admin" && (
            <th className="p-2 border border-gray-400">Costo</th>
            )} 
            <th className="p-2 border border-gray-400">Venta</th>
            <th className="p-2 border border-gray-400">Monto Entregado</th>
            <th className="p-2 border border-gray-400">Moneda</th>
             {rol?.tipo === "admin" && (
            <th className="p-2 border border-gray-400">Ganancia</th>
           )}
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
              <td className="p-2 border border-gray-300">{v.bateria}</td>
              <td className="p-2 border border-gray-300">{v.gb}</td>
              <td className="p-2 border border-gray-300">{v.imei}</td>
              <td className="p-2 border border-gray-300">{v.serie}</td>
              <td className="p-2 border border-gray-300">${v.precioCosto?.toLocaleString("es-AR")}</td>
              <td className="p-2 border border-gray-300">${v.precioVenta?.toLocaleString("es-AR")}</td>
              <td className="p-2 border border-gray-300">{v.montoEntregado ? v.montoEntregado : "-"}</td>
              <td className="p-2 border border-gray-300">{v.monedaEntregado || "-"}</td>
              <td className="p-2 border border-gray-300">${(v.precioVenta - v.precioCosto)?.toLocaleString("es-AR")}</td>
              <td className="p-2 border border-gray-300">
                <button onClick={() => onEditar(v)} className="text-blue-600 hover:underline mr-2">Editar</button>
                <button onClick={() => setVentaAEliminar(v)} className="text-red-600 hover:underline">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
