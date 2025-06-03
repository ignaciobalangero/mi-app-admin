"use client";

interface Props {
  mostrar: boolean;
  pago: {
    monto: string;
    moneda: string;
    formaPago: string;
    destino: string;
    observaciones: string;
  } | null;
  onClose: () => void;
  handlePagoChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onGuardarPago: (nuevoPago: any) => void;
  guardadoConExito: boolean;
}

export default function ModalPago({
  mostrar,
  pago,
  onClose,
  handlePagoChange,
  onGuardarPago,
  guardadoConExito,
}: Props) {
  if (!mostrar || !pago) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all duration-300">
        
        {/* Header del Modal */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Información de Pago</h3>
              <p className="text-green-100">Registra los detalles del pago recibido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all duration-200"
          >
            ×
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 space-y-6">
          
          {/* Sección de Monto y Moneda */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              💰 Monto del Pago
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-700">
                  Monto abonado:
                </label>
                <input
                  type="number"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder="0.00"
                  className="w-full p-3 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg font-medium text-gray-900 placeholder-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-700">
                  Moneda:
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  className="w-full p-3 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección de Método de Pago */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
            <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
              🏦 Método de Pago
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-purple-700">
                  Forma de pago:
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="🔍 Ej: Efectivo, Transferencia, Mercado Pago..."
                  className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-purple-700">
                  Destino (opcional):
                </label>
                <input
                  type="text"
                  name="destino"
                  value={pago.destino}
                  onChange={handlePagoChange}
                  placeholder="🏪 Cuenta bancaria, caja..."
                  className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Sección de Observaciones */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-6">
            <h4 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
              📝 Observaciones
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-amber-700">
                Notas adicionales (opcional):
              </label>
              <textarea
                name="observaciones"
                value={pago.observaciones}
                onChange={handlePagoChange}
                placeholder="💭 Cualquier información adicional sobre el pago..."
                rows={3}
                className="w-full p-3 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Mensaje de Éxito */}
          {guardadoConExito && (
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <span className="text-green-800 font-semibold text-lg">
                  ¡Pago registrado con éxito!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botones */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 p-6">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Cancelar
            </button>
            <button
              onClick={() => onGuardarPago(pago)}
              disabled={!pago.monto || guardadoConExito}
              className={`px-8 py-2.5 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
                !pago.monto || guardadoConExito
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-105"
              }`}
            >
              💾 Guardar Pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}