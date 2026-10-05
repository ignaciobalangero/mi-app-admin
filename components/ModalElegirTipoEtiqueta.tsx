"use client";

import { useState } from "react";
import {
  imprimirEtiquetaStockConCodigo,
  type ItemEtiquetaStock,
  type TipoCodigoEtiqueta,
} from "@/lib/imprimirEtiquetaRepuesto";

type Props = {
  abierto: boolean;
  negocioID: string;
  items: ItemEtiquetaStock[];
  onClose: () => void;
};

const OPCIONES: Array<{
  tipo: TipoCodigoEtiqueta;
  icono: string;
  titulo: string;
  descripcion: string;
  recomendado?: boolean;
  color: string;
}> = [
  {
    tipo: "qr",
    icono: "▣",
    titulo: "Código QR",
    descripcion: "Al escanearlo con el celular abre el producto en la app",
    recomendado: true,
    color: "from-[#3498db] to-[#2980b9]",
  },
  {
    tipo: "barras",
    icono: "|||",
    titulo: "Código de barras",
    descripcion: "Barras 1D para lectores láser o pistola",
    color: "from-[#16a085] to-[#1abc9c]",
  },
  {
    tipo: "ninguno",
    icono: "Aa",
    titulo: "Solo texto",
    descripcion: "Nombre del producto sin código escaneable",
    color: "from-[#7f8c8d] to-[#95a5a6]",
  },
];

export default function ModalElegirTipoEtiqueta({
  abierto,
  negocioID,
  items,
  onClose,
}: Props) {
  const [imprimiendo, setImprimiendo] = useState(false);
  const [tipoActivo, setTipoActivo] = useState<TipoCodigoEtiqueta | null>(null);

  if (!abierto) return null;

  const cantidad = items.length;

  const elegir = async (tipo: TipoCodigoEtiqueta) => {
    if (!negocioID || items.length === 0 || imprimiendo) return;

    // Abrir en el mismo clic del usuario (si no, el navegador bloquea el pop-up)
    const ventana = window.open("", "_blank", "width=800,height=600");
    if (!ventana) {
      alert(
        "El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para este sitio e intentá de nuevo."
      );
      return;
    }

    try {
      ventana.document.write(
        "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Etiqueta</title></head><body style='font-family:Arial;padding:24px;color:#2c3e50'><p>Generando etiqueta…</p></body></html>"
      );
      ventana.document.close();
      setImprimiendo(true);
      setTipoActivo(tipo);
      await imprimirEtiquetaStockConCodigo(negocioID, items, tipo, ventana);
      onClose();
    } catch (e) {
      console.error(e);
      try {
        ventana.close();
      } catch {
        /* noop */
      }
      alert(e instanceof Error ? e.message : "No se pudo imprimir la etiqueta.");
    } finally {
      setImprimiendo(false);
      setTipoActivo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-[#ecf0f1] overflow-hidden">
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] text-white px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Imprimir etiqueta</h2>
            <p className="text-sm text-white/80 mt-0.5">
              {cantidad === 1
                ? "Elegí el tipo de código"
                : `${cantidad} etiquetas · elegí el tipo de código`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={imprimiendo}
            className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 font-bold text-xl leading-none disabled:opacity-50"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-3 bg-[#f8f9fa]">
          {OPCIONES.map((op) => {
            const activo = tipoActivo === op.tipo && imprimiendo;
            return (
              <button
                key={op.tipo}
                type="button"
                disabled={imprimiendo}
                onClick={() => void elegir(op.tipo)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 flex items-center gap-4 disabled:opacity-60 ${
                  activo
                    ? "border-[#3498db] bg-white shadow-md scale-[1.01]"
                    : "border-[#ecf0f1] bg-white hover:border-[#3498db]/60 hover:shadow-md hover:scale-[1.01]"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${op.color} text-white flex items-center justify-center font-black text-sm shadow-md flex-shrink-0`}
                >
                  {op.icono}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#2c3e50]">{op.titulo}</span>
                    {op.recomendado ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-[#d5f4e6] text-[#27ae60] px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[#7f8c8d] mt-0.5">{op.descripcion}</p>
                  {activo ? (
                    <p className="text-xs text-[#3498db] font-semibold mt-1">
                      Generando e imprimiendo…
                    </p>
                  ) : null}
                </div>
                <span className="text-[#bdc3c7] text-lg flex-shrink-0">→</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 bg-white border-t border-[#ecf0f1] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={imprimiendo}
            className="px-4 py-2 rounded-lg border border-[#bdc3c7] text-[#2c3e50] font-semibold hover:bg-[#ecf0f1] disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
