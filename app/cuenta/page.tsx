// Página de Cuenta Corriente unificada con Pesos y Dólares
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import RequireAdmin from "@/lib/RequireAdmin";
import Header from "../Header";
import Link from "next/link";

interface Trabajo {
  cliente: string;
  precio?: number;
  estado: string;
}

interface Pago {
  cliente: string;
  monto: number | null;
  montoUSD?: number | null;
  moneda: "ARS" | "USD";
  fecha: string;
}

interface CuentaCorriente {
  cliente: string;
  adeudadoPesos: number;
  pagosPesos: number;
  saldoPesos: number;
  adeudadoUSD: number;
  pagosUSD: number;
  saldoUSD: number;
}

export default function CuentaCorrientePage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");

  const formatPesos = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  const formatUSD = (num: number) =>
    `USD ${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
    }).format(num)}`;

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

  useEffect(() => {
    const cargarDatos = async () => {
      if (!negocioID) return;

      const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));

      const trabajos: Trabajo[] = [];
      trabajosSnap.forEach((doc) => trabajos.push(doc.data() as Trabajo));

      const pagos: Pago[] = [];
      pagosSnap.forEach((doc) => pagos.push(doc.data() as Pago));

      const clientes = Array.from(new Set([...trabajos.map(t => t.cliente), ...pagos.map(p => p.cliente)]));

      const resumen: CuentaCorriente[] = clientes.map((cliente) => {
        const trabajosCliente = trabajos.filter(
          (t) => t.cliente === cliente && (t.estado === "PENDIENTE" || t.estado === "ENTREGADO")
        );

        const pagosCliente = pagos.filter((p) => p.cliente === cliente);

        const adeudadoPesos = trabajosCliente.reduce((sum, t) => sum + (t.precio || 0), 0);
        const pagosPesos = pagosCliente
          .filter((p) => p.moneda === "ARS")
          .reduce((sum, p) => sum + (p.monto || 0), 0);

        const pagosUSD = pagosCliente
          .filter((p) => p.moneda === "USD")
          .reduce((sum, p) => sum + (p.montoUSD || 0), 0);

        return {
          cliente,
          adeudadoPesos,
          pagosPesos,
          saldoPesos: adeudadoPesos - pagosPesos,
          adeudadoUSD: 0, // por ahora no se cargan ventas en USD
          pagosUSD,
          saldoUSD: -pagosUSD, // deuda negativa si ya pagó
        };
      }).filter((c) => c.saldoPesos !== 0 || c.saldoUSD !== 0);

      setCuentas(resumen);
    };

    cargarDatos();
  }, [negocioID]);

  const cuentasFiltradas = cuentas.filter((c) =>
    c.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  return (
    <RequireAdmin>
      <Header />
      <main className="pt-20 text-black p-6 min-h-screen bg-gray-100">
        <h1 className="text-3xl font-bold mb-6 text-center">Cuenta Corriente</h1>

        <div className="mb-4 flex flex-wrap gap-4 justify-center sm:justify-between items-center">
          <input
            type="text"
            placeholder="Filtrar por cliente"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className="bg-white border border-gray-400 p-2 rounded text-black"
          />
          <Link
            href="/pagos"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Ir a Pagos
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-300">
              <tr>
                <th className="p-3 border border-gray-400 text-left">Cliente</th>
                <th className="p-3 border border-gray-400 text-left">Adeudado ($)</th>
                <th className="p-3 border border-gray-400 text-left">Pagos ($)</th>
                <th className="p-3 border border-gray-400 text-left">Saldo ($)</th>
                <th className="p-3 border border-gray-400 text-left">Pagos (USD)</th>
                <th className="p-3 border border-gray-400 text-left">Saldo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {cuentasFiltradas.map((c) => (
                <tr
                  key={c.cliente}
                  className={`border-t ${c.saldoPesos > 0 ? "bg-red-200" : "bg-green-200"}`}
                >
                  <td className="p-2 border border-gray-300">{c.cliente}</td>
                  <td className="p-2 border border-gray-300">{formatPesos(c.adeudadoPesos)}</td>
                  <td className="p-2 border border-gray-300">{formatPesos(c.pagosPesos)}</td>
                  <td className="p-2 border border-gray-300">{formatPesos(c.saldoPesos)}</td>
                  <td className="p-2 border border-gray-300">{formatUSD(c.pagosUSD)}</td>
                  <td className="p-2 border border-gray-300">{formatUSD(c.saldoUSD)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </RequireAdmin>
  );
}
