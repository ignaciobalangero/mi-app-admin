/** Lógica compartida: venta en USD/ARS, pago dual y conversión entre monedas. */

export type TotalesVentaMoneda = { totalARS: number; totalUSD: number };

export type TelefonoComoPagoInput = {
  valorPago: number;
  moneda: string;
} | null;

/**
 * True solo si la venta completa (todos los ítems de la operación) es USD.
 * Importante: en teléfono+accesorio hay que pasar totalARS/totalUSD de la venta
 * combinada. Si se mira solo el teléfono, un accesorio ARS haría convertir el
 * pago en pesos a crédito USD y dejaría la deuda ARS sin cancelar.
 */
export function esVentaSoloUSD(totalARS: number, totalUSD: number): boolean {
  return totalARS === 0 && totalUSD > 0;
}

/** True solo si la venta completa es en pesos. Ahí los dólares físicos cancelan esa deuda. */
export function esVentaSoloARS(totalARS: number, totalUSD: number): boolean {
  return totalUSD === 0 && totalARS > 0;
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

/** Pesos que cancelan una venta solo ARS cuando el cliente entrega dólares. */
export function calcularARSDesdeUSD(pagoUSD: number, cotizacion: number): number {
  if (pagoUSD <= 0 || cotizacion <= 0) return 0;
  const ars = pagoUSD * cotizacion;
  return Number.isFinite(ars) ? Math.round(ars * 100) / 100 : 0;
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
  const ventaSoloARS = esVentaSoloARS(totalARS, totalUSD);
  const pagoARSSaldo = pagoARSCuentaSaldoARS(ventaSoloUSD, pagoARS);
  const arsDesdeUSD = ventaSoloARS ? calcularARSDesdeUSD(pagoUSD, cotizacion) : 0;
  const creditoUSD = ventaSoloUSD
    ? creditoUSDVentaSoloUSD(pagoARS, pagoUSD, cotizacion)
    : ventaSoloARS
      ? 0
      : Math.max(0, pagoUSD);

  let saldoARS = totalARS - pagoARSSaldo - arsDesdeUSD;
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

export function notaConversionUSDaARS(
  pagoUSD: number,
  arsEquivalente: number,
  cotizacion: number
): string {
  return `Pago recibido en USD ${Number(pagoUSD).toLocaleString("es-AR")} aplicado a ARS $${Number(arsEquivalente).toLocaleString("es-AR")} (cotización $1 USD = $${Number(cotizacion).toLocaleString("es-AR")} ARS)`;
}

export type DetallesPagoFirestore =
  | { tipo: "USD" }
  | {
      tipo: "ARS_a_USD";
      montoUSDEquivalente: number;
      cotizacionPago: number;
      /** Compatibilidad con registros anteriores */
      montoARSOriginal?: number;
    }
  | {
      tipo: "USD_a_ARS";
      montoARSEquivalente: number;
      montoUSDOriginal: number;
      cotizacionPago: number;
    };

/**
 * Cómo un cobro en dólares impacta la cuenta de una venta.
 * En una venta solo en pesos, los billetes se convierten y no dejan crédito en USD.
 * La caja sigue viendo `montoUSD`: esto solo dice qué saldo del cliente se mueve.
 */
export function impactoPagoUsdEnVenta(opts: {
  montoUSD: number;
  cotizacion: number;
  totalARS: number;
  totalUSD: number;
}): {
  detallesPago: DetallesPagoFirestore;
  deltaARS: number;
  deltaUSD: number;
  nota: string;
} {
  const monto = Math.max(0, Number(opts.montoUSD) || 0);
  const cotizacion = Number(opts.cotizacion) || 0;
  if (esVentaSoloARS(Number(opts.totalARS) || 0, Number(opts.totalUSD) || 0)) {
    const ars = calcularARSDesdeUSD(monto, cotizacion);
    if (ars > 0) {
      return {
        detallesPago: {
          tipo: "USD_a_ARS",
          montoARSEquivalente: ars,
          montoUSDOriginal: monto,
          cotizacionPago: cotizacion,
        },
        deltaARS: -ars,
        deltaUSD: 0,
        nota: notaConversionUSDaARS(monto, ars, cotizacion),
      };
    }
  }
  return {
    detallesPago: { tipo: "USD" },
    deltaARS: 0,
    deltaUSD: -monto,
    nota: "",
  };
}

/** Crédito que un pago ya guardado aporta a la cuenta. No cuenta dos veces una conversión. */
export function creditoCuentaDePago(pago: {
  monto?: unknown;
  montoUSD?: unknown;
  detallesPago?: {
    tipo?: string;
    montoUSDEquivalente?: number;
    montoARSEquivalente?: number;
  } | null;
}): { ars: number; usd: number } {
  const det = pago.detallesPago;
  if (det?.tipo === "USD_a_ARS") {
    return { ars: Math.max(0, Number(det.montoARSEquivalente) || 0), usd: 0 };
  }
  return {
    ars: Math.max(0, Number(pago.monto) || 0),
    usd: Math.max(0, Number(pago.montoUSD) || 0),
  };
}

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

export function aplicarDescuentoVenta(params: {
  totalARS: number;
  totalUSD: number;
  modo: "ninguno" | "porcentaje" | "monto";
  porcentaje?: number;
  montoARS?: number;
  montoUSD?: number;
}): {
  subtotalARS: number;
  subtotalUSD: number;
  descuentoARS: number;
  descuentoUSD: number;
  descuentoPorcentaje: number;
  totalARS: number;
  totalUSD: number;
} {
  const subtotalARS = Math.max(0, Number(params.totalARS) || 0);
  const subtotalUSD = Math.max(0, Number(params.totalUSD) || 0);
  const redondear = (n: number) => Math.round(Math.max(0, n) * 100) / 100;

  if (params.modo === "porcentaje") {
    const porcentaje = Math.min(100, Math.max(0, Number(params.porcentaje) || 0));
    const descuentoARS = redondear((subtotalARS * porcentaje) / 100);
    const descuentoUSD = redondear((subtotalUSD * porcentaje) / 100);
    return {
      subtotalARS,
      subtotalUSD,
      descuentoARS,
      descuentoUSD,
      descuentoPorcentaje: porcentaje,
      totalARS: redondear(subtotalARS - descuentoARS),
      totalUSD: redondear(subtotalUSD - descuentoUSD),
    };
  }

  if (params.modo === "monto") {
    const descuentoARS = redondear(Math.min(subtotalARS, Number(params.montoARS) || 0));
    const descuentoUSD = redondear(Math.min(subtotalUSD, Number(params.montoUSD) || 0));
    return {
      subtotalARS,
      subtotalUSD,
      descuentoARS,
      descuentoUSD,
      descuentoPorcentaje: 0,
      totalARS: redondear(subtotalARS - descuentoARS),
      totalUSD: redondear(subtotalUSD - descuentoUSD),
    };
  }

  return {
    subtotalARS,
    subtotalUSD,
    descuentoARS: 0,
    descuentoUSD: 0,
    descuentoPorcentaje: 0,
    totalARS: redondear(subtotalARS),
    totalUSD: redondear(subtotalUSD),
  };
}

function brutoLineaProducto(p: {
  precioVenta?: unknown;
  precioUnitario?: unknown;
  cantidad?: unknown;
}): number {
  const pv = Number(p?.precioVenta);
  if (Number.isFinite(pv) && pv > 0) return pv;
  const unit = Number(p?.precioUnitario) || 0;
  const cantRaw = Number(p?.cantidad) || 1;
  const cant = cantRaw > 0 ? cantRaw : 1;
  return unit * cant;
}

function monedaDeLinea(p: { moneda?: unknown }): "ARS" | "USD" {
  return String(p?.moneda || "ARS").toUpperCase() === "USD" ? "USD" : "ARS";
}

/**
 * Reparte el descuento de la venta en cada línea.
 * El precio que queda guardado ya es el cobrado: la tabla y la cuenta corriente
 * suman esos precios y no vuelven a restar el descuento.
 */
export function aplicarDescuentoEnLineas<T extends Record<string, unknown>>(
  productos: T[],
  descuentoARS: number,
  descuentoUSD: number
): T[] {
  const redondear = (n: number) => Math.round(Math.max(0, n) * 100) / 100;
  const descARS = redondear(Number(descuentoARS) || 0);
  const descUSD = redondear(Number(descuentoUSD) || 0);
  if (descARS <= 0 && descUSD <= 0) return productos.map((p) => ({ ...p }));

  const copia = productos.map((p) => ({ ...p }));

  const aplicar = (moneda: "ARS" | "USD", descuento: number) => {
    if (descuento <= 0) return;
    const indices = copia
      .map((p, i) => ({ i, bruto: brutoLineaProducto(p) }))
      .filter((x) => monedaDeLinea(copia[x.i]) === moneda && x.bruto > 0);
    const subtotal = indices.reduce((acc, x) => acc + x.bruto, 0);
    if (subtotal <= 0) return;
    const desc = Math.min(subtotal, descuento);
    const target = redondear(subtotal - desc);
    let acumulado = 0;
    indices.forEach((item, n) => {
      const esUltima = n === indices.length - 1;
      const neto = esUltima
        ? redondear(target - acumulado)
        : redondear((item.bruto / subtotal) * target);
      if (!esUltima) acumulado = redondear(acumulado + neto);
      const p = copia[item.i];
      const cantRaw = Number(p.cantidad || 1);
      const cant = cantRaw > 0 ? cantRaw : 1;
      const unit = neto / cant;
      const costo = Number(p.precioCosto || 0);
      const ganancia = redondear((unit - costo) * cant);
      const usd = moneda === "USD";
      copia[item.i] = {
        ...p,
        precioUnitario: unit,
        precioVenta: neto,
        ganancia,
        precioUnitarioUSD: usd ? unit : null,
        precioUnitarioARS: usd ? null : unit,
        precioVentaUSD: usd ? neto : null,
        precioVentaARS: usd ? null : neto,
      };
    });
  };

  aplicar("ARS", descARS);
  aplicar("USD", descUSD);
  return copia;
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
