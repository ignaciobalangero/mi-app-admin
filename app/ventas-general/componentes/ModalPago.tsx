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
  console.log("mostrar", mostrar); // deberías ver true en consola
  //if (!mostrar || !pago) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white/10 backdrop-blur-sm flex items-center justify-center">


      <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-lg animate-fade-in text-black border-4 border-red-200">

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
        <div className="flex justify-end mt-6">
          <button
            onClick={onGuardarPago}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
          >
            Guardar
          </button>
        </div>
        {guardadoConExito && (
          <div className="mt-4 text-center text-green-700 font-semibold">
            ✔️ Pago registrado con éxito
          </div>
        )}
      </div>
    </div>
  );
}
