"use client";

// 📦 Tabla de productos – Sección REPUESTOS

interface Producto {
  id: string;
  codigo: string;
  categoria: string;
  producto: string;
  marca: string;
  color: string;
  precioCosto: number;
  precioCostoPesos: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
  proveedor: string;
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

          <th className="px-2 py-1 border border-gray-400 text-xs w-[40px]">Código</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[80px]">Categoría</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[200px]">Producto</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[90px]">Marca</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[80px]">Color</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[60px]">Costo</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[100px]">Costo en Pesos</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs text-center w-[40px]">Cant.</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[90px]">Proveedor</th> 
          <th className="px-2 py-1 border border-gray-400 text-xs w-[80px]">Acciones</th> 
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
            <td className="p-1.5 border border-gray-300 text-xs">{p.codigo}</td> 
            <td className="p-1.5 border w-20 border-gray-300 text-xs">{p.categoria}</td> 
            <td className="p-1.5 border border-gray-300 text-xs">{p.producto}</td> 
            <td className="p-1.5 border border-gray-300 text-xs">{p.marca}</td> 
            <td className="p-1.5 border border-gray-300 text-xs">{p.color}</td> 
            <td className="p-1.5 border w-28 border-gray-300 text-xs">{p.moneda} ${p.precioCosto}</td> 
            <td className="p-1.5 border w-28 border-gray-300 text-xs"> 
              {typeof p.precioCostoPesos === "number"
                ? `$${p.precioCostoPesos.toLocaleString("es-AR")}`
                : "—"}
            </td>
            <td className="p-1.5 border w-18 border-gray-300 text-xs text-center">{p.cantidad}</td> 
            <td className="p-1.5 border border-gray-300 text-xs">{p.proveedor}</td> 
            <td className="p-1.5 border border-gray-300"> 
              <button
                onClick={() => editarProducto(p)}
                className="text-blue-600 hover:underline mr-1 text-xs" 
              >
                Editar
              </button>
              <button
                onClick={() => eliminarProducto(p.id)}
                className="text-red-600 hover:underline text-xs" 
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