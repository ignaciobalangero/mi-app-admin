"use client";

import { useEffect, useState } from "react";
import SelectorProductoVentaGeneral from "./SelectorProductoVentaGeneral";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import type { ProductoStock } from "./SelectorProductoVentaGeneral";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAgregar: (producto: any) => void;
}

export default function ModalRepuesto({ isOpen, onClose, onAgregar }: Props) {
  const [producto, setProducto] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [hojaProducto, setHojaProducto] = useState("");
  const [hojaSeleccionada, setHojaSeleccionada] = useState("");
  const [hojasDisponibles, setHojasDisponibles] = useState<string[]>([]);
  const [hoja, setHoja] = useState("");
  const [categoria, setCategoria] = useState("");
  const [color, setColor] = useState("");
  const [precio, setPrecio] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [codigo, setCodigo] = useState("");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const [filtroTexto, setFiltroTexto] = useState("");

  useEffect(() => {
    const cargarHojas = async () => {
      if (!rol?.negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`));
      const hojas = new Set<string>();
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.hoja) hojas.add(data.hoja);
      });
      const lista = Array.from(hojas);
      setHojasDisponibles(lista);
      if (!hojaSeleccionada && lista.length > 0) {
        setHojaSeleccionada(lista[0]);
      }
    };
    cargarHojas();
  }, [rol?.negocioID]);

  const handleAgregar = () => {
    if (!producto || cantidad <= 0 || precio <= 0) return;

    onAgregar({
      categoria: "Repuesto",
      hoja: hojaSeleccionada,
      producto,
      marca,
      modelo,
      categoriaRepuesto: categoria,
      color,
      cantidad,
      precioUnitario: precio,
      total: precio * cantidad,
      codigo,
      moneda: "USD",
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
        <h2 className="text-xl font-bold">Agregar Repuesto</h2>

        {hojasDisponibles.length > 0 && (
          <select
            value={hojaSeleccionada}
            onChange={(e) => setHojaSeleccionada(e.target.value)}
            className="border px-3 py-2 w-full rounded"
          >
            {hojasDisponibles.map((hoja, i) => (
              <option key={i} value={hoja}>
                {hoja}
              </option>
            ))}
          </select>
        )}

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
