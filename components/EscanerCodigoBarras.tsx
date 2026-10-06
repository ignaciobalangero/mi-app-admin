"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** imei = solo 15 dígitos (teléfonos); codigo = cualquier barras/QR de stock */
  modo?: "imei" | "codigo";
  /** Si true, no cierra al leer (útil en control de stock continuo) */
  mantenerAbierto?: boolean;
  onDetectado: (codigo: string) => void;
  onCerrar: () => void;
};

function crearLector(): MultiFormatReader {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
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

function invertirRGBA(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = 255 - data[i];
    out[i + 1] = 255 - data[i + 1];
    out[i + 2] = 255 - data[i + 2];
    out[i + 3] = data[i + 3];
  }
  return out;
}

function decodificarZxing(canvas: HTMLCanvasElement, reader: MultiFormatReader): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width < 20 || height < 8) return null;
  const imageData = ctx.getImageData(0, 0, width, height);

  const intentar = (pixels: Uint8ClampedArray): string | null => {
    try {
      const source = new RGBLuminanceSource(pixels, width, height);
      const bitmap = new BinaryBitmap(new HybridBinarizer(source));
      return reader.decodeWithState(bitmap).getText().trim() || null;
    } catch {
      return null;
    }
  };

  const normal = intentar(imageData.data);
  if (normal) return normal;
  // Códigos invertidos / etiquetas con fondo oscuro
  return intentar(invertirRGBA(imageData.data));
}

type Region = { sx: number; sy: number; sw: number; sh: number };

function regionesCaptura(
  w: number,
  h: number,
  modo: "imei" | "codigo"
): Region[] {
  if (modo === "imei") {
    const sw = Math.floor(w * 0.92);
    const sh = Math.max(80, Math.floor(h * 0.38));
    return [{ sx: Math.floor((w - sw) / 2), sy: Math.floor((h - sh) / 2), sw, sh }];
  }

  // Código: frame completo + centro (QR) + franja horizontal (barras)
  const full = { sx: 0, sy: 0, sw: w, sh: h };
  const side = Math.min(w, h);
  const square = {
    sx: Math.floor((w - side) / 2),
    sy: Math.floor((h - side) / 2),
    sw: side,
    sh: side,
  };
  const bandW = Math.floor(w * 0.94);
  const bandH = Math.max(100, Math.floor(h * 0.42));
  const band = {
    sx: Math.floor((w - bandW) / 2),
    sy: Math.floor((h - bandH) / 2),
    sw: bandW,
    sh: bandH,
  };
  return [full, square, band];
}

function capturarRegion(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  region: Region,
  maxSide = 1280
): boolean {
  const { sx, sy, sw, sh } = region;
  if (!sw || !sh || video.readyState < 2) return false;

  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const dw = Math.max(1, Math.floor(sw * scale));
  const dh = Math.max(1, Math.floor(sh * scale));
  canvas.width = dw;
  canvas.height = dh;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
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
    { video: true },
  ];

  let ultimo: unknown;
  let fallbackFrontal: MediaStream | null = null;

  for (let i = 0; i < intentos.length; i++) {
    const c = intentos[i];
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      const track = stream.getVideoTracks()[0];
      const facing = track.getSettings().facingMode;
      // Preferí trasera; si sale frontal y quedan intentos, guardar y seguir
      if (facing === "user" && i < intentos.length - 1) {
        fallbackFrontal?.getTracks().forEach((t) => t.stop());
        fallbackFrontal = stream;
        continue;
      }
      fallbackFrontal?.getTracks().forEach((t) => t.stop());
      try {
        await track.applyConstraints({
          advanced: [
            { focusMode: "continuous" } as MediaTrackConstraintSet,
          ],
        });
      } catch {
        /* noop */
      }
      return stream;
    } catch (e) {
      ultimo = e;
    }
  }
  if (fallbackFrontal) return fallbackFrontal;
  throw ultimo ?? new Error("No hay cámara");
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

type BarcodeDetectorLike = {
  detect: (src: ImageBitmapSource) => Promise<{ rawValue?: string }[]>;
};

