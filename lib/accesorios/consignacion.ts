export type LineaVentaAccesorio = {
  codigo?: string;
  stockDocId?: string;
  origenStock?: string;
  tipo?: string;
  categoria?: string;
  cantidad?: number;
};

export function esLineaAccesorio(p: LineaVentaAccesorio): boolean {
  const origen = String(p.origenStock || "");
  const tipo = String(p.tipo || "").toLowerCase();
  const cat = String(p.categoria || "").toLowerCase();
  return (
    origen === "stockAccesorios" ||
    tipo === "accesorio" ||
    cat === "accesorio" ||
    cat === "accesorios"
  );
}

/** Unidades vendidas de cada accesorio en consignación, según las ventas del período. */
export function vendidosConsignacion(
  accesorios: { id: string; codigo: string }[],
  ventas: { productos?: LineaVentaAccesorio[] }[]
): Map<string, number> {
  const ids = new Set(accesorios.map((a) => a.id));
  const porCodigo = new Map<string, string>();
  for (const a of accesorios) {
    const codigo = String(a.codigo || "").trim();
    if (codigo && !porCodigo.has(codigo)) porCodigo.set(codigo, a.id);
  }
  const vendidos = new Map<string, number>();
  for (const venta of ventas) {
    for (const linea of venta.productos || []) {
      const docId = String(linea.stockDocId || "").trim();
      const codigo = String(linea.codigo || "").trim();
      let id = "";
      if (docId && ids.has(docId)) id = docId;
      else if (esLineaAccesorio(linea) && codigo && porCodigo.has(codigo)) id = porCodigo.get(codigo) || "";
      if (!id) continue;
      const cant = Math.max(0, Number(linea.cantidad) || 0);
      if (!cant) continue;
      vendidos.set(id, Math.round(((vendidos.get(id) || 0) + cant) * 100) / 100);
    }
  }
  return vendidos;
}
