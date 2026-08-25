"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  titulo?: string;
};

/**
 * Firma digital con mouse, dedo o Apple Pencil (pointer events).
 * Guarda un PNG en data URL vía onChange.
 */
export default function CampoFirmaDigital({
  value,
  onChange,
  disabled = false,
  titulo = "Firma del cliente",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const [abierto, setAbierto] = useState(false);
  const [tieneTrazo, setTieneTrazo] = useState(false);

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

  return (
    <div className="rounded-xl border-2 border-[#bdc3c7] bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-semibold text-[#2c3e50]">✍️ {titulo}</p>
          <p className="text-xs text-[#7f8c8d]">
            Ideal en iPad con Pencil: el cliente firma en pantalla y queda en el ticket.
          </p>
        </div>
        {!abierto && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAbierto(true)}
            className="px-4 py-2 rounded-lg bg-[#3498db] hover:bg-[#2980b9] text-white text-sm font-semibold disabled:opacity-50"
          >
            {value ? "✏️ Re-firmar" : "✍️ Firmar"}
          </button>
        )}
      </div>

      {value && !abierto ? (
        <div className="rounded-lg border border-[#ecf0f1] bg-[#f8f9fa] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Firma del cliente"
            className="max-h-28 w-auto mx-auto object-contain"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="mt-2 text-xs text-[#e74c3c] font-medium hover:underline"
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
  );
}
