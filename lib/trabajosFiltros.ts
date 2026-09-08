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

/** Ingresó / marcó como garantía (sigue valiendo aunque el estado pase a ENTREGADO, etc.). */
export function trabajoEsGarantia(t: { estado?: string; esGarantia?: boolean }): boolean {
  if (t.esGarantia === true) return true;
  return String(t.estado || "").trim().toUpperCase() === "GARANTIA";
}

/** Al cambiar estado: si pasa a GARANTIA, marca el flag; si ya era garantía, no lo borra. */
export function payloadEsGarantiaAlCambiarEstado(
  trabajo: { estado?: string; esGarantia?: boolean },
  nuevoEstado: string
): { esGarantia?: boolean } {
  if (String(nuevoEstado || "").trim().toUpperCase() === "GARANTIA") {
    return { esGarantia: true };
  }
  if (trabajoEsGarantia(trabajo)) {
    return { esGarantia: true };
  }
  return {};
}
