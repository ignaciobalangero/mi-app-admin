"use client";

import Link from "next/link";
import { useRol } from "../../lib/useRol";
import { useLogo } from "@/app/components/LogoProvider";

interface SidebarProps {
  abierto: boolean;
  setAbierto: (abierto: boolean) => void;
}

export default function Sidebar({ abierto, setAbierto }: SidebarProps) {
  const { rol } = useRol();
  const { logoUrl, cargandoLogo } = useLogo();

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
    { label: "Venta de teléfonos", icono: "📱", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Stock Gral", icono: "🏪", href: "/ventas/stock-accesorios-repuestos" },
    { label: "Stock Repuestos (Sheet)", icono: "📋", href: "/integracion-sheet/stock-sheet" },
    { label: "Clientes", icono: "👥", href: "/clientes" },
    { label: "Caja Diaria", icono: "🏦", href: "/CajaDiaria" },
    { label: "Proveedores", icono: "", href: "/proveedores" },
    { label: "Configuraciones", icono: "⚙️", href: "/configuraciones" },
  ];
 
  const botonesEmpleado = [
    { label: "Inicio", icono: "🏠", href: "/" },
    { label: "Ingreso de trabajo", icono: "📝", href: "/ingreso" },
    { label: "Ventas General", icono: "💰", href: "/ventas-general" },
    { label: "Gestión de Trabajos", icono: "🔧", href: "/gestion-trabajos" },
    { label: "Stock Repuestos (Sheet)", icono: "📋", href: "/integracion-sheet/stock-sheet" },
    { label: "Venta de teléfonos", icono: "📱", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Stock Grl", icono: "🏪", href: "/ventas/stock-accesorios-repuestos" },
    { label: "Clientes", icono: "👥", href: "/clientes" },
    { label: "Gestion de Pagos", icono: "💳", href: "/pagos" },
    { label: "Cuenta Corriente", icono: "📊", href: "/cuenta" },
  ];

  const botones = rol?.tipo === "admin" ? botonesAdmin : botonesEmpleado;

  if (!rol) return null;

  return (
    <>
      {/* Header superior separado que respeta la zona segura */}
      <header className="fixed top-[env(safe-area-inset-top,0)] left-0 right-0 h-16 bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] text-[#2c3e50] shadow-lg z-30 flex items-center justify-center border-b-2 border-[#3498db]">
        <div className="flex items-center gap-3">
          {cargandoLogo ? (
            <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
          ) : logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 object-contain max-w-[200px]"
            />
          ) : (
            <>
              <div className="w-10 h-10 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <span className="text-xl font-bold text-[#2c3e50]">GestiOne</span>
            </>
          )}
        </div>
      </header>



      {/* Sidebar reposicionado */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-gradient-to-b from-[#f0f2f5] to-[#e8eaed] text-[#2c3e50] shadow-xl transition-all duration-300 z-40 ${
          abierto ? "w-64" : "w-16"
        } flex flex-col overflow-hidden border-r-2 border-[#3498db]`}
      >
        <button
          onClick={() => setAbierto(!abierto)}
          className="absolute top-3 right-4 bg-[#3498db] hover:bg-[#2980b9] text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md z-50"
          title={abierto ? "Cerrar menú" : "Abrir menú"}
        >
          {abierto ? "⬅️" : "☰"}
        </button>

        {/* Espacio para el botón de colapsar */}
        <div className="h-12"></div>

        <nav className="flex-1 flex flex-col space-y-1 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-[#3498db] scrollbar-track-[#e8eaed]">
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
    </>
  );
}