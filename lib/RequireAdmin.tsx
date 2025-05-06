"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./auth";
import { useRol } from "./useRol";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [user, loadingUser] = useAuthState(auth);
  const { rol } = useRol(); // ✅ hacemos destructuring
  const router = useRouter();

  useEffect(() => {
    if (!loadingUser && rol !== null && (!user || rol?.tipo !== "admin")) {
      router.replace("/");
    }
  }, [user, loadingUser, rol, router]);

  if (loadingUser || rol?.tipo === null) {
    return <p className="text-center text-white mt-10">Cargando acceso...</p>;
  }

  return <>{children}</>;
}
