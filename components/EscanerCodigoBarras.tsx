"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  InvertedLuminanceSource,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";

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

function inferirEsFrontal(label: string, facingMode?: string): boolean {
  if (facingMode === "user") return true;
  if (facingMode === "environment") return false;
  const l = label.toLowerCase();
  if (/back|rear|environment|trasera|trás|wide angle|telephoto/i.test(l)) return false;
  if (/front|face|user|facetime|isight|integrated|built-in|selfie|continuity/i.test(l)) return true;
  return !esDispositivoMobile();
}

function crearLector(): MultiFormatReader {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.CODABAR,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.QR_CODE,
  ]);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

function decodificarCanvas(canvas: HTMLCanvasElement, reader: MultiFormatReader): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const { width, height } = canvas;
  if (width < 8 || height < 8) return null;

  const imageData = ctx.getImageData(0, 0, width, height);
  const base = new RGBLuminanceSource(imageData.data, width, height);

  for (const invertir of [false, true]) {
    const source = invertir ? new InvertedLuminanceSource(base) : base;
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    try {
      const texto = reader.decodeWithState(bitmap).getText().trim();
      if (texto) return texto;
    } catch {
      /* siguiente variante */
    }
  }

  return null;
}

type Recorte = "completo" | "centro";

function capturarFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  opts: { espejarHorizontal: boolean; recorte: Recorte }
): boolean {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h || video.readyState < 2) return false;

  let sx = 0;
  let sy = 0;
  let sw = w;
  let sh = h;

  if (opts.recorte === "centro") {
    sw = Math.floor(w * 0.82);
    sh = Math.floor(h * 0.5);
    sx = Math.floor((w - sw) / 2);
    sy = Math.floor((h - sh) / 2);
  }

  canvas.width = sw;
  canvas.height = sh;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (opts.espejarHorizontal) {
    ctx.translate(sw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  return true;
}

async function listarCamarasDisponibles(): Promise<CamaraInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "videoinput" && d.deviceId)
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label?.trim() || `Cámara ${i + 1}`,
      esFrontal: inferirEsFrontal(d.label || ""),
    }));
}

