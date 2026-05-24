export const PRECIO_MENSUAL_LISTA_ARS = 60_000;
export const PRECIO_MENSUAL_OFERTA_ARS = 35_000;

export function formatoPrecioGestione(valor: number): string {
  return `$${valor.toLocaleString("es-AR")}`;
}
