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
    { label: "Orden de trabajo", icono: "🛠️", href: "/ingreso" },
    { label: "Gestion de Ordenes", icono: "🛠️", href: "/gestion-trabajos" },
    { label: "Administrar $ ordenes", icono: "👥", href: "/resumen" },
    { label: "Cuenta Corriente", icono: "💲", href: "/cuenta" },
    { label: "Gestion de Pagos", icono: "💲", href: "/pagos" },
    { label: "Resumen de cuenta", icono: "📈", href: "/resumen-cuenta" },
    { label: "Venta de teléfonos", icono: "🛒", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Venta de accesorios", icono: "🛒", href: "/ventas/accesorios" },
    { label: "Stock Gral", icono: "📦", href: "/ventas/stock-accesorios-repuestos" },
    { label: "Stock Repuestos (Sheet)", icono: "📄", href: "/integracion-sheet/stock-sheet" },
    { label: "Clientes", icono: "👥", href: "/clientes" },
    { label: "Configuraciones", icono: "⚙️", href: "/configuraciones" },
  ];
 
  const botonesEmpleado = [
    { label: "Inicio", icono: "🏠", href: "/" },
    { label: "Ingreso de trabajo", icono: "🛠️", href: "/ingreso" },
    { label: "Gestión de Trabajos", icono: "🛠️", href: "/gestion-trabajos" },
    { label: "Venta de teléfonos", icono: "🛒", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Venta de accesorios", icono: "🛒", href: "/ventas/accesorios" },
    { label: "Stock Gral", icono: "📦", href: "/ventas/stock-accesorios-repuestos" },
    { label: "Clientes", icono: "👥", href: "/clientes" },
  ];

  const botones = rol?.tipo === "admin" ? botonesAdmin : botonesEmpleado;

  if (!rol) return null;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-gray-100 text-black shadow-lg transition-all duration-300 z-50 ${
        abierto ? "w-48" : "w-16"
      } flex flex-col overflow-hidden`}
    >
      {/* Botón de abrir/cerrar en posición absoluta */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="absolute top-4 left-4 text-white text-2xl z-50"
        title={abierto ? "Cerrar menú" : "Abrir menú"}
      >
        {abierto ? "⬅️" : "☰"}
      </button>

      {/* Espaciado para que no tape los ítems */}
      <div className="h-16"></div>

      <nav className="flex-1 flex flex-col mt-2 space-y-1 px-2 overflow-y-auto">
        {botones.map((boton, i) => (
          <Link
            key={i}
            href={boton.href}
            className="flex items-center p-2 rounded hover:bg-gray-700 text-sm transition-all"
          >
            <span className="text-lg">{boton.icono}</span>
            {abierto && (
              <span className="ml-2 whitespace-nowrap">
                {boton.label}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
