"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Producto {
  id: string;
  codigo: string;
  categoria: string;
  producto: string;
  marca: string;
  modelo?: string;
  color?: string;
  precioCosto: number;
  precio1?: number;
  precio2?: number;
  precio3?: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
  proveedor?: string;
  stockIdeal?: number;
}

interface Props {
  producto: Producto;
  cotizacion: number;
  calcularPrecioDinamico: (producto: Producto, tipoPrecio: "precio1" | "precio2" | "precio3" | "precioCosto") => number;
  onClose: () => void;
}

const PRECIOS = [
  {
    tipo: "precio1" as const,
    titulo: "Precio 1",
    caja: "bg-gradient-to-r from-[#d5f4e6] to-[#a8e6cf] border-[#27ae60]",
    texto: "text-[#27ae60]",
  },
  {
    tipo: "precio2" as const,
    titulo: "Precio 2",
    caja: "bg-gradient-to-r from-[#dbeafe] to-[#a7c9ff] border-[#3498db]",
    texto: "text-[#3498db]",
  },
  {
    tipo: "precio3" as const,
    titulo: "Precio 3",
    caja: "bg-gradient-to-r from-[#f3e8ff] to-[#e1c4ff] border-[#9b59b6]",
    texto: "text-[#9b59b6]",
  },
];

export default function ModalVerPrecios({
  producto,
  cotizacion,
  calcularPrecioDinamico,
  onClose,
}: Props) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  if (!montado) return null;

  const ganancia = (tipo: "precio1" | "precio2" | "precio3") => {
    const costo = calcularPrecioDinamico(producto, "precioCosto");
    if (costo <= 0) return "0";
    return (((calcularPrecioDinamico(producto, tipo) / costo) - 1) * 100).toFixed(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483000] overflow-y-auto overscroll-contain bg-black/40 backdrop-blur-sm">
      <div className="flex min-h-full justify-center px-3 py-4 sm:px-4 sm:py-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-ver-precios-titulo"
          className="my-auto flex w-full max-w-md max-h-[min(92dvh,920px)] flex-col overflow-hidden rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl"
        >
          <div className="shrink-0 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-3 text-white sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <span className="text-xl">💰</span>
                </div>
                <div className="min-w-0">
                  <h2 id="modal-ver-precios-titulo" className="text-base font-bold sm:text-lg">
                    Precios de Venta
                  </h2>
                  <p className="break-words text-sm text-purple-100">{producto.producto}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl font-bold text-purple-100 hover:bg-white/20 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8f9fa] p-3 sm:space-y-4 sm:p-4">
            <div className="rounded-xl border border-[#ecf0f1] bg-white p-3">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="min-w-0">
                  <span className="text-[#7f8c8d]">Código:</span>
                  <div className="break-words font-medium text-[#2c3e50]">{producto.codigo || "—"}</div>
                </div>
                <div className="min-w-0">
                  <span className="text-[#7f8c8d]">Stock:</span>
                  <div className="font-medium text-[#2c3e50]">{producto.cantidad} unidades</div>
                </div>
                <div className="min-w-0">
                  <span className="text-[#7f8c8d]">Marca:</span>
                  <div className="break-words font-medium text-[#2c3e50]">{producto.marca || "—"}</div>
                </div>
                <div className="min-w-0">
                  <span className="text-[#7f8c8d]">Modelo:</span>
                  <div className="break-words font-medium text-[#2c3e50]">{producto.modelo || "N/A"}</div>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-[#7f8c8d]">Cotización actual:</span>
                  <div className="break-words font-bold text-[#f39c12]">
                    1 USD = ${cotizacion.toLocaleString("es-AR")} ARS
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {PRECIOS.map((precio) => (
                <div key={precio.tipo} className={`rounded-xl border p-3 sm:p-4 ${precio.caja}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className={`flex items-center gap-2 font-bold ${precio.texto}`}>
                        <span>💵</span> {precio.titulo}
                      </h3>
                      <div className="break-words text-sm text-[#7f8c8d]">
                        Original: {producto.moneda} ${(producto[precio.tipo] || 0).toLocaleString("es-AR")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold sm:text-2xl ${precio.texto}`}>
                        ${calcularPrecioDinamico(producto, precio.tipo).toLocaleString("es-AR")}
                      </div>
                      <div className={`text-sm font-medium ${precio.texto}`}>ARS</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {producto.precioCosto > 0 && (
              <div className="rounded-xl border-2 border-[#f39c12] bg-white p-3">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#f39c12]">
                  <span>📈</span> Ganancias Estimadas (sobre costo)
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="min-w-0 rounded-lg bg-[#d5f4e6] p-2 text-center">
                    <div className="text-base font-bold text-[#27ae60] sm:text-lg">{ganancia("precio1")}%</div>
                    <div className="text-[#7f8c8d]">Precio 1</div>
                  </div>
                  <div className="min-w-0 rounded-lg bg-[#dbeafe] p-2 text-center">
                    <div className="text-base font-bold text-[#3498db] sm:text-lg">{ganancia("precio2")}%</div>
                    <div className="text-[#7f8c8d]">Precio 2</div>
                  </div>
                  <div className="min-w-0 rounded-lg bg-[#f3e8ff] p-2 text-center">
                    <div className="text-base font-bold text-[#9b59b6] sm:text-lg">{ganancia("precio3")}%</div>
                    <div className="text-[#7f8c8d]">Precio 3</div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="text-[#7f8c8d]">Costo:</span>
                  <div className="break-words font-bold text-[#e74c3c]">
                    ${calcularPrecioDinamico(producto, "precioCosto").toLocaleString("es-AR")} ARS
                  </div>
                </div>
                <div className="min-w-0 text-right">
                  <span className="text-[#7f8c8d]">Proveedor:</span>
                  <div className="break-words font-medium text-[#2c3e50]">{producto.proveedor || "—"}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-gradient-to-r from-[#95a5a6] to-[#7f8c8d] px-6 py-2 font-medium text-white shadow-md hover:from-[#7f8c8d] hover:to-[#6c7b7f]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