async function abrirStreamCamara(
  deviceIdPreferido?: string,
  preferirFrontal = !esDispositivoMobile()
): Promise<{ stream: MediaStream; info: CamaraInfo }> {
  const intentos: MediaStreamConstraints[] = [];

  if (deviceIdPreferido) {
    intentos.push({
      video: {
        deviceId: { exact: deviceIdPreferido },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    intentos.push({
      video: {
        deviceId: { ideal: deviceIdPreferido },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  }

  if (preferirFrontal) {
    intentos.push({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } else {
    intentos.push({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  }

  intentos.push({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
  intentos.push({ video: true });

  let ultimoError: unknown;
  for (const constraints of intentos) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const deviceId = settings.deviceId || deviceIdPreferido || "";
      const label = track.label?.trim() || "Cámara activa";
      const esFrontal = inferirEsFrontal(label, settings.facingMode);
      return {
        stream,
        info: { deviceId, label, esFrontal },
      };
    } catch (e) {
      ultimoError = e;
    }
  }

  throw ultimoError ?? new Error("No se pudo abrir la cámara");
}

/** Escanea códigos de barras con la cámara activa (misma que se ve en pantalla). */
export default function EscanerCodigoBarras({
  abierto,
  titulo = "Escanear código",
  onDetectado,
  onCerrar,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const onDetectadoRef = useRef(onDetectado);
  const onCerrarRef = useRef(onCerrar);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const [camaras, setCamaras] = useState<CamaraInfo[]>([]);
  const [camaraActiva, setCamaraActiva] = useState<CamaraInfo | null>(null);
  const [camaraId, setCamaraId] = useState("");

  useEffect(() => {
    onDetectadoRef.current = onDetectado;
    onCerrarRef.current = onCerrar;
  }, [onDetectado, onCerrar]);

  const detenerStream = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!abierto) {
      detenerStream();
      setCamaras([]);
      setCamaraActiva(null);
      setCamaraId("");
      setError("");
      setIniciando(false);
      return;
    }

    let cancelado = false;

    const iniciar = async () => {
      setIniciando(true);
      setError("");
      detenerStream();

      try {
        const { stream, info } = await abrirStreamCamara(undefined, !esDispositivoMobile());
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setCamaraActiva(info);
        setCamaraId(info.deviceId);

        const lista = await listarCamarasDisponibles();
        if (cancelado) return;
        setCamaras(lista.length > 0 ? lista : [info]);

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
      } catch (e) {
        if (cancelado) return;
        console.warn("EscanerCodigoBarras abrir:", e);
        setError(
          "No se pudo abrir la cámara. Revisá permisos en Safari/Chrome (Cámara) o ingresá el IMEI manualmente."
        );
      } finally {
        if (!cancelado) setIniciando(false);
      }
    };

    void iniciar();
    return () => {
      cancelado = true;
      detenerStream();
    };
  }, [abierto, detenerStream]);

  useEffect(() => {
    if (!abierto || !camaraId || !camaraActiva || !videoRef.current || !canvasRef.current) return;
    if (iniciando) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const reader = crearLector();
    let activo = true;
    let ultimoIntento = 0;

    const loop = (ts: number) => {
      if (!activo) return;
      if (ts - ultimoIntento >= 100) {
        ultimoIntento = ts;
        const espejos = camaraActiva.esFrontal ? [false, true] : [false, true];
        const recortes: Recorte[] = ["centro", "completo"];

        for (const recorte of recortes) {
          for (const espejar of espejos) {
            if (!capturarFrame(video, canvas, ctx, { espejarHorizontal: espejar, recorte })) continue;
            const texto = decodificarCanvas(canvas, reader);
            if (texto) {
              activo = false;
              detenerStream();
              onDetectadoRef.current(texto);
              onCerrarRef.current();
              return;
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      activo = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [abierto, camaraId, camaraActiva, iniciando, detenerStream]);

  const cambiarCamara = async (nuevoId: string) => {
    if (!nuevoId || nuevoId === camaraId) return;
    setIniciando(true);
    setError("");
    detenerStream();

    try {
      const cam = camaras.find((c) => c.deviceId === nuevoId);
      const { stream, info } = await abrirStreamCamara(
        nuevoId,
        cam?.esFrontal ?? !esDispositivoMobile()
      );
      streamRef.current = stream;
      setCamaraActiva(info);
      setCamaraId(info.deviceId);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch (e) {
      console.warn("EscanerCodigoBarras cambiar:", e);
      setError("No se pudo cambiar a esa cámara. Probá otra.");
    } finally {
      setIniciando(false);
    }
  };

  if (!abierto) return null;

  const espejarPreview = camaraActiva?.esFrontal ?? !esDispositivoMobile();

  return (
    <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">📷 {titulo}</h3>
            <p className="text-xs text-white/80">
              Centrá el código en el recuadro. Usamos la misma cámara que ves en pantalla.
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
          {camaraActiva ? (
            <p className="text-xs text-emerald-300">
              Cámara activa: <strong>{camaraActiva.label}</strong>
            </p>
          ) : null}

          {camaras.length > 0 ? (
            <label className="block text-xs text-slate-300">
              Cambiar cámara
              <select
                value={camaraId}
                disabled={iniciando}
                onChange={(e) => void cambiarCamara(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 text-white text-sm px-3 py-2 disabled:opacity-50"
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
              style={espejarPreview ? { transform: "scaleX(-1)" } : undefined}
              muted
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden />
            <div className="pointer-events-none absolute inset-x-[9%] top-[25%] bottom-[25%] border-2 border-dashed border-emerald-400/80 rounded-lg" />
          </div>

          {iniciando ? (
            <p className="text-center text-slate-300 text-sm">Iniciando cámara…</p>
          ) : null}
          {error ? <p className="text-center text-red-300 text-sm">{error}</p> : null}
          {!error && !iniciando ? (
            <p className="text-center text-slate-400 text-[11px]">
              Acercá el código de barras del IMEI al recuadro verde y mantenelo firme 1–2 segundos.
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
