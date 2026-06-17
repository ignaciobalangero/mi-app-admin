import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  CategoriaMovimientoCaja,
  MovimientoCaja,
  ResumenCajaDia,
  ResumenEgresosCaja,
  ResumenIngresosCaja,
  SubcategoriaVentaCaja,
} from "@/lib/caja/cajaTypes";
import { esLineaStockExtra } from "@/lib/ventasStockProducto";
import {
  crearResumenMediosVacio,
  medioPagoDesdeDocumento,
  montoEnARS,
  normalizarMedioPago,
} from "@/lib/caja/mediosPago";
import { fechaCajaHoy } from "@/lib/caja/fechaCaja";

function ingresosVacios(): ResumenIngresosCaja {
  return {
    cobrosTrabajos: 0,
    ventasContado: 0,
    ventasTelefonoARS: 0,
    ventasTelefonoUSDEquivARS: 0,
    ventasAccesorios: 0,
    ventasRepuestoStock: 0,
    ventasRepuestoExtra: 0,
    cobrosCuentaCorriente: 0,
    ingresosManuales: 0,
    transferenciasDesdeMayor: 0,
    total: 0,
  };
}

function egresosVacios(): ResumenEgresosCaja {
  return {
    gastosOperativos: 0,
    pagosProveedores: 0,
    retirosDueno: 0,
    egresosManuales: 0,
    transferenciasAMayor: 0,
    total: 0,
  };
}

function subcategoriaVentaDesdeProductos(productos: unknown[]): SubcategoriaVentaCaja {
  const list = Array.isArray(productos) ? productos : [];
  const esTelefono = list.some((p) => String((p as Record<string, unknown>).categoria ?? "") === "Teléfono");
  if (esTelefono) {
    const soloUsd = list.every(
      (p) => String((p as Record<string, unknown>).moneda ?? "ARS").toUpperCase() === "USD"
    );
    return soloUsd ? "venta_telefono_usd" : "venta_telefono_ars";
  }
  if (list.some((p) => String((p as Record<string, unknown>).tipo ?? "").toLowerCase() === "accesorio")) {
    return "venta_accesorio";
  }
  if (list.some((p) => esLineaStockExtra(p as Record<string, unknown>))) {
    return "venta_repuesto_extra";
  }
  return "venta_repuesto_stock";
}

function sumarSubcategoriaVenta(ing: ResumenIngresosCaja, sub: SubcategoriaVentaCaja, monto: number) {
  ing.ventasContado += monto;
  switch (sub) {
    case "venta_telefono_ars":
      ing.ventasTelefonoARS += monto;
      break;
    case "venta_telefono_usd":
      ing.ventasTelefonoUSDEquivARS += monto;
      break;
    case "venta_accesorio":
      ing.ventasAccesorios += monto;
      break;
    case "venta_repuesto_stock":
      ing.ventasRepuestoStock += monto;
      break;
    case "venta_repuesto_extra":
      ing.ventasRepuestoExtra += monto;
      break;
  }
}

function acumularIngresoCategoria(
  ing: ResumenIngresosCaja,
  cat: CategoriaMovimientoCaja,
  monto: number,
  sub?: SubcategoriaVentaCaja
) {
  switch (cat) {
    case "cobro_trabajo":
      ing.cobrosTrabajos += monto;
      break;
    case "cobro_venta":
      if (sub) sumarSubcategoriaVenta(ing, sub, monto);
      else ing.ventasContado += monto;
      break;
    case "cobro_cta_cte":
      ing.cobrosCuentaCorriente += monto;
      break;
    case "ingreso_manual":
      ing.ingresosManuales += monto;
      break;
    case "transferencia_caja_mayor":
      ing.transferenciasDesdeMayor += monto;
      break;
    default:
      break;
  }
  ing.total =
    ing.cobrosTrabajos +
    ing.ventasContado +
    ing.cobrosCuentaCorriente +
    ing.ingresosManuales +
    ing.transferenciasDesdeMayor;
}

function acumularEgresoCategoria(eg: ResumenEgresosCaja, cat: CategoriaMovimientoCaja, monto: number) {
  switch (cat) {
    case "gasto_operativo":
      eg.gastosOperativos += monto;
      break;
    case "pago_proveedor":
      eg.pagosProveedores += monto;
      break;
    case "retiro_dueno":
      eg.retirosDueno += monto;
      break;
    case "egreso_manual":
      eg.egresosManuales += monto;
      break;
    case "transferencia_caja_mayor":
      eg.transferenciasAMayor += monto;
      break;
    default:
      break;
  }
  eg.total =
    eg.gastosOperativos +
    eg.pagosProveedores +
    eg.retirosDueno +
    eg.egresosManuales +
    eg.transferenciasAMayor;
}

