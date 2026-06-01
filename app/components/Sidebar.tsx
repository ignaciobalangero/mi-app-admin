"use client";

import Link from "next/link";
import { useState } from "react";
import { useRol } from "../../lib/useRol";
import { usePedidosTiendaPendientesVenta } from "@/lib/usePedidosTiendaPendientesVenta";
import { useAdminLayout } from "./AdminLayoutContext";

type BotonMenu = {
  label: string;
  icono: string;
  href: string;
  badge?: number;
};

function NavLink({
  boton,
  abierto,
  onNavigate,
}: {
  boton: BotonMenu;
  abierto: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={boton.href}
      onClick={onNavigate}
      className="group flex min-h-[44px] items-center rounded-lg p-3 text-xs text-[#2c3e50] transition-all duration-200 hover:bg-[#3498db] hover:text-white hover:shadow-md"
    >
      <span className="relative text-lg transition-transform group-hover:scale-110">
        {boton.icono}
        {boton.badge != null && boton.badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#e74c3c] px-0.5 text-[9px] font-bold leading-none text-white">
            {boton.badge > 9 ? "9+" : boton.badge}
          </span>
        )}
      </span>
      {abierto && (
        <span className="ml-3 flex items-center gap-2 whitespace-nowrap font-medium group-hover:text-white">
          {boton.label}
          {boton.badge != null && boton.badge > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e74c3c] px-1 text-[9px] font-bold text-white">
              {boton.badge > 9 ? "9+" : boton.badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const { rol, puedeVerPedidosTienda } = useRol();
  const [administracionAbierta, setAdministracionAbierta] = useState(false);
  const { count: pedidosPendientesVenta, tieneAcceso: badgePedidosTienda } =
    usePedidosTiendaPendientesVenta();
  const {
    mobileNavOpen,
    closeMobileNav,
    desktopExpanded,
    toggleDesktopExpanded,
  } = useAdminLayout();

  if (rol?.tipo === "cliente") return null;
  if (!rol) return null;

  const itemIphonetec = puedeVerPedidosTienda
    ? [{ label: "iPhoneTEC", icono: "🛒", href: "/iphonetec" }]
    : [];

  const badgeVentas =
    badgePedidosTienda && pedidosPendientesVenta > 0 ? pedidosPendientesVenta : undefined;

  const botonesAdmin: BotonMenu[] = [
    { label: "Inicio", icono: "🏠", href: "/" },
    { label: "Ventas General", icono: "💰", href: "/ventas-general", badge: badgeVentas },
    { label: "Orden de trabajo", icono: "📝", href: "/ingreso" },
    { label: "Gestion de Ordenes", icono: "🔧", href: "/gestion-trabajos" },
    { label: "Administrar $ ordenes", icono: "💵", href: "/resumen" },
    { label: "Cuenta Corriente", icono: "📊", href: "/cuenta" },
    { label: "Gestion de Pagos", icono: "💳", href: "/pagos" },
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
    { label: "Caja Diaria", icono: "💰", href: "/caja-diaria" },
    { label: "Venta de teléfonos", icono: "📱", href: "/ventas/telefonos" },
    { label: "Stock de teléfonos", icono: "📦", href: "/ventas/stock-telefonos" },
    { label: "Stock Grl", icono: "🏪", href: "/ventas/stock-accesorios-repuestos" },
    ...itemIphonetec,
    { label: "Clientes", icono: "👥", href: "/clientes" },
    { label: "Gestion de Pagos", icono: "💳", href: "/pagos" },
  ];

  const botones = rol?.tipo === "admin" ? botonesAdmin : botonesEmpleado;
  const subMenuFiltrado = subMenuAdministracion.filter(
    (item) => !item.soloAdmin || rol?.tipo === "admin"
  );

  const navAbierto = mobileNavOpen || desktopExpanded;
  const cerrarSiMobile = () => closeMobileNav();

  return (
    <aside
      className={`fixed left-0 top-16 z-50 flex h-[calc(100dvh-4rem)] flex-col overflow-hidden border-r-2 border-[#3498db] bg-gradient-to-b from-[#f0f2f5] to-[#e8eaed] text-[#2c3e50] shadow-xl transition-transform duration-300 ease-out ${
        mobileNavOpen ? "translate-x-0" : "-translate-x-full"
      } w-[min(100vw-3rem,17rem)] lg:translate-x-0 ${
        desktopExpanded ? "lg:w-64" : "lg:w-16"
      }`}
      aria-hidden={!mobileNavOpen ? undefined : false}
    >
      <button
        type="button"
        onClick={toggleDesktopExpanded}
        className="absolute right-3 top-3 z-50 hidden h-8 w-8 items-center justify-center rounded-lg bg-[#3498db] text-white shadow-md transition-all hover:scale-110 hover:bg-[#2980b9] lg:flex"
        title={desktopExpanded ? "Cerrar menú" : "Abrir menú"}
      >
        {desktopExpanded ? "⬅️" : "☰"}
      </button>

      <div className="flex items-center justify-between px-3 pt-3 lg:hidden">
        <span className="text-sm font-bold text-[#2c3e50]">Menú</span>
        <button
          type="button"
          onClick={closeMobileNav}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ecf0f1] text-lg"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <div className="hidden h-12 lg:block" />

      <nav className="scrollbar-thin scrollbar-thumb-[#3498db] scrollbar-track-[#e8eaed] flex flex-1 flex-col space-y-1 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {botones.slice(0, 7).map((boton, i) => (
          <NavLink
            key={i}
            boton={boton}
            abierto={navAbierto}
            onNavigate={cerrarSiMobile}
          />
        ))}

        {rol?.tipo === "admin" && (
          <div>
            <button
              type="button"
              onClick={() => setAdministracionAbierta(!administracionAbierta)}
              className="group flex min-h-[44px] w-full items-center rounded-lg p-3 text-xs transition-all duration-200 hover:bg-[#9b59b6] hover:text-white hover:shadow-md"
            >
              <span className="text-lg transition-transform group-hover:scale-110">📊</span>
              {navAbierto && (
                <>
                  <span className="ml-3 flex-1 whitespace-nowrap text-left font-medium text-[#2c3e50] group-hover:text-white">
                    Administración
                  </span>
                  <span className="text-xs group-hover:text-white">
                    {administracionAbierta ? "▼" : "▶"}
                  </span>
                </>
              )}
            </button>

            {navAbierto && administracionAbierta && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-[#9b59b6] pl-2">
                {subMenuFiltrado.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    onClick={cerrarSiMobile}
                    className="group flex min-h-[40px] items-center rounded-lg p-2 text-xs transition-all duration-200 hover:bg-[#8e44ad] hover:text-white"
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
        )}

        {botones.slice(7).map((boton, i) => (
          <NavLink
            key={i + 7}
            boton={boton}
            abierto={navAbierto}
            onNavigate={cerrarSiMobile}
          />
        ))}
      </nav>

      {navAbierto && (
        <div className="border-t border-[#d5dbdb] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="rounded-lg bg-[#e8eaed] p-2">
            <p className="text-center text-xs text-[#7f8c8d]">
              <span className="font-semibold text-[#2c3e50]">Rol:</span> {rol?.tipo}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
