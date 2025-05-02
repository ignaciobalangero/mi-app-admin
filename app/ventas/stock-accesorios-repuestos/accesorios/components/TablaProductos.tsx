"use client";

interface Producto {
  id: string;
  codigo: string;
  producto: string;
  categoria: string;
  marca: string;
  color: string;
  precioCosto: number;
  precioVenta: number;
  precioVentaPesos: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
}

interface Props {
  productos: Producto[];
  editarProducto: (producto: Producto) => void;
  eliminarProducto: (id: string) => void;
}

export default function TablaProductos({ productos, editarProducto, eliminarProducto }: Props) {
  return (
    <table className="w-full bg-white rounded shadow overflow-hidden">
      <thead className="bg-gray-300 text-left">
        <tr>
          <th className="p-2 border border-gray-400 w-[5px]">Código</th>
          <th className="p-2 border border-gray-400">Producto</th>
          <th className="p-2 border border-gray-400">Categoría</th>
          <th className="p-2 border border-gray-400">Marca</th>
          <th className="p-2 border border-gray-400">Color</th>
          <th className="p-2 border border-gray-400">Costo</th>
          <th className="p-2 border border-gray-400">Precio</th>
          <th className="p-2 border border-gray-400">Venta en pesos</th>
          <th className="p-2 border border-gray-400 w-[5px]">Cantidad</th>
          <th className="p-2 border border-gray-400 w-[5px]">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {productos.map((p) => (
          <tr
            key={p.id}
            className={`border-t border-gray-300 ${
                p.cantidad === 0
                  ? "bg-red-100"
                  : p.cantidad <= (p.stockBajo ?? 3)
                  ? "bg-yellow-100"
                  : "bg-green-100"
              }`}              
          >
            <td className="p-2 border border-gray-300">{p.codigo}</td>
            <td className="p-2 border border-gray-300">{p.producto}</td>
            <td className="p-2 border border-gray-300">{p.categoria}</td>
            <td className="p-2 border border-gray-300">{p.marca}</td>
            <td className="p-2 border border-gray-300">{p.color}</td>
            <td className="p-2 border border-gray-300">{p.moneda} ${p.precioCosto}</td>
            <td className="p-2 border border-gray-300">{p.moneda} ${p.precioVenta}</td>
            <td className="p-2 border border-gray-300">
              ${p.precioVentaPesos?.toLocaleString("es-AR")} pesos
            </td>
            <td className="p-2 border border-gray-300">{p.cantidad}</td>
            <td className="p-2 border border-gray-300">
              <button
                onClick={() => editarProducto(p)}
                className="text-blue-600 hover:underline mr-2"
              >
                Editar
              </button>
              <button
                onClick={() => eliminarProducto(p.id)}
                className="text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}