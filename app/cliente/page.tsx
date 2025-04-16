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
  precio?: any;
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
  const [totalAdeudado, setTotalAdeudado] = useState<number>(0);
  const router = useRouter();

  // Evitar acceso si no es cliente
  useEffect(() => {
    if (rol && rol !== "cliente") {
      router.push("/");
    }
  }, [rol, router]);

  if (rol && rol !== "cliente") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gray-900">
        <p className="text-lg">Acceso denegado. Redirigiendo...</p>
      </div>
    );
  }

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

      const preciosTrabajos = trabajosData.map(t => {
        const valor = typeof t.precio === "string"
          ? parseInt(t.precio.replace(/\$/g, "").replace(/\./g, "").trim()) || 0
          : t.precio || 0;
        return valor;
      });
      const sumaPrecios = preciosTrabajos.reduce((acc, n) => acc + n, 0);
      const sumaPagos = pagosData.reduce((acc, p) => acc + (p.monto || 0), 0);
      setTotalAdeudado(sumaPrecios - sumaPagos);
    };

    cargarDatos();
  }, [cliente]);

  const trabajosPendientes = trabajos.filter(t => t.estado === "PENDIENTE");
  const trabajosEntregados = trabajos.filter(t => t.estado === "ENTREGADO");

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
        <img src="/logo.png" alt="Logo" className="mx-auto w-120" />
        <button
          onClick={cerrarSesion}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="flex justify-end mb-4">
        <div className="bg-gray-800 px-4 py-2 rounded-xl text-right">
          <h2 className="text-lg font-semibold text-green-400">💰 Total adeudado</h2>
          {pagos.length > 0 || trabajos.length > 0 ? (
            <p className="text-xl font-bold text-white">
              ${Number(totalAdeudado).toLocaleString("es-AR")}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Calculando...</p>
          )}
        </div>
      </div>

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
