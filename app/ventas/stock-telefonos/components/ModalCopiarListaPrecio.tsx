"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { etiquetaEstado } from "@/lib/stockTelefonos/estados";
import {
  armarListaPrecioWhatsApp,
  estadosDisponiblesEnStock,
  type TipoPrecioLista,
  type TelefonoListaPrecio,
} from "@/lib/stockTelefonos/listaPrecioWhatsApp";

type Props = {
  abierto: boolean;
  telefonos: TelefonoListaPrecio[];
  onClose: () => void;
  onCopiado: (mensaje: string) => void;
};

export default function ModalCopiarListaPrecio({
  abierto,
  telefonos,
  onClose,
  onCopiado,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecioLista>("venta");
  const [estadosSel, setEstadosSel] = useState<string[]>([]);
  const [copiando, setCopiando] = useState(false);

  const estados = useMemo(
    () => estadosDisponiblesEnStock(telefonos),
    [telefonos]
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!abierto) return;
    setTipoPrecio("venta");
    setEstadosSel(estados);
  }, [abierto, estados]);

  const preview = useMemo(
    () =>
      armarListaPrecioWhatsApp(telefonos, {
        tipoPrecio,
        estados: estadosSel,
      }),
    [telefonos, tipoPrecio, estadosSel]
  );

  const toggleEstado = (estado: string) => {
    setEstadosSel((prev) =>
      prev.includes(estado)
        ? prev.filter((e) => e !== estado)
        : [...prev, estado]
    );
  };

  const copiar = async () => {
    if (!preview.texto || preview.cantidad === 0) return;
    setCopiando(true);
    try {
      await navigator.clipboard.writeText(preview.texto);
      onCopiado(`📋 Lista copiada (${preview.cantidad} equipos)`);
      onClose();
    } catch (e) {
      console.error(e);
      alert("No se pudo copiar. Probá de nuevo o copiá el texto a mano.");
    } finally {
      setCopiando(false);
    }
  };

  if (!abierto || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white p-4 flex justify-between gap-3 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg">Copiar lista de precios</h2>
            <p className="text-sm text-white/90">Formato listo para WhatsApp</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 font-bold flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Tipo de precio</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["venta", "Precio venta"],
                  ["mayorista", "Precio mayorista"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTipoPrecio(id)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    tipoPrecio === id
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:border-emerald-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-sm font-semibold text-gray-800">Estado</p>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setEstadosSel(estados)}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setEstadosSel([])}
                  className="text-gray-500 font-semibold hover:underline"
                >
                  Ninguno
                </button>
              </div>
            </div>
            {estados.length === 0 ? (
              <p className="text-sm text-gray-500">No hay equipos disponibles en stock.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {estados.map((e) => {
                  const activo = estadosSel.includes(e);
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => toggleEstado(e)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                        activo
                          ? "bg-sky-600 border-sky-600 text-white"
                          : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      {etiquetaEstado(e)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">
              Vista previa ({preview.cantidad}{" "}
              {preview.cantidad === 1 ? "equipo" : "equipos"})
            </p>
            <pre className="whitespace-pre-wrap text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-56 overflow-y-auto text-gray-800 font-sans leading-relaxed">
              {preview.texto || "Seleccioná al menos un estado con stock."}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!preview.texto || copiando}
            onClick={() => void copiar()}
            className="flex-1 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold disabled:opacity-50"
          >
            {copiando ? "Copiando…" : "📋 Copiar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
