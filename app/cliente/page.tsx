"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import RequireAuth from "../../lib/requireAuth";
import { useRol } from "../../lib/useRol";

interface TrabajoCliente {
  cliente: string;
  modelo: string;
  trabajo: string;
  precio: number;
  estado: string;
  fecha: string;
  fechaEntrega?: string;
  firebaseId: string;
}

export default function Cliente() {
  const { rol, cliente } = useRol();
  const [trabajos, setTrabajos] = useState<TrabajoCliente[]>([]);

  const cargarTrabajos = async () => {
    if (!cliente) return;
    const q = query(collection(db, "resumen-clientes"), where("cliente", "==", cliente.toLowerCase()));
    const querySnapshot = await getDocs(q);
    const datos: TrabajoCliente[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<TrabajoCliente, "firebaseId">;
      datos.push({ ...data, firebaseId: docSnap.id });
    });

    // Ordenar por fecha descendente
    datos.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
    setTrabajos(datos);
  };

  useEffect(() => {
    if (rol === "cliente") {
      cargarTrabajos();
    }
  }, [rol, cliente]);

  const totalPrecio = trabajos.reduce((acc, t) => acc + (t.precio || 0), 0);
  const entregado = trabajos.filter((t) => t.estado === "ENTREGADO");
  const pendiente = trabajos.filter((t) => t.estado === "PENDIENTE");

  return (
    <RequireAuth>
      <main className="pt-20 min-h-screen bg-gray-100 text-black p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Bienvenido, {cliente}</h1>

        <div className="text-center text-2xl font-semibold mb-6">
          <p>💰 Total adeudado: ${totalPrecio}</p>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Trabajos pendientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-300">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Trabajo</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendiente.map((t) => (
                  <tr key={t.firebaseId} className="border-t border-gray-400">
                    <td className="p-3">{t.fecha}</td>
                    <td className="p-3">{t.modelo}</td>
                    <td className="p-3">{t.trabajo}</td>
                    <td className="p-3">${t.precio}</td>
                    <td className="p-3">{t.estado}</td>
                  </tr>
                ))}
                {pendiente.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      No hay trabajos pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Trabajos entregados</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-300">
                  <th className="p-3">Fecha ingreso</th>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Trabajo</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha entrega</th>
                </tr>
              </thead>
              <tbody>
                {entregado.map((t) => (
                  <tr key={t.firebaseId} className="border-t border-gray-400">
                    <td className="p-3">{t.fecha}</td>
                    <td className="p-3">{t.modelo}</td>
                    <td className="p-3">{t.trabajo}</td>
                    <td className="p-3">${t.precio}</td>
                    <td className="p-3">{t.estado}</td>
                    <td className="p-3">{t.fechaEntrega || "-"}</td>
                  </tr>
                ))}
                {entregado.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      No hay trabajos entregados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
