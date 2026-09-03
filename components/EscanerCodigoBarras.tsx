"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { extraerImei } from "@/lib/extraerImei";

type Props = {
  abierto: boolean;
  titulo?: string;
  onDetectado: (codigo: string) => void;
  onCerrar: () => void;
};

function crearLector(): MultiFormatReader {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ]);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

function decodificarZxing(canvas: HTMLCanvasElement, reader: MultiFormatReader): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width < 20 || height < 8) return null;
  const imageData = ctx.getImageData(0, 0, width, height);
  const source = new RGBLuminanceSource(imageData.data, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    return reader.decodeWithState(bitmap).getText().trim();
  } catch {
    return null;
  }
}

function capturarFranja(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): boolean {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h || video.readyState < 2) return false;

  // Franja ancha (IMEI en caja/etiqueta suele ser horizontal).
  const sw = Math.floor(w * 0.92);
  const sh = Math.max(80, Math.floor(h * 0.38));
  const sx = Math.floor((w - sw) / 2);
  const sy = Math.floor((h - sh) / 2);

  canvas.width = sw;
  canvas.height = sh;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  return true;
}

async function abrirCamaraTrasera(): Promise<MediaStream> {
  const videoBase: MediaTrackConstraints = {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };

  const intentos: MediaStreamConstraints[] = [
    { video: { ...videoBase, facingMode: { exact: "environment" } } },
    { video: videoBase },
    { video: { facingMode: "environment" } },
  ];

  let ultimo: unknown;
  for (const c of intentos) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      const track = stream.getVideoTracks()[0];
      const facing = track.getSettings().facingMode;
      if (facing === "user") {
        stream.getTracks().forEach((t) => t.stop());
        continue;
      }
      try {
        await track.applyConstraints({
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        });
      } catch {
        /* no todas las cámaras soportan foco */
      }
      return stream;
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo ?? new Error("No hay cámara trasera");
}

async function crearWorkerOcr() {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, { logger: () => undefined });
  await worker.setParameters({ tessedit_char_whitelist: "0123456789" });
  return worker;
}

async function leerImeiConOcr(
  canvas: HTMLCanvasElement,
  worker: Awaited<ReturnType<typeof crearWorkerOcr>>
): Promise<string | null> {
  const { data } = await worker.recognize(canvas);
  return extraerImei(data.text || "");
}

/** Escáner de IMEI: cámara trasera, código de barras y OCR de 15 dígitos. */
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
  const ocrBusy = useRef(false);
  const ocrLast = useRef(0);
  const ocrWorkerRef = useRef<Awaited<ReturnType<typeof crearWorkerOcr>> | null>(null);
  const onDetectadoRef = useRef(onDetectado);
  const onCerrarRef = useRef(onCerrar);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const [estado, setEstado] = useState("Apuntá al código de barras o al número IMEI");

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
    if (videoRef.current?.srcObject) videoRef.current.srcObject = null;
    const w = ocrWorkerRef.current;
    ocrWorkerRef.current = null;
    if (w) void w.terminate();
  }, []);

  const emitir = useCallback(
    (raw: string) => {
      const imei = extraerImei(raw);
      if (!imei) return false;
      detenerStream();
      onDetectadoRef.current(imei);
      onCerrarRef.current();
      return true;
    },
    [detenerStream]
  );

  useEffect(() => {
    if (!abierto) {
      detenerStream();
      setError("");
      setIniciando(false);
      setEstado("Apuntá al código de barras o al número IMEI");
      return;
    }

    let cancelado = false;
    const reader = crearLector();

    const iniciar = async () => {
      setIniciando(true);
      setError("");
      detenerStream();

      try {
        const stream = await abrirCamaraTrasera();
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.srcObject = stream;
        await video.play();
        setEstado("Buscando código de barras…");
      } catch (e) {
        if (cancelado) return;
        console.warn("EscanerCodigoBarras:", e);
        setError(
          "No se pudo abrir la cámara trasera. En iPad/iPhone permití Cámara y usá la de atrás. En Mac no hay cámara trasera."
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
    if (!abierto || iniciando || error || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const reader = crearLector();
    let activo = true;
    let ultimoBarcode = 0;

    const loop = (ts: number) => {
      if (!activo) return;

      if (ts - ultimoBarcode >= 80) {
        ultimoBarcode = ts;
        if (capturarFranja(video, canvas, ctx)) {
          const texto = decodificarZxing(canvas, reader);
          if (texto && emitir(texto)) return;
        }
      }

      // OCR cada ~1.6s si el código de barras no aparece (número impreso).
      if (!ocrBusy.current && ts - ocrLast.current >= 1600) {
        ocrLast.current = ts;
        ocrBusy.current = true;
        setEstado("Leyendo número IMEI (15 dígitos)…");
        void (async () => {
          try {
            if (!ocrWorkerRef.current) {
              ocrWorkerRef.current = await crearWorkerOcr();
            }
            if (!activo || !ocrWorkerRef.current) return;
            const imei = await leerImeiConOcr(canvas, ocrWorkerRef.current);
            if (!activo) return;
            if (imei && emitir(imei)) return;
            setEstado("No hay código de barras: acercá el número IMEI al recuadro");
          } catch {
            if (activo) setEstado("Acercá el código o el número IMEI al recuadro");
          } finally {
            ocrBusy.current = false;
          }
        })();
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
  }, [abierto, iniciando, error, emitir]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">📷 {titulo}</h3>
            <p className="text-xs text-white/80">Solo cámara trasera. Código de barras o IMEI de 15 dígitos.</p>
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
          <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              muted
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden />
            <div className="pointer-events-none absolute inset-x-[4%] top-[31%] bottom-[31%] border-2 border-dashed border-emerald-400/80 rounded-lg" />
          </div>

          {iniciando ? (
            <p className="text-center text-slate-300 text-sm">Abriendo cámara trasera…</p>
          ) : null}
          {error ? <p className="text-center text-red-300 text-sm">{error}</p> : null}
          {!error && !iniciando ? (
            <p className="text-center text-slate-400 text-[11px]">{estado}</p>
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
