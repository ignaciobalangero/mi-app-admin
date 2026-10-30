export type MonedaCotizacion = "ARS" | "USD";

export type BateriaCotizacion = "mas90" | "menos90";

export type ModeloCotizacion = {
  id: string;
  modelo: string;
  moneda: MonedaCotizacion;
  precioMas90: number;
  precioMenos90: number;
};

export function etiquetaBateria(bateria: BateriaCotizacion): string {
  return bateria === "mas90" ? "batería 90% o más" : "batería menos de 90%";
}

export function precioSegunBateria(modelo: ModeloCotizacion, bateria: BateriaCotizacion): number {
  return bateria === "mas90" ? modelo.precioMas90 : modelo.precioMenos90;
}

export function monedaDe(valor: unknown): MonedaCotizacion {
  return String(valor || "USD").toUpperCase() === "ARS" ? "ARS" : "USD";
}

export function digitosWhatsapp(valor: unknown): string {
  return String(valor || "").replace(/\D/g, "").slice(0, 15);
}

export function normalizarModelos(raw: unknown): ModeloCotizacion[] {
  if (!Array.isArray(raw)) return [];
  const lista: ModeloCotizacion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const fila = item as Record<string, unknown>;
    const modelo = String(fila.modelo || "").trim().slice(0, 80);
    const legado = Math.round(Math.max(0, Number(fila.precio) || 0) * 100) / 100;
    const precioMas90 = Math.round(Math.max(0, Number(fila.precioMas90 ?? legado) || 0) * 100) / 100;
    const precioMenos90 = Math.round(Math.max(0, Number(fila.precioMenos90) || 0) * 100) / 100;
    if (!modelo || !(precioMas90 > 0 || precioMenos90 > 0)) continue;
    const id = String(fila.id || "").trim().slice(0, 40) || String(lista.length + 1);
    lista.push({ id, modelo, precioMas90, precioMenos90, moneda: monedaDe(fila.moneda) });
    if (lista.length >= 200) break;
  }
  return lista;
}

/** Lista guardada con precio de batería. Una lista vieja (solo `precio`) no pisa la tabla. */
export function modelosCotizadorGuardados(raw: unknown): ModeloCotizacion[] {
  if (!Array.isArray(raw)) return [];
  const conBateria = raw.some(
    (item) =>
      !!item &&
      typeof item === "object" &&
      ("precioMas90" in item || "precioMenos90" in item)
  );
  if (!conBateria) return [];
  return normalizarModelos(raw);
}

export function textoMoneda(moneda: MonedaCotizacion, precio: number): string {
  const monto = precio.toLocaleString("es-AR");
  return moneda === "USD" ? `USD $${monto}` : `$${monto}`;
}

export function saldoCotizacion(
  monedaEquipo: MonedaCotizacion,
  precioEquipo: number,
  monedaToma: MonedaCotizacion,
  precioToma: number
): { texto: string; mismaMoneda: boolean } {
  if (monedaEquipo !== monedaToma) {
    return { texto: "", mismaMoneda: false };
  }
  const diff = Math.round((precioEquipo - precioToma) * 100) / 100;
  if (diff < 0) {
    return { texto: `A favor ${textoMoneda(monedaEquipo, Math.abs(diff))}`, mismaMoneda: true };
  }
  return { texto: textoMoneda(monedaEquipo, diff), mismaMoneda: true };
}

export function armarConsultaWhatsapp(opts: {
  equipo: string;
  precioEquipo: string;
  miTelefono: string;
  toma: string;
  saldo: string;
  mismaMoneda: boolean;
}): string {
  const lineas = [
    "Hola, quiero consultar este cambio:",
    "",
    `Equipo: ${opts.equipo}`,
    `Precio: ${opts.precioEquipo}`,
    "",
    `Mi teléfono: ${opts.miTelefono}`,
    `Lo toman en: ${opts.toma}`,
    "",
  ];
  if (opts.mismaMoneda) {
    lineas.push(`Saldo: ${opts.saldo}`);
  } else {
    lineas.push("El saldo lo vemos juntos porque están en monedas distintas.");
  }
  return lineas.join("\n");
}

export function urlWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
