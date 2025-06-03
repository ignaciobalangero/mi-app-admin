interface Props {
  mostrar: boolean;
  pago: {
    cliente: string;
    monto: string;
    moneda: string;
    formaPago: string;
    destino: string;
    observaciones: string;
  };
  onClose: () => void;
  onGuardar: () => void;
  handlePagoChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
}

export default function ModalPago({
  mostrar,
  pago,
  onClose,
  onGuardar,
  handlePagoChange,
}: Props) {
  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-[#ecf0f1] transform transition-all duration-300">
        
        {/* Header del modal - Estilo GestiOne */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Registrar Pago</h3>
                <p className="text-green-100 text-sm mt-1">
                  Información del pago del cliente
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

        <div className="p-6 bg-[#f8f9fa] max-h-[calc(90vh-120px)] overflow-y-auto">
          
          {/* Información del cliente */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">👤</span>
              </div>
              <h4 className="text-lg font-semibold text-[#2c3e50]">Cliente</h4>
            </div>
            <p className="text-[#3498db] font-bold text-xl bg-[#ebf3fd] px-4 py-2 rounded-lg border border-[#3498db]">
              {pago.cliente}
            </p>
          </div>

          {/* Formulario de pago - Estilo GestiOne */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💰</span>
              </div>
              <h4 className="text-lg font-semibold text-[#2c3e50]">Datos del Pago</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Monto */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💵 Monto
                </label>
                <input
                  type="number"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>

              {/* Moneda */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💱 Moneda
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos</option>
                  <option value="USD">🇺🇸 Dólares</option>
                </select>
              </div>

              {/* Forma de pago */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💳 Forma de Pago
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="Efectivo, Transferencia, etc."
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>

              {/* Destino */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🎯 Destino
                </label>
                <input
                  type="text"
                  name="destino"
                  value={pago.destino}
                  onChange={handlePagoChange}
                  placeholder="Concepto del pago"
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>

              {/* Observaciones - Span completo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📝 Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={pago.observaciones}
                  onChange={handlePagoChange}
                  rows={3}
                  placeholder="Observaciones adicionales sobre el pago..."
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Botones de acción - Estilo GestiOne */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-6 mt-6 shadow-sm">
            <div className="flex justify-between items-center">
              <button 
                onClick={onClose} 
                className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={onGuardar}
                disabled={!pago.monto || !pago.formaPago}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
                  (!pago.monto || !pago.formaPago)
                    ? "bg-[#bdc3c7] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] hover:scale-105"
                }`}
              >
                💾 Guardar Pago
              </button>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 mt-6 border border-[#bdc3c7]">
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Nota:</strong> Este pago se registrará automáticamente en el sistema de pagos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}