// components/ResumenVentas.tsx
import React from 'react';
import { DollarSign, CreditCard, FileText } from 'lucide-react';
import { ResumenCaja } from '../types/caja';

interface ResumenVentasProps {
  resumenCaja: ResumenCaja;
}

const ResumenVentas: React.FC<ResumenVentasProps> = ({ resumenCaja }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Ventas</p>
            <p className="text-2xl font-bold text-gray-800">
              ${resumenCaja.totalVentas.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Efectivo (debe haber)</p>
            <p className="text-2xl font-bold text-green-600">
              ${resumenCaja.efectivo.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Transferencias</p>
            <p className="text-2xl font-bold text-blue-600">
              ${resumenCaja.transferencia.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Cuenta Corriente</p>
            <p className="text-2xl font-bold text-orange-600">
              ${resumenCaja.cuentaCorriente.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumenVentas;