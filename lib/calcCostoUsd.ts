/** Convierte precio en pesos a USD según cotización (ayuda al cargar costo). */
export function usdDesdePesos(pesos: number, cotizacion: number): number | null {
  if (!Number.isFinite(pesos) || !Number.isFinite(cotizacion) || pesos <= 0 || cotizacion <= 0) {
    return null;
  }
  return Math.round((pesos / cotizacion) * 100) / 100;
}
