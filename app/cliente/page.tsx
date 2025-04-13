"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth";
import { useRol } from "../../lib/useRol";

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
  precio?: number;
  firebaseId: string;
}

interface Pago {
  cliente: string;
  monto: number;
  fecha: string;
  firebaseId: string;
}

export default function Cliente() {
  const { rol, cliente } = useRol();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const cargarTrabajos = async () => {
    const q = query(collection(db, "trabajos"), where("cliente", "==", cliente));
    const querySnapshot = await getDocs(q);
    const datos: Trabajo[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Trabajo, "firebaseId">;
      datos.push({ ...data, firebaseId: docSnap.id });
    });

    // Ordenar por fecha descendente
    datos.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
    setTrabajos(datos);
  };

  const cargarPagos = async () => {
    const q = query(collection(db, "pagos"), where("cliente", "==", cliente));
    const querySnapshot = await getDocs(q);
    const datos: Pago[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Pago, "firebaseId">;
      datos.push({ ...data, firebaseId: docSnap.id });
    });

    // Ordenar por fecha descendente
    datos.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
    setPagos(datos);
  };

  useEffect(() => {
    if (rol === "cliente") {
      cargarTrabajos();
      cargarPagos();
    }
  }, [rol, cliente]);

  const totalPrecio = trabajos.reduce((acc, t) => acc + (t.precio || 0), 0);
  const totalPagado = pagos.reduce((acc, p) => acc + (p.monto || 0), 0);
  const saldo = totalPrecio - totalPagado;

  return (
    <RequireAuth>
      <Header />
      <main className="pt-20 min-h-screen bg-gray-100 text-black p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Bienvenido, {cliente}</h1>

        <div className="text-center text-2xl font-semibold mb-6">
          <p>💰 Saldo pendiente: ${saldo}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Tus trabajos</h2>
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
                {trabajos.map((t) => (
                  <tr key={t.firebaseId} className="border-t border-gray-400">
                    <td className="p-3">{t.fecha}</td>
                    <td className="p-3">{t.modelo}</td>
                    <td className="p-3">{t.trabajo}</td>
                    <td className="p-3">${t.precio || 0}</td>
                    <td className="p-3">{t.estado}</td>
                    <td className="p-3">{t.fechaEntrega || "-"}</td>
                  </tr>
                ))}
                {trabajos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      No tenés trabajos cargados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Pagos realizados</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-300">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Monto</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.firebaseId} className="border-t border-gray-400">
                    <td className="p-3">{p.fecha}</td>
                    <td className="p-3">${p.monto}</td>
                  </tr>
                ))}
                {pagos.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-4 text-gray-500">
                      No registramos pagos aún.
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
