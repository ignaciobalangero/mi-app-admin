"use client";

import { useState } from "react";
import {
  descripcionProductoVenta,
  htmlImpresionVenta,
  imprimirHtmlVenta,
  type TipoImpresionVenta,
  type VentaImpresion,
} from "@/lib/impresionVentaGeneral";

interface ModalRemitoProps {
  mostrar: boolean;
  venta: VentaImpresion | null;
  onClose: () => void;
  nombreNegocio?: string;
  direccionNegocio?: string;
  telefonoNegocio?: string;
}

export default function ModalRemitoImpresion({
  mostrar,
  venta,
  onClose,
  nombreNegocio = "",
  direccionNegocio = "",
  telefonoNegocio = "",
}: ModalRemitoProps) {
  const [tipo, setTipo] = useState<TipoImpresionVenta | null>(null);

  const cerrar = () => {
    setTipo(null);
    onClose();
  };

  const negocio = {
    nombre: nombreNegocio,
    direccion: direccionNegocio,
    telefono: telefonoNegocio,
  };

  const handleImprimir = () => {
    if (!venta || !tipo) return;
    const html = htmlImpresionVenta(venta, tipo, negocio);
    if (!imprimirHtmlVenta(html)) {
      alert("No se pudo abrir la ventana de impresión. Revisá el bloqueador de ventanas emergentes.");
    }
  };

  if (!mostrar || !venta) return null;

  const subtotal =
    venta.productos?.reduce(
      (acc, p) => acc + Number(p.precioUnitario || 0) * Number(p.cantidad || 0),
      0
    ) || 0;
  const descuentos =
    (venta.pagos?.reduce((acc, p) => acc + Number(p.monto || 0), 0) || 0) +
    (venta.telefonoComoPago ? Number(venta.telefonoComoPago.valorPago || 0) : 0);
  const totalFinal = Math.max(0, subtotal - descuentos);
  const cantItems =
    venta.productos?.reduce((a, p) => a + Number(p.cantidad || 0), 0) || 0;

  const elegirTipo = (t: TipoImpresionVenta) => setTipo(t);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-[#ecf0f1] max-h-[95vh] overflow-hidden flex flex-col">

        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg">
              🖨️
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {!tipo ? "Tipo de impresión" : tipo === "formal" ? "Remito — cliente final" : "Checklist — preparación"}
              </h2>
              <p className="text-blue-100 text-xs">
                {!tipo
                  ? "Elegí el formato según el destino del documento"
                  : "Vista previa · listo para imprimir"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {tipo && (
              <>
                <button
                  type="button"
                  onClick={() => setTipo(null)}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={handleImprimir}
                  className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] px-4 py-2 rounded-lg font-medium text-sm"
                >
                  🖨️ Imprimir
                </button>
              </>
            )}
            <button
              type="button"
              onClick={cerrar}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 bg-white flex-1">
          {!tipo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto py-4">
              <button
                type="button"
                onClick={() => elegirTipo("formal")}
                className="text-left p-6 rounded-xl border-2 border-[#3498db] hover:bg-[#ebf3fd] transition-colors group"
              >
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-bold text-[#2c3e50] text-lg mb-2 group-hover:text-[#3498db]">
                  Cliente final
                </h3>
                <p className="text-sm text-[#7f8c8d]">
                  Remito formal con precios, totales y datos del negocio. Ideal para entregar al comprador.
                </p>
              </button>
              <button
                type="button"
                onClick={() => elegirTipo("checklist")}
                className="text-left p-6 rounded-xl border-2 border-[#f39c12] hover:bg-[#fef9e7] transition-colors group"
              >
                <div className="text-3xl mb-3">☑️</div>
                <h3 className="font-bold text-[#2c3e50] text-lg mb-2 group-hover:text-[#f39c12]">
                  Preparación de pedido
                </h3>
                <p className="text-sm text-[#7f8c8d]">
                  Lista compacta con casilla, precios y total. Una línea por producto para preparar pedidos de repuestos.
                </p>
              </button>
              <p className="md:col-span-2 text-center text-xs text-[#95a5a6]">
                Pedido {venta.nroVenta || venta.id?.slice(-6)} · {venta.cliente} · {cantItems} ítems
              </p>
            </div>
          ) : tipo === "checklist" ? (
            <div className="max-w-2xl mx-auto">
              <div className="border-b-2 border-[#2c3e50] pb-3 mb-4">
                <h1 className="font-bold text-base">{nombreNegocio || "Pedido"} — Checklist</h1>
                <p className="text-sm text-[#7f8c8d] mt-1">
                  <strong>Pedido:</strong> {venta.nroVenta || venta.id?.slice(-6)} ·{" "}
                  <strong>Cliente:</strong> {venta.cliente} · <strong>Fecha:</strong> {venta.fecha}
                </p>
              </div>
              <div className="space-y-0.5 text-sm">
                {venta.productos?.map((p, i) => {
                  const pu = Number(p.precioUnitario) || 0;
                  const cant = Number(p.cantidad) || 0;
                  const sub = pu * cant;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 py-1 border-b border-[#ecf0f1] text-[#2c3e50]"
                    >
                      <span className="shrink-0 text-[#bdc3c7]">☐</span>
                      <span className="shrink-0 w-7 text-right font-bold">{cant}×</span>
                      <span className="flex-1 min-w-0">
                        {p.codigo ? (
                          <span className="text-[#7f8c8d] font-mono text-xs mr-1">{p.codigo}</span>
                        ) : null}
                        {descripcionProductoVenta(p)}
                      </span>
                      <span className="shrink-0 text-right text-xs whitespace-nowrap">
                        <span className="text-[#7f8c8d]">${pu.toLocaleString("es-AR")}</span>{" "}
                        <strong>${sub.toLocaleString("es-AR")}</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 ml-auto w-56 text-sm border-t-2 border-[#2c3e50] pt-3 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>${subtotal.toLocaleString("es-AR")}</strong>
                </div>
                {descuentos > 0 && (
                  <div className="flex justify-between text-[#27ae60]">
                    <span>Descuentos</span>
                    <strong>-${descuentos.toLocaleString("es-AR")}</strong>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-[#ecf0f1] pt-2">
                  <span>Total</span>
                  <span className="text-[#8e44ad]">${totalFinal.toLocaleString("es-AR")}</span>
                </div>
              </div>
              <p className="text-xs text-[#95a5a6] mt-4 text-center">
                Marcá cada casilla al preparar el pedido
              </p>
            </div>
          ) : (
            <>
              <div className="text-center border-b-2 border-[#3498db] pb-6 mb-6">
                <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">
                  {nombreNegocio || (
                    <span className="text-[#bdc3c7] italic text-xl font-normal">
                      Sin nombre de negocio configurado
                    </span>
                  )}
                </h1>
                {direccionNegocio && <p className="text-[#7f8c8d] text-sm">{direccionNegocio}</p>}
                {telefonoNegocio && <p className="text-[#7f8c8d] text-sm">Tel: {telefonoNegocio}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 text-sm">
                  <h3 className="font-bold text-[#2c3e50] mb-2">REMITO DE VENTA</h3>
                  <p>
                    <strong>N°:</strong> {venta.nroVenta || venta.id?.slice(-6)}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {venta.fecha}
                  </p>
                  <p>
                    <strong>Estado:</strong>{" "}
                    {venta.estado === "pagado" ? "PAGADO" : "PENDIENTE"}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] rounded-xl p-4 text-sm">
                  <h3 className="font-bold text-[#2c3e50] mb-2">CLIENTE</h3>
                  <p>
                    <strong>{venta.cliente}</strong>
                  </p>
                  <p className="text-[#7f8c8d] mt-1">
                    Emisión: {new Date().toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#34495e] text-white">
                      <th className="p-2 text-center w-10">Cant.</th>
                      <th className="p-2 text-left w-20">Cód.</th>
                      <th className="p-2 text-left">Descripción</th>
                      <th className="p-2 text-right">P. unit.</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venta.productos?.map((p, index) => {
                      const desc = descripcionProductoVenta(p);
                      const pu = Number(p.precioUnitario) || 0;
                      const cant = Number(p.cantidad) || 0;
                      return (
                        <tr
                          key={index}
                          className={index % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"}
                        >
                          <td className="p-2 text-center font-semibold">{cant}</td>
                          <td className="p-2 font-mono text-xs text-[#7f8c8d]">
                            {p.codigo || "—"}
                          </td>
                          <td className="p-2">
                            {desc}
                            {p.color ? (
                              <span className="text-[#7f8c8d] text-xs"> · {p.color}</span>
                            ) : null}
                          </td>
                          <td className="p-2 text-right">${pu.toLocaleString("es-AR")}</td>
                          <td className="p-2 text-right font-bold">
                            ${(pu * cant).toLocaleString("es-AR")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(venta.pagos?.length || venta.telefonoComoPago) ? (
                <div className="mb-6 text-sm">
                  <h3 className="font-bold text-[#2c3e50] mb-2">Pagos</h3>
                  {venta.pagos?.map((pago, i) => (
                    <p key={i} className="text-[#27ae60]">
                      {pago.formaPago} — ${Number(pago.monto)?.toLocaleString("es-AR")}{" "}
                      {pago.moneda}
                    </p>
                  ))}
                  {venta.telefonoComoPago && (
                    <p className="text-[#3498db]">
                      Teléfono parte de pago — $
                      {Number(venta.telefonoComoPago.valorPago)?.toLocaleString("es-AR")}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="flex justify-end">
                <div className="w-72 bg-[#f8f9fa] rounded-xl p-4 border border-[#ecf0f1]">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal</span>
                    <strong>${subtotal.toLocaleString("es-AR")}</strong>
                  </div>
                  {descuentos > 0 && (
                    <div className="flex justify-between text-[#27ae60] mb-2">
                      <span>Descuentos</span>
                      <strong>-${descuentos.toLocaleString("es-AR")}</strong>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-[#3498db] pt-2 text-lg">
                    <span className="font-bold">Total</span>
                    <strong className="text-[#8e44ad]">
                      ${totalFinal.toLocaleString("es-AR")}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
