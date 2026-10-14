"use client";

import Header from "../Header";
import { useRol } from "@/lib/useRol";
import ConsultaImeiIfree from "@/app/ventas/stock-telefonos/components/ConsultaImeiIfree";

export default function ConsultarImeiPage() {
  const { rol } = useRol();
  const negocioID = rol?.negocioID || "";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f4f6f7] px-4 pb-16 pt-24">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-[#d6eaf8] bg-white p-5 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#3498db]">
              Consulta suelta
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#2c3e50]">Consultar un IMEI</h1>
            <p className="mt-2 text-sm text-[#7f8c8d]">
              Pegá el número cuando tengas una duda, aunque el equipo no esté en el stock. Cada botón consulta solo eso.
            </p>
            {negocioID ? (
              <div className="mt-6">
                <ConsultaImeiIfree negocioID={negocioID} variante="libre" />
              </div>
            ) : (
              <p className="mt-6 text-sm text-[#7f8c8d]">Cargando el negocio…</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
