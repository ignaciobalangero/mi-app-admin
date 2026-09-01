"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

type Props = {
  abierto: boolean;
  titulo?: string;
  onDetectado: (codigo: string) => void;
  onCerrar: () => void;
};

/** Escanea códigos de barras / QR con la cámara (ideal para IMEI en etiquetas). */
export default function EscanerCodigoBarras({
  abierto,
  titulo = "Escanear código",
  onDetectado,
  onCerrar,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectadoRef = useRef(onDetectado);
  const onCerrarRef = useRef(onCerrar);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const [videoListo, setVideoListo] = useState(false);

  useEffect(() => {
    onDetectadoRef.current = onDetectado;
    onCerrarRef.current = onCerrar;
  }, [onDetectado, onCerrar]);

  useEffect(() => {
    if (!abierto) {
      setVideoListo(false);
      return;
    }
    setVideoListo(true);
  }, [abierto]);

  useEffect(() => {
    if (!abierto || !videoListo || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;
    setError("");
    setIniciando(true);

    let activo = true;

    const iniciar = async () => {
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
          if (!activo) return;
          if (result) {
            const texto = result.getText().trim();
            if (texto) {
              activo = false;
              controls?.stop();
              onDetectadoRef.current(texto);
              onCerrarRef.current();
            }
          }
          if (err && !String(err).includes("NotFoundException")) {
            /* sin código en frame — normal */
          }
        });
      } catch (e) {
        console.warn("EscanerCodigoBarras:", e);
        if (activo) {
          setError(
            "No se pudo abrir la cámara. Revisá los permisos del navegador o ingresá el IMEI manualmente."
          );
        }
      } finally {
        if (activo) setIniciando(false);
      }
    };

    void iniciar();

    return () => {
      activo = false;
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [abierto, videoListo]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">📷 {titulo}</h3>
            <p className="text-xs text-white/80">Apuntá la cámara al código de barras del IMEI</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-4 bg-slate-950">
          <video
            ref={videoRef}
            className="w-full rounded-xl aspect-[4/3] object-cover bg-black"
            muted
            playsInline
            autoPlay
          />
          {iniciando ? (
            <p className="text-center text-slate-300 text-sm mt-3">Iniciando cámara…</p>
          ) : null}
          {error ? <p className="text-center text-red-300 text-sm mt-3">{error}</p> : null}
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
