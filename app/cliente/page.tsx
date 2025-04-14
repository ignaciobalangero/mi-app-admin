"use client";
import { useEffect, useState } from "react";
import { useRol } from "../../lib/useRol";
import { auth } from "../../lib/auth";
import { signOut } from "firebase/auth";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

interface Trabajo {
  fecha: string;
  modelo: string;
  trabajo: string;
  precio: number;
  estado: string;
  fechaEntrega?: string;
}

interface Pago {
  fecha: string;
  monto: number;
  forma?: string;
  destino?: string;
}

export default function Cliente() {
  const { rol, cliente } = useRol();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [verPagos, setVerPagos] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!cliente) return;

    const cargarDatos = async () => {
      const trabajosQuery = query(collection(db, "trabajos"), where("cliente", "==", cliente));
      const pagosQuery = query(collection(db, "pagos"), where("cliente", "==", cliente));

      const [trabajosSnap, pagosSnap] = await Promise.all([
        getDocs(trabajosQuery),
        getDocs(pagosQuery),
      ]);

      const trabajosData: Trabajo[] = [];
      trabajosSnap.forEach(doc => {
        trabajosData.push(doc.data() as Trabajo);
      });

      const pagosData: Pago[] = [];
      pagosSnap.forEach(doc => {
        pagosData.push(doc.data() as Pago);
      });

      setTrabajos(trabajosData);
      setPagos(pagosData);
    };

    cargarDatos();
  }, [cliente]);

  const trabajosPendientes = trabajos.filter(t => t.estado === "PENDIENTE");
  const trabajosEntregados = trabajos.filter(t => t.estado === "ENTREGADO");

  const totalAdeudado =
    trabajosPendientes.reduce((acc, t) => acc + (t.precio || 0), 0) +
    trabajosEntregados.reduce((acc, t) => acc + (t.precio || 0), 0) -
    pagos.reduce((acc, p) => acc + (p.monto || 0), 0);

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen py-10 px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bienvenido,</h1>
        <button
          onClick={cerrarSesion}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </div>

      <h2 className="text-xl mb-4">💰 Total adeudado: ${totalAdeudado}</h2>

      <button
        onClick={() => setVerPagos(!verPagos)}
        className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        {verPagos ? "Ocultar pagos realizados" : "Mostrar pagos realizados"}
      </button>

      {verPagos && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Pagos realizados</h3>
          {pagos.length === 0 ? (
            <p className="text-gray-400">No hay pagos registrados aún.</p>
          ) : (
            <ul className="list-disc list-inside text-sm">
              {pagos.map((p, i) => (
                <li key={i}>
                  {p.fecha}: ${p.monto} {p.forma ? `(${p.forma})` : ""} {p.destino ? `→ ${p.destino}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Trabajos pendientes</h2>
        <table className="w-full text-left bg-gray-800 rounded overflow-hidden">
          <thead className="bg-gray-700 text-sm">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">Modelo</th>
              <th className="p-2">Trabajo</th>
              <th className="p-2 w-28">Precio</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {trabajosPendientes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-400">
                  No hay trabajos pendientes.
                </td>
              </tr>
            ) : (
              trabajosPendientes.map((t, i) => (
                <tr key={i} className="border-t border-gray-600">
                  <td className="p-2">{t.fecha}</td>
                  <td className="p-2">{t.modelo}</td>
                  <td className="p-2">{t.trabajo}</td>
                  <td className="p-2">${t.precio}</td>
                  <td className="p-2">{t.estado}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Trabajos entregados</h2>
        <table className="w-full text-left bg-gray-800 rounded overflow-hidden">
          <thead className="bg-gray-700 text-sm">
            <tr>
              <th className="p-2">Fecha ingreso</th>
              <th className="p-2">Modelo</th>
              <th className="p-2">Trabajo</th>
              <th className="p-2 w-28">Precio</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Fecha entrega</th>
            </tr>
          </thead>
          <tbody>
            {trabajosEntregados.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-400">
                  No hay trabajos entregados aún.
                </td>
              </tr>
            ) : (
              trabajosEntregados.map((t, i) => (
                <tr key={i} className="border-t border-gray-600">
                  <td className="p-2">{t.fecha}</td>
                  <td className="p-2">{t.modelo}</td>
                  <td className="p-2">{t.trabajo}</td>
                  <td className="p-2">${t.precio}</td>
                  <td className="p-2">{t.estado}</td>
                  <td className="p-2">{t.fechaEntrega || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
