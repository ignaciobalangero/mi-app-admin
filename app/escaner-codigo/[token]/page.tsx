"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EscanerCodigoBarras from "@/components/EscanerCodigoBarras";

export default function EscanerCodigoCelularPage() {
  const params = useParams();
  const token = String(params?.token || "");
  const [escaneando, setEscaneando] = useState(false);
  const [ultimo, setUltimo] = useState("");
  const [error, setError] = useState("");

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

  const enviar = async (codigo: string) => {
    setError("");
    try {
      const res = await fetch("/api/escaner-imei", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "enviar", token, codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEscaneando(false);
        setError(String(data.error || "No se pudo pasar el código a la computadora."));
        return;
      }
      setUltimo(String(data.codigo || codigo));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(40);
      }
    } catch {
      setEscaneando(false);
      setError("Sin conexión. El código no llegó a la computadora.");
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
      <h1 className="text-3xl font-bold mt-2 leading-tight">Escáner de stock</h1>
      <p className="text-slate-300 mt-2 text-base leading-relaxed">
        Usá la cámara de atrás. Apuntá al código de barras o al QR de la etiqueta. Cada lectura
        llega sola a la computadora.
      </p>

      <button
        type="button"
        onClick={() => {
          setError("");
          setEscaneando(true);
        }}
        className="mt-8 w-full rounded-2xl bg-emerald-500 text-slate-950 text-xl font-bold py-5 active:bg-emerald-400"
      >
        {ultimo ? "Seguir escaneando" : "Abrir cámara"}
      </button>

      {ultimo ? (
        <div className="mt-6 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 p-5">
          <p className="text-emerald-300 font-semibold">Último código en la computadora</p>
          <p className="mt-2 text-lg font-mono break-all">{ultimo}</p>
        </div>
      ) : null}

      {error ? <p className="mt-6 text-center text-red-300">{error}</p> : null}

      <EscanerCodigoBarras
        abierto={escaneando}
        titulo="Código del producto"
        modo="codigo"
        mantenerAbierto
        onDetectado={(codigo) => void enviar(codigo)}
        onCerrar={() => setEscaneando(false)}
      />
    </main>
  );
}
