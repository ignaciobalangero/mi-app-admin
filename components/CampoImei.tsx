"use client";

import { useState } from "react";
import EscanerCodigoBarras from "@/components/EscanerCodigoBarras";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

/** IMEI con botón para escanear código de barras con la cámara. */
export default function CampoImei({
  value,
  onChange,
  disabled = false,
  className = "",
  inputClassName = "",
  placeholder = "Número IMEI",
}: Props) {
  const [escaneando, setEscaneando] = useState(false);

  const normalizarImei = (raw: string) => raw.replace(/\D/g, "").slice(0, 20);

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(normalizarImei(e.target.value))}
          className={
            inputClassName ||
            "flex-1 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
          }
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEscaneando(true)}
          className="px-4 py-3 rounded-lg border-2 border-[#3498db] bg-[#ebf5fb] hover:bg-[#d6eaf8] text-[#2c3e50] font-semibold whitespace-nowrap disabled:opacity-50"
          title="Escanear código de barras del IMEI"
        >
          📷 Escanear
        </button>
      </div>

      <EscanerCodigoBarras
        abierto={escaneando}
        titulo="Escanear IMEI"
        onDetectado={(codigo) => onChange(normalizarImei(codigo))}
        onCerrar={() => setEscaneando(false)}
      />
    </>
  );
}
