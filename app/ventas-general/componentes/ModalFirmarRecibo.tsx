"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CampoFirmaDigital from "@/components/CampoFirmaDigital";
import {
  guardarFirmaReciboEnVenta,
  subirFirmaClienteVenta,
} from "@/lib/ventasFirmaCliente";

type Props = {
  abierto: boolean;
  negocioID: string;
  ventaId: string;
  nroVenta?: string;
  cliente?: string;
  firmaActual?: string | null;
  onClose: () => void;
  onFirmado: (firmaUrl: string) => void;
};

export default function ModalFirmarRecibo({
  abierto,
  negocioID,
  ventaId,
  nroVenta,
  cliente,
  firmaActual,
  onClose,
  onFirmado,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [firma, setFirma] = useState<string | null>(firmaActual || null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!abierto) return;
    setFirma(firmaActual || null);
  }, [abierto, firmaActual]);

  const guardar = async () => {
    if (!negocioID || !ventaId) return;
    if (!firma) {
      alert("Pedile al cliente que firme antes de guardar.");
      return;
    }
    setGuardando(true);
    try {
      let url = firma;
      if (firma.startsWith("data:image/")) {
        url = await subirFirmaClienteVenta({
          negocioID,
          ventaId,
          dataUrl: firma,
        });
      }
      await guardarFirmaReciboEnVenta({
        negocioID,
        ventaId,
        nroVenta,
        firmaClienteUrl: url,
      });
      onFirmado(url);
      onClose();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar la firma. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483002] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 max-h-[94dvh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4 flex justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-lg">Firma de conformidad</h2>
            <p className="text-sm text-white/90 truncate">
              {cliente ? `Cliente: ${cliente}` : "Recibo de compra"}
              {nroVenta ? ` · #${nroVenta}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 font-bold flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-3">
          <p className="text-sm text-[#7f8c8d]">
            Pedile al cliente que firme en la pantalla (dedo o stylus). La firma queda
            guardada en el recibo.
          </p>
          <CampoFirmaDigital
            value={firma}
            onChange={setFirma}
            disabled={guardando}
            titulo="Firma de conformidad"
          />
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || !firma}
            className="flex-1 py-3 rounded-xl bg-[#27ae60] hover:bg-[#1e8449] text-white font-semibold disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "💾 Guardar firma"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
