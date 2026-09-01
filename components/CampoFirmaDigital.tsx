"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PanelFirmaIpadQr from "@/components/PanelFirmaIpadQr";

type FirmaIpadProps = {
  negocioID: string;
  trabajoFirebaseId?: string;
  tokenPublico?: string;
  onTokenGenerado?: (token: string) => void;
  /** Crea borrador en Firebase si aún no hay trabajo guardado (ingreso). */
  onPrepararBorrador?: () => Promise<{ trabajoFirebaseId: string; tokenPublico: string } | null>;
};

type Props = {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  titulo?: string;
  firmaIpad?: FirmaIpadProps;
};

/**
 * Firma digital con mouse, dedo o Apple Pencil (pointer events).
 * Guarda un PNG en data URL vía onChange, o URL si firmó desde iPad.
 */
export default function CampoFirmaDigital({
  value,
  onChange,
  disabled = false,
  titulo = "Firma del cliente",
  firmaIpad,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const [abierto, setAbierto] = useState(false);
  const [tieneTrazo, setTieneTrazo] = useState(false);
  const [modalQrAbierto, setModalQrAbierto] = useState(false);
  const [qrCtx, setQrCtx] = useState<{ trabajoFirebaseId: string; tokenPublico: string } | null>(
    null
  );
  const [preparandoQr, setPreparandoQr] = useState(false);

  const ajustarCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = parent.clientWidth;
    const h = Math.max(180, Math.round(w * 0.35));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    setTieneTrazo(false);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    ajustarCanvas();
    const onResize = () => ajustarCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [abierto, ajustarCanvas]);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const { x, y } = punto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneTrazo(true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    dibujando.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const limpiar = () => {
    ajustarCanvas();
    onChange(null);
  };

  const confirmar = () => {
    const canvas = canvasRef.current;
    if (!canvas || !tieneTrazo) {
      alert("Pedile al cliente que firme antes de confirmar.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
    setAbierto(false);
  };

  const abrirQrIpad = async () => {
    if (disabled || !firmaIpad) return;

    setPreparandoQr(true);
    try {
      let ctx = qrCtx;

      if (firmaIpad.trabajoFirebaseId) {
        ctx = {
          trabajoFirebaseId: firmaIpad.trabajoFirebaseId,
          tokenPublico: firmaIpad.tokenPublico || "",
        };
      } else if (firmaIpad.onPrepararBorrador) {
        ctx = await firmaIpad.onPrepararBorrador();
      }

      if (!ctx?.trabajoFirebaseId) return;

      setQrCtx(ctx);
      setModalQrAbierto(true);
    } finally {
      setPreparandoQr(false);
    }
  };

  const tituloCorto = titulo.replace(/\s*\(.*\)\s*$/, "").trim() || "Firma del cliente";

  return (
    <>
      <div className="rounded-xl border-2 border-[#bdc3c7] bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <p className="text-sm font-semibold text-[#2c3e50]">✍️ {tituloCorto}</p>
            <p className="text-xs text-[#7f8c8d]">
              Firmá acá en pantalla o usá <strong>QR</strong> para que el cliente firme en el iPad.
            </p>
          </div>
          {!abierto ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setAbierto(true)}
                className="px-4 py-2 rounded-lg bg-[#3498db] hover:bg-[#2980b9] text-white text-sm font-semibold disabled:opacity-50"
              >
                {value ? "✏️ Re-firmar" : "✍️ Firmar"}
              </button>
              {firmaIpad ? (
                <button
                  type="button"
                  disabled={disabled || preparandoQr}
                  onClick={() => void abrirQrIpad()}
                  className="px-4 py-2 rounded-lg bg-[#9b59b6] hover:bg-[#8e44ad] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {preparandoQr ? "…" : "📱 QR"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {value && !abierto ? (
          <div className="rounded-lg border border-[#ecf0f1] bg-[#f8f9fa] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Firma del cliente"
              className="max-h-28 w-auto mx-auto object-contain"
            />
            <p className="text-[11px] text-center text-[#27ae60] mt-1 font-medium">
              {value.startsWith("http") ? "✓ Firma recibida desde iPad" : "✓ Firma confirmada"}
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="mt-2 text-xs text-[#e74c3c] font-medium hover:underline block mx-auto"
            >
              Quitar firma
            </button>
          </div>
        ) : null}

        {abierto ? (
          <div className="space-y-2">
            <div className="rounded-lg border-2 border-dashed border-[#3498db] bg-white overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                className="w-full block cursor-crosshair touch-none"
                style={{ touchAction: "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            </div>
            <p className="text-[11px] text-[#7f8c8d] text-center">
              Firmá acá con el dedo o el Apple Pencil
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={limpiar}
                className="px-3 py-2 rounded-lg border border-[#bdc3c7] text-sm text-[#2c3e50] hover:bg-[#ecf0f1]"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  if (!value) ajustarCanvas();
                }}
                className="px-3 py-2 rounded-lg border border-[#bdc3c7] text-sm text-[#2c3e50] hover:bg-[#ecf0f1]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                className="px-4 py-2 rounded-lg bg-[#27ae60] hover:bg-[#1e8449] text-white text-sm font-semibold"
              >
                Confirmar firma
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modalQrAbierto && firmaIpad && qrCtx ? (
        <div className="fixed inset-0 z-[999998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#d7bde2]">
            <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">📱 QR para firmar en iPad</h3>
                <p className="text-xs text-white/85">Escaneá con el iPad y firmá antes de guardar</p>
              </div>
              <button
                type="button"
                onClick={() => setModalQrAbierto(false)}
                className="h-10 w-10 rounded-lg bg-white/15 hover:bg-white/25 text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <PanelFirmaIpadQr
                negocioID={firmaIpad.negocioID}
                tokenPublico={qrCtx.tokenPublico}
                trabajoFirebaseId={qrCtx.trabajoFirebaseId}
                onTokenGenerado={(token) => {
                  setQrCtx((prev) => (prev ? { ...prev, tokenPublico: token } : prev));
                  firmaIpad.onTokenGenerado?.(token);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
