"use client";

import { useEffect, useState } from "react";

const URL_CONSULTA_IMEI = "https://imei.enacom.gob.ar";

type Props = {
  abierto: boolean;
  imei: string;
  onCerrar: () => void;
  onImeiChange?: (imei: string) => void;
};

function normalizarImei(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 20);
}

/**
 * Modal nativo de consulta IMEI.
 * ENACOM no funciona bien embebido (iframe): al buscar se reinicia.
 * Por eso abrimos su consulta en una ventana y dejamos el IMEI listo para pegar.
 */
export default function ModalConsultaImei({
  abierto,
  imei,
  onCerrar,
  onImeiChange,
}: Props) {
  const [imeiLocal, setImeiLocal] = useState(imei);
  const [copiado, setCopiado] = useState(false);
  const [abriendo, setAbriendo] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setCopiado(false);
      setAbriendo(false);
      return;
    }
    setImeiLocal(imei);
  }, [abierto, imei]);

  if (!abierto) return null;

  const imeiLimpio = normalizarImei(imeiLocal);
  const puedeBuscar = imeiLimpio.length >= 14;

  const copiarImei = async () => {
    try {
      await navigator.clipboard.writeText(imeiLimpio);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
      return true;
    } catch {
      alert(`No se pudo copiar. Anotá el IMEI: ${imeiLimpio}`);
      return false;
    }
  };

  const buscar = async () => {
    if (!puedeBuscar) {
      alert("Ingresá un IMEI de 14 o 15 dígitos.");
      return;
    }

    setAbriendo(true);
    onImeiChange?.(imeiLimpio);
    await copiarImei();

    const popup = window.open(URL_CONSULTA_IMEI, "consulta_imei", "width=980,height=820");

    if (!popup) {
      // Popup bloqueado → pestaña nueva
      window.open(URL_CONSULTA_IMEI, "_blank");
      alert("Se abrió la consulta. Pegá el IMEI (ya está copiado) y completá el captcha.");
    }

    setAbriendo(false);
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] text-white px-5 py-4 flex items-start justify-between gap-3">
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

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
              Número IMEI
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={imeiLocal}
              onChange={(e) => setImeiLocal(normalizarImei(e.target.value))}
              placeholder="15 dígitos"
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-xl bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] font-mono text-lg tracking-wide text-[#2c3e50]"
              autoFocus
            />
          </div>

          <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50 border border-slate-200 rounded-xl p-3">
            <li>
              Tocá <strong>Buscar</strong> (copia el IMEI y abre la consulta).
            </li>
            <li>
              En la ventana nueva, <strong>pegá</strong> el IMEI ({" "}
              <kbd className="px-1 rounded bg-white border text-xs">Cmd/Ctrl + V</kbd>
              ).
            </li>
            <li>Completá el captcha y confirmá la consulta.</li>
          </ol>

          <button
            type="button"
            disabled={!puedeBuscar || abriendo}
            onClick={() => void buscar()}
            className="w-full py-3.5 rounded-xl bg-[#27ae60] hover:bg-[#1e8449] text-white font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {abriendo ? "Abriendo consulta…" : "🔍 Buscar"}
          </button>

          <button
            type="button"
            disabled={!puedeBuscar}
            onClick={() => void copiarImei()}
            className="w-full py-2.5 rounded-xl border-2 border-[#3498db] bg-[#ebf5fb] hover:bg-[#d6eaf8] text-[#2c3e50] font-semibold text-sm disabled:opacity-50"
          >
            {copiado ? "✓ IMEI copiado" : "📋 Solo copiar IMEI"}
          </button>

          <p className="text-[11px] text-center text-slate-400">
            Consulta oficial del registro de equipos. El resultado se ve en la ventana de consulta.
          </p>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
