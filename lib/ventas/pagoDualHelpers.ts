/** Lógica compartida: venta en USD/ARS, pago dual y conversión ARS→USD. */

export type TotalesVentaMoneda = { totalARS: number; totalUSD: number };

export type TelefonoComoPagoInput = {
  valorPago: number;
  moneda: string;
} | null;

export function esVentaSoloUSD(totalARS: number, totalUSD: number): boolean {
  return totalARS === 0 && totalUSD > 0;
}

export function cotizacionEfectiva(
  cotizacionPago: number,
  cotizacionVenta: number
): number {
  if (cotizacionPago > 0) return cotizacionPago;
  if (cotizacionVenta > 0) return cotizacionVenta;
  return 1000;
}

export function calcularUsdDesdeARS(pagoARS: number, cotizacion: number): number {
  if (pagoARS <= 0 || cotizacion <= 0) return 0;
  const usd = pagoARS / cotizacion;
  return Number.isFinite(usd) ? usd : 0;
}

/** Crédito total en USD cuando la venta es solo USD (USD físico + ARS convertidos). */
export function creditoUSDVentaSoloUSD(
  pagoARS: number,
  pagoUSD: number,
  cotizacion: number
): number {
  return Math.max(0, pagoUSD) + calcularUsdDesdeARS(pagoARS, cotizacion);
}

/** En venta solo USD, los pesos cancelan deuda USD — no restan saldo ARS del cliente. */
export function pagoARSCuentaSaldoARS(
  ventaSoloUSD: boolean,
  pagoARS: number
): number {
  return ventaSoloUSD ? 0 : Math.max(0, pagoARS);
}

function normalizarTelefonosPago(
  telefonoPago?: TelefonoComoPagoInput,
  telefonosPago?: TelefonoComoPagoInput[]
): TelefonoComoPagoInput[] {
  if (telefonosPago?.length) {
    return telefonosPago.filter((t) => t && t.valorPago > 0);
  }
  if (telefonoPago && telefonoPago.valorPago > 0) return [telefonoPago];
  return [];
}

export function calcularSaldosVenta(params: {
  totalARS: number;
  totalUSD: number;
  pagoARS: number;
  pagoUSD: number;
  cotizacion: number;
  telefonoPago?: TelefonoComoPagoInput;
  telefonosPago?: TelefonoComoPagoInput[];
}): {
  saldoARS: number;
  saldoUSD: number;
  creditoUSD: number;
  totalAproximado: number;
  pagoAproximado: number;
  saldoAproximado: number;
  ventaSoloUSD: boolean;
} {
  const { totalARS, totalUSD, pagoARS, pagoUSD, cotizacion, telefonoPago, telefonosPago } =
    params;
  const ventaSoloUSD = esVentaSoloUSD(totalARS, totalUSD);
  const pagoARSSaldo = pagoARSCuentaSaldoARS(ventaSoloUSD, pagoARS);
  const creditoUSD = ventaSoloUSD
    ? creditoUSDVentaSoloUSD(pagoARS, pagoUSD, cotizacion)
    : Math.max(0, pagoUSD);

  let saldoARS = totalARS - pagoARSSaldo;
  let saldoUSD = totalUSD - creditoUSD;

  const listaTelefonosPago = normalizarTelefonosPago(telefonoPago, telefonosPago);
  for (const tp of listaTelefonosPago) {
    if (String(tp.moneda).toUpperCase() === "USD") {
      saldoUSD -= tp.valorPago;
    } else {
      saldoARS -= tp.valorPago;
    }
  }

  const totalAproximado = totalARS + totalUSD * cotizacion;
  const telefonoAprox = listaTelefonosPago.reduce((acc, tp) => {
    return (
      acc +
      (String(tp.moneda).toUpperCase() === "USD"
        ? tp.valorPago * cotizacion
        : tp.valorPago)
    );
  }, 0);

  const pagoAproximado = ventaSoloUSD
    ? creditoUSD * cotizacion
    : pagoARS + pagoUSD * cotizacion;

  const saldoAproximado = totalAproximado - pagoAproximado - telefonoAprox;

  return {
    saldoARS,
    saldoUSD,
    creditoUSD,
    totalAproximado,
    pagoAproximado,
    saldoAproximado,
    ventaSoloUSD,
  };
}

export function ventaEstaPagada(
  saldoARS: number,
  saldoUSD: number,
  tolerancia = 0.01
): boolean {
  return saldoARS <= tolerancia && saldoUSD <= tolerancia;
}

export function notaConversionARSaUSD(
  pagoARS: number,
  usdEquivalente: number,
  cotizacion: number
): string {
  return `Pago recibido en ARS $${Number(pagoARS).toLocaleString("es-AR")} aplicado a USD ${usdEquivalente.toFixed(2)} (cotización $1 USD = $${Number(cotizacion).toLocaleString("es-AR")} ARS)`;
}

export type DetallesPagoFirestore =
  | { tipo: "USD" }
  | {
      tipo: "ARS_a_USD";
      montoUSDEquivalente: number;
      cotizacionPago: number;
      /** Compatibilidad con registros anteriores */
      montoARSOriginal?: number;
    };

export type LineaPagoVenta = {
  moneda: "ARS" | "USD";
  monto: number;
  formaPago?: string;
};

/** Normaliza líneas de pago (con medio por ítem) o cae a montos agregados legacy. */
export function resolverLineasPago(pago: {
  monto?: string | number | null;
  montoUSD?: string | number | null;
  formaPago?: string;
  lineas?: LineaPagoVenta[];
} | null | undefined): LineaPagoVenta[] {
  if (!pago) return [];
  const guardadas = Array.isArray(pago.lineas) ? pago.lineas : [];
  const validas = guardadas
    .filter((l) => (l.moneda === "ARS" || l.moneda === "USD") && Number(l.monto) > 0)
    .map((l) => ({
      moneda: l.moneda as "ARS" | "USD",
      monto: Number(l.monto),
      formaPago:
        String(l.formaPago || pago.formaPago || "Efectivo").trim() || "Efectivo",
    }));
  if (validas.length > 0) return validas;

  const ars = Number(pago.monto || 0);
  const usd = Number(pago.montoUSD || 0);
  const forma = String(pago.formaPago || "Efectivo").trim() || "Efectivo";
  const out: LineaPagoVenta[] = [];
  if (ars > 0) out.push({ moneda: "ARS", monto: ars, formaPago: forma });
  if (usd > 0) out.push({ moneda: "USD", monto: usd, formaPago: forma });
  return out;
}

export function formaPagoDocumento(
  forma: string | undefined,
  moneda: "ARS" | "USD"
): string {
  const base = String(forma || "Efectivo").trim() || "Efectivo";
  if (moneda === "USD") {
    return /\bUSD\b/i.test(base) ? base : `${base} USD`;
  }
  return base;
}
