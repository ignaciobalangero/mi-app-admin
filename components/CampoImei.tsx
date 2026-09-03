"use client";

import { useState } from "react";
import EscanerCodigoBarras from "@/components/EscanerCodigoBarras";
import ModalConsultaImei from "@/components/ModalConsultaImei";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

/** IMEI con escáner de cámara y consulta de estado (ENACOM). */
export default function CampoImei({
  value,
  onChange,
  disabled = false,
  className = "",
  inputClassName = "",
  placeholder = "Número IMEI",
}: Props) {
  const [escaneando, setEscaneando] = useState(false);
  const [consultando, setConsultando] = useState(false);

  const normalizarImei = (raw: string) => raw.replace(/\D/g, "").slice(0, 20);
  const imeiLimpio = normalizarImei(value);
  const puedeConsultar = imeiLimpio.length >= 14;

  const abrirConsulta = () => {
    if (!puedeConsultar) {
      alert("Cargá un IMEI válido (14–15 dígitos) antes de consultar.");
      return;
    }
    setConsultando(true);
  };

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(normalizarImei(e.target.value))}
          className={
            inputClassName ||
            "flex-1 min-w-[140px] px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
          }
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEscaneando(true)}
          className="px-3 sm:px-4 py-3 rounded-lg border-2 border-[#3498db] bg-[#ebf5fb] hover:bg-[#d6eaf8] text-[#2c3e50] font-semibold whitespace-nowrap disabled:opacity-50"
          title="Escanear código de barras del IMEI"
        >
          📷 Escanear
        </button>
        <button
          type="button"
          disabled={disabled || !puedeConsultar}
          onClick={abrirConsulta}
          className="px-3 sm:px-4 py-3 rounded-lg border-2 border-[#27ae60] bg-[#eafaf1] hover:bg-[#d5f5e3] text-[#1e8449] font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          title="Consultar estado del IMEI"
        >
          🔍 Consultar
        </button>
      </div>

      <EscanerCodigoBarras
        abierto={escaneando}
        titulo="Escanear IMEI"
        onDetectado={(codigo) => onChange(normalizarImei(codigo))}
        onCerrar={() => setEscaneando(false)}
      />

      <ModalConsultaImei
        abierto={consultando}
        imei={imeiLimpio}
        onImeiChange={(imei) => onChange(imei)}
        onCerrar={() => setConsultando(false)}
      />
    </>
  );
}
