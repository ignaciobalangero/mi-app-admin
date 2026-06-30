"use client";

import { useEffect, useState } from "react";
import { abrirSesionCaja, obtenerUltimoCierreSaldo } from "@/lib/caja/sesionCaja";
import { auth } from "@/lib/auth";
import { formatearPrecioCaja } from "@/lib/caja/calcularResumenDia";

interface Props {
  negocioID: string;
  onClose: () => void;
  onAbierta: () => void;
}

export default function ModalAbrirCaja({ negocioID, onClose, onAbierta }: Props) {
  const [saldoInicialARS, setSaldoInicialARS] = useState("");
  const [saldoInicialUSD, setSaldoInicialUSD] = useState("0");
  const [saldoAnterior, setSaldoAnterior] = useState<number | null>(null);
  const [notas, setNotas] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  useEffect(() => {
    obtenerUltimoCierreSaldo(negocioID).then((s) => {
      setSaldoAnterior(s);
      setSaldoInicialARS(String(s));
    });
  }, [negocioID]);

  const abrir = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Sesión expirada.");
      return;
    }
    setAbriendo(true);
    try {
      await abrirSesionCaja({
        negocioId: negocioID,
        saldoInicialARS: Number(saldoInicialARS) || 0,
        saldoInicialUSD: Number(saldoInicialUSD) || 0,
        usuario: user.email || user.uid,
        usuarioId: user.uid,
        notas,
      });
      onAbierta();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo abrir la caja.");
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6 rounded-t-2xl">
          <h3 className="text-xl font-bold">Abrir Caja del Día</h3>
          <p className="text-sm text-blue-100 mt-1">Registrá el fondo fijo inicial en efectivo</p>
        </div>

        <div className="p-6 space-y-4">
          {saldoAnterior != null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <span className="text-[#7f8c8d]">Saldo final del cierre anterior (sugerido): </span>
              <span className="font-bold text-[#2c3e50]">{formatearPrecioCaja(saldoAnterior)} ARS</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#2c3e50] mb-1">Fondo fijo ARS *</label>
            <input
              type="number"
              value={saldoInicialARS}
              onChange={(e) => setSaldoInicialARS(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white text-[#2c3e50] [color-scheme:light] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2c3e50] mb-1">Fondo USD billetes (opcional)</label>
            <input
              type="number"
              value={saldoInicialUSD}
              onChange={(e) => setSaldoInicialUSD(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white text-[#2c3e50] [color-scheme:light] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2c3e50] mb-1">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg resize-none bg-white text-[#2c3e50] [color-scheme:light] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
            />
          </div>
        </div>

        <div className="p-6 bg-[#f8f9fa] rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={abrir}
            disabled={abriendo || !saldoInicialARS}
            className="flex-1 px-4 py-3 bg-[#3498db] hover:bg-[#2980b9] disabled:bg-[#bdc3c7] text-white rounded-lg font-bold"
          >
            {abriendo ? "Abriendo…" : "Abrir caja"}
          </button>
        </div>
      </div>
    </div>
  );
}
