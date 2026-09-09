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

export type MarcasEstadoTrabajo = {
  estado?: string;
  esGarantia?: boolean;
  sinReparacion?: boolean;
};

/** Ingresó / marcó como garantía (sigue valiendo aunque el estado pase a ENTREGADO, etc.). */
export function trabajoEsGarantia(t: MarcasEstadoTrabajo): boolean {
  if (t.esGarantia === true) return true;
  return String(t.estado || "").trim().toUpperCase() === "GARANTIA";
}

/** Marcó sin reparación (sigue pintado así aunque pase a ENTREGADO). */
export function trabajoSinReparacion(t: MarcasEstadoTrabajo): boolean {
  if (t.sinReparacion === true) return true;
  return String(t.estado || "").trim().toUpperCase() === "SIN REPARACION";
}

/**
 * Flags al cambiar estado:
 * - GARANTIA / SIN REPARACION activan su marca (y anulan la otra).
 * - PENDIENTE limpia ambas (sirve para deshacer un error).
 * - Otros estados (ENTREGADO, etc.) conservan la marca previa.
 */
export function payloadMarcasEstadoAlCambiar(
  trabajo: MarcasEstadoTrabajo,
  nuevoEstado: string
): { esGarantia: boolean; sinReparacion: boolean } {
  const n = String(nuevoEstado || "").trim().toUpperCase();

  if (n === "PENDIENTE") {
    return { esGarantia: false, sinReparacion: false };
  }
  if (n === "GARANTIA") {
    return { esGarantia: true, sinReparacion: false };
  }
  if (n === "SIN REPARACION") {
    return { esGarantia: false, sinReparacion: true };
  }

  return {
    esGarantia: trabajoEsGarantia(trabajo),
    sinReparacion: trabajoSinReparacion(trabajo) && !trabajoEsGarantia(trabajo),
  };
}

/** @deprecated usar payloadMarcasEstadoAlCambiar */
export function payloadEsGarantiaAlCambiarEstado(
  trabajo: MarcasEstadoTrabajo,
  nuevoEstado: string
): { esGarantia: boolean; sinReparacion: boolean } {
  return payloadMarcasEstadoAlCambiar(trabajo, nuevoEstado);
}

/** Texto de badge: ENTREGADO · GAR / ENTREGADO · SIN REP */
export function etiquetaEstadoTabla(t: MarcasEstadoTrabajo & { estado?: string }): string {
  const estado = String(t.estado || "").trim() || "—";
  if (trabajoEsGarantia(t) && estado.toUpperCase() !== "GARANTIA") {
    return `${estado} · GAR`;
  }
  if (trabajoSinReparacion(t) && estado.toUpperCase() !== "SIN REPARACION") {
    return `${estado} · SIN REP`;
  }
  return estado;
}
