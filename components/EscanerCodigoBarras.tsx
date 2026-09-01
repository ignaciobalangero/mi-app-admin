"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
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
    } else if (a.esFrontal !== b.esFrontal) {
      return a.esFrontal ? -1 : 1;
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
      const texto = reader.decode(bitmap).getText().trim();
      if (texto) return texto;
    } catch {
      /* intentar otra variante */
    }
  }

  return null;
}

function capturarFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  espejarHorizontal: boolean
): boolean {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h || video.readyState < 2) return false;

  canvas.width = w;
  canvas.height = h;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (espejarHorizontal) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return true;
}

/** Escanea códigos de barras con la cámara. En frontal también prueba frame espejado. */
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
  const espejarPreview = camaraActiva?.esFrontal ?? !esDispositivoMobile();

  useEffect(() => {
    if (!abierto || !videoListo || !camaraId || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const reader = crearLector();
    let activo = true;

    const detener = () => {
      activo = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (video.srcObject) video.srcObject = null;
    };

    const iniciar = async () => {
      setError("");
      setIniciando(true);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: camaraId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const esFrontal = camaraActiva?.esFrontal ?? false;
        let ultimoIntento = 0;

        const loop = (ts: number) => {
          if (!activo) return;
          if (ts - ultimoIntento >= 120) {
            ultimoIntento = ts;
            const variantes = esFrontal ? [false, true] : [false];

            for (const espejarFrame of variantes) {
              if (!capturarFrame(video, canvas, ctx, espejarFrame)) continue;
              const texto = decodificarCanvas(canvas, reader);
              if (texto) {
                detener();
                onDetectadoRef.current(texto);
                onCerrarRef.current();
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        console.warn("EscanerCodigoBarras:", e);
        if (activo) {
          setError(
            "No se pudo usar esta cámara. Probá otra en el selector o ingresá el IMEI manualmente."
          );
        }
      } finally {
        if (activo) setIniciando(false);
      }
    };

    void iniciar();
    return detener;
  }, [abierto, videoListo, camaraId, camaraActiva?.esFrontal]);

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
                : "FaceTime: la vista se espeja, pero el lector también prueba el código invertido"}
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
              style={espejarPreview ? { transform: "scaleX(-1)" } : undefined}
              muted
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden />
            <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-white/40 rounded-lg" />
          </div>

          {iniciando ? (
            <p className="text-center text-slate-300 text-sm">Iniciando cámara…</p>
          ) : null}
          {error ? <p className="text-center text-red-300 text-sm">{error}</p> : null}
          {!error && espejarPreview ? (
            <p className="text-center text-slate-400 text-[11px]">
              Vista espejada para orientarte. El escaneo prueba normal e invertido horizontalmente.
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
