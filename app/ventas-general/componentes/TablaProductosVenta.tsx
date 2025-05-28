"use client";

interface Producto {
  producto: string;
  marca?: string;
  modelo?: string;
  color?: string;
  cantidad: number;
  precioUnitario: number;
  moneda: "ARS" | "USD";
}

interface Props {
  productos: Producto[];
  onEliminar?: (index: number) => void;
}

export default function TablaProductosVenta({ productos, onEliminar }: Props) {
  if (productos.length === 0) {
    return <p className="text-sm text-gray-500">No hay productos cargados.</p>;
  }

}
