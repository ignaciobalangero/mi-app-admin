// TablaVentasAccesorios.tsx
"use client";

interface Venta {
  id: string;
  fecha: string;
  cliente: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  moneda: "ARS" | "USD";
  cotizacion: number | null;
}

interface Props {
  ventas: Venta[];
  onEditar: (venta: Venta) => void;
  onEliminar: (id: string) => void;
}

export default function TablaVentasAccesorios({ ventas, onEditar, onEliminar }: Props) {
  return (
    <table className="w-full bg-white rounded shadow overflow-hidden">
      <thead className="bg-gray-300 text-left">
        <tr>
          <th className="p-2 border border-gray-400">Fecha</th>
          <th className="p-2 border border-gray-400">Cliente</th>
          <th className="p-2 border border-gray-400">Producto</th>
          <th className="p-2 border border-gray-400">Cantidad</th>
          <th className="p-2 border border-gray-400">Precio</th>
          <th className="p-2 border border-gray-400">Moneda</th>
          <th className="p-2 border border-gray-400">Total en pesos</th>
          <th className="p-2 border border-gray-400">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {ventas.map((v) => {
          const totalPesos =
            v.moneda === "USD"
              ? v.precioUnitario * v.cantidad * (v.cotizacion || 0)
              : v.precioUnitario * v.cantidad;

          return (
            <tr key={v.id} className="border-t border-gray-300">
              <td className="p-2 border border-gray-300">{v.fecha}</td>
              <td className="p-2 border border-gray-300">{v.cliente}</td>
              <td className="p-2 border border-gray-300">{v.producto}</td>
              <td className="p-2 border border-gray-300">{v.cantidad}</td>
              <td className="p-2 border border-gray-300">
            
                  {v.moneda === "USD"
                    ? `USD ${v.precioUnitario ?? "-"}`
                    : v.precioUnitario !== undefined
                      ? `$${v.precioUnitario.toLocaleString("es-AR")}`
                      : "-"}
                  
              </td>
              <td className="p-2 border border-gray-300">{v.moneda}</td>
              <td className="p-2 border border-gray-300">
                ${totalPesos.toLocaleString("es-AR")}
              </td>
              <td className="p-2 border border-gray-300">
                <button
                  onClick={() => onEditar(v)}
                  className="text-blue-600 hover:underline mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => onEliminar(v.id)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
