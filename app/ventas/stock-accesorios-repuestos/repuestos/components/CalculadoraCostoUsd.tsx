"use client";

import { useEffect, useMemo, useState } from "react";
import { usdDesdePesos } from "@/lib/calcCostoUsd";

type Props = {
  cotizacionSistema: number;
  onAplicarCosto: (usd: number) => void;
  compact?: boolean;
};

export default function CalculadoraCostoUsd({
  cotizacionSistema,
  onAplicarCosto,
  compact = false,
}: Props) {
  const [cotizacionCalc, setCotizacionCalc] = useState("");
  const [precioPesosCalc, setPrecioPesosCalc] = useState("");

  useEffect(() => {
    if (cotizacionSistema > 0) {
      setCotizacionCalc(String(cotizacionSistema));
    }
  }, [cotizacionSistema]);

  const resultadoUsd = useMemo(() => {
    const pesos = parseFloat(precioPesosCalc);
    const cot = parseFloat(cotizacionCalc);
    return usdDesdePesos(pesos, cot);
  }, [precioPesosCalc, cotizacionCalc]);

  const inputCls = compact
    ? "p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white text-[#2c3e50] text-xs focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20"
    : "p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white text-[#2c3e50] text-xs focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20";

  return (
    <>
      <div>
        <label className="block text-[10px] sm:text-xs font-semibold text-[#2c3e50] mb-1 truncate">
          💵 Cotiz. USD
        </label>
        <input
          type="number"
          value={cotizacionCalc}
          onChange={(e) => setCotizacionCalc(e.target.value)}
          step="1"
          min="0"
          placeholder={cotizacionSistema > 0 ? String(cotizacionSistema) : "1200"}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[10px] sm:text-xs font-semibold text-[#2c3e50] mb-1 truncate">
          🇦🇷 Precio ARS
        </label>
        <input
          type="number"
          value={precioPesosCalc}
          onChange={(e) => setPrecioPesosCalc(e.target.value)}
          step="0.01"
          min="0"
          placeholder="Ej: 8400"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[10px] sm:text-xs font-semibold text-[#2c3e50] mb-1 truncate">
          = Costo USD
        </label>
        <div className="flex min-h-[34px] items-stretch gap-1">
          <div
            className={`flex flex-1 items-center justify-center rounded-lg border-2 px-1 text-center text-xs font-bold ${
              resultadoUsd != null
                ? "border-[#27ae60] bg-[#eafaf1] text-[#1e8449]"
                : "border-[#ecf0f1] bg-[#f8f9fa] text-[#95a5a6]"
            }`}
            title={resultadoUsd != null ? `${precioPesosCalc} ÷ ${cotizacionCalc}` : undefined}
          >
            {resultadoUsd != null ? `$${resultadoUsd}` : "—"}
          </div>
          <button
            type="button"
            disabled={resultadoUsd == null}
            onClick={() => resultadoUsd != null && onAplicarCosto(resultadoUsd)}
            className="shrink-0 rounded-lg bg-[#3498db] px-2 text-[10px] font-bold text-white hover:bg-[#2980b9] disabled:cursor-not-allowed disabled:bg-[#bdc3c7]"
            title="Copiar al precio de costo"
          >
            →
          </button>
        </div>
        <p className="mt-0.5 text-[9px] text-[#7f8c8d] leading-tight">ARS ÷ cotiz.</p>
      </div>
    </>
  );
}
