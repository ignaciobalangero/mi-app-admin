/** Campo vacío / sin cargar (precio o costo). */
export function montoTrabajoVacio(valor: unknown): boolean {
  if (valor === undefined || valor === null || valor === "") return true;
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(/\./g, "").replace(",", "."));
  return !Number.isFinite(n) || n === 0;
}

export function trabajoSinCosto(t: { costo?: unknown }): boolean {
  return montoTrabajoVacio(t.costo);
}

export function trabajoSinPrecio(t: { precio?: unknown }): boolean {
  return montoTrabajoVacio(t.precio);
}
