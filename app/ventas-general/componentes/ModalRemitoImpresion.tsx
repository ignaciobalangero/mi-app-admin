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
      {/* Estilos para impresión */}
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

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] bg-white/30 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[95vh] overflow-hidden flex flex-col">
          
          {/* Header del Modal - NO se imprime */}
          <div className="no-print bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🖨️</span>
              <h2 className="text-xl font-bold">Vista Previa - Remito</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleImprimir}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200"
              >
                ×
              </button>
            </div>
          </div>

          {/* Contenido del Remito - SÍ se imprime */}
          <div className="print-area overflow-y-auto p-8 bg-white" ref={remitoRef}>
            
            {/* Encabezado del Negocio */}
            <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{nombreNegocio}</h1>
              <p className="text-gray-600">{direccionNegocio}</p>
              <p className="text-gray-600">Tel: {telefonoNegocio}</p>
            </div>

            {/* Información del Remito */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">
                  📋 REMITO DE VENTA
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>N° Remito:</strong> {venta.nroVenta || venta.id?.slice(-6)}</p>
                  <p><strong>Fecha:</strong> {venta.fecha}</p>
                  <p><strong>Estado:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      venta.estado === "pagado" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {venta.estado === "pagado" ? "PAGADO" : "PENDIENTE"}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">
                  👤 DATOS DEL CLIENTE
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Cliente:</strong> {venta.cliente}</p>
                  <p><strong>Fecha de emisión:</strong> {new Date().toLocaleDateString("es-AR")}</p>
                </div>
              </div>
            </div>

            {/* Tabla de Productos */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                📦 DETALLE DE PRODUCTOS
              </h3>
              
              <table className="w-full border-collapse border border-gray-400 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 p-2 text-left">Categoría</th>
                    <th className="border border-gray-400 p-2 text-left">Producto</th>
                    <th className="border border-gray-400 p-2 text-left">Marca</th>
                    <th className="border border-gray-400 p-2 text-left">Modelo</th>
                    <th className="border border-gray-400 p-2 text-left">Color</th>
                    <th className="border border-gray-400 p-2 text-right">Precio Unit.</th>
                    <th className="border border-gray-400 p-2 text-center">Cant.</th>
                    <th className="border border-gray-400 p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.productos?.map((producto: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-400 p-2">{producto.categoria}</td>
                      <td className="border border-gray-400 p-2">{producto.producto}</td>
                      <td className="border border-gray-400 p-2">{producto.marca}</td>
                      <td className="border border-gray-400 p-2">{producto.modelo}</td>
                      <td className="border border-gray-400 p-2">{producto.color}</td>
                      <td className="border border-gray-400 p-2 text-right">
                        ${producto.precioUnitario?.toLocaleString("es-AR")}
                      </td>
                      <td className="border border-gray-400 p-2 text-center">{producto.cantidad}</td>
                      <td className="border border-gray-400 p-2 text-right font-medium">
                        ${(producto.precioUnitario * producto.cantidad)?.toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagos y Descuentos */}
            {(venta.pagos?.length > 0 || venta.telefonoComoPago) && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                  💳 PAGOS REGISTRADOS
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venta.pagos?.map((pago: any, index: number) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-3">
                      <p className="font-medium">{pago.formaPago}</p>
                      <p className="text-sm text-gray-600">{pago.observaciones}</p>
                      <p className="text-lg font-bold text-green-700">
                        ${Number(pago.monto)?.toLocaleString("es-AR")} {pago.moneda}
                      </p>
                    </div>
                  ))}
                  
                  {venta.telefonoComoPago && (
                    <div className="border border-gray-300 rounded-lg p-3">
                      <p className="font-medium">Teléfono como parte de pago</p>
                      <p className="text-sm text-gray-600">
                        {venta.telefonoComoPago.marca} {venta.telefonoComoPago.modelo}
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        ${Number(venta.telefonoComoPago.valorPago)?.toLocaleString("es-AR")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Totales */}
            <div className="border-t-2 border-gray-400 pt-6">
              <div className="flex justify-end">
                <div className="w-80">
                  <div className="space-y-3 text-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">Subtotal:</span>
                      <span className="font-bold">${subtotal?.toLocaleString("es-AR")}</span>
                    </div>
                    
                    {descuentos > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Descuentos:</span>
                        <span className="font-medium">-${descuentos?.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-400 pt-3">
                      <div className="flex justify-between text-xl font-bold">
                        <span>TOTAL {descuentos > 0 ? "A PAGAR" : ""}:</span>
                        <span className="text-purple-700">
                          ${Math.max(0, totalFinal)?.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del Remito */}
            <div className="border-t border-gray-300 mt-8 pt-6 text-center text-sm text-gray-600">
              <p>Gracias por su compra</p>
              <p className="mt-2">Este documento es válido como comprobante de compra</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}