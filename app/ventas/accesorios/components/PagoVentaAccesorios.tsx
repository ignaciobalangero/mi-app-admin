"use client";

interface Props {
  mostrarPago: boolean;
  // Podés agregar más props después
}

export default function PagoVentaAccesorios({ mostrarPago }: Props) {
  if (!mostrarPago) return null;

  return (
    <div className="w-full mt-4 p-4 border border-gray-400 rounded bg-white">
      <h3 className="text-md font-semibold mb-2">Pago del Cliente</h3>
      <div className="flex flex-wrap gap-4">
        {/* campos: montoAbonado, monedaPago, formaPago, observaciones, saldo */}
      </div>
    </div>
  );
}
