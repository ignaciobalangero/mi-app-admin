import type { MedioPagoCaja } from "@/lib/caja/cajaTypes";

export const MEDIOS_PAGO_CAJA: { id: MedioPagoCaja; label: string }[] = [
  { id: "efectivo_ars", label: "Efectivo ARS" },
  { id: "transferencia", label: "Transferencia / CBU" },
  { id: "tarjeta_debito", label: "Tarjeta débito" },
  { id: "tarjeta_credito", label: "Tarjeta crédito" },
  { id: "usd_billete", label: "USD billete" },
  { id: "mercado_pago", label: "Mercado Pago / Modo" },
  { id: "otro", label: "Otro" },
];

export function labelMedioPago(medio: MedioPagoCaja): string {
  return MEDIOS_PAGO_CAJA.find((m) => m.id === medio)?.label ?? medio;
}

/** Normaliza textos legacy del sistema (pagos.forma, gastos.metodoPago, etc.). */
export function normalizarMedioPago(raw: string | undefined | null): MedioPagoCaja {
  const t = String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (!t) return "efectivo_ars";
  if (t.includes("transfer")) return "transferencia";
  if (t.includes("debito") || t.includes("débito")) return "tarjeta_debito";
  if (t.includes("credito") || t.includes("crédito") || t.includes("tarjeta")) {
    return t.includes("debito") ? "tarjeta_debito" : "tarjeta_credito";
  }
  if (t.includes("mercado") || t.includes("modo") || t.includes("qr")) return "mercado_pago";
  if (t.includes("usd") || t.includes("dolar") || t.includes("dólar")) return "usd_billete";
  if (t.includes("efectivo") || t.includes("cash")) return "efectivo_ars";
  if (t.includes("crypto")) return "otro";
  return "otro";
}

export function crearResumenMediosVacio(): Record<MedioPagoCaja, number> {
  return {
    efectivo_ars: 0,
    transferencia: 0,
    tarjeta_debito: 0,
    tarjeta_credito: 0,
    usd_billete: 0,
    mercado_pago: 0,
    otro: 0,
  };
}

/** Convierte montos a ARS para totales de caja (la caja opera en ARS). */
export function montoEnARS(
  monto: number,
  moneda: string | undefined,
  cotizacion: number | undefined
): number {
  const cot = cotizacion && cotizacion > 0 ? cotizacion : 0;
  if (String(moneda ?? "ARS").toUpperCase() === "USD") {
    return cot > 0 ? monto * cot : 0;
  }
  return monto;
}