function clasificarPago(p: Record<string, unknown>): CategoriaMovimientoCaja {
  if (p.trabajoId) return "cobro_trabajo";
  if (p.nroVenta || p.ventaId) return "cobro_venta";
  if (p.tipoDestino === "proveedor" || p.proveedorDestino) return "pago_proveedor";
  return "cobro_cta_cte";
}

function totalesMonedaVacios() {
  return {
    ingresosARS: 0,
    ingresosUSD: 0,
    ingresosUSDEquivARS: 0,
    egresosARS: 0,
    egresosUSD: 0,
    egresosUSDEquivARS: 0,
  };
}

function subcategoriaDesdePago(
  p: Record<string, unknown>,
  ventasPorNro: Map<number, Record<string, unknown>>
): SubcategoriaVentaCaja | undefined {
  const destino = String(p.destino ?? "").toLowerCase();
  if (destino.includes("ventatelefono") || destino.includes("venta_telefono")) {
    const monedaPago = String(p.moneda ?? "ARS").toUpperCase();
    const usd = Number(p.montoUSD ?? 0);
    return monedaPago === "USD" || usd > 0 ? "venta_telefono_usd" : "venta_telefono_ars";
  }

  const nro = Number(p.nroVenta ?? 0);
  const venta = nro ? ventasPorNro.get(nro) : undefined;
  if (venta) {
    return subcategoriaVentaDesdeProductos(venta.productos as unknown[]);
  }
  return "venta_repuesto_stock";
}

function montosPagoSeparados(p: Record<string, unknown>): {
  ars: number;
  usd: number;
  cot: number;
} {
  const cot = Number(p.cotizacion ?? p.cotizacionPago ?? 0);
  const ars = Number(p.monto ?? 0);
  const usd = Number(p.montoUSD ?? 0);
  const moneda = String(p.moneda ?? "ARS").toUpperCase();

  if (moneda === "USD" && ars <= 0) {
    return { ars: 0, usd, cot };
  }
  if (moneda === "ARS" && usd <= 0) {
    return { ars, usd: 0, cot };
  }
  if (moneda === "DUAL" || (ars > 0 && usd > 0)) {
    return { ars, usd, cot };
  }
  if (usd > 0 && ars <= 0) {
    return { ars: 0, usd, cot };
  }
  return { ars, usd: 0, cot };
}

function acumularIngresoPorMoneda(
  totales: ReturnType<typeof totalesMonedaVacios>,
  ars: number,
  usd: number,
  cot: number
) {
  if (ars > 0) totales.ingresosARS += ars;
  if (usd > 0) {
    totales.ingresosUSD += usd;
    if (cot > 0) totales.ingresosUSDEquivARS += usd * cot;
  }
}

function acumularEgresoPorMoneda(
  totales: ReturnType<typeof totalesMonedaVacios>,
  ars: number,
  usd: number,
  cot: number
) {
  if (ars > 0) totales.egresosARS += ars;
  if (usd > 0) {
    totales.egresosUSD += usd;
    if (cot > 0) totales.egresosUSDEquivARS += usd * cot;
  }
}

function acumularPagoEnCaja(params: {
  p: Record<string, unknown>;
  ingresos: ResumenIngresosCaja;
  egresos: ResumenEgresosCaja;
  medios: Record<import("@/lib/caja/cajaTypes").MedioPagoCaja, number>;
  totalesPorMoneda: ReturnType<typeof totalesMonedaVacios>;
  ventasPorNro: Map<number, Record<string, unknown>>;
}) {
  const { p, ingresos, egresos, medios, totalesPorMoneda, ventasPorNro } = params;
  const cat = clasificarPago(p);
  const { ars, usd, cot } = montosPagoSeparados(p);
  if (ars <= 0 && usd <= 0) return;

  const montoTotalARS = ars + (usd > 0 && cot > 0 ? usd * cot : 0);
  if (montoTotalARS <= 0 && usd <= 0) return;

  const forma = String(p.forma ?? p.formaPago ?? "");

  if (cat === "pago_proveedor") {
    acumularEgresoCategoria(egresos, "pago_proveedor", montoTotalARS);
    acumularEgresoPorMoneda(totalesPorMoneda, ars, usd, cot);
    if (ars > 0) {
      medios[normalizarMedioPago(forma)] -= ars;
    }
    if (usd > 0) {
      const medioUsd = medioPagoDesdeDocumento(p);
      medios[medioUsd] -= montoEnARS(usd, "USD", cot);
    }
    return;
  }

  const sub =
    cat === "cobro_venta"
      ? subcategoriaDesdePago(p, ventasPorNro)
      : undefined;

  acumularIngresoCategoria(ingresos, cat, montoTotalARS, sub);
  acumularIngresoPorMoneda(totalesPorMoneda, ars, usd, cot);

  if (ars > 0) {
    const medioArs =
      usd > 0 && forma.toLowerCase().includes("usd")
        ? normalizarMedioPago(forma.replace(/\+?\s*usd/gi, "").trim() || "Efectivo")
        : normalizarMedioPago(forma);
    medios[medioArs === "usd_billete" ? "efectivo_ars" : medioArs] += ars;
  }

  if (usd > 0) {
    const medioUsd = medioPagoDesdeDocumento(p);
    medios[medioUsd] += montoEnARS(usd, "USD", cot);
  }
}

