"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "../lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import { useLogo } from "@/app/components/LogoProvider"; // ✅ nuevo

export default function Header() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
  const { logoUrl, cargandoLogo } = useLogo(); // ✅ nuevo

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const esHistorial = pathname?.includes("/historial");

  return (
    <div className="w-full py-2 px-4 bg-gray-700 text-white shadow-md fixed top-0 left-0 z-50 flex justify-between items-center">
      
      {/* Logo centrado */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
  {cargandoLogo ? (
    <div className="h-12 w-32 bg-gray-400 rounded" />
  ) : logoUrl ? (
    <img
      src={logoUrl}
      alt="Logo"
      className="h-12 object-contain"
    />
  ) : (
    <div className="h-12 w-32 bg-red-300 rounded text-center text-black text-sm flex items-center justify-center">
      Sin logo
    </div>
  )}
</div>

      {/* Botón cerrar sesión a la derecha */}
      <div className="flex justify-end items-center w-full">
        {!loading && user && (
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-semibold transition"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}
