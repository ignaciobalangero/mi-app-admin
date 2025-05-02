// SeccionPagoCliente.tsx
"use client";

interface Props {
  montoAbonado: number;
  setMontoAbonado: (valor: number) => void;
  monedaPago: string;
  setMonedaPago: (valor: string) => void;
  formaPago: string;
  setFormaPago: (valor: string) => void;
  observacionesPago: string;
  setObservacionesPago: (valor: string) => void;
  saldo: number;
}

export default function SeccionPagoCliente({
  montoAbonado,
  setMontoAbonado,
  monedaPago,
  setMonedaPago,
  formaPago,
  setFormaPago,
  observacionesPago,
  setObservacionesPago,
  saldo,
}: Props) {
  return (
    <div className="w-full mt-4 p-4 border border-gray-400 rounded bg-white">
      <h3 className="text-md font-semibold mb-2">Pago del cliente</h3>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col w-32">
          <label className="text-xs mb-1 text-gray-600">Monto abonado</label>
          <input
            type="number"
            value={montoAbonado}
            onChange={(e) => setMontoAbonado(Number(e.target.value))}
            className="p-2 border border-gray-400 rounded"
          />
        </div>

        <div className="flex flex-col w-28">
          <label className="text-xs mb-1 text-gray-600">Moneda</label>
          <select
            value={monedaPago}
            onChange={(e) => setMonedaPago(e.target.value)}
            className="p-2 border border-gray-400 rounded"
          >
            <option value="ARS">Pesos</option>
            <option value="USD">Dólares</option>
          </select>
        </div>

        <div className="flex flex-col w-40">
          <label className="text-xs mb-1 text-gray-600">Forma de pago</label>
          <input
            type="text"
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            className="p-2 border border-gray-400 rounded"
          />
        </div>

        <div className="flex flex-col w-64">
          <label className="text-xs mb-1 text-gray-600">Observaciones</label>
          <input
            type="text"
            value={observacionesPago}
            onChange={(e) => setObservacionesPago(e.target.value)}
            className="p-2 border border-gray-400 rounded"
          />
        </div>

        <div className="flex flex-col w-40">
          <label className="text-xs mb-1 text-gray-600">Saldo restante</label>
          <input
            type="text"
            value={`$${saldo.toLocaleString("es-AR")}`}
            readOnly
            className="p-2 border border-gray-300 rounded bg-gray-100 font-semibold"
          />
        </div>
      </div>
    </div>
  );
}
