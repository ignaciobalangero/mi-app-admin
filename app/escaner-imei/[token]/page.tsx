"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EscanerCodigoBarras from "@/components/EscanerCodigoBarras";

function grupos(imei: string): string {
  return imei.replace(/(\d{6})(?=\d)/g, "$1 ").trim();
}

export default function EscanerImeiCelularPage() {
  const params = useParams();
  const token = String(params?.token || "");
  const [escaneando, setEscaneando] = useState(false);
  const [ultimo, setUltimo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!/^[a-f0-9]{32}$/.test(token)) return;
    let cancelado = false;
    const ping = async () => {
      try {
        const res = await fetch("/api/escaner-imei", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "ping", token }),
        });
        if ((res.status === 404 || res.status === 410) && !cancelado) {
          const data = await res.json().catch(() => ({}));
          setError(String(data.error || "El link venció. Generá otro QR en la computadora."));
        }
      } catch {
        if (!cancelado) setError("Sin conexión. Revisá el Wi‑Fi del celular.");
      }
    };
    void ping();
    const id = window.setInterval(() => void ping(), 5000);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, [token]);

  const enviar = async (imei: string) => {
    setEscaneando(false);
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/escaner-imei", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "enviar", token, imei }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error || "No se pudo pasar el IMEI a la computadora."));
        setUltimo("");
        return;
      }
      setUltimo(String(data.imei || imei));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(40);
      }
    } catch {
      setError("Sin conexión. El IMEI no llegó a la computadora.");
    } finally {
      setEnviando(false);
    }
  };

  if (!/^[a-f0-9]{32}$/.test(token)) {
    return (
      <main className="min-h-dvh bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-center text-lg">Este link no es válido. Generá otro QR en la computadora.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-white flex flex-col px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <p className="text-emerald-300 text-sm font-semibold tracking-wide">Gestione</p>
      <h1 className="text-3xl font-bold mt-2 leading-tight">Escáner de IMEI</h1>
      <p className="text-slate-300 mt-2 text-base leading-relaxed">
        Usá la cámara de atrás. Apuntá al código de barras de la caja o de la bandeja del equipo.
        El número aparece solo en la computadora.
      </p>

      <button
        type="button"
        onClick={() => {
          setError("");
          setEscaneando(true);
        }}
        disabled={enviando}
        className="mt-8 w-full rounded-2xl bg-emerald-500 text-slate-950 text-xl font-bold py-5 active:bg-emerald-400 disabled:opacity-50"
      >
        {ultimo ? "Escanear otro" : "Abrir cámara"}
      </button>

      {enviando ? <p className="mt-6 text-center text-slate-300">Pasando el número a la computadora…</p> : null}

      {ultimo && !enviando ? (
        <div className="mt-6 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 p-5">
          <p className="text-emerald-300 font-semibold">Listo, ya está en la computadora</p>
          <p className="mt-2 text-2xl font-mono tracking-wide">{grupos(ultimo)}</p>
          <p className="mt-3 text-sm text-slate-300">
            Cuando cargues el próximo teléfono, tocá Escanear otro.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-6 text-center text-red-300">{error}</p> : null}

      <EscanerCodigoBarras
        abierto={escaneando}
        titulo="IMEI del equipo"
        modo="imei"
        onDetectado={(codigo) => void enviar(codigo)}
        onCerrar={() => setEscaneando(false)}
      />
    </main>
  );
}
