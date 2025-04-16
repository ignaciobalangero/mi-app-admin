"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "../lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Header() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState("/logo.png");

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const esHistorial = pathname?.includes("/historial");

  useEffect(() => {
    const cargarLogo = async () => {
      const ref = doc(db, "configuracion", "global");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      }
    };
    cargarLogo();
  }, []);

  return (
    <div className="w-full p-4 bg-gray-800 text-white shadow-md fixed top-0 left-0 z-50 flex justify-between items-center px-6">
      <Link href={esHistorial ? "/clientes" : "/"}>
        <span className="text-lg font-bold hover:underline cursor-pointer">
          ← {esHistorial ? "ATRÁS" : "INICIO"}
        </span>
      </Link>

      <img
        src={logoUrl}
        alt="Logo"
        className="w-40 h-auto object-contain absolute left-1/2 transform -translate-x-1/2"
      />

      {!loading && user && (
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-semibold transition"
        >
          Cerrar sesión
        </button>
      )}
    </div>
  );
}
