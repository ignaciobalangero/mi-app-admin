"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";

export default function Header() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="w-full p-4 bg-gray-800 text-white shadow-md fixed top-0 left-0 z-50 flex justify-between items-center px-6">
      <Link href="/">
        <span className="text-lg font-bold hover:underline cursor-pointer">
          ← INICIO
        </span>
      </Link>

      <img src="/logo.png" alt="Logo" className="w-70 h-auto object-contain absolute left-1/2 transform -translate-x-1/2" />

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
