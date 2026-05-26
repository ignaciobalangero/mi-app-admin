"use client";

import { useRouter } from "next/navigation";
import { logout } from "../lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import { useLogo } from "@/app/components/LogoProvider";
import { useRol } from "@/lib/useRol";
import { useAdminLayout } from "@/app/components/AdminLayoutContext";

export default function Header() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { logoUrl, cargandoLogo } = useLogo();
  const { rol, suscripcion } = useRol();
  const { toggleMobileNav } = useAdminLayout();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const getColorSuscripcion = (dias: number | null) => {
    if (!dias) return "bg-gray-500";
    if (dias <= 7) return "bg-red-500 animate-pulse";
    if (dias <= 30) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTextoSuscripcion = (dias: number | null, plan: string | null) => {
    if (!dias) return "Sin suscripción";
    if (dias <= 0) return "Vencida";
    if (dias === 1) return `${dias}d (${plan})`;
    return `${dias}d (${plan})`;
  };

  const mostrarSuscripcion =
    (rol?.tipo === "admin" || rol?.tipo === "empleado") && suscripcion && !loading;

  return (
    <header className="fixed left-0 right-0 top-0 z-[60] flex h-16 items-center justify-between gap-2 border-b-2 border-[#3498db] bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-2 text-[#2c3e50] shadow-lg sm:px-4 pt-[env(safe-area-inset-top,0)]">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleMobileNav}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3498db] text-lg text-white shadow-md transition hover:bg-[#2980b9] lg:hidden touch-manipulation"
          aria-label="Abrir menú"
        >
          ☰
        </button>

        {mostrarSuscripcion && (
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <div
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${getColorSuscripcion(suscripcion.diasRestantes)}`}
            />
            <span className="truncate text-xs font-medium text-[#2c3e50] md:text-sm">
              {getTextoSuscripcion(suscripcion.diasRestantes, suscripcion.planActual)}
            </span>
            {suscripcion.diasRestantes != null && suscripcion.diasRestantes <= 7 && (
              <span className="hidden rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 md:inline">
                Renovar
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center px-1 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:px-4">
        {cargandoLogo ? (
          <div className="h-9 w-24 animate-pulse rounded-lg bg-white/20 sm:h-10 sm:w-28" />
        ) : logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-9 max-w-[120px] object-contain sm:h-10 sm:max-w-[180px]"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3498db] sm:h-10 sm:w-10">
              <span className="text-lg sm:text-xl">📋</span>
            </div>
            <span className="hidden text-base font-bold text-[#2c3e50] xs:inline sm:text-xl">
              GestiOne
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end">
        {!loading && user && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#e74c3c] to-[#c0392b] px-2.5 py-2 text-xs font-semibold text-white shadow-md transition hover:scale-[1.02] sm:gap-2 sm:px-4 sm:text-sm touch-manipulation"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        )}
      </div>
    </header>
  );
}
