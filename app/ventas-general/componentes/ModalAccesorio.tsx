"use client";

import { useState } from "react";
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
    const producto = productos[0];
    if (!producto || cantidad <= 0 || producto.precioUnitario <= 0) return;

    onAgregar({
      categoria: "Accesorio",
      producto: producto.producto,
      marca: producto.marca,
      modelo: producto.modelo,
      categoriaAccesorio: producto.categoria,
      color: producto.color,
      cantidad,
      precioUnitario: producto.precioUnitario,
      total: producto.precioUnitario * cantidad,
      codigo: producto.id,
      moneda: producto.moneda,
    });

    onClose();
    reset();
  };

  const reset = () => {
    setProductos([]);
    setCantidad(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-xl space-y-4">
        <h2 className="text-xl font-bold">Agregar Accesorio</h2>

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

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-500 rounded hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleAgregar}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
