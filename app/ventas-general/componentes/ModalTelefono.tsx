"use client";

import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAgregar: (producto: {
    categoria: "Teléfono";
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
  }) => void;
}

export default function ModalTelefono({ isOpen, onClose, onAgregar }: Props) {
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);

  const handleAgregar = () => {
    onAgregar({ categoria: "Teléfono", descripcion, cantidad, precioUnitario });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded shadow-lg w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold">Agregar Teléfono</h2>

        <input
          type="text"
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border px-2 py-1 w-full"
        />
        <input
          type="number"
          placeholder="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(parseInt(e.target.value))}
          className="border px-2 py-1 w-full"
        />
        <input
          type="number"
          placeholder="Precio unitario"
          value={precioUnitario}
          onChange={(e) => setPrecioUnitario(parseFloat(e.target.value))}
          className="border px-2 py-1 w-full"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
          <button onClick={handleAgregar} className="px-4 py-2 bg-blue-600 text-white rounded">Agregar</button>
        </div>
      </div>
    </div>
  );
}
