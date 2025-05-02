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
    onGuardar: () => void; // ✅ NUEVO
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
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-lg animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">💸 Información de Pago</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black text-xl font-bold"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="monto"
              value={pago.monto}
              onChange={handlePagoChange}
              placeholder="Monto abonado"
              className="p-2 border rounded w-full"
            />
            <select
              name="moneda"
              value={pago.moneda}
              onChange={handlePagoChange}
              className="p-2 border rounded w-full"
            >
              <option value="ARS">Pesos</option>
              <option value="USD">Dólares</option>
            </select>
            <input
              type="text"
              name="formaPago"
              value={pago.formaPago}
              onChange={handlePagoChange}
              placeholder="Forma de pago (efectivo, transferencia...)"
              className="p-2 border rounded w-full"
            />
            <input
              type="text"
              name="destino"
              value={pago.destino}
              onChange={handlePagoChange}
              placeholder="Destino (opcional)"
              className="p-2 border rounded w-full"
            />
            <textarea
              name="observaciones"
              value={pago.observaciones}
              onChange={handlePagoChange}
              placeholder="Observaciones (opcional)"
              className="p-2 border rounded w-full md:col-span-2"
            />
          </div>
  
          <div className="flex justify-end mt-4">
            <button
              onClick={onGuardar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              Guardar Pago
            </button>
          </div>
        </div>
      </div>
    );
  }
  