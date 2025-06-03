interface Props {
  mostrar: boolean;
  pago: {
    monto: string;
    moneda: string;
    formaPago: string;
    destino: string;
    observaciones: string;
  };
  onClose: () => void;
  handlePagoChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onGuardar: () => void;
  guardadoConExito: boolean;
}

export default function ModalPago({ mostrar, pago, onClose, handlePagoChange, onGuardar, guardadoConExito }: Props) {
  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 animate-fade-in border border-gray-200">
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-2xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-3">
                💳 Información de Pago
              </h3>
              <p className="text-green-100 mt-2">
                Registra los detalles del pago recibido
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-green-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Sección de monto y moneda */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              💰 Monto del Pago
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-700">
                  Monto abonado
                </label>
                <input
                  type="number"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder="0.00"
                  className="w-full p-3 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-700">
                  Moneda
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  className="w-full p-3 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección de método de pago */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
              🏦 Método de Pago
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-700">
                  Forma de pago
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="Ej: Efectivo, Transferencia, Mercado Pago..."
                  className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-700">
                  Destino (opcional)
                </label>
                <input
                  type="text"
                  name="destino"
                  value={pago.destino}
                  onChange={handlePagoChange}
                  placeholder="Cuenta bancaria, caja..."
                  className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sección de observaciones */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
            <h4 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
              📝 Observaciones
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-amber-700">
                Notas adicionales (opcional)
              </label>
              <textarea
                name="observaciones"
                value={pago.observaciones}
                onChange={handlePagoChange}
                placeholder="Cualquier información adicional sobre el pago..."
                rows={3}
                className="w-full p-3 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Mensaje de éxito */}
          {guardadoConExito && (
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <span className="text-green-800 font-semibold text-lg">
                  ¡Pago registrado con éxito!
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Cancelar
            </button>
            <button
              onClick={onGuardar}
              disabled={!pago.monto || guardadoConExito}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
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