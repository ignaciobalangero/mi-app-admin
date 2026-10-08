"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import SelectorProductoVentaGeneral from "./SelectorProductoVentaGeneral";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAgregar: (producto: any) => void;
}

export default function ModalAccesorio({ isOpen, onClose, onAgregar }: Props) {
  const [productos, setProductos] = useState<any[]>([]);
  const [cantidad, setCantidad] = useState(1);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [color, setColor] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [filtroTexto, setFiltroTexto] = useState("");

  const handleAgregar = () => {
    const producto = productos[productos.length - 1] || productos[0];
    if (!producto || cantidad <= 0 || Number(producto.precioUnitario) <= 0) return;

    onAgregar({
      ...producto,
      categoria: "Accesorio",
      producto: producto.producto,
      marca: producto.marca,
      modelo: producto.modelo,
      categoriaAccesorio: producto.categoria,
      color: producto.color,
      cantidad,
      precioUnitario: producto.precioUnitario,
      total: producto.precioUnitario * cantidad,
      codigo: producto.codigo || producto.id,
      id: producto.id || producto.codigo || "",
      stockDocId: producto.stockDocId || producto.id || "",
      tipo: producto.tipo || "accesorio",
      origenStock: producto.origenStock || "stockAccesorios",
      moneda: producto.moneda,
    });

    onClose();
    reset();
  };

  const reset = () => {
    setProductos([]);
    setCantidad(1);
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147482000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-xl rounded-t-2xl shadow-lg flex flex-col max-h-[92dvh] min-h-0 overflow-hidden">
        <div className="p-4 sm:p-6 pb-2 flex-shrink-0 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6">
          <h2 className="text-xl font-bold">Agregar Accesorio</h2>
        </div>

        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 space-y-4 min-h-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <SelectorProductoVentaGeneral
            productos={productos}
            setProductos={setProductos}
            setPrecio={setPrecio}
            setMarca={setMarca}
            setModelo={setModelo}
            setCategoria={setCategoria}
            setColor={setColor}
            setCodigo={setCodigo}
            setMoneda={setMoneda}
            filtroTexto={filtroTexto}
            setFiltroTexto={setFiltroTexto}
          />

          <input
            type="number"
            placeholder="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))}
            className="border px-3 py-2 w-full rounded"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 pt-3 border-t border-gray-100 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-500 rounded hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAgregar}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
