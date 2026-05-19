import type { ItemStockPublico } from "@/lib/stockPublicoTypes";

/** Precio lista 1 en pesos según moneda del ítem y cotización USD (tienda / carrito). */
export function precioListaARS(it: ItemStockPublico, cotizacionUSD: number): number {
  const cot = cotizacionUSD > 0 ? cotizacionUSD : 0;
  if (it.moneda === "USD") {
    if (it.precio1 > 0 && cot > 0) return Math.round(it.precio1 * cot);
    if (it.precioVentaARS > 0) return Math.round(it.precioVentaARS);
    return 0;
  }
  if (it.precioVentaARS > 0) return Math.round(it.precioVentaARS);
  if (it.precio1 > 0) return Math.round(it.precio1);
  return 0;
}

export function sinPrecioLista(it: ItemStockPublico): boolean {
  return (!it.precio1 || it.precio1 <= 0) && (!it.precioVentaARS || it.precioVentaARS <= 0);
}

/** Texto para la tienda: siempre prioriza ARS; si el ítem está en USD muestra referencia USD chica. */
export function textoPrecioTienda(it: ItemStockPublico, cotizacionUSD: number): string {
  if (sinPrecioLista(it)) return "Consultá precio";
  const ars = precioListaARS(it, cotizacionUSD);
  if (ars <= 0) return "Consultá precio";
  if (it.moneda === "USD" && it.precio1 > 0) {
    const usd = it.precio1.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `$${ars.toLocaleString("es-AR")}`;
  }
  return `$${ars.toLocaleString("es-AR")}`;
}

export function subtotalLineaARS(
  it: ItemStockPublico,
  cantidad: number,
  cotizacionUSD: number
): number {
  const u = precioListaARS(it, cotizacionUSD);
  if (u <= 0) return 0;
  return Math.round(u * cantidad);
}

/** Ítem con precioVentaARS recalculado para el carrito / totales. */
export function itemConPrecioARS(
  it: ItemStockPublico,
  cotizacionUSD: number
): ItemStockPublico {
  return {
    ...it,
    precioVentaARS: precioListaARS(it, cotizacionUSD),
  };
}
