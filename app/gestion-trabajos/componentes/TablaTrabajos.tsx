"use client";

import { useRouter } from "next/navigation";
import { DollarSign } from "lucide-react";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore"; // ✅ Importamos updateDoc y doc
import { db } from "@/lib/firebase"; // ✅ Importamos db
import { useEffect } from "react";

interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  observaciones?: string;
  precio?: number;
  estado: string;
  estadoCuentaCorriente?: "pendiente" | "pagado"; // ✅ Agregado campo opcional
}

interface TablaProps {
  trabajos: Trabajo[];
  cambiarEstado: (firebaseId: string, nuevoEstado: string) => void;
  eliminarTrabajo: (firebaseId: string) => void;
  onPagar: (trabajo: Trabajo) => void;
  router: ReturnType<typeof useRouter>;
  negocioID: string; // ✅ Agregado prop negocioID
  recargarTrabajos: () => Promise<void>; 
}

export default function TablaTrabajos({
  trabajos,
  cambiarEstado,
  eliminarTrabajo,
  onPagar,
  router,
  negocioID,
  recargarTrabajos, // ✅ Lo recibimos
}: TablaProps) {
  const obtenerClaseEstado = (trabajo: Trabajo) => {
    if (trabajo.estadoCuentaCorriente === "pagado") return "bg-blue-100"; // Azul
    if (trabajo.estado === "ENTREGADO") return "bg-green-100"; // Verde
    if (trabajo.estado === "REPARADO") return "bg-yellow-100"; // Amarillo
    return "bg-red-100"; // Rojo por defecto (Pendiente)
  };
  
  

  const manejarClickEditar = (id: string) => {
    router.push(`/gestion-trabajos/editar?id=${id}`);
  };

  const [pagina, setPagina] = useState(1);
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<Trabajo | null>(null);
  const [modalConfirmarPagoVisible, setModalConfirmarPagoVisible] = useState(false); // ✅ Nuevo
  const [trabajoAConfirmarPago, setTrabajoAConfirmarPago] = useState<Trabajo | null>(null); // ✅ Nuevo

  const abrirModalConfirmarPago = (trabajo: Trabajo) => {
    setTrabajoAConfirmarPago(trabajo);
    setModalConfirmarPagoVisible(true);
  };

  const confirmarPago = async () => {
    if (!trabajoAConfirmarPago) return;
    try {
      const ref = doc(db, `negocios/${negocioID}/trabajos/${trabajoAConfirmarPago.firebaseId}`);
      await updateDoc(ref, { estadoCuentaCorriente: "pagado" });
      setModalConfirmarPagoVisible(false);
      setTrabajoAConfirmarPago(null);
      alert("✅ Trabajo marcado como pagado correctamente.");
    } catch (error) {
      console.error("Error marcando como pagado:", error);
      alert("❌ No se pudo marcar como pagado.");
    }
  };

  const itemsPorPagina = 40;
  const trabajosPaginados = trabajos.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);
  const totalPaginas = Math.ceil(trabajos.length / itemsPorPagina);

  useEffect(() => {
    const listener = () => {
      recargarTrabajos();
    };
    window.addEventListener("trabajosActualizados", listener);
    return () => window.removeEventListener("trabajosActualizados", listener);
  }, []);


  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse text-sm bg-white rounded shadow">
        <thead className="bg-gray-300">
          <tr>
            <th className="p-2 border">Fecha</th>
            <th className="p-2 border">Cliente</th>
            <th className="p-2 border">Modelo</th>
            <th className="p-2 border">Trabajo</th>
            <th className="p-2 border">Observaciones</th>
            <th className="p-2 border">Precio</th>
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {trabajosPaginados.map((t) => (
            <tr key={t.firebaseId} className={obtenerClaseEstado(t)}>
              <td className="p-2 border">{t.fecha}</td>
              <td className="p-2 border">{t.cliente}</td>
              <td className="p-2 border">{t.modelo}</td>
              <td className="p-2 border">{t.trabajo}</td>
              <td className="p-2 border">{t.observaciones || "-"}</td>
              <td className="p-2 border">${t.precio}</td>
              <td className="p-2 border font-semibold">{t.estado}</td>
              <td className="p-2 border">
  <div className="flex flex-col gap-1">
  <select
    value={t.estadoCuentaCorriente === "pagado" ? "PAGADO" : t.estado}
    onChange={async (e) => {
      const nuevoEstado = e.target.value;
      const ref = doc(db, `negocios/${negocioID}/trabajos/${t.firebaseId}`);
      const updates: any = {};

      if (nuevoEstado === "PAGADO") {
        updates.estadoCuentaCorriente = "pagado";
        updates.estado = "ENTREGADO"; // o dejá el último estado anterior
      } else {
        updates.estado = nuevoEstado;
        if (t.estadoCuentaCorriente === "pagado") {
          updates.estadoCuentaCorriente = "pendiente"; // opcional
        }
      }

      await updateDoc(ref, updates);
      await recargarTrabajos();
    }}
    className="p-1 border rounded w-full"
  >
    <option value="PENDIENTE">Pendiente</option>
    <option value="REPARADO">Reparado</option>
    <option value="ENTREGADO">Entregado</option>
    <option value="PAGADO">Pagado</option>
  </select>

    <div className="flex flex-wrap gap-1 mt-1">
      <button
        onClick={() => manejarClickEditar(t.firebaseId)}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
      >
        Editar
      </button>
      <button
        onClick={() => eliminarTrabajo(t.firebaseId)}
        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
      >
        Eliminar
      </button>
      <button
        onClick={() => onPagar(t)}
        className="bg-green-700 hover:bg-green-800 text-white px-2 py-1 rounded text-xs"
      >
        Pagar
      </button>
      <button
        onClick={() => setTrabajoSeleccionado(t)}
        className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
      >
        Ver más
      </button>
    </div>
  </div>
</td>


            </tr>
          ))}
        </tbody>
      </table>

      {trabajoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-xl max-w-lg w-full shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Detalle del Trabajo</h2>
            <p><strong>Cliente:</strong> {trabajoSeleccionado.cliente}</p>
            <p><strong>Modelo:</strong> {trabajoSeleccionado.modelo}</p>
            <p><strong>Trabajo:</strong> {trabajoSeleccionado.trabajo}</p>
            <p><strong>Precio:</strong> ${trabajoSeleccionado.precio}</p>
            <p><strong>Estado:</strong> {trabajoSeleccionado.estado}</p>
            <p><strong>Observaciones:</strong> {trabajoSeleccionado.observaciones || "-"}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setTrabajoSeleccionado(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConfirmarPagoVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-xl max-w-md w-full shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Confirmar Pago</h2>
            <p className="mb-6">¿Seguro que querés marcar este trabajo como pagado?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalConfirmarPagoVisible(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPago}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setPagina(num)}
              className={`px-4 py-2 rounded ${
                pagina === num ? "bg-blue-600 text-white" : "bg-gray-300 text-black"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
