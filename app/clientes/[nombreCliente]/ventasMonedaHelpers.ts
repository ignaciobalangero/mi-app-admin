/**
 * Cuenta corriente: ventas = suma por línea según `moneda` del producto (default ARS).
 * Un teléfono en ARS suma en ARS; en USD suma en USD.
 */

export function normalizeMonedaCuenta(m: unknown): "ARS" | "USD" {
  const u = String(m ?? "ARS").trim().toUpperCase();
  return u === "USD" ? "USD" : "ARS";
}

export function monedaLineaProducto(p: any): "ARS" | "USD" {
  return normalizeMonedaCuenta(p?.moneda);
}

export function importeLineaProducto(p: any): number {
  return Number(p?.precioUnitario ?? 0) * Number(p?.cantidad ?? 1);
}

export function totalesVentasPorMoneda(productos: any[] | undefined): {
  totalARS: number;
  totalUSD: number;
} {
  let totalARS = 0;
  let totalUSD = 0;
  for (const p of productos || []) {
    const imp = importeLineaProducto(p);
    if (monedaLineaProducto(p) === "USD") totalUSD += imp;
    else totalARS += imp;
  }
  return { totalARS, totalUSD };
}
