"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";

type Props = {
  negocioID: string;
  abierto: boolean;
  onCerrar: () => void;
  onCodigo: (codigo: string) => void;
  onCamaraLocal?: () => void;
};

export default function PanelEscanerCodigo({
  negocioID,
  abierto,
  onCerrar,
  onCodigo,
  onCamaraLocal,
}: Props) {
  const [user] = useAuthState(auth);
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [ultimo, setUltimo] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const seqVisto = useRef(0);
  const onCodigoRef = useRef(onCodigo);
  onCodigoRef.current = onCodigo;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!abierto || !user || !negocioID) return;
    let cancelado = false;
    let token = "";

    const crear = async () => {
      setCargando(true);
      setError("");
      setQr("");
      setUrl("");
      setConectado(false);
      setUltimo("");
      setMinimizado(false);
      seqVisto.current = 0;
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/escaner-imei", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ accion: "crear", negocioID, modo: "codigo" }),
        });
        const data = await res.json();
        if (!res.ok || !data.token) {
          throw new Error(String(data.error || "No se pudo armar el QR."));
        }
        token = String(data.token);
        const link = `${window.location.origin}/escaner-codigo/${token}`;
        if (cancelado) return;
        setUrl(link);
        setQr(await QRCode.toDataURL(link, { width: 220, margin: 1 }));
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo armar el QR.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    const leer = async () => {
      if (!token || cancelado) return;
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(
          `/api/escaner-imei?token=${encodeURIComponent(token)}&negocioID=${encodeURIComponent(negocioID)}`,
          { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelado) return;
        setConectado(Boolean(data.conectado));
        const seq = Number(data.seq || 0);
        const codigo = String(data.codigo || "");
        if (seq > seqVisto.current && codigo) {
          seqVisto.current = seq;
          setUltimo(codigo);
          setMinimizado(true);
          onCodigoRef.current(codigo);
        }
      } catch {
        /* el próximo intento */
      }
    };

    void crear();
    const id = window.setInterval(() => void leer(), 1000);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, [abierto, user, negocioID]);

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar el link.");
    }
  };

  if (!abierto || !mounted) return null;

  if (minimizado) {
    return createPortal(
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2147482990] w-[min(100%-1.5rem,28rem)] rounded-2xl bg-[#1a5276] text-white shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{conectado ? "Celular conectado" : "Esperando el celular"}</p>
          {ultimo ? <p className="text-xs text-white/80 truncate">{ultimo}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setMinimizado(false)}
          className="text-xs font-semibold px-2 py-1 rounded-lg bg-white/15"
        >
          QR
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="h-8 w-8 rounded-lg bg-white/15 text-lg leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[2147482990] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-[#d4e6f1] p-4 text-sm text-[#2c3e50]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-base">Escanear con el celular</p>
            <p className="text-[#5d6d7e] mt-1">
              Con la cámara del teléfono, leé este QR. Después apuntá al código del accesorio o
              repuesto. La lectura llega acá.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="h-9 w-9 rounded-lg bg-[#f4f6f7] text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {cargando ? <p className="mt-3 text-[#7f8c8d]">Armando el QR…</p> : null}
        {error ? <p className="mt-3 text-red-600">{error}</p> : null}

        {qr ? (
          <div className="mt-3 flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR para abrir el escáner en el celular"
              className="w-44 h-44 bg-white rounded-lg border border-[#d4e6f1]"
            />
            <p className={conectado ? "text-emerald-700 font-semibold text-center" : "text-[#7f8c8d] text-center"}>
              {conectado
                ? "Celular conectado. Seguí apuntando a los códigos."
                : "Esperando que abras el link en el celular."}
            </p>
            {ultimo ? (
              <p className="font-mono text-xs text-center break-all text-emerald-800">Último: {ultimo}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void copiar()}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#85c1e9] text-[#1a5276] text-xs font-semibold"
            >
              {copiado ? "Link copiado" : "Copiar link"}
            </button>
          </div>
        ) : null}

        {onCamaraLocal ? (
          <button
            type="button"
            onClick={onCamaraLocal}
            className="mt-4 w-full px-3 py-2 rounded-lg border border-[#bdc3c7] bg-[#f8f9f9] text-[#2c3e50] text-sm font-semibold"
          >
            Cámara de este equipo
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
