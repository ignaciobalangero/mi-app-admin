// components/HistorialCajas.tsx
import React, { useState } from 'react';
import { History, TrendingUp } from 'lucide-react';
import { CajaHistorial } from '../types/caja';
import { 
  agruparCajasPorMes, 
  calcularTotalesPorMes, 
  calcularTotalHistorial,
  formatearFecha,
  formatearMes 
} from '../utils/cajaUtils';

interface HistorialCajasProps {
  historialCajas: CajaHistorial[];
}

const HistorialCajas: React.FC<HistorialCajasProps> = ({ historialCajas }) => {
  const [mostrarHistorial, setMostrarHistorial] = useState(true);
  const [mesesExpandidos, setMesesExpandidos] = useState(new Set([new Date().toISOString().slice(0, 7)]));

  const cajasPorMes = agruparCajasPorMes(historialCajas);
  const totalesPorMes = calcularTotalesPorMes(cajasPorMes);
  const totalesHistorial = calcularTotalHistorial(historialCajas);

  const toggleMesExpandido = (mes: string) => {
    setMesesExpandidos(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(mes)) {
        nuevo.delete(mes);
      } else {
        nuevo.add(mes);
      }
      return nuevo;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-800">Historial de Cajas por Mes</h3>
          </div>
          <button
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {mostrarHistorial ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      {/* Resumen Total Global */}
      <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-600">Total General Ventas</p>
            <p className="text-lg font-bold text-blue-600">
              ${totalesHistorial.ventas.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">Total General Efectivo</p>
            <p className="text-lg font-bold text-green-600">
              ${totalesHistorial.efectivo.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">Total General Transferencias</p>
            <p className="text-lg font-bold text-blue-600">
              ${totalesHistorial.transferencia.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">Total General C. Corriente</p>
            <p className="text-lg font-bold text-orange-600">
              ${totalesHistorial.cuentaCorriente.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      {mostrarHistorial && (
        <div className="space-y-0">
          {totalesPorMes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium">No hay historial de cajas</p>
              <p className="text-sm">Las cajas cerradas aparecerán aquí</p>
            </div>
          ) : (
            totalesPorMes.map((mesData) => (
              <div key={mesData.mes} className="border-b border-gray-200 last:border-b-0">
                
                {/* Header del Mes */}
                <div 
                  className="bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
                  onClick={() => toggleMesExpandido(mesData.mes)}
                >
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`transform transition-transform duration-200 ${
                        mesesExpandidos.has(mesData.mes) ? 'rotate-90' : 'rotate-0'
                      }`}>
                        <TrendingUp className="w-4 h-4 text-gray-600" />
                      </div>
                      <h4 className="text-base font-bold text-gray-800 capitalize">
                        {formatearMes(mesData.mes)}
                      </h4>
                      <span className="text-sm text-gray-500">
                        ({mesData.diasTrabajados} días)
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Ventas</p>
                        <p className="font-bold text-blue-600">
                          ${mesData.ventas.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Promedio/día</p>
                        <p className="font-bold text-green-600">
                          ${mesData.promedioVentas.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Diferencias</p>
                        <p className={`font-bold ${
                          mesData.diferenciaNeta === 0 
                            ? 'text-green-600' 
                            : mesData.diferenciaNeta > 0
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                          {mesData.diferenciaNeta === 0 && '✅ Exacto'}
                          {mesData.diferenciaNeta > 0 && `+$${mesData.diferenciaNeta.toLocaleString()}`}
                          {mesData.diferenciaNeta < 0 && `-$${Math.abs(mesData.diferenciaNeta).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalle del Mes */}
                {mesesExpandidos.has(mesData.mes) && (
                  <div className="bg-white">
                    {/* Resumen del Mes */}
                    <div className="bg-blue-50 px-6 py-3 border-b border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Efectivo</p>
                          <p className="text-sm font-bold text-green-600">
                            ${mesData.efectivo.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Transferencias</p>
                          <p className="text-sm font-bold text-blue-600">
                            ${mesData.transferencia.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">C. Corriente</p>
                          <p className="text-sm font-bold text-orange-600">
                            ${mesData.cuentaCorriente.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Sobrantes</p>
                          <p className="text-sm font-bold text-blue-600">
                            +${mesData.diferenciasPositivas.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Faltantes</p>
                          <p className="text-sm font-bold text-red-600">
                            -${mesData.diferenciasNegativas.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Cajas del Mes */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Fecha
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Ventas
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Efectivo
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Transfer.
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              C. Corriente
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              En Caja
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              Dif.
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {cajasPorMes[mesData.mes]
                            .sort((a, b) => b.fecha.localeCompare(a.fecha))
                            .map((caja, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatearFecha(caja.fecha)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                ${caja.totalVentas.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                                ${caja.efectivo.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                                ${caja.transferencia.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 text-right font-medium">
                                ${caja.cuentaCorriente.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                ${caja.efectivoEnCaja.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  caja.diferencia === 0 
                                    ? 'bg-green-100 text-green-800'
                                    : caja.diferencia > 0
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {caja.diferencia === 0 && '✅'}
                                  {caja.diferencia > 0 && `+${caja.diferencia.toLocaleString()}`}
                                  {caja.diferencia < 0 && `${caja.diferencia.toLocaleString()}`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HistorialCajas;