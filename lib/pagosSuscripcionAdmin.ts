import { Timestamp } from "firebase/firestore";

export type PlanSuscripcionPago = "mensual" | "trimestral" | "anual";

export type PagoSuscripcionRegistro = {
  id?: string;
  fechaPago: Date;
  monto: number | null;
  meses: number;
  plan: PlanSuscripcionPago;
  notas: string;
  fechaVencimientoAnterior: Date | null;
  fechaVencimientoNueva: Date;
  registradoEn: Date;
};

export function planDesdeMeses(meses: number): PlanSuscripcionPago {
  if (meses >= 12) return "anual";
  if (meses >= 3) return "trimestral";
  return "mensual";
}

export function etiquetaPlan(plan: PlanSuscripcionPago): string {
  switch (plan) {
    case "anual":
      return "Anual";
    case "trimestral":
      return "Trimestral";
    default:
      return "Mensual";
  }
}

/** Base = el mayor entre vencimiento actual y fecha del pago; suma meses. */
export function calcularNuevaFechaVencimiento(
  fechaVencimientoActual: Date | null,
  fechaPago: Date,
  meses: number
): Date {
  const base =
    fechaVencimientoActual && fechaVencimientoActual.getTime() > fechaPago.getTime()
      ? new Date(fechaVencimientoActual)
      : new Date(fechaPago);

  const nueva = new Date(base);
  nueva.setMonth(nueva.getMonth() + meses);
  return nueva;
}

export function fechaFirestoreADate(valor: unknown): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (valor instanceof Timestamp) return valor.toDate();
  if (
    typeof valor === "object" &&
    valor !== null &&
    "toDate" in valor &&
    typeof (valor as { toDate: () => Date }).toDate === "function"
  ) {
    return (valor as { toDate: () => Date }).toDate();
  }
  return null;
}

export function formatearFechaSuscripcion(fecha: unknown): string {
  const d = fechaFirestoreADate(fecha);
  if (!d) return "—";
  return d.toLocaleDateString("es-AR");
}

export function formatearMontoPago(monto: number | null | undefined): string {
  if (monto == null || Number.isNaN(monto)) return "—";
  return `$${monto.toLocaleString("es-AR")}`;
}

export function rutaPagosSuscripcion(adminId: string): string {
  return `usuarios/${adminId}/pagosSuscripcion`;
}

export function pagoSuscripcionDesdeFirestore(
  id: string,
  data: Record<string, unknown>
): PagoSuscripcionRegistro {
  return {
    id,
    fechaPago: fechaFirestoreADate(data.fechaPago) ?? new Date(),
    monto: data.monto != null ? Number(data.monto) : null,
    meses: Number(data.meses) || 1,
    plan: (data.plan as PlanSuscripcionPago) || "mensual",
    notas: String(data.notas ?? "").trim(),
    fechaVencimientoAnterior: fechaFirestoreADate(data.fechaVencimientoAnterior),
    fechaVencimientoNueva:
      fechaFirestoreADate(data.fechaVencimientoNueva) ?? new Date(),
    registradoEn: fechaFirestoreADate(data.registradoEn) ?? new Date(),
  };
}

/** Indica si el negocio debería haber pagado pero no hay registro reciente. */
export function debePagoSuscripcion(
  fechaVencimiento: unknown,
  ultimoPago: unknown,
  esExento?: boolean
): boolean {
  if (esExento) return false;
  const venc = fechaFirestoreADate(fechaVencimiento);
  if (!venc) return false;
  const ahora = new Date();
  if (venc.getTime() >= ahora.getTime()) return false;
  const pago = fechaFirestoreADate(ultimoPago);
  if (!pago) return true;
  return pago.getTime() < venc.getTime();
}
