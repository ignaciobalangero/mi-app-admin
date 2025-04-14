"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RequireAdmin from "@/lib/RequireAdmin";
import Header from "../Header";

interface Trabajo {
  cliente: string;
  precio?: number;
  estado: string;
}

interface Pago {
  cliente: string;
  monto: number;
  fecha: string;
}

interface CuentaCorriente {
  cliente: string;
  totalAdeudado: number;
  entregas: number;
  saldoPendiente: number;
}

export default function CuentaCorrientePage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");

  const formatNumero = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  useEffect(() => {
    const cargarDatos = async () => {
      const trabajosSnap = await getDocs(collection(db, "trabajos"));
      const pagosSnap = await getDocs(collection(db, "pagos"));

      const trabajos: Trabajo[] = [];
      trabajosSnap.forEach((doc) => trabajos.push(doc.data() as Trabajo));

      const pagos: Pago[] = [];
      pagosSnap.forEach((doc) => pagos.push(doc.data() as Pago));

      const clientes = Array.from(new Set(trabajos.map((t) => t.cliente)));

      const resumen: CuentaCorriente[] = clientes.map((cliente) => {
        const adeudado = trabajos
          .filter(
            (t) =>
              t.cliente === cliente &&
              (t.estado === "PENDIENTE" || t.estado === "ENTREGADO")
          )
          .reduce((sum, t) => sum + (t.precio || 0), 0);

        const entregas = pagos
          .filter((p) => p.cliente === cliente)
          .reduce((sum, p) => sum + p.monto, 0);

        return {
          cliente,
          totalAdeudado: adeudado,
          entregas,
          saldoPendiente: adeudado - entregas,
        };
      });

      setCuentas(
        resumen.filter((c) => c.saldoPendiente !== 0) // solo mostrar deudores o con saldo a favor
      );
    };

    cargarDatos();
  }, []);

  const exportarCSV = () => {
    const encabezado = ["Cliente", "Adeudado", "Entregas", "Saldo pendiente"];
    const filas = cuentasFiltradas.map((c) => [
      c.cliente,
      c.totalAdeudado,
      c.entregas,
      c.saldoPendiente,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [encabezado, ...filas].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cuenta_corriente.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cuentasFiltradas = cuentas.filter((c) =>
    c.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  const saldoTotal = cuentas.reduce((sum, c) => sum + c.saldoPendiente, 0);

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
          <div className="flex items-center gap-4">
            <button
              onClick={exportarCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Exportar CSV
            </button>
            <span className="text-lg font-semibold">
              Saldo Total: {formatNumero(saldoTotal)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-300">
              <tr>
                <th className="p-3 border border-gray-400 text-left">Cliente</th>
                <th className="p-3 border border-gray-400 text-left">Total Adeudado</th>
                <th className="p-3 border border-gray-400 text-left">Entregas</th>
                <th className="p-3 border border-gray-400 text-left">Saldo pendiente</th>
              </tr>
            </thead>
            <tbody>
              {cuentasFiltradas.map((c) => (
                <tr
                  key={c.cliente}
                  className={`border-t ${
                    c.saldoPendiente < 0
                      ? "bg-green-200"
                      : "bg-red-200"
                  }`}
                >
                  <td className="p-2 border border-gray-300">{c.cliente}</td>
                  <td className="p-2 border border-gray-300">{formatNumero(c.totalAdeudado)}</td>
                  <td className="p-2 border border-gray-300">{formatNumero(c.entregas)}</td>
                  <td className="p-2 border border-gray-300 font-semibold">
                    {formatNumero(c.saldoPendiente)}{" "}
                    {c.saldoPendiente < 0 && <span className="text-sm text-green-700">(Saldo a favor)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </RequireAdmin>
  );
}
