/**
 * Cuenta corriente: ventas = suma por línea según `moneda` del producto (default ARS).
 * Un teléfono en ARS suma en ARS; en USD suma en USD.
 */

export function normalizeMonedaCuenta(m: unknown): "ARS" | "USD" {
  const u = String(m ?? "ARS").trim().toUpperCase();
  return u === "USD" ? "USD" : "ARS";
}

export function monedaLineaProducto(p: any): "ARS" | "USD" {
  return normalizeMonedaCuenta(p?.moneda);
}

export function importeLineaProducto(p: any): number {
  return Number(p?.precioUnitario ?? 0) * Number(p?.cantidad ?? 1);
}

export function totalesVentasPorMoneda(productos: any[] | undefined): {
  totalARS: number;
  totalUSD: number;
} {
  let totalARS = 0;
  let totalUSD = 0;
  for (const p of productos || []) {
    const imp = importeLineaProducto(p);
    if (monedaLineaProducto(p) === "USD") totalUSD += imp;
    else totalARS += imp;
  }
  return { totalARS, totalUSD };
}

/**
 * Costo unitario en la misma moneda de venta del producto (para ganancia en tablas).
 * `cotizacion` debe ser la de la venta (la que usó `obtenerDatosRespetandoMonedas` al guardar `precioCostoPesos`), no la del modal de pago.
 */
export function costoUnitarioEnMonedaVenta(p: any, cotizacion: number): number {
  const m = monedaLineaProducto(p);
  const pu = Number(p?.precioUnitario ?? 0);
  const pc = Number(p?.precioCosto ?? 0);
  const pcp = Number(p?.precioCostoPesos ?? 0);
  const cot = cotizacion > 0 ? cotizacion : 0;

  if (m === "ARS") {
    return pcp || pc || 0;
  }

  // USD: costo en USD “chico”; luego precioCosto grande = ARS guardado en el mismo campo (÷ cot) ANTES que pcp/cot
  // (si no, pcp/cot con cot mal tomada del hook deja costo ~0 y ganancia ~precio).
  if (pc > 0 && pc <= Math.min(pu * 2.5, 5000)) {
    return pc;
  }
  // precioCosto en ARS a veces queda en el mismo campo (miles); no confundir con USD tipo 40–500
  if (
    pc > Math.max(pu * 2.5, 200) &&
    pc >= 2000 &&
    pc > pu * 10 &&
    cot > 0 &&
    pc < 5_000_000
  ) {
    const comoUsd = pc / cot;
    if (comoUsd > 0 && comoUsd <= Math.max(pu * 5, 50_000)) {
      return comoUsd;
    }
  }
  if (pcp > 0 && cot > 0) {
    return pcp / cot;
  }
  return pc;
}

/**
 * Ganancia por línea para tablas. USD: prioriza `precioCosto` en USD; si el recálculo suena a “casi todo ganancia”
 * por cotización mala, reintenta con `cotizacionUsada` de la línea o usa `ganancia` guardada.
 */
export function gananciaLineaProductoVenta(p: any, cotizacion: number): number {
  const pu = Number(p?.precioUnitario ?? 0);
  const cant = Number(p?.cantidad ?? 1);
  const ventaLinea = pu * cant;
  const m = monedaLineaProducto(p);

  if (m === "USD") {
    const pc = Number(p?.precioCosto ?? 0);
    if (pc > 0 && pc <= Math.min(pu * 2.5, 5000)) {
      return (pu - pc) * cant;
    }
  }

  const calc = (() => {
    const c = costoUnitarioEnMonedaVenta(p, cotizacion);
    return (pu - c) * cant;
  })();

  if (m === "USD" && pu > 0 && cant > 0 && ventaLinea > 0) {
    const pcp = Number(p?.precioCostoPesos ?? 0);
    const impliedCost = pu - calc / cant;
    const margenCalc = calc / ventaLinea;
    const sospechoso =
      pcp > 500 &&
      calc > 0 &&
      margenCalc > 0.88 &&
      impliedCost >= 0 &&
      impliedCost < pu * 0.12;

    if (sospechoso) {
      const cotLinea = Number(p?.cotizacionUsada ?? 0);
      if (cotLinea >= 50 && cotLinea <= 500_000) {
        const cAlt = costoUnitarioEnMonedaVenta(p, cotLinea);
        const gAlt = (pu - cAlt) * cant;
        if (
          Number.isFinite(gAlt) &&
          gAlt <= ventaLinea + 0.02 &&
          gAlt >= -ventaLinea - 0.02 &&
          Math.abs(gAlt - calc) > 0.25
        ) {
          return gAlt;
        }
      }
    }
  }

  const saved = Number(p?.ganancia);
  const savedOk =
    Number.isFinite(saved) &&
    saved >= -ventaLinea - 0.02 &&
    saved <= ventaLinea + 0.02;
  if (savedOk) {
    const umbralG = Math.max(0.01, ventaLinea * 0.1);
    if (Math.abs(calc - saved) > umbralG) {
      return saved;
    }
  }

  return calc;
}
