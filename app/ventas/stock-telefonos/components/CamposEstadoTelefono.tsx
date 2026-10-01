"use client";

import { useEffect, useState } from "react";
import {
  ESTADOS_BASE,
  cargarEstadosExtra,
  estadoPideCondicion,
  etiquetaEstado,
  guardarEstadosExtra,
  normalizarEstado,
} from "@/lib/stockTelefonos/estados";

interface Props {
  negocioID: string;
  estado: string;
  bateria: string;
  ciclosCarga?: string;
  onChange: (campo: "estado" | "bateria" | "ciclosCarga", valor: string) => void;
  compacto?: boolean;
}

export default function CamposEstadoTelefono({
  negocioID,
  estado,
  bateria,
  ciclosCarga = "",
  onChange,
  compacto = false,
}: Props) {
  const [extras, setExtras] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [mostrarCiclos, setMostrarCiclos] = useState(Boolean(String(ciclosCarga || "").trim()));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!negocioID) return;
    cargarEstadosExtra(negocioID).then(setExtras).catch(() => setExtras([]));
  }, [negocioID]);

  useEffect(() => {
    if (String(ciclosCarga || "").trim()) setMostrarCiclos(true);
  }, [ciclosCarga]);

  const pideCondicion = estadoPideCondicion(estado);
  const inputCls = compacto
    ? "p-2 border rounded w-full"
    : "w-full p-3 border-2 border-[#bdc3c7] rounded-xl text-[#2c3e50] bg-white";

  async function agregarEstado() {
    const value = normalizarEstado(nuevo);
    if (!value || value === "nuevo" || value === "usado" || extras.includes(value)) {
      setNuevo("");
      return;
    }
    const next = [...extras, value];
    setGuardando(true);
    setError("");
    try {
      await guardarEstadosExtra(negocioID, next);
      setExtras(next);
      onChange("estado", value);
      setNuevo("");
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar el estado.");
    } finally {
      setGuardando(false);
    }
  }

  async function quitarEstado(value: string) {
    const next = extras.filter((e) => e !== value);
    await guardarEstadosExtra(negocioID, next);
    setExtras(next);
    if (normalizarEstado(estado) === value) onChange("estado", "nuevo");
  }

  return (
    <div className={compacto ? "space-y-2" : "space-y-2"}>
      <div className={compacto ? "" : "space-y-2"}>
        {!compacto && (
          <label className="block text-sm font-semibold text-[#2c3e50]">⚡ Estado</label>
        )}
        <select
          name="estado"
          value={normalizarEstado(estado) || "nuevo"}
          onChange={(e) => onChange("estado", e.target.value)}
          className={inputCls}
        >
          {ESTADOS_BASE.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
          {extras.map((e) => (
            <option key={e} value={e}>
              {etiquetaEstado(e)}
            </option>
          ))}
        </select>
        <div className="flex gap-2 mt-2">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            placeholder="Agregar estado…"
            className={inputCls}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarEstado();
              }
            }}
          />
          <button
            type="button"
            disabled={guardando || !nuevo.trim()}
            onClick={agregarEstado}
            className="px-3 py-2 bg-[#3498db] text-white rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
          >
            +
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {extras.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {extras.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => quitarEstado(e)}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                title="Quitar este estado del selector"
              >
                {etiquetaEstado(e)} ×
              </button>
            ))}
          </div>
        )}
      </div>

      {pideCondicion && (
        <div className={compacto ? "space-y-2" : "space-y-2"}>
          <input
            type="number"
            name="bateria"
            value={bateria}
            onChange={(e) => onChange("bateria", e.target.value)}
            placeholder="% Batería"
            min="0"
            max="100"
            className={inputCls}
          />
          {!mostrarCiclos ? (
            <button
              type="button"
              onClick={() => setMostrarCiclos(true)}
              className="text-sm text-[#2980b9] font-medium"
            >
              + Ciclos de carga
            </button>
          ) : (
            <input
              type="number"
              name="ciclosCarga"
              value={ciclosCarga}
              onChange={(e) => onChange("ciclosCarga", e.target.value)}
              placeholder="Ciclos de carga (opcional)"
              min="0"
              className={inputCls}
            />
          )}
        </div>
      )}
    </div>
  );
}
