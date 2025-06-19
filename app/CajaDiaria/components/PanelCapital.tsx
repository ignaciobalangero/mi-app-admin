// components/PanelCapital.tsx
import React, { useState } from 'react';
import { Building2, Eye, EyeOff, RefreshCw, DollarSign, FileText, Vault } from 'lucide-react';
import { CapitalData } from '../types/caja';
import { calcularTotalInventario, calcularTotalEfectivo, calcularCapitalTotal } from '../utils/cajaUtils';

interface PanelCapitalProps {
  capitalData: CapitalData;
  cotizacionCapital: number;
  cargandoCapital: boolean;
  onActualizarEfectivo: (tipo: keyof CapitalData, valor: string) => void;
  onRecargarCapital: () => void;
  onCambiarCotizacion: (valor: number) => void;
}

const PanelCapital: React.FC<PanelCapitalProps> = ({
  capitalData,
  cotizacionCapital,
  cargandoCapital,
  onActualizarEfectivo,
  onRecargarCapital,
  onCambiarCotizacion
}) => {
  const [mostrarCapital, setMostrarCapital] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">Capital del Negocio</h3>
              <p className="text-purple-100 text-sm">Control total de inventario y efectivo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onRecargarCapital}
              disabled={cargandoCapital}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${cargandoCapital ? 'animate-spin' : ''}`} />
              <span className="text-sm">Actualizar</span>
            </button>
            
            <button
              onClick={() => setMostrarCapital(!mostrarCapital)}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              {mostrarCapital ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-sm">{mostrarCapital ? 'Ocultar' : 'Mostrar'}</span>
            </button>
          </div>
        </div>
      </div>

      {mostrarCapital && (
        <div className="p-6 space-y-6">
          
          {/* Resumen de Capital Total */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Inventario (USD)</p>
                  <p className="text-2xl font-bold text-blue-800">
                    ${calcularTotalInventario(capitalData).toLocaleString()} USD
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">Total Efectivo</p>
                  <p className="text-2xl font-bold text-green-800">
                    ${calcularTotalEfectivo(capitalData, cotizacionCapital).toFixed(2)} USD
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Vault className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600">Capital Total (USD)</p>
                  <p className="text-2xl font-bold text-purple-800">
                    ${calcularCapitalTotal(capitalData, cotizacionCapital).toLocaleString()} USD
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle del Inventario */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Inventario por Categorías */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Inventario por Categorías
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📱</span>
                    </div>
                    <span className="font-medium text-gray-700">Teléfonos</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">
                      ${capitalData.stockTelefonos.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">stockTelefonos</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🔌</span>
                    </div>
                    <span className="font-medium text-gray-700">Accesorios</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ${capitalData.stockAccesorios.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">stockAccesorios</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🔧</span>
                    </div>
                    <span className="font-medium text-gray-700">Repuestos</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      ${capitalData.stockRepuestos.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">stockRepuestos</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <span className="font-medium text-gray-700">Stock Extra</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">
                      ${capitalData.stockExtra.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">stockExtra</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Control de Efectivo */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Efectivo Disponible
              </h4>
              
              <div className="space-y-4">
                {/* USD */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💵 Efectivo en USD
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-600">$</span>
                    <input
  type="number"
  value={capitalData.efectivoUSD}
  onChange={(e) => onActualizarEfectivo('efectivoUSD', e.target.value)}
  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold text-gray-900 bg-white"
  placeholder="0"
/>
                    <span className="text-sm text-gray-700 font-medium">USD</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center font-medium">
                    ≈ ${(capitalData.efectivoUSD * cotizacionCapital).toLocaleString()} ARS
                  </p>
                </div>

                {/* ARS */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💴 Efectivo en ARS
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-600">$</span>
                    <input
  type="number"
  value={capitalData.efectivoARS}
  onChange={(e) => onActualizarEfectivo('efectivoARS', e.target.value)}
  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-bold text-gray-900 bg-white"
  placeholder="0"
/>
                    <span className="text-sm text-gray-700 font-medium">ARS</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center font-medium">
                    ≈ ${(capitalData.efectivoARS / cotizacionCapital).toFixed(2)} USD
                  </p>
                </div>

                {/* Cotización para conversión */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Cotización USD para conversión:
                  </label>
                  <input
  type="number"
  value={cotizacionCapital}
  onChange={(e) => onCambiarCotizacion(Number(e.target.value))}
  className="w-full px-2 py-1 border border-blue-300 rounded text-center text-sm font-bold text-gray-900 bg-white"
/>
                </div>

                {/* Total Efectivo */}
                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                  <p className="text-sm font-medium text-green-700 text-center">Total Efectivo</p>
                  <p className="text-xl font-bold text-green-800 text-center">
                    ${calcularTotalEfectivo(capitalData, cotizacionCapital).toFixed(2)} USD
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelCapital;