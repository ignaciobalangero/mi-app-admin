"use client";

interface Producto {
  id: string;
  codigo: string;
  producto: string;
  categoria: string;
  marca: string;
  modelo: string;
  color: string;
  precioCosto: number;
  precio1: number;
  precio2: number;
  precio3: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
}

interface Props {
  productos: Producto[];
  editarProducto: (producto: Producto) => void;
  eliminarProducto: (id: string) => void;
  verPreciosConvertidos: (producto: Producto) => void;
  cotizacion: number | null; // <-- Agregamos esto
}

export default function TablaProductos({ productos, editarProducto, eliminarProducto, cotizacion, verPreciosConvertidos }: Props) {
  const verMas = (p: Producto) => {
    if (cotizacion === null) {
      alert("No se pudo obtener la cotización del dólar.");
      return;
    }

    const convertir = (precio: number) =>
      p.moneda === "USD" ? `$${(precio * cotizacion).toLocaleString("es-AR")} ARS` : `$${precio.toLocaleString("es-AR")} ARS`;

    alert(
      `Precios en pesos:\n\n` +
      `Precio 1: ${convertir(p.precio1)}\n` +
      `Precio 2: ${convertir(p.precio2)}\n` +
      `Precio 3: ${convertir(p.precio3)}`
    );
  };

  return (
    <table className="w-full bg-white rounded shadow overflow-hidden">
      <thead className="bg-gray-300 text-left">
        <tr>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[60px]">Código</th>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[160px]">Producto</th>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[80px]">Categoría</th>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[80px]">Marca</th>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[40px]">Modelo</th>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[80px]">Color</th>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[60px]">Costo</th>
        <th className="px-2 py-1 border border-gray-400 text-sm text-center w-[20px]">Cant.</th>
        <th className="px-2 py-1 border border-gray-400 text-sm w-[100px]">Acciones</th>

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
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.codigo}</td>
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.producto}</td>
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.categoria}</td>
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.marca}</td>
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.modelo}</td>
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.color}</td>
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.moneda} ${p.precioCosto}</td>
            <td className="px-2 py-1 border border-gray-300 text-sm">{p.cantidad}</td>
            <td className="px-2 py-1 border border-gray-300">
  <div className="flex gap-1 flex-wrap">
    <button
      onClick={() => editarProducto(p)}
      className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 text-xs rounded"
    >
      Editar
    </button>
    <button
      onClick={() => verPreciosConvertidos(p)}
      className="bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 text-xs rounded"
    >
      Ver más
    </button>
    <button
      onClick={() => eliminarProducto(p.id)}
      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs rounded"
    >
      Eliminar
    </button>
  </div>
</td>

          </tr>
        ))}
      </tbody>
    </table>
  );
}
