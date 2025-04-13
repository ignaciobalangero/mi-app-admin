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
import { useRol } from "../../lib/useRol";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/auth";

interface Trabajo {
  fecha: string;
  fechaEntrega?: string;
  modelo: string;
  trabajo: string;
  precio: number;
  estado: string;
  cliente: string;
  firebaseId: string;
}

export default function Cliente() {
  const { rol, cliente } = useRol();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);

  const cargarTrabajos = async () => {
    if (!cliente) return;
    const q = query(collection(db, "trabajos"), where("cliente", "==", cliente.toLowerCase()));
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
  }, [cliente]);

  if (rol !== "cliente") return null;

  const pendientes = trabajos.filter((t) => t.estado === "PENDIENTE");
  const entregados = trabajos.filter((t) => t.estado === "ENTREGADO");
  const totalAdeudado = pendientes.reduce((acc, t) => acc + (t.precio || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 text-black p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-4">Bienvenido,</h1>
        <button
          onClick={() => signOut(auth)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-2">💰 Total adeudado: ${totalAdeudado}</h2>

      <section className="mt-8">
        <h3 className="text-lg font-bold mb-2">Trabajos pendientes</h3>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-300 text-left">
              <th className="p-2">Fecha</th>
              <th className="p-2">Modelo</th>
              <th className="p-2">Trabajo</th>
              <th className="p-2">Precio</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((t) => (
              <tr key={t.firebaseId} className="border-t border-gray-400">
                <td className="p-2">{t.fecha}</td>
                <td className="p-2">{t.modelo}</td>
                <td className="p-2">{t.trabajo}</td>
                <td className="p-2">${t.precio}</td>
                <td className="p-2">{t.estado}</td>
              </tr>
            ))}
            {pendientes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-2 text-center text-gray-500">
                  No hay trabajos pendientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h3 className="text-lg font-bold mb-2">Trabajos entregados</h3>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-300 text-left">
              <th className="p-2">Fecha ingreso</th>
              <th className="p-2">Modelo</th>
              <th className="p-2">Trabajo</th>
              <th className="p-2">Precio</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Fecha entrega</th>
            </tr>
          </thead>
          <tbody>
            {entregados.map((t) => (
              <tr key={t.firebaseId} className="border-t border-gray-400">
                <td className="p-2">{t.fecha}</td>
                <td className="p-2">{t.modelo}</td>
                <td className="p-2">{t.trabajo}</td>
                <td className="p-2">${t.precio}</td>
                <td className="p-2">{t.estado}</td>
                <td className="p-2">{t.fechaEntrega || "-"}</td>
              </tr>
            ))}
            {entregados.length === 0 && (
              <tr>
                <td colSpan={6} className="p-2 text-center text-gray-500">
                  No hay trabajos entregados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}