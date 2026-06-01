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

function montoPagoEnARS(p: Record<string, unknown>): number {
  const moneda = String(p.moneda ?? "ARS");
  const cot = Number(p.cotizacion ?? 0);
  const ars = Number(p.monto ?? 0);
  const usd = Number(p.montoUSD ?? 0);
  if (moneda === "USD" || (usd > 0 && ars === 0)) {
    return montoEnARS(usd, "USD", cot);
  }
  return ars + (usd > 0 && cot > 0 ? usd * cot : 0);
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

  const pagosProcesados = new Set<string>();

  pagosSnap.docs.forEach((d) => {
    const p = { id: d.id, ...d.data() } as Record<string, unknown>;
    const cat = clasificarPago(p);
    const monto = montoPagoEnARS(p);
    if (monto <= 0) return;

    const medio = normalizarMedioPago(String(p.forma ?? ""));

    if (cat === "pago_proveedor") {
      acumularEgresoCategoria(egresos, "pago_proveedor", monto);
      medios[medio] -= monto;
      pagosProcesados.add(d.id);
      return;
    }

    let sub: SubcategoriaVentaCaja | undefined;
    if (cat === "cobro_venta") {
      const nro = Number(p.nroVenta ?? 0);
      const venta = nro ? ventasPorNro.get(nro) : undefined;
      sub = venta ? subcategoriaVentaDesdeProductos(venta.productos as unknown[]) : "venta_repuesto_stock";
    }

    acumularIngresoCategoria(ingresos, cat, monto, sub);
    medios[medio] += monto;
    pagosProcesados.add(d.id);
  });

  gastosSnap.docs.forEach((d) => {
    const g = d.data();
    const moneda = String(g.moneda ?? "ARS");
    const monto =
      moneda === "USD"
        ? montoEnARS(Number(g.monto ?? 0), "USD", Number(g.cotizacion ?? 0))
        : Number(g.monto ?? 0);
    if (monto <= 0) return;
    acumularEgresoCategoria(egresos, "gasto_operativo", monto);
    const medio = normalizarMedioPago(String(g.metodoPago ?? g.forma ?? "efectivo"));
    medios[medio] -= monto;
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
