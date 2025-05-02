"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
// Agrego solo las flechas lindas
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(true);

  return (
    <>
      {/* Botón de abrir/cerrar, siempre arriba de todo */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed top-4 left-4 text-white text-2xl z-[9999] bg-gray-800 rounded p-1"
        title={abierto ? "Cerrar menú" : "Abrir menú"}
      >
        {abierto ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
      </button>

      <div className="flex min-h-screen">
        <Sidebar abierto={abierto} setAbierto={setAbierto} />

        <main className={`flex-1 transition-all duration-300 ${abierto ? "pl-48" : "pl-16"} pt-4`}>
          {children}
        </main>
      </div>
    </>
  );
}