async function detectarNativo(video: HTMLVideoElement): Promise<string | null> {
  const w = window as unknown as {
    BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
  };
  const BD = w.BarcodeDetector;
  if (!BD || !video.videoWidth) return null;
  try {
    const detector = new BD({
      formats: [
        "qr_code",
        "aztec",
        "data_matrix",
        "code_128",
        "code_39",
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "itf",
      ],
    });
    const codes = await detector.detect(video);
    const raw = codes[0]?.rawValue?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

/** Escáner: IMEI (teléfonos) o código de barras/QR libre (stock). */
export default function EscanerCodigoBarras({
  abierto,
  titulo = "Escanear código",
  modo = "imei",
  mantenerAbierto = false,
  onDetectado,
  onCerrar,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const ocrBusy = useRef(false);
  const ocrLast = useRef(0);
  const nativoLast = useRef(0);
  const ultimoEmitido = useRef<{ texto: string; ts: number }>({ texto: "", ts: 0 });
  const ocrWorkerRef = useRef<Awaited<ReturnType<typeof crearWorkerOcr>> | null>(null);
  const onDetectadoRef = useRef(onDetectado);
  const onCerrarRef = useRef(onCerrar);
  const modoRef = useRef(modo);
  const mantenerAbiertoRef = useRef(mantenerAbierto);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const [manual, setManual] = useState("");
  const [estado, setEstado] = useState(
    modo === "codigo"
      ? "Apuntá al código de barras o QR del producto"
      : "Apuntá al código de barras o al número IMEI"
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    onDetectadoRef.current = onDetectado;
    onCerrarRef.current = onCerrar;
    modoRef.current = modo;
    mantenerAbiertoRef.current = mantenerAbierto;
  }, [onDetectado, onCerrar, modo, mantenerAbierto]);

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
      const texto = String(raw || "").trim();
      if (!texto) return false;

      // Evitar relecturas del mismo código en ráfaga (modo continuo)
      const ahora = Date.now();
      if (
        mantenerAbiertoRef.current &&
        ultimoEmitido.current.texto === texto &&
        ahora - ultimoEmitido.current.ts < 1600
      ) {
        return false;
      }

      if (modoRef.current === "imei") {
        const imei = extraerImei(texto);
        if (!imei) return false;
        ultimoEmitido.current = { texto: imei, ts: ahora };
        detenerStream();
        onDetectadoRef.current(imei);
        onCerrarRef.current();
        return true;
      }

      ultimoEmitido.current = { texto, ts: ahora };
      onDetectadoRef.current(texto);
      if (mantenerAbiertoRef.current) {
        setEstado(`✓ Leído: ${texto.slice(0, 28)}${texto.length > 28 ? "…" : ""}`);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(25);
        }
        return true;
      }

      detenerStream();
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
      setManual("");
      setEstado(
        modo === "codigo"
          ? "Apuntá al código de barras o QR del producto"
          : "Apuntá al código de barras o al número IMEI"
      );
      return;
    }

    let cancelado = false;

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
        setEstado(
          modo === "codigo"
            ? "Acercá el código · mantené firme 1–2 segundos"
            : "Buscando código de barras…"
        );
      } catch (e) {
        if (cancelado) return;
        console.warn("EscanerCodigoBarras:", e);
        setError(
          "No se pudo abrir la cámara. Permití el acceso o ingresá el código manualmente abajo."
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
  }, [abierto, detenerStream, modo]);

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
      const intervalo = modoRef.current === "codigo" ? 90 : 80;

      if (ts - ultimoBarcode >= intervalo) {
        ultimoBarcode = ts;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h && video.readyState >= 2) {
          const regiones = regionesCaptura(w, h, modoRef.current);
          for (const region of regiones) {
            // Resolución alta + media (códigos chicos / lejos)
            for (const maxSide of [1600, 960]) {
              if (!capturarRegion(video, canvas, ctx, region, maxSide)) continue;
              const texto = decodificarZxing(canvas, reader);
              if (texto && emitir(texto)) return;
            }
          }
        }
      }

      // API nativa (Chrome/Android/Safari reciente) — suele leer mejor QR/barras
      if (
        modoRef.current === "codigo" &&
        ts - nativoLast.current >= 200 &&
        !ocrBusy.current
      ) {
        nativoLast.current = ts;
        void detectarNativo(video).then((texto) => {
          if (!activo || !texto) return;
          emitir(texto);
        });
      }

      if (
        modoRef.current === "imei" &&
        !ocrBusy.current &&
        ts - ocrLast.current >= 1600
      ) {
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
      } else if (modoRef.current === "codigo" && ts - ocrLast.current >= 2500) {
        ocrLast.current = ts;
        setEstado("Acercá el código · buena luz · sin reflejos");
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

  if (!abierto || !mounted) return null;

  const confirmarManual = () => {
    const t = manual.trim();
    if (!t) return;
    emitir(t);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483000] bg-black flex flex-col sm:items-center sm:justify-center sm:bg-black/70 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-lg sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg truncate">📷 {titulo}</h3>
            <p className="text-[11px] sm:text-xs text-white/80">
              {modo === "codigo"
                ? "Código de barras o QR · cámara trasera"
                : "Código de barras o IMEI de 15 dígitos"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-2xl leading-none flex-shrink-0"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 p-3 sm:p-4 bg-slate-950 space-y-3 flex flex-col">
          <div className="relative overflow-hidden rounded-xl bg-black flex-1 min-h-[45dvh] sm:min-h-0 sm:aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              muted
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden />
            <div
              className={`pointer-events-none absolute border-2 border-dashed border-emerald-400/90 rounded-lg ${
                modo === "codigo"
                  ? "inset-[12%] sm:inset-x-[10%] sm:top-[18%] sm:bottom-[18%]"
                  : "inset-x-[4%] top-[31%] bottom-[31%]"
              }`}
            />
          </div>

          {iniciando ? (
            <p className="text-center text-slate-300 text-sm">Abriendo cámara…</p>
          ) : null}
          {error ? <p className="text-center text-red-300 text-sm">{error}</p> : null}
          {!error && !iniciando ? (
            <p className="text-center text-slate-400 text-[11px]">{estado}</p>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-medium">
              O ingresá el código a mano
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmarManual();
                }}
                placeholder="Código / QR"
                className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-white text-sm placeholder:text-slate-500"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={confirmarManual}
                disabled={!manual.trim()}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40"
              >
                OK
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 w-full sm:w-auto"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
