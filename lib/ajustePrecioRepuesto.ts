import { normalizarMoneda } from "@/lib/monedaRepuesto";

export type CampoPrecioAjuste = "precioCosto" | "precio1" | "precio2" | "precio3";

export type AlcanceAjustePrecio = "seleccionados" | "todosARS" | "visiblesARS";

const CAMPOS_PESOS: Record<CampoPrecioAjuste, string> = {
  precioCosto: "precioCostoPesos",
  precio1: "precio1Pesos",
  precio2: "precio2Pesos",
  precio3: "precio3Pesos",
};

export function aplicarPorcentajePrecio(valor: number, porcentaje: number): number {
  if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(porcentaje)) return valor;
  return Math.round(valor * (1 + porcentaje / 100));
}

/** Patch para repuesto en ARS (precio y campo *Pesos sincronizados). */
export function patchAjustePrecioARS(
  data: Record<string, unknown>,
  porcentaje: number,
  campos: CampoPrecioAjuste[]
): Record<string, number> {
  const patch: Record<string, number> = {};
  for (const campo of campos) {
    const v = Number(data[campo]) || 0;
    if (v <= 0) continue;
    const nuevo = aplicarPorcentajePrecio(v, porcentaje);
    patch[campo] = nuevo;
    patch[CAMPOS_PESOS[campo]] = nuevo;
  }
  return patch;
}

export function esRepuestoARS(data: Record<string, unknown>): boolean {
  return normalizarMoneda(data.moneda) === "ARS";
}

export function ejemploAjuste(
  valor: number,
  porcentaje: number
): { antes: number; despues: number } | null {
  if (valor <= 0) return null;
  return {
    antes: valor,
    despues: aplicarPorcentajePrecio(valor, porcentaje),
  };
}
