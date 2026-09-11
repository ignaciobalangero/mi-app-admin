"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { serverTimestamp, setDoc } from "firebase/firestore";
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

export default function ZingueriaRegisterPage() {
  const { user, loading } = useZingueriaSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreTaller, setNombreTaller] = useState("");
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
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      await setDoc(zUserRef(cred.user.uid), {
        email: email.trim().toLowerCase(),
        nombreTaller: nombreTaller.trim(),
        activo: true,
        ownerUid: cred.user.uid,
        creado: serverTimestamp(),
      });
      router.replace("/zingueria/app");
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code.includes("email-already-in-use")) {
        setError("Ese email ya está registrado.");
      } else if (code.includes("weak-password")) {
        setError("La contraseña tiene que tener al menos 6 caracteres.");
      } else {
        setError("No se pudo crear la cuenta. Probá de nuevo.");
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
        style={{ ...zCard, width: "100%", maxWidth: 420 }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🔩</div>
          <h1 style={{ margin: "8px 0 4px", fontSize: 28 }}>Crear taller</h1>
          <p style={{ margin: 0, color: zColors.muted, fontSize: 14 }}>
            Registrate en Zinguería
          </p>
        </div>
        <label style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
          Nombre del taller
          <input
            required
            value={nombreTaller}
            onChange={(e) => setNombreTaller(e.target.value)}
            style={{ ...zInput, marginTop: 6 }}
            placeholder="Ej. Zinguería López"
          />
        </label>
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
            minLength={6}
            autoComplete="new-password"
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
          {busy ? "Creando…" : "Crear cuenta"}
        </button>
        <p
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 13,
            color: zColors.muted,
          }}
        >
          ¿Ya tenés cuenta?{" "}
          <Link href="/zingueria/login" style={{ color: zColors.accent }}>
            Ingresá
          </Link>
        </p>
      </form>
    </div>
  );
}
