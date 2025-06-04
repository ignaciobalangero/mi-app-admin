"use client";

import Link from "next/link";
import { useRol } from "../../lib/useRol";

interface SidebarProps {
  abierto: boolean;
  setAbierto: (abierto: boolean) => void;
}

export default function Sidebar({ abierto, setAbierto }: SidebarProps) {
  const { rol } = useRol();

  if (rol?.tipo === "cliente") return null;

  const botonesAdmin = [
    { label: "Inicio", icono: "🏠", href: "/" },
    { label: "Ventas General", icono: "💰", href: "/ventas-general" },
    { label: "Orden de trabajo", icono: "📝", href: "/ingreso" },
    { label: "Gestion de Ordenes", icono: "🔧", href: "/gestion-trabajos" },
    { label: "Administrar $ ordenes", icono: "💵", href: "/resumen" },
    { label: "Cuenta Corriente", icono: "📊", href: "/cuenta" },
    { label: "Gestion de Pagos", icono: "💳", href: "/pagos" },
    { label: "Resumen de cuenta", icono: "📈", href: "/resumen-cuenta" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Stock Gral", icono: "🏪", href: "/ventas/stock-accesorios-repuestos" },
    { label: "Stock Repuestos (Sheet)", icono: "📋", href: "/integracion-sheet/stock-sheet" },
    { label: "Clientes", icono: "👥", href: "/clientes" },
    { label: "Configuraciones", icono: "⚙️", href: "/configuraciones" },
  ];
 
  const botonesEmpleado = [
    { label: "Inicio", icono: "🏠", href: "/" },
    { label: "Ingreso de trabajo", icono: "📝", href: "/ingreso" },
    { label: "Ventas General", icono: "💰", href: "/ventas-general" },
    { label: "Gestión de Trabajos", icono: "🔧", href: "/gestion-trabajos" },
    { label: "Venta de teléfonos", icono: "📱", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Stock Grl", icono: "🏪", href: "/ventas/stock-accesorios-repuestos" },
    { label: "Clientes", icono: "👥", href: "/clientes" },
  ];

  const botones = rol?.tipo === "admin" ? botonesAdmin : botonesEmpleado;

  if (!rol) return null;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-[#f0f2f5] to-[#e8eaed] text-[#2c3e50] shadow-xl transition-all duration-300 z-40 ${
        abierto ? "w-64" : "w-16"
      } flex flex-col overflow-hidden border-r-2 border-[#3498db]`}
    >
      <button
        onClick={() => setAbierto(!abierto)}
        className="absolute top-5 right-4 bg-[#3498db] hover:bg-[#2980b9] text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md z-50"
        title={abierto ? "Cerrar menú" : "Abrir menú"}
      >
        {abierto ? "⬅️" : "☰"}
      </button>

      <div className="h-16 flex items-center justify-center border-b border-[#d5dbdb]">
        {abierto && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
              <span className="text-sm">📋</span>
            </div>
            <span className="text-sm font-bold text-[#2c3e50]">GestiOne</span>
          </div>
        )}
      </div>

      <nav className="flex-1 flex flex-col mt-2 space-y-1 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-[#3498db] scrollbar-track-[#e8eaed]">
        {botones.map((boton, i) => (
          <Link
            key={i}
            href={boton.href}
            className="flex items-center p-3 rounded-lg hover:bg-[#3498db] hover:text-white hover:shadow-md text-xs transition-all duration-200 group"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{boton.icono}</span>
            {abierto && (
              <span className="ml-3 whitespace-nowrap font-medium text-[#2c3e50] group-hover:text-white">
                {boton.label}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {abierto && (
        <div className="p-3 border-t border-[#d5dbdb]">
          <div className="bg-[#e8eaed] rounded-lg p-2">
            <p className="text-xs text-[#7f8c8d] text-center">
              <span className="font-semibold text-[#2c3e50]">Rol:</span> {rol?.tipo}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}