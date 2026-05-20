/** Precio de venta = costo + margen % sobre el costo */
export function precioDesdeMargen(costo: number, porcentaje: number): number {
  if (costo <= 0 || !Number.isFinite(porcentaje)) return 0;
  return Math.round(costo * (1 + porcentaje / 100) * 100) / 100;
}

export function margenDesdePrecio(costo: number, precio: number): number | null {
  if (costo <= 0 || precio <= 0) return null;
  return Math.round(((precio - costo) / costo) * 1000) / 10;
}
