"use client";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth";

interface Trabajo {
  id: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  estado: string;
  fecha: string;
  fechaEntrega?: string;
  firebaseId: string;
}

export default function Entregados() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState<Trabajo | null>(null);

  const cargarTrabajos = async () => {
    const q = query(collection(db, "trabajos"), where("estado", "==", "ENTREGADO"));
    const querySnapshot = await getDocs(q);
    const datos: Trabajo[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Trabajo, "firebaseId">;
      datos.push({ ...data, firebaseId: docSnap.id });
    });

    const ordenados = datos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    setTrabajos(ordenados);
  };

  const guardarCambios = async () => {
    if (!editando) return;

    const { firebaseId, ...resto } = editando;
    const docRef = doc(db, "trabajos", firebaseId);
    await updateDoc(docRef, resto);
    setEditando(null);
    await cargarTrabajos();
  };

  const eliminarTrabajo = async (id: string) => {
    await deleteDoc(doc(db, "trabajos", id));
    await cargarTrabajos();
  };

  useEffect(() => {
    cargarTrabajos();
  }, []);

  const trabajosFiltrados = trabajos.filter(
    (t) =>
      t.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      t.modelo.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <RequireAuth>
      <Header />
      <div className="pt-20 min-h-screen bg-gray-100 text-black p-8">
        <h1 className="text-4xl font-bold mb-6 text-center">Trabajos entregados</h1>

        <input
          type="text"
          placeholder="Filtrar por cliente o modelo..."
          className="mb-6 w-full max-w-md mx-auto block p-3 border border-gray-400 rounded-lg"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />

        <div className="overflow-x-auto max-w-6xl mx-auto">
          <table className="w-full table-auto border-collapse bg-white rounded shadow">
            <thead>
              <tr className="bg-gray-300 text-left">
                <th className="p-3 border-r">Fecha ingreso</th>
                <th className="p-3 border-r">Cliente</th>
                <th className="p-3 border-r">Modelo</th>
                <th className="p-3 border-r">Trabajo</th>
                <th className="p-3 border-r">Clave</th>
                <th className="p-3 border-r">Observaciones</th>
                <th className="p-3 border-r">Fecha entrega</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {trabajosFiltrados.map((t) => (
                <tr key={t.firebaseId} className="border-t border-gray-300 hover:bg-gray-100 transition">
                  <td className="p-3 border-r">{t.fecha}</td>
                  <td className="p-3 border-r">{t.cliente}</td>
                  <td className="p-3 border-r">{t.modelo}</td>
                  <td className="p-3 border-r">{t.trabajo}</td>
                  <td className="p-3 border-r">{t.clave}</td>
                  <td className="p-3 border-r">{t.observaciones}</td>
                  <td className="p-3 border-r">{t.fechaEntrega || "-"}</td>
                  <td className="p-3 flex flex-col gap-2">
                    <button
                      onClick={() => setEditando(t)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarTrabajo(t.firebaseId)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {trabajosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    No hay trabajos entregados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editando && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white text-black p-6 rounded-lg shadow max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Editar trabajo</h2>
              <input
                className="w-full border p-2 mb-2 rounded"
                value={editando.cliente}
                onChange={(e) => setEditando({ ...editando, cliente: e.target.value })}
                placeholder="Cliente"
              />
              <input
                className="w-full border p-2 mb-2 rounded"
                value={editando.modelo}
                onChange={(e) => setEditando({ ...editando, modelo: e.target.value })}
                placeholder="Modelo"
              />
              <input
                className="w-full border p-2 mb-2 rounded"
                value={editando.trabajo}
                onChange={(e) => setEditando({ ...editando, trabajo: e.target.value })}
                placeholder="Trabajo"
              />
              <input
                className="w-full border p-2 mb-2 rounded"
                value={editando.clave}
                onChange={(e) => setEditando({ ...editando, clave: e.target.value })}
                placeholder="Clave"
              />
              <input
                className="w-full border p-2 mb-4 rounded"
                value={editando.observaciones}
                onChange={(e) => setEditando({ ...editando, observaciones: e.target.value })}
                placeholder="Observaciones"
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setEditando(null)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCambios}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
