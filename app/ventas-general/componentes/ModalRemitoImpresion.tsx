"use client";

import { useEffect, useRef } from "react";

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
  nombreNegocio = "Tu Negocio",
  direccionNegocio = "Dirección del negocio",
  telefonoNegocio = "Teléfono"
}: ModalRemitoProps) {
  const remitoRef = useRef<HTMLDivElement>(null);

  const handleImprimir = () => {
    window.print();
  };

  if (!mostrar || !venta) return null;

  const subtotal = venta.productos?.reduce((acc: number, p: any) => {
    return acc + (p.precioUnitario * p.cantidad);
  }, 0) || 0;

  const descuentos = (venta.pagos?.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0) || 0) +
                    (venta.telefonoComoPago ? Number(venta.telefonoComoPago.valorPago || 0) : 0);

  const totalFinal = subtotal - descuentos;

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-[#ecf0f1] max-h-[95vh] overflow-hidden flex flex-col">
          
          <div className="no-print bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4 flex justify-between items-center">
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

          <div className="print-area overflow-y-auto p-6 bg-white" ref={remitoRef}>
            
            <div className="text-center border-b-2 border-[#3498db] pb-6 mb-6">
              <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">{nombreNegocio}</h1>
              <p className="text-[#7f8c8d] text-sm">{direccionNegocio}</p>
              <p className="text-[#7f8c8d] text-sm">Tel: {telefonoNegocio}</p>
            </div>

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
                      venta.estado === "pagado" 
                        ? "bg-[#d5f4e6] text-[#27ae60]" 
                        : "bg-[#fdebd0] text-[#e67e22]"
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
                      <tr key={index} className={`border-b border-[#ecf0f1] ${
                        index % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"
                      }`}>
                        <td className="p-3">{producto.categoria}</td>
                        <td className="p-3">{producto.producto}</td>
                        <td className="p-3">{producto.marca}</td>
                        <td className="p-3">{producto.modelo}</td>
                        <td className="p-3">{producto.color}</td>
                        <td className="p-3 text-right font-medium">
                          ${producto.precioUnitario?.toLocaleString("es-AR")}
                        </td>
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
                      <p className="text-lg font-bold text-[#27ae60]">
                        ${Number(pago.monto)?.toLocaleString("es-AR")} {pago.moneda}
                      </p>
                    </div>
                  ))}
                  
                  {venta.telefonoComoPago && (
                    <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] border border-[#3498db] rounded-xl p-4">
                      <p className="font-bold text-[#3498db] text-sm">Teléfono como parte de pago</p>
                      <p className="text-xs text-[#7f8c8d] mb-2">
                        {venta.telefonoComoPago.marca} {venta.telefonoComoPago.modelo}
                      </p>
                      <p className="text-lg font-bold text-[#3498db]">
                        ${Number(venta.telefonoComoPago.valorPago)?.toLocaleString("es-AR")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                        <span className="text-lg font-bold text-[#2c3e50]">
                          TOTAL {descuentos > 0 ? "A PAGAR" : ""}:
                        </span>
                        <span className="text-2xl font-bold text-[#8e44ad]">
                          ${Math.max(0, totalFinal)?.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#ecf0f1] mt-8 pt-6 text-center">
              <div className="bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] rounded-xl p-4">
                <p className="text-[#2c3e50] font-semibold">¡Gracias por su compra!</p>
                <p className="text-sm text-[#7f8c8d] mt-1">Este documento es válido como comprobante de compra</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}