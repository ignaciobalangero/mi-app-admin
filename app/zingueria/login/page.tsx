"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { zUserRef } from "@/lib/zingueria/paths";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import {
  Spinner,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
  zShell,
} from "@/lib/zingueria/ui";

export default function ZingueriaLoginPage() {
  const { user, loading } = useZingueriaSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/zingueria/app");
  }, [user, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const snap = await getDoc(zUserRef(cred.user.uid));
      if (!snap.exists() || snap.data()?.activo !== true) {
        await signOut(auth);
        setError(
          "No hay un perfil de Zinguería activo para esta cuenta. Registrate primero."
        );
        return;
      }
      router.replace("/zingueria/app");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "error";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setError("Email o contraseña incorrectos.");
      } else {
        setError("No se pudo iniciar sesión. Probá de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div
      style={{
        ...zShell,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(ellipse at top, #164e63 0%, #0f172a 55%)",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{ ...zCard, width: "100%", maxWidth: 400 }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🔩</div>
          <h1 style={{ margin: "8px 0 4px", fontSize: 28 }}>Zinguería</h1>
          <p style={{ margin: 0, color: zColors.muted, fontSize: 14 }}>
            Ingresá a tu taller
          </p>
        </div>
        <label style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...zInput, marginTop: 6 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
          Contraseña
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...zInput, marginTop: 6 }}
          />
        </label>
        {error && (
          <p style={{ color: zColors.danger, fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          style={{ ...zBtnPrimary, width: "100%", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
        <p
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 13,
            color: zColors.muted,
          }}
        >
          ¿No tenés cuenta?{" "}
          <Link href="/zingueria/register" style={{ color: zColors.accent }}>
            Registrate
          </Link>
        </p>
      </form>
    </div>
  );
}
