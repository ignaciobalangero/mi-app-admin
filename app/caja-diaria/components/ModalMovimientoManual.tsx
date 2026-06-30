"use client";

import { useState } from "react";
import type { CategoriaIngresoCaja, CategoriaEgresoCaja } from "@/lib/caja/cajaTypes";
import { MEDIOS_PAGO_CAJA } from "@/lib/caja/mediosPago";
import { registrarMovimientoCaja } from "@/lib/caja/registrarMovimientoCaja";
import { auth } from "@/lib/auth";
import { puedeRetiroDueno } from "@/lib/caja/permisosCaja";
import type { MedioPagoCaja } from "@/lib/caja/cajaTypes";

interface Props {
  negocioID: string;
  sesionId: string;
  rolTipo: string;
  tipo: "ingreso" | "egreso";
  onClose: () => void;
  onGuardado: () => void;
}

const CATEGORIAS_INGRESO: { id: CategoriaIngresoCaja; label: string }[] = [
  { id: "ingreso_manual", label: "Ingreso manual" },
  { id: "transferencia_caja_mayor", label: "Transferencia desde Caja Mayor" },
];

const CATEGORIAS_EGRESO: { id: CategoriaEgresoCaja; label: string }[] = [
  { id: "gasto_operativo", label: "Gasto operativo" },
  { id: "egreso_manual", label: "Egreso manual" },
  { id: "retiro_dueno", label: "Retiro del dueño" },
  { id: "transferencia_caja_mayor", label: "Transferencia a Caja Mayor" },
];

export default function ModalMovimientoManual({
  negocioID,
  sesionId,
  rolTipo,
  tipo,
  onClose,
  onGuardado,
}: Props) {
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<string>(
    tipo === "ingreso" ? "ingreso_manual" : "gasto_operativo"
  );
  const [medioPago, setMedioPago] = useState<MedioPagoCaja>("efectivo_ars");
  const [guardando, setGuardando] = useState(false);

  const categorias =
    tipo === "ingreso"
      ? CATEGORIAS_INGRESO
      : CATEGORIAS_EGRESO.filter(
          (c) => c.id !== "retiro_dueno" || puedeRetiroDueno(rolTipo)
        );

  const guardar = async () => {
    const user = auth.currentUser;
    if (!user || !monto || Number(monto) <= 0 || !descripcion.trim()) {
      alert("Completá monto y descripción.");
      return;
    }
    if (categoria === "retiro_dueno" && !puedeRetiroDueno(rolTipo)) {
      alert("Solo el administrador puede registrar retiros del dueño.");
      return;
    }

    setGuardando(true);
    try {
      await registrarMovimientoCaja(negocioID, {
        sesionId,
        tipo,
        categoria: categoria as CategoriaIngresoCaja & CategoriaEgresoCaja,
        montoARS: Number(monto),
        medioPago,
        descripcion: descripcion.trim(),
        usuario: user.email || user.uid,
        usuarioId: user.uid,
        origenSync: "manual",
      });
      onGuardado();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div
          className={`p-6 rounded-t-2xl text-white ${
            tipo === "ingreso"
              ? "bg-gradient-to-r from-[#27ae60] to-[#2ecc71]"
              : "bg-gradient-to-r from-[#e74c3c] to-[#c0392b]"
          }`}
        >
          <h3 className="text-xl font-bold">
            {tipo === "ingreso" ? "Ingreso manual" : "Egreso manual"}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg bg-white text-[#2c3e50] [color-scheme:light]"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto ARS *</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg bg-white text-[#2c3e50] [color-scheme:light]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Medio de pago</label>
            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as MedioPagoCaja)}
              className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg bg-white text-[#2c3e50] [color-scheme:light]"
            >
              {MEDIOS_PAGO_CAJA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción / justificación *</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg resize-none bg-white text-[#2c3e50] [color-scheme:light]"
            />
          </div>
        </div>

        <div className="p-6 bg-[#f8f9fa] rounded-b-2xl flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-[#95a5a6] text-white rounded-lg">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 py-3 bg-[#3498db] text-white rounded-lg font-bold disabled:bg-[#bdc3c7]"
          >
            {guardando ? "Guardando…" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
