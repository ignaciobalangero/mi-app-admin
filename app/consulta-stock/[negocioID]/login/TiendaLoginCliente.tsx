"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/auth";
import { cardTienda, inputTienda } from "../../tiendaUi";
import TiendaAuthShell from "../../components/TiendaAuthShell";

function mensajeErrorAuth(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Email o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";
    default:
      return "No se pudo iniciar sesión. Verificá email y contraseña.";
  }
}

export default function TiendaLoginCliente({ negocioID }: { negocioID: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const ret = params.get("return");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activar, setActivar] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const destino =
    ret === "checkout"
      ? `/consulta-stock/${negocioID}?checkout=1`
      : `/consulta-stock/${negocioID}/cuenta`;

  const activarCuentaTienda = async (token: string) => {
    const res = await fetch("/api/tienda/activar-cuenta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ negocioId: negocioID, nombre, telefono }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo activar la cuenta.");
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();

      const estadoRes = await fetch(
        `/api/tienda/perfil-estado?negocioId=${encodeURIComponent(negocioID)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const estado = await estadoRes.json();

      if (!estadoRes.ok) {
        throw new Error(estado.error || "No se pudo verificar la cuenta.");
      }

      if (estado.tienePerfil) {
        router.push(destino);
        return;
      }

      if (activar) {
        if (!nombre.trim() || telefono.replace(/\D/g, "").length < 10) {
          setError("Completá nombre y teléfono para activar la tienda.");
          setLoading(false);
          return;
        }
        await activarCuentaTienda(token);
        router.push(destino);
        return;
      }

      setActivar(true);
      if (estado.nombreSugerido && !nombre) setNombre(estado.nombreSugerido);
      if (estado.telefonoSugerido && !telefono) setTelefono(estado.telefonoSugerido);
      setError("");
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code?.startsWith("auth/")) {
        setError(mensajeErrorAuth(code));
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("No se pudo iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TiendaAuthShell negocioID={negocioID} titulo="Iniciar sesión">
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-xl font-bold text-neutral-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cuenta de la tienda. Si ya usás Gestione con el mismo mail, entrá con la misma contraseña.
        </p>
        <div className={`mt-6 space-y-3 ${cardTienda}`}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputTienda}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputTienda}
            autoComplete="current-password"
          />
          {activar && (
            <>
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                Tu email ya tiene cuenta en Gestione. Completá tus datos para activar la tienda{" "}
                <strong>{negocioID}</strong> (no cambia tu acceso al panel).
              </p>
              <input
                placeholder="Nombre completo *"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputTienda}
              />
              <input
                placeholder="Teléfono *"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={inputTienda}
              />
            </>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleLogin()}
            className="w-full rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Entrando…" : activar ? "Activar tienda y entrar" : "Entrar"}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-neutral-600">
          ¿Email nuevo para la tienda?{" "}
          <Link
            href={`/consulta-stock/${negocioID}/registro${ret ? `?return=${ret}` : ""}`}
            className="font-semibold text-[#2563eb]"
          >
            Registrate
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link
            href={`/consulta-stock/${negocioID}`}
            className="text-xs text-neutral-500 hover:underline"
          >
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </TiendaAuthShell>
  );
}
