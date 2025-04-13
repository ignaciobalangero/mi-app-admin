"use client";
import { useEffect, useState } from "react";
import Header from "../Header";
import { useRol } from "@/lib/useRol";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/login");
  };

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
    if (rol === "cliente") cargarTrabajos();
  }, [rol, cliente]);

  if (rol !== "cliente") return null;

  const trabajosPendientes = trabajos.filter((t) => t.estado === "PENDIENTE");
  const trabajosEntregados = trabajos.filter((t) => t.estado === "ENTREGADO");

  const totalAdeudado = trabajosPendientes.reduce((sum, t) => sum + t.precio, 0);

  return (
    <div className="pt-20 min-h-screen bg-gray-100 text-black p-8">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">Bienvenido,</h1>
        <button
          onClick={cerrarSesion}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Cerrar sesión
        </button>
      </div>

      <h2 className="text-xl mt-2 mb-6 max-w-5xl mx-auto">💰 Total adeudado: ${totalAdeudado}</h2>

      <div className="max-w-5xl mx-auto">
        <h3 className="text-lg font-bold mb-2">Trabajos pendientes</h3>
        <table className="w-full table-auto border-collapse mb-10">
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
            {trabajosPendientes.map((t) => (
              <tr key={t.firebaseId} className="border-t border-gray-400">
                <td className="p-2">{t.fecha}</td>
                <td className="p-2">{t.modelo}</td>
                <td className="p-2">{t.trabajo}</td>
                <td className="p-2">${t.precio}</td>
                <td className="p-2">{t.estado}</td>
              </tr>
            ))}
            {trabajosPendientes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-600">
                  No hay trabajos pendientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
            {trabajosEntregados.map((t) => (
              <tr key={t.firebaseId} className="border-t border-gray-400">
                <td className="p-2">{t.fecha}</td>
                <td className="p-2">{t.modelo}</td>
                <td className="p-2">{t.trabajo}</td>
                <td className="p-2">${t.precio}</td>
                <td className="p-2">{t.estado}</td>
                <td className="p-2">{t.fechaEntrega || "-"}</td>
              </tr>
            ))}
            {trabajosEntregados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-600">
                  No hay trabajos entregados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
