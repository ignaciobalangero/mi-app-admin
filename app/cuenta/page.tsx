"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import RequireAdmin from "@/lib/RequireAdmin";
import Header from "../Header";
import Link from "next/link";
import { useRol } from "@/lib/useRol";

interface Trabajo {
  cliente: string;
  precio?: number | string;
  estado: string;
  moneda?: "ARS" | "USD";
}

interface Pago {
  cliente: string;
  monto?: number | null;
  moneda: "ARS" | "USD";
  fecha: string;
}

interface CuentaCorriente {
  cliente: string;
  saldoPesos: number;
  saldoUSD: number;
}

export default function CuentaCorrientePage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const [negocioID, setNegocioID] = useState<string>("");

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  useEffect(() => {
    const cargarCuentas = async () => {
      if (!negocioID) return;

      const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));

      const cuentasMap: { [cliente: string]: { saldoPesos: number; saldoUSD: number } } = {};

      // Procesar trabajos
      trabajosSnap.forEach((doc) => {
        const data = doc.data() as Trabajo;
        if (data.estado !== "ENTREGADO" && data.estado !== "PAGADO") return;

        const cliente = data.cliente;
        const precio = Number(data.precio || 0);
        const moneda = data.moneda || "ARS";

        if (!cuentasMap[cliente]) {
          cuentasMap[cliente] = { saldoPesos: 0, saldoUSD: 0 };
        }

        if (moneda === "ARS") {
          cuentasMap[cliente].saldoPesos += precio;
        } else {
          cuentasMap[cliente].saldoUSD += precio;
        }
      });

      // Procesar pagos
      pagosSnap.forEach((doc) => {
        const data = doc.data() as Pago;
        const cliente = data.cliente;
        const monto = Number(data.monto || 0);
        const moneda = data.moneda || "ARS";

        if (!cuentasMap[cliente]) {
          cuentasMap[cliente] = { saldoPesos: 0, saldoUSD: 0 };
        }

        if (moneda === "ARS") {
          cuentasMap[cliente].saldoPesos -= monto;
        } else {
          cuentasMap[cliente].saldoUSD -= monto;
        }
      });

      const cuentasFinales = Object.entries(cuentasMap)
        .map(([cliente, valores]) => ({
          cliente,
          saldoPesos: valores.saldoPesos,
          saldoUSD: valores.saldoUSD,
        }))
        .filter((c) => c.saldoPesos > 0 || c.saldoUSD > 0);

      setCuentas(cuentasFinales);
    };

    cargarCuentas();
  }, [negocioID]);

  const cuentasFiltradas = cuentas.filter((c) =>
    c.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  const formatPesos = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  const formatUSD = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(num);

  const totalPesos = cuentas.reduce((acum, c) => acum + c.saldoPesos, 0);
  const totalUSD = cuentas.reduce((acum, c) => acum + c.saldoUSD, 0);

  return (
    <RequireAdmin>
      <Header />
      <main className="pt-20 text-black p-6 min-h-screen bg-gray-100">
        <h1 className="text-3xl font-bold mb-6 text-center">Cuenta Corriente</h1>

        <div className="text-center text-lg font-semibold text-red-600 mb-4">
          💰 Deuda Total: {formatPesos(totalPesos)} y {formatUSD(totalUSD)}
        </div>

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
                <th className="p-3 border border-gray-400 text-left">Saldo Adeudado ($)</th>
                <th className="p-3 border border-gray-400 text-left">Saldo Adeudado (USD)</th>
              </tr>
            </thead>
            <tbody>
              {cuentasFiltradas.map((c) => (
                <tr
                  key={c.cliente}
                  className={`border-t ${
                    c.saldoPesos > 0 || c.saldoUSD > 0 ? "bg-red-200" : "bg-green-200"
                  }`}
                >
                  <td className="p-2 border border-gray-300">{c.cliente}</td>
                  <td className="p-2 border border-gray-300">{formatPesos(c.saldoPesos)}</td>
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
