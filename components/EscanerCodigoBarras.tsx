"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

type Props = {
  abierto: boolean;
  titulo?: string;
  onDetectado: (codigo: string) => void;
  onCerrar: () => void;
};

type CamaraInfo = {
  deviceId: string;
  label: string;
  esFrontal: boolean;
};

function esDispositivoMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function inferirEsFrontal(label: string): boolean {
  const l = label.toLowerCase();
  if (/back|rear|environment|trasera|trás|wide angle/i.test(l)) return false;
  if (/front|face|user|facetime|isight|integrated|built-in|selfie/i.test(l)) return true;
  return !esDispositivoMobile();
}

function ordenarCamaras(devices: MediaDeviceInfo[], preferirTrasera: boolean): CamaraInfo[] {
  const lista = devices
    .filter((d) => d.kind === "videoinput" && d.deviceId)
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label?.trim() || `Cámara ${i + 1}`,
      esFrontal: inferirEsFrontal(d.label || ""),
    }));

  return lista.sort((a, b) => {
    if (preferirTrasera) {
      if (a.esFrontal !== b.esFrontal) return a.esFrontal ? 1 : -1;
    } else {
      if (a.esFrontal !== b.esFrontal) return a.esFrontal ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
}

async function listarCamaras(): Promise<CamaraInfo[]> {
  const preferirTrasera = esDispositivoMobile();
  let devices: MediaDeviceInfo[] = [];

  try {
    devices = await BrowserMultiFormatReader.listVideoInputDevices();
  } catch {
    devices = [];
  }

  if (devices.length === 0 || devices.every((d) => !d.label)) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      devices = await BrowserMultiFormatReader.listVideoInputDevices();
    } catch {
      /* permiso denegado */
    }
  }

  const ordenadas = ordenarCamaras(devices, preferirTrasera);
  if (ordenadas.length > 0) return ordenadas;

  throw new Error("No se encontró ninguna cámara");
}

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
  const [camaras, setCamaras] = useState<CamaraInfo[]>([]);
  const [camaraId, setCamaraId] = useState("");

  useEffect(() => {
    onDetectadoRef.current = onDetectado;
    onCerrarRef.current = onCerrar;
  }, [onDetectado, onCerrar]);

  useEffect(() => {
    if (!abierto) {
      setVideoListo(false);
      setCamaras([]);
      setCamaraId("");
      setError("");
      return;
    }

    let cancelado = false;

    const cargar = async () => {
      setIniciando(true);
      setError("");
      try {
        const lista = await listarCamaras();
        if (cancelado) return;
        setCamaras(lista);
        setCamaraId(lista[0]?.deviceId || "");
        setVideoListo(true);
      } catch (e) {
        if (cancelado) return;
        console.warn("EscanerCodigoBarras listar:", e);
        setError(
          "No se pudo acceder a la cámara. Revisá los permisos del navegador o ingresá el IMEI manualmente."
        );
      } finally {
        if (!cancelado) setIniciando(false);
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [abierto]);

  const camaraActiva = camaras.find((c) => c.deviceId === camaraId) || camaras[0];
  const espejarVideo = camaraActiva?.esFrontal ?? !esDispositivoMobile();

  useEffect(() => {
    if (!abierto || !videoListo || !videoRef.current || !camaraId) return;

    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;
    setError("");
    setIniciando(true);

    let activo = true;

    const iniciar = async () => {
      try {
        controls = await reader.decodeFromConstraints(
          {
            video: {
              deviceId: { exact: camaraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current!,
          (result, err) => {
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
          }
        );
      } catch (e) {
        console.warn("EscanerCodigoBarras:", e);
        if (activo) {
          setError(
            "No se pudo usar esta cámara. Probá otra cámara en el selector o ingresá el IMEI manualmente."
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
  }, [abierto, videoListo, camaraId]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">📷 {titulo}</h3>
            <p className="text-xs text-white/80">
              {esDispositivoMobile()
                ? "Apuntá la cámara al código de barras del IMEI"
                : "En Mac usá la cámara frontal (FaceTime) y acercá bien el código"}
            </p>
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

        <div className="p-4 bg-slate-950 space-y-3">
          {camaras.length > 1 ? (
            <label className="block text-xs text-slate-300">
              Cámara
              <select
                value={camaraId}
                onChange={(e) => setCamaraId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 text-white text-sm px-3 py-2"
              >
                {camaras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label}
                    {c.esFrontal ? " (frontal)" : " (trasera)"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              style={espejarVideo ? { transform: "scaleX(-1)" } : undefined}
              muted
              playsInline
              autoPlay
            />
            <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-white/40 rounded-lg" />
          </div>

          {iniciando ? (
            <p className="text-center text-slate-300 text-sm">Iniciando cámara…</p>
          ) : null}
          {error ? <p className="text-center text-red-300 text-sm">{error}</p> : null}
          {!error && espejarVideo ? (
            <p className="text-center text-slate-400 text-[11px]">
              Vista espejada para que sea más natural con la cámara frontal.
            </p>
          ) : null}
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
