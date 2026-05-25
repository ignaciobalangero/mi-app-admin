"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/auth";
import { cardTienda, inputTienda } from "../../tiendaUi";
import TiendaAuthShell from "../../components/TiendaAuthShell";

export default function TiendaRegistroCliente({ negocioID }: { negocioID: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const ret = params.get("return");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dniCuit, setDniCuit] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const destino =
    ret === "checkout"
      ? `/consulta-stock/${negocioID}?checkout=1`
      : `/consulta-stock/${negocioID}/cuenta`;

  const handleRegistro = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tienda/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocioId: negocioID, nombre, email, telefono, dniCuit, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.emailYaExiste) {
          throw new Error(
            "Este email ya está registrado. Andá a Iniciar sesión y usá la misma contraseña para activar la tienda."
          );
        }
        throw new Error(data.error || "No se pudo registrar.");
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push(destino);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al registrarse.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TiendaAuthShell negocioID={negocioID} titulo="Crear cuenta">
      <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-bold text-neutral-900">Crear cuenta</h1>
      <p className="mt-1 text-sm text-neutral-500">Registrate para comprar y ver tu historial.</p>
      <div className={`mt-6 space-y-3 ${cardTienda}`}>
        <input placeholder="Nombre completo *" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputTienda} />
        <input type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} className={inputTienda} />
        <input placeholder="Teléfono (con código de área) *" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputTienda} />
        <input placeholder="DNI / CUIT (opcional)" value={dniCuit} onChange={(e) => setDniCuit(e.target.value)} className={inputTienda} />
        <input type="password" placeholder="Contraseña (mín. 6 caracteres) *" value={password} onChange={(e) => setPassword(e.target.value)} className={inputTienda} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleRegistro()}
          className="w-full rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </div>
      <p className="mt-4 text-center text-sm text-neutral-600">
        ¿Ya tenés cuenta?{" "}
        <Link href={`/consulta-stock/${negocioID}/login${ret ? `?return=${ret}` : ""}`} className="font-semibold text-[#2563eb]">
          Iniciar sesión
        </Link>
      </p>
      <p className="mt-2 text-center">
        <Link href={`/consulta-stock/${negocioID}`} className="text-xs text-neutral-500 hover:underline">
          ← Volver a la tienda
        </Link>
      </p>
      </div>
    </TiendaAuthShell>
  );
}
