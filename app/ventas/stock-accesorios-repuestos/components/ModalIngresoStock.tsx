"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { promedioPonderadoCosto } from "@/lib/stock/promedioPonderado";

type ProductoStock = {
  id: string;
  producto?: string;
  codigo?: string;
  cantidad?: number;
  precioCosto?: number;
  precioCostoPesos?: number;
  moneda?: "ARS" | "USD" | string;
};

interface Props {
  producto: ProductoStock;
  negocioID: string;
  coleccion: "stockAccesorios" | "stockRepuestos";
  cotizacion?: number;
  onClose: () => void;
  onActualizado: (
    producto: ProductoStock & {
      cantidad: number;
      precioCosto: number;
      precioCostoPesos?: number;
    }
  ) => void;
}

export default function ModalIngresoStock({
  producto,
  negocioID,
  coleccion,
  cotizacion = 0,
  onClose,
  onActualizado,
}: Props) {
  const stockActual = Number(producto.cantidad) || 0;
  const costoActual = Number(producto.precioCosto) || 0;
  const moneda = String(producto.moneda || "ARS").toUpperCase();

  const [cantidadIngreso, setCantidadIngreso] = useState(1);
  const [costoIngreso, setCostoIngreso] = useState(costoActual || 0);
  const [guardando, setGuardando] = useState(false);

  const preview = useMemo(
    () =>
      promedioPonderadoCosto(
        stockActual,
        costoActual,
        cantidadIngreso,
        costoIngreso
      ),
    [stockActual, costoActual, cantidadIngreso, costoIngreso]
  );

  const puedeGuardar =
    cantidadIngreso > 0 && costoIngreso >= 0 && !Number.isNaN(costoIngreso);

  const confirmar = async () => {
    if (!negocioID || !producto.id || !puedeGuardar) return;
    setGuardando(true);
    try {
      const { nuevaCantidad, nuevoCosto } = promedioPonderadoCosto(
        stockActual,
        costoActual,
        cantidadIngreso,
        costoIngreso
      );

      const patch: Record<string, number> = {
        cantidad: nuevaCantidad,
        precioCosto: nuevoCosto,
      };

      if (coleccion === "stockRepuestos") {
        const cot = Number(cotizacion) > 0 ? Number(cotizacion) : 0;
        patch.precioCostoPesos =
          moneda === "USD" && cot > 0 ? nuevoCosto * cot : nuevoCosto;
      }

      await updateDoc(
        doc(db, `negocios/${negocioID}/${coleccion}/${producto.id}`),
        patch
      );
      onActualizado({
        ...producto,
        cantidad: nuevaCantidad,
        precioCosto: nuevoCosto,
        ...(coleccion === "stockRepuestos"
          ? { precioCostoPesos: patch.precioCostoPesos }
          : {}),
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("No se pudo actualizar el stock.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#ecf0f1] overflow-hidden">
        <div className="bg-gradient-to-r from-[#16a085] to-[#1abc9c] text-white p-4 flex justify-between items-start gap-3">
          <div>
            <h2 className="text-lg font-bold">Ingresar stock</h2>
            <p className="text-sm text-white/90 mt-1">
              {producto.producto || "Producto"}
              {producto.codigo ? ` · ${producto.codigo}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm bg-[#f8f9fa] rounded-xl p-3 border border-[#ecf0f1]">
            <div>
              <p className="text-[#7f8c8d] text-xs">Stock actual</p>
              <p className="font-semibold text-[#2c3e50]">{stockActual}</p>
            </div>
            <div>
              <p className="text-[#7f8c8d] text-xs">Costo actual</p>
              <p className="font-semibold text-[#2c3e50]">
                {moneda} ${costoActual.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2c3e50] mb-1">
              Cantidad a ingresar
            </label>
            <input
              type="number"
              min="1"
              value={cantidadIngreso}
              onChange={(e) => setCantidadIngreso(Math.max(0, Number(e.target.value) || 0))}
              className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl text-[#2c3e50]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2c3e50] mb-1">
              Costo unitario de esta compra ({moneda})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costoIngreso}
              onChange={(e) => setCostoIngreso(Number(e.target.value) || 0)}
              className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl text-[#2c3e50]"
            />
          </div>

          <div className="rounded-xl border-2 border-[#16a085] bg-[#e8f8f5] p-3 text-sm space-y-1">
            <p className="font-semibold text-[#0e6655]">Resultado (promedio ponderado)</p>
            <p className="text-[#2c3e50]">
              Nuevo stock: <strong>{preview.nuevaCantidad}</strong>
            </p>
            <p className="text-[#2c3e50]">
              Nuevo costo:{" "}
              <strong>
                {moneda} ${preview.nuevoCosto.toLocaleString("es-AR")}
              </strong>
            </p>
            <p className="text-xs text-[#7f8c8d] mt-1">
              Ejemplo: 50 × 18 + 50 × 14 = promedio 16. Los precios de venta no se modifican.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#ecf0f1] text-[#2c3e50] font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!puedeGuardar || guardando}
              onClick={confirmar}
              className="flex-1 py-2.5 rounded-xl bg-[#16a085] hover:bg-[#138d75] text-white font-semibold disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Confirmar ingreso"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
