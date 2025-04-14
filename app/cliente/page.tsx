"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import { useRol } from "@/lib/useRol";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";

const db = getFirestore(app);

interface Trabajo {
  fecha: string;
  fechaEntrega?: string;
  modelo: string;
  trabajo: string;
  precio: number;
  estado: string;
}

interface Pago {
  fecha: string;
  monto: number;
  forma: string;
  destino: string;
}

export default function Cliente() {
  const { rol, cliente } = useRol();
  const router = useRouter();
  const [trabajosPendientes, setTrabajosPendientes] = useState<Trabajo[]>([]);
  const [trabajosEntregados, setTrabajosEntregados] = useState<Trabajo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [mostrarPagos, setMostrarPagos] = useState(false);

  const cargarTrabajos = async () => {
    if (!cliente) return;

    const qPendientes = query(collection(db, "trabajos"), where("cliente", "==", cliente), where("estado", "==", "PENDIENTE"));
    const qEntregados = query(collection(db, "trabajos"), where("cliente", "==", cliente), where("estado", "==", "ENTREGADO"));
    const qPagos = query(collection(db, "pagos"), where("cliente", "==", cliente));

    const [snapshotPendientes, snapshotEntregados, snapshotPagos] = await Promise.all([
      getDocs(qPendientes),
      getDocs(qEntregados),
      getDocs(qPagos),
    ]);

    const pendientes: Trabajo[] = [];
    snapshotPendientes.forEach(doc => pendientes.push(doc.data() as Trabajo));

    const entregados: Trabajo[] = [];
    snapshotEntregados.forEach(doc => entregados.push(doc.data() as Trabajo));

    const listaPagos: Pago[] = [];
    snapshotPagos.forEach(doc => listaPagos.push(doc.data() as Pago));

    setTrabajosPendientes(pendientes);
    setTrabajosEntregados(entregados);
    setPagos(listaPagos);
  };

  useEffect(() => {
    cargarTrabajos();
  }, [cliente]);

  const totalPendientes = trabajosPendientes.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
  const totalEntregados = trabajosEntregados.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
  const totalAdeudado = totalPendientes + totalEntregados;

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (rol !== "cliente") return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bienvenido,</h1>
        <button onClick={cerrarSesion} className="bg-red-600 text-white px-4 py-2 rounded">Cerrar sesión</button>
      </div>
      <p className="text-xl mt-2 mb-6">💰 Total adeudado: ${totalAdeudado}</p>

      <button
        onClick={() => setMostrarPagos(!mostrarPagos)}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-6"
      >
        {mostrarPagos ? "Ocultar pagos realizados" : "Mostrar pagos realizados"}
      </button>

      {mostrarPagos && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Historial de pagos</h2>
          <table className="w-full table-auto">
            <thead className="bg-gray-300">
              <tr>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Monto</th>
                <th className="p-2 text-left">Forma de pago</th>
                <th className="p-2 text-left">Destino</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length > 0 ? (
                pagos.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{p.fecha}</td>
                    <td className="p-2">${p.monto}</td>
                    <td className="p-2">{p.forma}</td>
                    <td className="p-2">{p.destino}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">No hay pagos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Trabajos pendientes</h2>
        <table className="w-full table-auto">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Modelo</th>
              <th className="p-2 text-left">Trabajo</th>
              <th className="p-2 text-left">Precio</th>
              <th className="p-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {trabajosPendientes.length > 0 ? (
              trabajosPendientes.map((t, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{t.fecha}</td>
                  <td className="p-2">{t.modelo}</td>
                  <td className="p-2">{t.trabajo}</td>
                  <td className="p-2">${t.precio}</td>
                  <td className="p-2">{t.estado}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay trabajos pendientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Trabajos entregados</h2>
        <table className="w-full table-auto">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2 text-left">Fecha ingreso</th>
              <th className="p-2 text-left">Modelo</th>
              <th className="p-2 text-left">Trabajo</th>
              <th className="p-2 text-left">Precio</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-left">Fecha entrega</th>
            </tr>
          </thead>
          <tbody>
            {trabajosEntregados.length > 0 ? (
              trabajosEntregados.map((t, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{t.fecha}</td>
                  <td className="p-2">{t.modelo}</td>
                  <td className="p-2">{t.trabajo}</td>
                  <td className="p-2">${t.precio}</td>
                  <td className="p-2">{t.estado}</td>
                  <td className="p-2">{t.fechaEntrega || "-"}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">No hay trabajos entregados aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
