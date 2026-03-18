"use client";

import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  venta?: any;
  trabajo?: any;
  nombreNegocio?: string;
  negocioID: string;
  /** "venta" | "trabajo" - para el backend saber el origen */
  origen?: "venta" | "trabajo";
}

/**
 * Modal para emitir factura electrónica a partir de una venta o un trabajo.
 * Por ahora muestra mensaje de "próximamente". Cuando se conecte el proveedor,
 * aquí se enviará el request y se guardará CAE + PDF.
 */
export default function ModalEmitirFactura({ isOpen, onClose, venta, trabajo, nombreNegocio, negocioID, origen }: Props) {
  const [tipoComprobante, setTipoComprobante] = useState<"A" | "B">("B");
  const [docCliente, setDocCliente] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ CAE: string; numero: number } | null>(null);

  if (!isOpen) return null;

  const esTrabajo = !!trabajo;
  const cliente = esTrabajo
    ? (trabajo.cliente ?? "—")
    : (venta?.cliente ?? venta?.nombreCliente ?? "—");
  const total = esTrabajo
    ? (trabajo.precio ?? 0)
    : (venta?.total ?? venta?.totalVenta ?? 0);
  const moneda = esTrabajo ? (trabajo.moneda ?? "ARS") : (venta?.moneda ?? "ARS");
  const items = esTrabajo ? [] : (venta?.productos ?? venta?.items ?? []);
  const descripcion = esTrabajo ? (trabajo.trabajo ?? trabajo.modelo ?? "Servicio técnico") : null;

  const handleEmitir = async () => {
    if (!negocioID || !origen) return;
    setError(null);
    setExito(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/emitir-factura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocioID,
          origen,
          tipoComprobante,
          cliente: {
            nombre: cliente,
            docNro: docCliente.trim() || undefined,
          },
          total,
          moneda,
          descripcion: descripcion || undefined,
          ventaId: venta?.id,
          trabajoId: trabajo?.firebaseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al emitir la factura");
        return;
      }
      setExito({ CAE: data.CAE, numero: data.numero });
    } catch (e: any) {
      setError(e?.message || "Error de conexión");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧾</span>
              <div>
                <h3 className="text-lg font-bold">Emitir factura electrónica</h3>
                <p className="text-white/90 text-sm">{nombreNegocio || (esTrabajo ? "Trabajo" : "Venta")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[#7f8c8d]">
            {esTrabajo ? "Este trabajo" : "Esta venta"} se enviará a facturación electrónica (AFIP). Completá el tipo de comprobante y luego emití.
          </p>

          <div>
            <label className="block text-sm font-semibold text-[#2c3e50] mb-2">Tipo de comprobante</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  checked={tipoComprobante === "A"}
                  onChange={() => setTipoComprobante("A")}
                  className="text-[#9b59b6]"
                />
                <span>Factura A (CUIT)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  checked={tipoComprobante === "B"}
                  onChange={() => setTipoComprobante("B")}
                  className="text-[#9b59b6]"
                />
                <span>Factura B (DNI/CF)</span>
              </label>
            </div>
          </div>

          <div className="bg-[#f8f9fa] rounded-xl p-4 border border-[#ecf0f1]">
            <p className="text-xs font-semibold text-[#7f8c8d] uppercase mb-1">Cliente</p>
            <p className="font-medium text-[#2c3e50]">{cliente}</p>
            <div className="mt-3">
              <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                CUIT / DNI (opcional; si no se completa, se emite como consumidor final)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 20123456789 o 12345678"
                value={docCliente}
                onChange={(e) => setDocCliente(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-[#ecf0f1] px-3 py-2 text-[#2c3e50]"
              />
            </div>
            {descripcion && (
              <p className="text-sm text-[#2c3e50] mt-2">{descripcion}</p>
            )}
            <p className="text-xs text-[#7f8c8d] mt-2">
              Total: {moneda === "USD" ? "u$s" : "$"} {Number(total).toLocaleString("es-AR")}
            </p>
            {!esTrabajo && Array.isArray(items) && items.length > 0 && (
              <p className="text-xs text-[#7f8c8d] mt-1">{items.length} ítem(s)</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          {exito && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800">Factura emitida correctamente</p>
              <p className="text-sm text-green-700 mt-1">CAE: {exito.CAE} — Nº: {exito.numero}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-[#ecf0f1]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEmitir}
            disabled={enviando}
            className="flex-1 py-2.5 rounded-xl font-semibold bg-[#9b59b6] text-white hover:bg-[#8e44ad] disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Emitir factura"}
          </button>
        </div>
      </div>
    </div>
  );
}
