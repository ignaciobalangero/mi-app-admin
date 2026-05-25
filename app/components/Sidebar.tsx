"use client";

import Link from "next/link";
import { useState } from "react";
import { useRol } from "../../lib/useRol";
import { useLogo } from "@/app/components/LogoProvider";
import { usePedidosTiendaPendientesVenta } from "@/lib/usePedidosTiendaPendientesVenta";

interface SidebarProps {
  abierto: boolean;
  setAbierto: (abierto: boolean) => void;
}

type BotonMenu = {
  label: string;
  icono: string;
  href: string;
  badge?: number;
};

function NavLink({
  boton,
  abierto,
}: {
  boton: BotonMenu;
  abierto: boolean;
}) {
  return (
    <Link
      href={boton.href}
      className="flex items-center p-3 rounded-lg hover:bg-[#3498db] hover:text-white hover:shadow-md text-xs transition-all duration-200 group"
    >
      <span className="relative text-lg group-hover:scale-110 transition-transform">
        {boton.icono}
        {boton.badge != null && boton.badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#e74c3c] text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {boton.badge > 9 ? "9+" : boton.badge}
          </span>
        )}
      </span>
      {abierto && (
        <span className="ml-3 whitespace-nowrap font-medium text-[#2c3e50] group-hover:text-white flex items-center gap-2">
          {boton.label}
          {boton.badge != null && boton.badge > 0 && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#e74c3c] text-white text-[9px] font-bold flex items-center justify-center">
              {boton.badge > 9 ? "9+" : boton.badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({ abierto, setAbierto }: SidebarProps) {
  const { rol, puedeVerPedidosTienda } = useRol();
  const { logoUrl, cargandoLogo } = useLogo();
  const [administracionAbierta, setAdministracionAbierta] = useState(false);
  const { count: pedidosPendientesVenta, tieneAcceso: badgePedidosTienda } =
    usePedidosTiendaPendientesVenta();

  if (rol?.tipo === "cliente") return null;

  const itemIphonetec = puedeVerPedidosTienda
    ? [{ label: "iPhoneTEC", icono: "🛒", href: "/iphonetec" }]
    : [];

  const badgeVentas = badgePedidosTienda && pedidosPendientesVenta > 0 ? pedidosPendientesVenta : undefined;

  const botonesAdmin: BotonMenu[] = [
    { label: "Inicio", icono: "🏠", href: "/" },
    { label: "Ventas General", icono: "💰", href: "/ventas-general", badge: badgeVentas },
    { label: "Orden de trabajo", icono: "📝", href: "/ingreso" },
    { label: "Gestion de Ordenes", icono: "🔧", href: "/gestion-trabajos" },
    { label: "Administrar $ ordenes", icono: "💵", href: "/resumen" },
    { label: "Cuenta Corriente", icono: "📊", href: "/cuenta" },
    { label: "Gestion de Pagos", icono: "💳", href: "/pagos" },
    // Aquí va el menú desplegable de Administración
    { label: "Venta de teléfonos", icono: "📱", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Stock Gral", icono: "🏪", href: "/ventas/stock-accesorios-repuestos" },
    ...itemIphonetec,
    { label: "Stock Repuestos (Sheet)", icono: "📋", href: "/integracion-sheet/stock-sheet" },
    { label: "Clientes", icono: "👥", href: "/clientes" },
    { label: "Configuraciones", icono: "⚙️", href: "/configuraciones" },
  ];

  const subMenuAdministracion = [
    { label: "Caja Diaria", icono: "💰", href: "/caja-diaria", soloAdmin: false },
    { label: "Caja Mayor", icono: "💎", href: "/caja-mayor", soloAdmin: true },
    { label: "Resumen de Cuenta", icono: "📈", href: "/resumen-cuenta", soloAdmin: true },
    { label: "Proveedores", icono: "🏭", href: "/proveedores", soloAdmin: true },
  ];
 
  const botonesEmpleado: BotonMenu[] = [
    { label: "Inicio", icono: "🏠", href: "/" },
    { label: "Ingreso de trabajo", icono: "📝", href: "/ingreso" },
    { label: "Ventas General", icono: "💰", href: "/ventas-general", badge: badgeVentas },
    { label: "Gestión de Trabajos", icono: "🔧", href: "/gestion-trabajos" },
    { label: "Stock Repuestos (Sheet)", icono: "📋", href: "/integracion-sheet/stock-sheet" },
    { label: "Cuenta Corriente", icono: "📊", href: "/cuenta" },
    { label: "Venta de teléfonos", icono: "📱", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Stock Grl", icono: "🏪", href: "/ventas/stock-accesorios-repuestos" },
    ...itemIphonetec,
    { label: "Clientes", icono: "👥", href: "/clientes" },
    { label: "Gestion de Pagos", icono: "💳", href: "/pagos" },
    
  ];

  const botones = rol?.tipo === "admin" ? botonesAdmin : botonesEmpleado;

  // Filtrar submenú según rol
  const subMenuFiltrado = subMenuAdministracion.filter(
    item => !item.soloAdmin || rol?.tipo === "admin"
  );

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
          {botones.slice(0, 7).map((boton, i) => (
            <NavLink key={i} boton={boton} abierto={abierto} />
          ))}

          {/* Menú desplegable de Administración */}
          <div>
            <button
              onClick={() => setAdministracionAbierta(!administracionAbierta)}
              className="w-full flex items-center p-3 rounded-lg hover:bg-[#9b59b6] hover:text-white hover:shadow-md text-xs transition-all duration-200 group"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
              {abierto && (
                <>
                  <span className="ml-3 flex-1 text-left whitespace-nowrap font-medium text-[#2c3e50] group-hover:text-white">
                    Administración
                  </span>
                  <span className="text-xs group-hover:text-white">
                    {administracionAbierta ? "▼" : "▶"}
                  </span>
                </>
              )}
            </button>

            {/* Submenú desplegable */}
            {abierto && administracionAbierta && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-[#9b59b6] pl-2">
                {subMenuFiltrado.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center p-2 rounded-lg hover:bg-[#8e44ad] hover:text-white text-xs transition-all duration-200 group"
                  >
                    <span className="text-base">{item.icono}</span>
                    <span className="ml-2 whitespace-nowrap font-medium text-[#2c3e50] group-hover:text-white">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Resto de botones después de Administración */}
          {botones.slice(7).map((boton, i) => (
            <NavLink key={i + 7} boton={boton} abierto={abierto} />
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