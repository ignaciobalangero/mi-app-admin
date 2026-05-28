export type ProductoStockLike = {
  tipo?: string;
  categoria?: string;
  origenStock?: string;
  hoja?: string;
  codigo?: string;
  id?: string;
  stockDocId?: string;
};

export function codigoProductoStock(producto: ProductoStockLike): string {
  return String(producto.codigo ?? producto.stockDocId ?? producto.id ?? "").trim();
}

/** Repuesto/stockExtra tiene prioridad sobre accesorio si hay señales contradictorias. */
export function clasificarProductoStock(
  producto: ProductoStockLike
): "accesorio" | "repuesto" | null {
  const t = String(producto.tipo ?? "").toLowerCase();
  const c = String(producto.categoria ?? "").toLowerCase();
  const origen = String(producto.origenStock ?? "");

  const esRepuesto =
    t === "repuesto" ||
    t === "general" ||
    c === "repuesto" ||
    c === "repuestos" ||
    origen === "stockRepuestos" ||
    origen === "stockExtra" ||
    !!producto.hoja;

  const esAccesorio =
    t === "accesorio" || c === "accesorio" || origen === "stockAccesorios";

  if (esRepuesto && !esAccesorio) return "repuesto";
  if (esAccesorio && !esRepuesto) return "accesorio";
  if (esRepuesto) return "repuesto";
  if (esAccesorio) return "accesorio";
  return null;
}

export function esProductoRepuestoOGeneral(producto: ProductoStockLike): boolean {
  return clasificarProductoStock(producto) === "repuesto";
}

export function esProductoAccesorio(producto: ProductoStockLike): boolean {
  return clasificarProductoStock(producto) === "accesorio";
}

export function productoAfectaStock(producto: ProductoStockLike): boolean {
  if (String(producto.categoria ?? "") === "Teléfono") return false;
  return codigoProductoStock(producto) !== "" && clasificarProductoStock(producto) !== null;
}
