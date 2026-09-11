import type { Pago, Trabajo } from "./types";

export function totalTrabajo(
  t: Pick<Trabajo, "precioTrabajo" | "precioMaterial">
): number {
  return (Number(t.precioTrabajo) || 0) + (Number(t.precioMaterial) || 0);
}

export function gananciaTrabajo(
  t: Pick<Trabajo, "precioTrabajo" | "precioMaterial" | "costoMaterial">
): number {
  return totalTrabajo(t) - (Number(t.costoMaterial) || 0);
}

export function totalPagado(pagos: Pick<Pago, "monto">[]): number {
  return pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
}

export function deudaTrabajo(
  t: Pick<Trabajo, "precioTrabajo" | "precioMaterial">,
  pagos: Pick<Pago, "monto">[]
): number {
  return Math.max(0, totalTrabajo(t) - totalPagado(pagos));
}

export interface CuentaCorrienteResumen {
  totalFacturado: number;
  totalPagado: number;
  saldo: number;
  trabajos: number;
}

/** Cuenta corriente de un cliente a partir de sus trabajos y pagos por trabajo. */
export function cuentaCorriente(
  trabajos: Pick<Trabajo, "precioTrabajo" | "precioMaterial" | "estado">[],
  pagosPorTrabajo: Pick<Pago, "monto">[][]
): CuentaCorrienteResumen {
  let totalFacturado = 0;
  let totalPagado = 0;
  trabajos.forEach((t, i) => {
    if (t.estado === "cancelado") return;
    totalFacturado += totalTrabajo(t);
    totalPagado += (pagosPorTrabajo[i] || []).reduce(
      (acc, p) => acc + (Number(p.monto) || 0),
      0
    );
  });
  return {
    totalFacturado,
    totalPagado,
    saldo: Math.max(0, totalFacturado - totalPagado),
    trabajos: trabajos.filter((t) => t.estado !== "cancelado").length,
  };
}

export function aCobrarTotal(
  trabajos: Pick<Trabajo, "precioTrabajo" | "precioMaterial" | "estado">[],
  pagosPorTrabajo: Map<string, Pick<Pago, "monto">[]> | Pick<Pago, "monto">[][],
  ids?: string[]
): number {
  let sum = 0;
  trabajos.forEach((t, i) => {
    if (t.estado === "cancelado" || t.estado === "presupuesto") return;
    const pagos = Array.isArray(pagosPorTrabajo)
      ? pagosPorTrabajo[i] || []
      : pagosPorTrabajo.get(ids?.[i] ?? "") || [];
    sum += deudaTrabajo(t, pagos);
  });
  return sum;
}
