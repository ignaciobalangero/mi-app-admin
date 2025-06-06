"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "../lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import { useLogo } from "@/app/components/LogoProvider";
import { useRol } from "@/lib/useRol"; // ✅ NUEVO

export default function Header() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
  const { logoUrl, cargandoLogo } = useLogo();
  const { rol, suscripcion } = useRol(); // ✅ NUEVO

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const esHistorial = pathname?.includes("/historial");

  // 🎨 Función para determinar color según días restantes
  const getColorSuscripcion = (dias: number | null) => {
    if (!dias) return "bg-gray-500";
    if (dias <= 7) return "bg-red-500 animate-pulse";
    if (dias <= 30) return "bg-yellow-500";
    return "bg-green-500";
  };

  // 🎨 Función para determinar texto según días restantes
  const getTextoSuscripcion = (dias: number | null, plan: string | null) => {
    if (!dias) return "Sin suscripción";
    if (dias <= 0) return "Suscripción vencida";
    if (dias === 1) return `${dias} día (${plan})`;
    return `${dias} días (${plan})`;
  };

  return (
    <div className="w-full py-3 px-4 bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] text-[#2c3e50] shadow-lg fixed top-0 left-0 z-50 flex justify-between items-center border-b-2 border-[#3498db]">
      
      {/* 🆕 CONTADOR DE SUSCRIPCIÓN - Arriba a la izquierda */}
      <div className="flex items-center gap-4">
        {rol?.tipo === "admin" && suscripcion && !loading && (
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getColorSuscripcion(suscripcion.diasRestantes)}`}></div>
            <span className="text-sm font-medium text-[#2c3e50]">
              {getTextoSuscripcion(suscripcion.diasRestantes, suscripcion.planActual)}
            </span>
            {suscripcion.diasRestantes && suscripcion.diasRestantes <= 7 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                ⚠️ Renovar pronto
              </span>
            )}
          </div>
        )}
        
        {rol?.tipo === "empleado" && suscripcion && !loading && (
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getColorSuscripcion(suscripcion.diasRestantes)}`}></div>
            <span className="text-sm font-medium text-[#2c3e50]">
              Plan: {getTextoSuscripcion(suscripcion.diasRestantes, suscripcion.planActual)}
            </span>
          </div>
        )}
      </div>

      {/* 🎨 LOGO - Centro */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        {cargandoLogo ? (
          <div className="h-10 w-28 bg-white/20 rounded-lg animate-pulse" />
        ) : logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-10 object-contain"
          />
        ) : (
          <div className="h-10 w-28 bg-white/10 border-2 border-white/20 rounded-lg text-center text-white text-xs flex items-center justify-center font-medium">
            Sin logo
          </div>
        )}
      </div>

      {/* 🚪 LOGOUT - Derecha */}
      <div className="flex justify-end items-center">
        {!loading && user && (
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
          >
            🚪 Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}