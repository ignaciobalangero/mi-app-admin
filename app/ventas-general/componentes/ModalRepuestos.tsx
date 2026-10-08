"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    const desdeSelector = productos[productos.length - 1];
    if (desdeSelector && (desdeSelector.id || desdeSelector.codigo)) {
      const cant = Number(cantidad) > 0 ? Number(cantidad) : Number(desdeSelector.cantidad) || 1;
      const pu = Number(desdeSelector.precioUnitario ?? precio) || 0;
      if (pu <= 0) return;
      onAgregar({
        ...desdeSelector,
        categoria: desdeSelector.categoria || "Repuesto",
        hoja: desdeSelector.hoja || hojaSeleccionada,
        cantidad: cant,
        precioUnitario: pu,
        total: pu * cant,
        codigo: desdeSelector.codigo || desdeSelector.id || codigo,
        id: desdeSelector.id || desdeSelector.codigo || "",
        stockDocId: desdeSelector.stockDocId || desdeSelector.id || "",
        tipo: desdeSelector.tipo || (desdeSelector.hoja ? "general" : "repuesto"),
        origenStock:
          desdeSelector.origenStock ||
          (desdeSelector.tipo === "repuesto"
            ? "stockRepuestos"
            : desdeSelector.tipo === "accesorio"
              ? "stockAccesorios"
              : "stockExtra"),
        moneda: desdeSelector.moneda || moneda || "USD",
      });
      onClose();
      reset();
      return;
    }

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
      codigo: codigo || "",
      id: codigo || "",
      stockDocId: codigo || "",
      tipo: hojaSeleccionada ? "general" : "repuesto",
      origenStock: hojaSeleccionada ? "stockExtra" : "stockRepuestos",
      moneda: moneda || "USD",
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

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147482000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-xl rounded-t-2xl shadow-lg flex flex-col max-h-[92dvh] min-h-0 overflow-hidden">
        <div className="p-4 sm:p-6 pb-2 flex-shrink-0 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6">
          <h2 className="text-xl font-bold">Agregar Repuesto</h2>
        </div>

        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 space-y-4 min-h-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
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
