/** Tipos y helpers para fotos + token público de trabajos. */

export type TipoFotoTrabajo = "ingreso" | "proceso";

export type FotoTrabajo = {
  url: string;
  tipo: TipoFotoTrabajo;
  creadoEn?: string;
  usuario?: string;
};

export function normalizarFotosTrabajo(raw: unknown, tipoDefault: TipoFotoTrabajo): FotoTrabajo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url.startsWith("http")) return null;
        return { url, tipo: tipoDefault } as FotoTrabajo;
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const url = String(o.url ?? "").trim();
        if (!url.startsWith("http")) return null;
        const tipo =
          o.tipo === "proceso" || o.tipo === "ingreso" ? (o.tipo as TipoFotoTrabajo) : tipoDefault;
        return {
          url,
          tipo,
          creadoEn: o.creadoEn ? String(o.creadoEn) : undefined,
          usuario: o.usuario ? String(o.usuario) : undefined,
        } as FotoTrabajo;
      }
      return null;
    })
    .filter((f): f is FotoTrabajo => !!f);
}

/** Token opaco para consulta pública (sin adivinar firebaseId). */
export function generarTokenPublicoTrabajo(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function urlEstadoTrabajoPublico(
  origin: string,
  negocioID: string,
  token: string
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/estado-trabajo/${encodeURIComponent(negocioID)}/${encodeURIComponent(token)}`;
}

export function etiquetaEstadoTrabajo(estado: string): string {
  const e = String(estado || "").toUpperCase();
  if (e.includes("ACEPTACION")) return "Pendiente de aceptación";
  if (e === "PENDIENTE") return "En reparación / pendiente";
  if (e === "REPARADO") return "Reparado — listo para retirar";
  if (e === "ENTREGADO") return "Entregado";
  if (e === "PAGADO") return "Pagado / cerrado";
  return estado || "Sin estado";
}

/** Texto listo para WhatsApp / SMS con el link de seguimiento de un solo trabajo. */
export function mensajeSeguimientoTrabajoCliente(opts: {
  cliente?: string;
  nroOrden?: string;
  modelo?: string;
  url: string;
  nombreNegocio?: string;
}): string {
  const cliente = String(opts.cliente || "").trim() || "cliente";
  const orden = String(opts.nroOrden || "").trim();
  const modelo = String(opts.modelo || "").trim();
  const negocio = String(opts.nombreNegocio || "").trim();
  const url = String(opts.url || "").trim();

  const lineas = [
    `Hola ${cliente}!`,
    "",
    orden || modelo
      ? `Te dejamos el seguimiento de tu equipo${orden ? ` (orden ${orden})` : ""}${
          modelo ? `: ${modelo}` : ""
        }.`
      : "Te dejamos el seguimiento de tu equipo.",
    "",
    "Con este link podés ver el estado actual y las fotos (solo de tu trabajo):",
    url,
    "",
    "Si tenés dudas, respondé a este mensaje.",
  ];
  if (negocio) {
    lineas.push("", `— ${negocio}`);
  }
  return lineas.join("\n");
}
