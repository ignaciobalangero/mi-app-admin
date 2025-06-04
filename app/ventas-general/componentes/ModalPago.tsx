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
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-2xl lg:max-w-3xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden transform transition-all duration-300 flex flex-col sm:max-h-[95vh]">
        
        {/* Header del Modal - Responsive */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Información de Pago</h3>
              <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Registra los detalles del pago recibido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-110"
          >
            ×
          </button>
        </div>

        {/* Contenido del Modal - Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
          
          {/* Sección de Monto y Moneda - Responsive */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">💰</span>
              </div>
              <span className="text-sm sm:text-base">Monto del Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Monto abonado:
                </label>
                <input
                  type="number"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder="0.00"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Moneda:
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección de Método de Pago - Responsive */}
          <div className="bg-white rounded-xl border-2 border-[#9b59b6] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🏦</span>
              </div>
              <span className="text-sm sm:text-base">Método de Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Forma de pago:
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="🔍 Ej: Efectivo, Transferencia..."
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Destino (opcional):
                </label>
                <input
                  type="text"
                  name="destino"
                  value={pago.destino}
                  onChange={handlePagoChange}
                  placeholder="🏪 Cuenta bancaria, caja..."
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
            </div>
          </div>

          {/* Sección de Observaciones - Responsive */}
          <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">📝</span>
              </div>
              <span className="text-sm sm:text-base">Observaciones</span>
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                Notas adicionales (opcional):
              </label>
              <textarea
                name="observaciones"
                value={pago.observaciones}
                onChange={handlePagoChange}
                placeholder="💭 Cualquier información adicional sobre el pago..."
                rows={3}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
              />
            </div>
          </div>

          {/* Mensaje de Éxito - Responsive */}
          {guardadoConExito && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#27ae60] text-xs sm:text-sm font-bold">✓</span>
                </div>
                <span className="text-white font-semibold text-sm sm:text-lg">
                  ¡Pago registrado con éxito!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botones - Responsive */}
        <div className="bg-[#ecf0f1] border-t-2 border-[#bdc3c7] p-3 sm:p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              onClick={() => onGuardarPago(pago)}
              disabled={!pago.monto || guardadoConExito}
              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                !pago.monto || guardadoConExito
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#27ae60] hover:bg-[#229954] hover:scale-105"
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