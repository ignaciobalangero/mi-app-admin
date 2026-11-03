"use client";

import { useState } from "react";
import EscanerCodigoBarras from "@/components/EscanerCodigoBarras";

type Props = {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  inputClassName?: string;
};

/** Campo de código de barras con cámara. El valor queda en el formulario y se guarda con el producto. */
export default function CampoCodigoBarras({
  value,
  onChange,
  placeholder = "Opcional — del packaging o etiqueta",
  inputClassName = "p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]",
}: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="shrink-0 rounded-lg border-2 border-[#16a085] bg-[#e8f8f5] px-3 font-bold text-[#0e6655]"
          title="Escanear y cargar el código"
        >
          📷
        </button>
      </div>
      <EscanerCodigoBarras
        abierto={abierto}
        titulo="Escanear código de barras"
        modo="codigo"
        onDetectado={(codigo) => onChange(codigo)}
        onCerrar={() => setAbierto(false)}
      />
    </>
  );
}