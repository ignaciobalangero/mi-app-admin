// components/TablaVentasDia.tsx
import React from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { VentaDelDia } from '../types/caja';
import { formatearFecha } from '../utils/cajaUtils';

interface TablaVentasDiaProps {
  ventasDelDia: VentaDelDia[];
  fechaSeleccionada: string;
  cargandoVentas: boolean;
}

const TablaVentasDia: React.FC<TablaVentasDiaProps> = ({
  ventasDelDia,
  fechaSeleccionada,
  cargandoVentas
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">
            Ventas del {formatearFecha(fechaSeleccionada)}
          </h3>
          {cargandoVentas && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Cargando...</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Venta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cliente
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Método
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ventasDelDia.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <p>No hay ventas registradas para esta fecha</p>
                  </div>
                </td>
              </tr>
            ) : (
              ventasDelDia.map((venta) => (
                <tr key={venta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{venta.nroVenta}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {venta.cliente}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    ${venta.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      venta.estado === 'pagado' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {venta.estado === 'pagado' ? '✅ Pagado' : '📋 Cuenta Corriente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      venta.metodoPago === 'efectivo' 
                        ? 'bg-green-100 text-green-800'
                        : venta.metodoPago === 'transferencia'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {venta.metodoPago === 'efectivo' && '💰 Efectivo'}
                      {venta.metodoPago === 'transferencia' && '🏦 Transferencia'}
                      {venta.metodoPago === 'cuenta_corriente' && '📋 C. Corriente'}
                      {!['efectivo', 'transferencia', 'cuenta_corriente'].includes(venta.metodoPago) && 
                        `💳 ${venta.metodoPago}`}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaVentasDia;