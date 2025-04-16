"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { auth } from "@/lib/auth";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth";
import { useAuthState } from "react-firebase-hooks/auth";

interface Trabajo {
  id: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  estado: string;
  fecha: string;
  firebaseId: string;
}

export default function Pendientes() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Trabajo>>({});
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");

  useEffect(() => {
    if (user) {
      const fetchNegocioID = async () => {
        const snap = await getDocs(query(collection(db, "usuarios"), where("email", "==", user.email)));
        snap.forEach((docu) => {
          const data = docu.data();
          if (data.negocioID) {
            setNegocioID(data.negocioID);
          }
        });
      };
      fetchNegocioID();
    }
  }, [user]);

  const cargarTrabajos = async () => {
    if (!negocioID) return;
    const q = query(collection(db, `negocios/${negocioID}/trabajos`), where("estado", "==", "PENDIENTE"));
    const querySnapshot = await getDocs(q);
    const datos: Trabajo[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Trabajo, "firebaseId">;
      datos.push({ ...data, firebaseId: docSnap.id });
    });

    const ordenados = datos.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    setTrabajos(ordenados);
  };

  const marcarComoEntregado = async (firebaseId: string) => {
    const docRef = doc(db, `negocios/${negocioID}/trabajos`, firebaseId);
    const fechaEntrega = new Date().toLocaleDateString("es-AR");
    await updateDoc(docRef, { estado: "ENTREGADO", fechaEntrega });
    await cargarTrabajos();
  };

  const eliminarTrabajo = async (id: string) => {
    await deleteDoc(doc(db, `negocios/${negocioID}/trabajos`, id));
    await cargarTrabajos();
  };

  const guardarEdicion = async () => {
    if (!editandoId) return;
    await updateDoc(doc(db, `negocios/${negocioID}/trabajos`, editandoId), formData);
    setEditandoId(null);
    setFormData({});
    await cargarTrabajos();
  };

  const trabajosFiltrados = trabajos.filter(
    (t) =>
      t.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      t.modelo.toLowerCase().includes(filtro.toLowerCase())
  );

  useEffect(() => {
    if (negocioID) cargarTrabajos();
  }, [negocioID]);

  return (
    <RequireAuth>
      <Header />
      <div className="pt-20 min-h-screen bg-gray-100 text-black p-8">
        <h1 className="text-4xl font-bold mb-6 text-center">Trabajos pendientes</h1>

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
                <th className="p-3 border border-gray-400">Fecha</th>
                <th className="p-3 border border-gray-400">Cliente</th>
                <th className="p-3 border border-gray-400">Modelo</th>
                <th className="p-3 border border-gray-400">Trabajo</th>
                <th className="p-3 border border-gray-400">Clave</th>
                <th className="p-3 border border-gray-400">Observaciones</th>
                <th className="p-3 border border-gray-400">Acción</th>
              </tr>
            </thead>
            <tbody>
              {trabajosFiltrados.map((t) =>
                editandoId === t.firebaseId ? (
                  <tr key={t.firebaseId} className="border-t border-gray-300">
                    <td className="p-2 border border-gray-300">{t.fecha}</td>
                    <td className="p-2 border border-gray-300">
                      <input
                        className="w-full p-1 border border-gray-400"
                        value={formData.cliente || ""}
                        onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      />
                    </td>
                    <td className="p-2 border border-gray-300">
                      <input
                        className="w-full p-1 border border-gray-400"
                        value={formData.modelo || ""}
                        onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      />
                    </td>
                    <td className="p-2 border border-gray-300">
                      <input
                        className="w-full p-1 border border-gray-400"
                        value={formData.trabajo || ""}
                        onChange={(e) => setFormData({ ...formData, trabajo: e.target.value })}
                      />
                    </td>
                    <td className="p-2 border border-gray-300">
                      <input
                        className="w-full p-1 border border-gray-400"
                        value={formData.clave || ""}
                        onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                      />
                    </td>
                    <td className="p-2 border border-gray-300">
                      <input
                        className="w-full p-1 border border-gray-400"
                        value={formData.observaciones || ""}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      />
                    </td>
                    <td className="p-2 border border-gray-300 flex gap-1">
                      <button
                        onClick={guardarEdicion}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditandoId(null);
                          setFormData({});
                        }}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.firebaseId} className="hover:bg-gray-100 transition border-t border-gray-300">
                    <td className="p-3 border border-gray-300">{t.fecha}</td>
                    <td className="p-3 border border-gray-300">{t.cliente}</td>
                    <td className="p-3 border border-gray-300">{t.modelo}</td>
                    <td className="p-3 border border-gray-300">{t.trabajo}</td>
                    <td className="p-3 border border-gray-300">{t.clave}</td>
                    <td className="p-3 border border-gray-300">{t.observaciones}</td>
                    <td className="p-3 border border-gray-300 space-y-2">
                      <button
                        onClick={() => marcarComoEntregado(t.firebaseId)}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white text-sm w-full"
                      >
                        Marcar entregado
                      </button>
                      <button
                        onClick={() => {
                          setEditandoId(t.firebaseId);
                          setFormData(t);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-white text-sm w-full"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarTrabajo(t.firebaseId)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm w-full"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              )}
              {trabajosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    No hay trabajos pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RequireAuth>
  );
}
