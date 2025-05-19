"use client";

import { useState } from "react";
import SelectorProducto from "./SelectorProducto";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAgregar: (producto: any) => void;
}

export default function ModalAccesorio({ isOpen, onClose, onAgregar }: Props) {
  const [producto, setProducto] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [color, setColor] = useState("");
  const [precio, setPrecio] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [codigo, setCodigo] = useState("");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");

  const handleAgregar = () => {
    if (!producto || cantidad <= 0 || precio <= 0) return;

    onAgregar({
      categoria: "Accesorio",
      producto,
      marca,
      modelo,
      categoriaAccesorio: categoria,
      color,
      cantidad,
      precioUnitario: precio,
      total: precio * cantidad,
      codigo,
      moneda,
    });

    onClose();
    reset();
  };

  const reset = () => {
    setProducto("");
    setMarca("");
    setModelo("");
    setCategoria("");
    setColor("");
    setPrecio(0);
    setCantidad(1);
    setCodigo("");
    setMoneda("ARS");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-xl space-y-4">
        <h2 className="text-xl font-bold">Agregar Accesorio</h2>

        <SelectorProducto
          producto={producto}
          setProducto={setProducto}
          setPrecio={setPrecio}
          setMarca={setMarca}
          setModelo={setModelo}
          setCategoria={setCategoria}
          setColor={setColor}
          setCodigo={setCodigo}
          setMoneda={setMoneda}
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

