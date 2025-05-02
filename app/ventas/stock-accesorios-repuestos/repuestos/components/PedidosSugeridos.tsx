"use client";

interface Producto {
  id: string;
  producto: string;
  cantidad: number;
  stockIdeal: number;
}

interface Props {
  productosAPedir: Producto[];
}

export default function PedidosSugeridos({ productosAPedir }: Props) {
  if (productosAPedir.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-yellow-200 border-l-4 border-yellow-600">
      <h2 className="text-lg font-bold mb-2">📦 Pedidos sugeridos de repuestos:</h2>
      <ul className="list-disc pl-6">
        {productosAPedir.map((p) => (
          <li key={p.id}>
            {p.producto} → Faltan {p.stockIdeal - p.cantidad} unidades para alcanzar stock ideal ({p.stockIdeal})
          </li>
        ))}
      </ul>
    </div>
  );
}
