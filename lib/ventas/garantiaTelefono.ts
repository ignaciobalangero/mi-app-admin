/** Opciones de garantía en meses para venta de teléfonos (1–12). */
export const MESES_GARANTIA_OPCIONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function etiquetaMesesGarantia(meses: number | string | null | undefined): string {
  const n = Number(meses) || 0;
  if (n <= 0) return "";
  return n === 1 ? "1 mes" : `${n} meses`;
}

/** Texto de garantía para el recibo: meses de la venta + texto fijo del negocio. */
export function armarTextoGarantiaRecibo(opts: {
  mesesPorTelefono: number[];
  textoConfigNegocio?: string;
}): string {
  const mesesValidos = opts.mesesPorTelefono
    .map((m) => Number(m) || 0)
    .filter((m) => m > 0);
  const unicos = Array.from(new Set(mesesValidos));
  const partes: string[] = [];

  if (unicos.length === 1) {
    partes.push(`Garantía: ${etiquetaMesesGarantia(unicos[0])}.`);
  } else if (unicos.length > 1) {
    partes.push(
      `Garantías: ${unicos.map((m) => etiquetaMesesGarantia(m)).join(", ")}.`
    );
  }

  const cfg = String(opts.textoConfigNegocio || "").trim();
  if (cfg) partes.push(cfg);

  return partes.join("\n");
}
