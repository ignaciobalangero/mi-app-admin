"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";

type Props = {
  negocioID: string;
  onImei: (imei: string) => void;
};

export default function PanelEscanerCelular({ negocioID, onImei }: Props) {
  const [user] = useAuthState(auth);
  const [abierto, setAbierto] = useState(false);
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [ultimo, setUltimo] = useState("");
  const [copiado, setCopiado] = useState(false);
  const seqVisto = useRef(0);
  const onImeiRef = useRef(onImei);
  onImeiRef.current = onImei;

  useEffect(() => {
    if (!abierto || !user || !negocioID) return;
    let cancelado = false;
    let token = "";

    const crear = async () => {
      setCargando(true);
      setError("");
      setQr("");
      setConectado(false);
      setUltimo("");
      seqVisto.current = 0;
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/escaner-imei", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ accion: "crear", negocioID }),
        });
        const data = await res.json();
        if (!res.ok || !data.token) {
          throw new Error(String(data.error || "No se pudo armar el QR."));
        }
        token = String(data.token);
        const link = `${window.location.origin}/escaner-imei/${token}`;
        if (cancelado) return;
        setUrl(link);
        setQr(await QRCode.toDataURL(link, { width: 220, margin: 1 }));
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo armar el QR.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void crear();

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
        const imei = String(data.imei || "");
        if (seq > seqVisto.current && imei) {
          seqVisto.current = seq;
          setUltimo(imei);
          onImeiRef.current(imei);
        }
      } catch {
        /* el próximo intento */
      }
    };

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

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="px-3 py-2 rounded-lg border border-[#3498db] bg-[#ebf5fb] text-[#1a5276] text-sm font-semibold hover:bg-[#d6eaf8]"
      >
        {abierto ? "Cerrar escáner del celular" : "📱 Escanear con el celular"}
      </button>

      {abierto ? (
        <div className="mt-2 rounded-xl border border-[#aed6f1] bg-[#f4f9fd] p-3 text-sm text-[#2c3e50]">
          <p className="font-semibold">El celular lee el código y lo carga acá</p>
          <p className="text-[#5d6d7e] mt-1">
            Con la cámara del teléfono, escaneá este QR. Se abre el escáner de atrás, apuntás al
            código del equipo y el IMEI se escribe solo en esta ficha.
          </p>

          {cargando ? <p className="mt-3 text-[#7f8c8d]">Armando el QR…</p> : null}
          {error ? <p className="mt-3 text-red-600">{error}</p> : null}

          {qr ? (
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR para abrir el escáner en el celular" className="w-44 h-44 bg-white rounded-lg border border-[#d4e6f1]" />
              <div className="space-y-2">
                <p className={conectado ? "text-emerald-700 font-semibold" : "text-[#7f8c8d]"}>
                  {conectado ? "Celular conectado. Apuntá al código." : "Esperando que abras el link en el celular."}
                </p>
                {ultimo ? (
                  <p className="font-mono text-base font-semibold text-emerald-800">Cargado: {ultimo}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void copiar()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#85c1e9] text-[#1a5276] text-xs font-semibold"
                >
                  {copiado ? "Link copiado" : "Copiar link"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
