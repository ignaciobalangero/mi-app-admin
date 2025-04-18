"use client";

import { useEffect } from "react";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function DebugPage() {
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    console.log("🧪 Debug de Firebase Auth:");
    console.log("👤 Usuario:", user);
    console.log("⌛ Loading:", loading);
    console.log("❌ Error:", error);
  }, [user, loading, error]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">🧪 Debug de Autenticación</h1>
      <p><strong>Usuario:</strong> {user?.email ?? "No logueado"}</p>
      <p><strong>Loading:</strong> {loading ? "Cargando..." : "Listo"}</p>
      <p><strong>Error:</strong> {error ? error.message : "Sin errores"}</p>
    </main>
  );
}
