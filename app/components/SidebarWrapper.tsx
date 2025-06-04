"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(true);

  return (
    <div className="flex min-h-screen">
      <Sidebar abierto={abierto} setAbierto={setAbierto} />

      {/* Contenido principal que se ajusta al sidebar */}
      <main className={`flex-1 transition-all duration-300 ${abierto ? "ml-64" : "ml-16"} mt-16`}>
        {children}
      </main>
    </div>
  );
}