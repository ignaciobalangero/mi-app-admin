"use client";

import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";

export default function DebugPage() {
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    console.log("🔍 useAuthState:", { user, loading, error });

    if (loading) {
      console.log("⏳ Cargando autenticación...");
      return;
    }

    if (error) {
      console.log("❌ Error de autenticación:", error);
      return;
    }

    if (!user) {
      console.log("❌ No hay usuario autenticado");
      return;
    }

    console.log("✅ Usuario autenticado:", user.email);
  }, [user, loading, error]);

  return (
    <main className="pt-24 px-4 text-black">
      <h1 className="text-2xl font-bold mb-4">🧪 Página de Debug</h1>
      <p>Revisá la consola para ver el estado de autenticación.</p>
    </main>
  );
}
