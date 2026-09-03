"use client";

import { useEffect, useState } from "react";

const URL_CONSULTA_IMEI = "https://imei.enacom.gob.ar";

type Props = {
  abierto: boolean;
  imei: string;
  onCerrar: () => void;
};

/** Modal nativo de consulta IMEI (usa el servicio oficial ENACOM embebido). */
export default function ModalConsultaImei({ abierto, imei, onCerrar }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setCopiado(false);
      setIframeError(false);
      return;
    }

    const copiar = async () => {
      try {
        await navigator.clipboard.writeText(imei);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      } catch {
        /* ignore */
      }
    };
    void copiar();
  }, [abierto, imei]);

  if (!abierto) return null;

  const abrirExterno = () => {
    window.open(URL_CONSULTA_IMEI, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] text-white px-4 sm:px-5 py-4 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="font-bold text-lg">🔍 Consultar IMEI</h3>
            <p className="text-xs text-white/80 mt-0.5">
              Verificá si el equipo está habilitado o bloqueado
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-2xl leading-none shrink-0"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">IMEI a consultar:</span>
            <code className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-sm font-mono text-slate-900 tracking-wide">
              {imei}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(imei);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2500);
                } catch {
                  alert("No se pudo copiar el IMEI");
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#3498db] hover:bg-[#2980b9] text-white text-xs font-semibold"
            >
              {copiado ? "✓ Copiado" : "Copiar IMEI"}
            </button>
            <button
              type="button"
              onClick={abrirExterno}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
            >
              Abrir en ventana
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Pegá el IMEI en el campo de abajo, completá el captcha y tocá Consultar.
            {copiado ? " El número ya está en el portapapeles." : ""}
          </p>
        </div>

        <div className="relative flex-1 min-h-[420px] bg-slate-100">
          {!iframeError ? (
            <iframe
              title="Consulta de IMEI"
              src={URL_CONSULTA_IMEI}
              className="absolute inset-0 w-full h-full border-0 bg-white"
              referrerPolicy="no-referrer-when-downgrade"
              onError={() => setIframeError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-slate-700 font-medium">
                No se pudo cargar la consulta acá adentro.
              </p>
              <p className="text-sm text-slate-500 max-w-sm">
                Abrí la consulta en una ventana nueva: el IMEI ya está copiado para pegarlo.
              </p>
              <button
                type="button"
                onClick={abrirExterno}
                className="px-5 py-3 rounded-xl bg-[#27ae60] hover:bg-[#1e8449] text-white font-bold"
              >
                Abrir consulta
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-white border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