export async function calcularResumenCajaDia(params: {
  negocioId: string;
  fecha?: string;
  sesionId?: string;
  saldoInicialARS?: number;
  saldoInicialUSD?: number;
}): Promise<ResumenCajaDia> {
  const fecha = params.fecha ?? fechaCajaHoy();
  const ingresos = ingresosVacios();
  const egresos = egresosVacios();
  const medios = crearResumenMediosVacio();
  const totalesPorMoneda = totalesMonedaVacios();
  const movimientos: MovimientoCaja[] = [];

  const ventasPorNro = new Map<number, Record<string, unknown>>();

  const [pagosSnap, ventasSnap, gastosSnap, movsSnap] = await Promise.all([
    getDocs(query(collection(db, `negocios/${params.negocioId}/pagos`), where("fecha", "==", fecha))),
    getDocs(query(collection(db, `negocios/${params.negocioId}/ventasGeneral`), where("fecha", "==", fecha))),
    getDocs(query(collection(db, `negocios/${params.negocioId}/gastos`), where("fecha", "==", fecha))),
    params.sesionId
      ? getDocs(
          query(
            collection(db, `negocios/${params.negocioId}/movimientosCaja`),
            where("sesionId", "==", params.sesionId)
          )
        )
      : Promise.resolve(null),
  ]);

  ventasSnap.docs.forEach((d) => {
    const data = d.data();
    const nro = Number(data.nroVenta ?? 0);
    if (nro) ventasPorNro.set(nro, { id: d.id, ...data });
  });

  pagosSnap.docs.forEach((d) => {
    const p = { id: d.id, ...d.data() } as Record<string, unknown>;
    acumularPagoEnCaja({
      p,
      ingresos,
      egresos,
      medios,
      totalesPorMoneda,
      ventasPorNro,
    });
  });

  gastosSnap.docs.forEach((d) => {
    const g = d.data() as Record<string, unknown>;
    const moneda = String(g.moneda ?? "ARS");
    const cot = Number(g.cotizacion ?? 0);
    const arsNativo = moneda === "USD" ? 0 : Number(g.monto ?? 0);
    const usdNativo = moneda === "USD" ? Number(g.monto ?? 0) : Number(g.montoUSD ?? 0);
    const monto =
      arsNativo + (usdNativo > 0 && cot > 0 ? usdNativo * cot : 0);
    if (monto <= 0) return;
    acumularEgresoCategoria(egresos, "gasto_operativo", monto);
    acumularEgresoPorMoneda(totalesPorMoneda, arsNativo, usdNativo, cot);
    if (arsNativo > 0) {
      medios[normalizarMedioPago(String(g.metodoPago ?? g.forma ?? "efectivo"))] -= arsNativo;
    }
    if (usdNativo > 0) {
      medios[medioPagoDesdeDocumento(g, { esGasto: true })] -= montoEnARS(
        usdNativo,
        "USD",
        cot
      );
    }
  });

  if (movsSnap) {
    movsSnap.docs.forEach((d) => {
      const m = { id: d.id, ...d.data() } as MovimientoCaja;
      if (m.esAnulado) return;
      movimientos.push(m);

      if (m.tipo === "ingreso") {
        acumularIngresoCategoria(ingresos, m.categoria, m.montoARS, m.subcategoria);
        medios[m.medioPago] += m.montoARS;
      } else {
        acumularEgresoCategoria(egresos, m.categoria, m.montoARS);
        medios[m.medioPago] -= m.montoARS;
      }
    });
  }

  const saldoInicialARS = params.saldoInicialARS ?? 0;
  const saldoInicialUSD = params.saldoInicialUSD ?? 0;
  const netoDiaARS = ingresos.total - egresos.total;

  return {
    saldoInicialARS,
    saldoInicialUSD,
    ingresos,
    egresos,
    netoDiaARS,
    medios,
    movimientos,
    totalesPorMoneda,
  };
}

/** Efectivo esperado al arqueo = saldo inicial + neto en efectivo ARS + USD convertido. */
export function calcularEsperadoPorMedio(
  resumen: ResumenCajaDia,
  cotizacionUSD: number
): ReturnType<typeof crearResumenMediosVacio> {
  const medios = { ...resumen.medios };
  medios.efectivo_ars += resumen.saldoInicialARS;
  if (resumen.saldoInicialUSD > 0 && cotizacionUSD > 0) {
    medios.usd_billete += resumen.saldoInicialUSD * cotizacionUSD;
  }
  return medios;
}

export function formatearPrecioCaja(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}
