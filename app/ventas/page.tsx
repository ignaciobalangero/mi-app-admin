// Archivo: /ventas/page.tsx

"use client";

import Link from "next/link";
import Header from "../Header";
import RequireAdmin from "@/lib/RequireAdmin";

export default function VentasHome() {
  return (
    <RequireAdmin>
      <Header />
      <main className="pt-20 min-h-screen bg-gray-100 text-black p-6 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8">Panel de Ventas</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
          <Link
            href="/ventas/accesorios"
            className="bg-white p-6 rounded-xl shadow hover:bg-gray-200 text-center font-semibold"
          >
            Venta de Accesorios
          </Link>
          <Link
            href="/ventas/telefonos"
            className="bg-white p-6 rounded-xl shadow hover:bg-gray-200 text-center font-semibold"
          >
            Venta de Teléfonos
          </Link>
          <Link
            href="/ventas/stock-telefonos"
            className="bg-white p-6 rounded-xl shadow hover:bg-gray-200 text-center font-semibold"
          >
            Stock de Teléfonos
          </Link>
          <Link
            href="/ventas/stock-accesorios-repuestos"
            className="bg-white p-6 rounded-xl shadow hover:bg-gray-200 text-center font-semibold"
          >
            Stock Accesorios y Repuestos
          </Link>
        </div>
      </main>
    </RequireAdmin>
  );
}
