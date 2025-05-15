import * as XLSX from "xlsx";

interface Producto {
  producto: string;
  cantidad: number;
  stockIdeal: number;
}

export function exportarPedidosAExcel(productos: Producto[]) {
  if (productos.length === 0) return;

  const datos = productos.map((p) => ({
    Producto: p.producto,
    "Cantidad actual": p.cantidad,
    "Stock ideal": p.stockIdeal,
    "Faltan": p.stockIdeal - p.cantidad,
  }));

  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos Sugeridos");

  XLSX.writeFile(workbook, "Pedidos_Sugeridos.xlsx");
}
