// components/ControlEfectivo.tsx
import React from 'react';
import { CheckCircle, AlertTriangle, Archive, RefreshCw } from 'lucide-react';
import { ResumenCaja } from '../types/caja';
import { formatearFecha } from '../utils/cajaUtils';

interface ControlEfectivoProps {
  resumenCaja: ResumenCaja;
  cajaCerrada: boolean;
  diferenciaCaja: number;
  fechaSeleccionada: string;
  onCerrarCaja: () => void;
  onNuevaCaja: () => void;
  onActualizarEfectivo: (valor: number) => void;
}

const ControlEfectivo: React.FC<ControlEfectivoProps> = ({
  resumenCaja,
  cajaCerrada,
  diferenciaCaja,
  fechaSeleccionada,
  onCerrarCaja,
  onNuevaCaja,
  onActualizarEfectivo
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">Control de Efectivo</h3>
        {cajaCerrada && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Archive className="w-4 h-4" />
            <span>Caja cerrada el {formatearFecha(fechaSeleccionada)}</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💰 Efectivo en Caja (conteo físico)
          </label>
          <input
  type="number"
  value={resumenCaja.efectivoEnCaja}
  onChange={(e) => onActualizarEfectivo(Number(e.target.value) || 0)}
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-gray-900 bg-white"
  placeholder="Ingrese el efectivo contado"
  disabled={cajaCerrada}
/>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">📊 Efectivo que debería haber:</p>
          <p className="text-2xl font-bold text-gray-800 mb-3">
            ${resumenCaja.efectivo.toLocaleString()}
          </p>
          
          {resumenCaja.efectivoEnCaja > 0 && (
            <div className="text-sm">
              <p className="text-gray-600">Diferencia:</p>
              <p className={`font-bold ${
                (resumenCaja.efectivoEnCaja - resumenCaja.efectivo) === 0 
                  ? 'text-green-600' 
                  : (resumenCaja.efectivoEnCaja - resumenCaja.efectivo) > 0
                  ? 'text-blue-600'
                  : 'text-red-600'
              }`}>
                {(resumenCaja.efectivoEnCaja - resumenCaja.efectivo) === 0 && '✅ Exacto'}
                {(resumenCaja.efectivoEnCaja - resumenCaja.efectivo) > 0 && 
                  `💰 +$${(resumenCaja.efectivoEnCaja - resumenCaja.efectivo).toLocaleString()}`}
                {(resumenCaja.efectivoEnCaja - resumenCaja.efectivo) < 0 && 
                  `⚠️ -$${Math.abs(resumenCaja.efectivoEnCaja - resumenCaja.efectivo).toLocaleString()}`}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col justify-center">
          {!cajaCerrada ? (
            <button
              onClick={onCerrarCaja}
              disabled={resumenCaja.efectivoEnCaja === 0}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Cerrar Caja
            </button>
          ) : (
            <button
              onClick={onNuevaCaja}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Nueva Caja
            </button>
          )}
        </div>
      </div>

      {/* Resultado del Cierre */}
      {cajaCerrada && (
        <div className={`mt-6 p-4 rounded-lg border-2 ${
          diferenciaCaja === 0 
            ? 'bg-green-50 border-green-200' 
            : diferenciaCaja > 0 
            ? 'bg-blue-50 border-blue-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {diferenciaCaja === 0 ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            )}
            <div>
              <h4 className="font-bold text-lg">
                {diferenciaCaja === 0 && '✅ Caja Cuadrada Perfecta'}
                {diferenciaCaja > 0 && '💰 Sobrante en Caja'}
                {diferenciaCaja < 0 && '⚠️ Faltante en Caja'}
              </h4>
              {diferenciaCaja !== 0 && (
                <p className="text-sm">
                  Diferencia: <span className="font-bold">
                    ${Math.abs(diferenciaCaja).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlEfectivo;