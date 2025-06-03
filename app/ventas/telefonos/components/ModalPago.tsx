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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 animate-fade-in border-2 border-[#ecf0f1]">
        
        {/* Header del modal - Estilo GestiOne */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white rounded-t-2xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">
                  Información de Pago
                </h3>
                <p className="text-green-100 mt-1">
                  Registra los detalles del pago recibido
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-green-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center hover:scale-110"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 bg-[#f8f9fa]">
          
          {/* Sección de monto y moneda - Estilo GestiOne */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💰</span>
              </div>
              Monto del Pago
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#2c3e50]">
                  Monto abonado
                </label>
                <input
                  type="number"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder="0.00"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#2c3e50]">
                  Moneda
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección de método de pago - Estilo GestiOne */}
          <div className="bg-white rounded-xl border-2 border-[#9b59b6] p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🏦</span>
              </div>
              Método de Pago
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#2c3e50]">
                  Forma de pago
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="Ej: Efectivo, Transferencia, Mercado Pago..."
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#2c3e50]">
                  Destino (opcional)
                </label>
                <input
                  type="text"
                  name="destino"
                  value={pago.destino}
                  onChange={handlePagoChange}
                  placeholder="Cuenta bancaria, caja..."
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
            </div>
          </div>

          {/* Sección de observaciones - Estilo GestiOne */}
          <div className="bg-white rounded-xl border-2 border-[#f39c12] p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📝</span>
              </div>
              Observaciones
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2c3e50]">
                Notas adicionales (opcional)
              </label>
              <textarea
                name="observaciones"
                value={pago.observaciones}
                onChange={handlePagoChange}
                placeholder="Cualquier información adicional sobre el pago..."
                rows={3}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-[#2c3e50] placeholder-[#7f8c8d]"
              />
            </div>
          </div>

          {/* Mensaje de éxito - Estilo GestiOne */}
          {guardadoConExito && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#27ae60] text-sm font-bold">✓</span>
                </div>
                <span className="text-white font-semibold text-lg">
                  ¡Pago registrado con éxito!
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción - Estilo GestiOne */}
          <div className="flex justify-end gap-4 pt-4 border-t-2 border-[#ecf0f1]">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Cancelar
            </button>
            <button
              onClick={onGuardar}
              disabled={!pago.monto || guardadoConExito}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
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