"use client";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth"; // 🔐 Protección

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

  const cargarTrabajos = async () => {
    const q = query(
      collection(db, "trabajos"),
      where("estado", "==", "ENTREGADO")
    );
    const querySnapshot = await getDocs(q);
    const datos: Trabajo[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Trabajo, "firebaseId">;
      datos.push({ ...data, firebaseId: docSnap.id });
    });

    setTrabajos(datos);
  };

  useEffect(() => {
    cargarTrabajos();
  }, []);

  return (
    <RequireAuth>
      <Header />
      <div className="pt-20 min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-6 text-center">Trabajos entregados</h1>
        <div className="overflow-x-auto max-w-6xl mx-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-800 text-left">
                <th className="p-3">Fecha ingreso</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Trabajo</th>
                <th className="p-3">Clave</th>
                <th className="p-3">Observaciones</th>
                <th className="p-3">Fecha entrega</th>
              </tr>
            </thead>
            <tbody>
              {trabajos.map((t) => (
                <tr key={t.firebaseId} className="border-t border-gray-700 hover:bg-gray-800 transition">
                  <td className="p-3">{t.fecha}</td>
                  <td className="p-3">{t.cliente}</td>
                  <td className="p-3">{t.modelo}</td>
                  <td className="p-3">{t.trabajo}</td>
                  <td className="p-3">{t.clave}</td>
                  <td className="p-3">{t.observaciones}</td>
                  <td className="p-3">{t.fechaEntrega || "-"}</td>
                </tr>
              ))}
              {trabajos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400">
                    No hay trabajos entregados aún.
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
