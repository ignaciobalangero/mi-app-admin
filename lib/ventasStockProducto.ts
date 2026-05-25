export function esProductoRepuestoOGeneral(producto: {
  tipo?: string;
  categoria?: string;
  origenStock?: string;
  hoja?: string;
}): boolean {
  const t = String(producto.tipo ?? "").toLowerCase();
  const c = String(producto.categoria ?? "").toLowerCase();
  const origen = String(producto.origenStock ?? "");
  return (
    t === "repuesto" ||
    t === "general" ||
    c === "repuesto" ||
    c === "repuestos" ||
    origen === "stockRepuestos" ||
    origen === "stockExtra" ||
    !!producto.hoja
  );
}

export function esProductoAccesorio(producto: {
  tipo?: string;
  categoria?: string;
  origenStock?: string;
}): boolean {
  const t = String(producto.tipo ?? "").toLowerCase();
  const c = String(producto.categoria ?? "").toLowerCase();
  return t === "accesorio" || c === "accesorio" || producto.origenStock === "stockAccesorios";
}
