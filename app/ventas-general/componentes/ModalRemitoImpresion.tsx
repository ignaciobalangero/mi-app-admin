"use client";

import { useRef } from "react";

interface ModalRemitoProps {
  mostrar: boolean;
  venta: any;
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
  telefonoNegocio = ""
}: ModalRemitoProps) {

  const handleImprimir = () => {
    if (!venta) return;

    const subtotal = venta.productos?.reduce((acc: number, p: any) => acc + (p.precioUnitario * p.cantidad), 0) || 0;
    const descuentos =
      (venta.pagos?.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0) || 0) +
      (venta.telefonoComoPago ? Number(venta.telefonoComoPago.valorPago || 0) : 0);
    const totalFinal = Math.max(0, subtotal - descuentos);

    const productosHTML = venta.productos?.map((p: any, i: number) => `
      <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1;">${p.categoria || "—"}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1;">${p.producto || p.descripcion || "—"}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1;">${p.marca || "—"}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1;">${p.modelo || "—"}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1;">${p.color || "—"}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1; text-align: right;">$${p.precioUnitario?.toLocaleString("es-AR")}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1; text-align: center;">${p.cantidad}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #ecf0f1; text-align: right; font-weight: bold;">$${(p.precioUnitario * p.cantidad)?.toLocaleString("es-AR")}</td>
      </tr>
    `).join("") || "";

    const pagosHTML = (venta.pagos?.length > 0 || venta.telefonoComoPago) ? `
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <div style="width: 32px; height: 32px; background: #f39c12; border-radius: 8px; display:flex; align-items:center; justify-content:center; color:white; font-size:14px;">💳</div>
          <h3 style="font-size: 14px; font-weight: 700; color: #2c3e50; margin: 0;">PAGOS REGISTRADOS</h3>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${(venta.pagos || []).map((pago: any) => `
            <div style="background: linear-gradient(to right, #d5f4e6, #c3f0ca); border: 1px solid #27ae60; border-radius: 10px; padding: 12px;">
              <p style="font-weight:700; color:#27ae60; font-size:13px; margin:0 0 4px;">${pago.formaPago}</p>
              <p style="font-size:11px; color:#7f8c8d; margin:0 0 6px;">${pago.observaciones || ""}</p>
              <p style="font-size:16px; font-weight:700; color:#27ae60; margin:0;">$${Number(pago.monto)?.toLocaleString("es-AR")} ${pago.moneda || ""}</p>
            </div>
          `).join("")}
          ${venta.telefonoComoPago ? `
            <div style="background: linear-gradient(to right, #ebf3fd, #d6eaff); border: 1px solid #3498db; border-radius: 10px; padding: 12px;">
              <p style="font-weight:700; color:#3498db; font-size:13px; margin:0 0 4px;">Teléfono como parte de pago</p>
              <p style="font-size:11px; color:#7f8c8d; margin:0 0 6px;">${venta.telefonoComoPago.marca} ${venta.telefonoComoPago.modelo}</p>
              <p style="font-size:16px; font-weight:700; color:#3498db; margin:0;">$${Number(venta.telefonoComoPago.valorPago)?.toLocaleString("es-AR")}</p>
            </div>
          ` : ""}
        </div>
      </div>
    ` : "";

    const descuentosHTML = descuentos > 0 ? `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; color:#27ae60;">
        <span style="font-weight:500;">Descuentos:</span>
        <span style="font-weight:700;">-$${descuentos?.toLocaleString("es-AR")}</span>
      </div>
    ` : "";

    const ventanaImpresion = window.open("", "_blank", "width=900,height=700");
    if (!ventanaImpresion) return;

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Remito ${venta.nroVenta || venta.id?.slice(-6)}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: white; color: #2c3e50; padding: 32px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>

        <!-- ENCABEZADO NEGOCIO -->
        <div style="text-align:center; border-bottom:2px solid #3498db; padding-bottom:20px; margin-bottom:24px;">
          <h1 style="font-size:28px; font-weight:700; color:#2c3e50; margin-bottom:6px;">${nombreNegocio || "—"}</h1>
          ${direccionNegocio ? `<p style="color:#7f8c8d; font-size:13px; margin-bottom:2px;">${direccionNegocio}</p>` : ""}
          ${telefonoNegocio ? `<p style="color:#7f8c8d; font-size:13px;">Tel: ${telefonoNegocio}</p>` : ""}
        </div>

        <!-- REMITO + CLIENTE -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
          <div style="background:linear-gradient(to right, #ecf0f1, #d5dbdb); border-radius:10px; padding:16px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
              <div style="width:32px; height:32px; background:#3498db; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:14px;">📋</div>
              <h3 style="font-size:14px; font-weight:700; color:#2c3e50;">REMITO DE VENTA</h3>
            </div>
            <p style="font-size:13px; margin-bottom:6px;"><strong>N° Remito:</strong> ${venta.nroVenta || venta.id?.slice(-6)}</p>
            <p style="font-size:13px; margin-bottom:6px;"><strong>Fecha:</strong> ${venta.fecha}</p>
            <p style="font-size:13px; display:flex; align-items:center; gap:8px;">
              <strong>Estado:</strong>
              <span style="padding:2px 8px; border-radius:6px; font-size:11px; font-weight:600; background:${venta.estado === 'pagado' ? '#d5f4e6' : '#fdebd0'}; color:${venta.estado === 'pagado' ? '#27ae60' : '#e67e22'};">
                ${venta.estado === "pagado" ? "PAGADO" : "PENDIENTE"}
              </span>
            </p>
          </div>

          <div style="background:linear-gradient(to right, #ebf3fd, #d6eaff); border-radius:10px; padding:16px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
              <div style="width:32px; height:32px; background:#3498db; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:14px;">👤</div>
              <h3 style="font-size:14px; font-weight:700; color:#2c3e50;">DATOS DEL CLIENTE</h3>
            </div>
            <p style="font-size:13px; margin-bottom:6px;"><strong>Cliente:</strong> ${venta.cliente}</p>
            <p style="font-size:13px;"><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString("es-AR")}</p>
          </div>
        </div>

        <!-- PRODUCTOS -->
        <div style="margin-bottom:24px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
            <div style="width:32px; height:32px; background:#9b59b6; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:14px;">📦</div>
            <h3 style="font-size:14px; font-weight:700; color:#2c3e50;">DETALLE DE PRODUCTOS</h3>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background:#34495e; color:white;">
                <th style="padding:10px 12px; text-align:left; font-weight:500;">Categoría</th>
                <th style="padding:10px 12px; text-align:left; font-weight:500;">Producto</th>
                <th style="padding:10px 12px; text-align:left; font-weight:500;">Marca</th>
                <th style="padding:10px 12px; text-align:left; font-weight:500;">Modelo</th>
                <th style="padding:10px 12px; text-align:left; font-weight:500;">Color</th>
                <th style="padding:10px 12px; text-align:right; font-weight:500;">Precio Unit.</th>
                <th style="padding:10px 12px; text-align:center; font-weight:500;">Cant.</th>
                <th style="padding:10px 12px; text-align:right; font-weight:500;">Total</th>
              </tr>
            </thead>
            <tbody>${productosHTML}</tbody>
          </table>
        </div>

        <!-- PAGOS -->
        ${pagosHTML}

        <!-- TOTALES -->
        <div style="border-top:2px solid #3498db; padding-top:20px; margin-bottom:24px;">
          <div style="display:flex; justify-content:flex-end;">
            <div style="width:300px; background:linear-gradient(to right, #ecf0f1, #d5dbdb); border-radius:10px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; color:#2c3e50;">
                <span style="font-weight:500;">Subtotal:</span>
                <span style="font-weight:700; font-size:16px;">$${subtotal?.toLocaleString("es-AR")}</span>
              </div>
              ${descuentosHTML}
              <div style="border-top:2px solid #3498db; padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:15px; font-weight:700; color:#2c3e50;">TOTAL${descuentos > 0 ? " A PAGAR" : ""}:</span>
                <span style="font-size:22px; font-weight:700; color:#8e44ad;">$${totalFinal?.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="border-top:1px solid #ecf0f1; text-align:center; background:linear-gradient(to right, #f8f9fa, #ecf0f1); border-radius:10px; padding:16px;">
          <p style="font-weight:600; color:#2c3e50;">¡Gracias por su compra!</p>
          <p style="font-size:12px; color:#7f8c8d; margin-top:4px;">Este documento es válido como comprobante de compra</p>
        </div>

      </body>
      </html>
    `);

    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
    }, 500);
  };

  if (!mostrar || !venta) return null;

  const subtotal = venta.productos?.reduce((acc: number, p: any) => acc + (p.precioUnitario * p.cantidad), 0) || 0;
  const descuentos =
    (venta.pagos?.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0) || 0) +
    (venta.telefonoComoPago ? Number(venta.telefonoComoPago.valorPago || 0) : 0);
  const totalFinal = subtotal - descuentos;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-[#ecf0f1] max-h-[95vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🖨️</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">Vista Previa - Remito</h2>
              <p className="text-blue-100 text-xs">Documento listo para imprimir</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImprimir}
              className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm transform hover:scale-105"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Vista previa */}
        <div className="overflow-y-auto p-6 bg-white">

          {/* Encabezado negocio */}
          <div className="text-center border-b-2 border-[#3498db] pb-6 mb-6">
            <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">
              {nombreNegocio || <span className="text-[#bdc3c7] italic text-xl font-normal">Sin nombre de negocio configurado</span>}
            </h1>
            {direccionNegocio && <p className="text-[#7f8c8d] text-sm">{direccionNegocio}</p>}
            {telefonoNegocio && <p className="text-[#7f8c8d] text-sm">Tel: {telefonoNegocio}</p>}
          </div>

          {/* Info remito + cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📋</span>
                </div>
                <h3 className="text-base font-bold text-[#2c3e50]">REMITO DE VENTA</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>N° Remito:</strong> {venta.nroVenta || venta.id?.slice(-6)}</p>
                <p><strong>Fecha:</strong> {venta.fecha}</p>
                <p className="flex items-center gap-2">
                  <strong>Estado:</strong>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    venta.estado === "pagado" ? "bg-[#d5f4e6] text-[#27ae60]" : "bg-[#fdebd0] text-[#e67e22]"
                  }`}>
                    {venta.estado === "pagado" ? "PAGADO" : "PENDIENTE"}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">👤</span>
                </div>
                <h3 className="text-base font-bold text-[#2c3e50]">DATOS DEL CLIENTE</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Cliente:</strong> {venta.cliente}</p>
                <p><strong>Fecha de emisión:</strong> {new Date().toLocaleDateString("es-AR")}</p>
              </div>
            </div>
          </div>

          {/* Tabla productos */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📦</span>
              </div>
              <h3 className="text-base font-bold text-[#2c3e50]">DETALLE DE PRODUCTOS</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-[#34495e] to-[#2c3e50] text-white">
                    <th className="p-3 text-left font-medium">Categoría</th>
                    <th className="p-3 text-left font-medium">Producto</th>
                    <th className="p-3 text-left font-medium">Marca</th>
                    <th className="p-3 text-left font-medium">Modelo</th>
                    <th className="p-3 text-left font-medium">Color</th>
                    <th className="p-3 text-right font-medium">Precio Unit.</th>
                    <th className="p-3 text-center font-medium">Cant.</th>
                    <th className="p-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.productos?.map((producto: any, index: number) => (
                    <tr key={index} className={`border-b border-[#ecf0f1] ${index % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"}`}>
                      <td className="p-3">{producto.categoria}</td>
                      <td className="p-3">{producto.producto}</td>
                      <td className="p-3">{producto.marca}</td>
                      <td className="p-3">{producto.modelo}</td>
                      <td className="p-3">{producto.color}</td>
                      <td className="p-3 text-right font-medium">${producto.precioUnitario?.toLocaleString("es-AR")}</td>
                      <td className="p-3 text-center font-medium">{producto.cantidad}</td>
                      <td className="p-3 text-right font-bold text-[#2c3e50]">
                        ${(producto.precioUnitario * producto.cantidad)?.toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagos */}
          {(venta.pagos?.length > 0 || venta.telefonoComoPago) && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💳</span>
                </div>
                <h3 className="text-base font-bold text-[#2c3e50]">PAGOS REGISTRADOS</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {venta.pagos?.map((pago: any, index: number) => (
                  <div key={index} className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border border-[#27ae60] rounded-xl p-4">
                    <p className="font-bold text-[#27ae60] text-sm">{pago.formaPago}</p>
                    <p className="text-xs text-[#7f8c8d] mb-2">{pago.observaciones}</p>
                    <p className="text-lg font-bold text-[#27ae60]">${Number(pago.monto)?.toLocaleString("es-AR")} {pago.moneda}</p>
                  </div>
                ))}
                {venta.telefonoComoPago && (
                  <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] border border-[#3498db] rounded-xl p-4">
                    <p className="font-bold text-[#3498db] text-sm">Teléfono como parte de pago</p>
                    <p className="text-xs text-[#7f8c8d] mb-2">{venta.telefonoComoPago.marca} {venta.telefonoComoPago.modelo}</p>
                    <p className="text-lg font-bold text-[#3498db]">${Number(venta.telefonoComoPago.valorPago)?.toLocaleString("es-AR")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="border-t-2 border-[#3498db] pt-6">
            <div className="flex justify-end">
              <div className="w-80 bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[#2c3e50]">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold text-lg">${subtotal?.toLocaleString("es-AR")}</span>
                  </div>
                  {descuentos > 0 && (
                    <div className="flex justify-between items-center text-[#27ae60]">
                      <span className="font-medium">Descuentos:</span>
                      <span className="font-bold">-${descuentos?.toLocaleString("es-AR")}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-[#3498db] pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-[#2c3e50]">TOTAL {descuentos > 0 ? "A PAGAR" : ""}:</span>
                      <span className="text-2xl font-bold text-[#8e44ad]">${Math.max(0, totalFinal)?.toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#ecf0f1] mt-8 pt-6 text-center">
            <div className="bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] rounded-xl p-4">
              <p className="text-[#2c3e50] font-semibold">¡Gracias por su compra!</p>
              <p className="text-sm text-[#7f8c8d] mt-1">Este documento es válido como comprobante de compra</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}