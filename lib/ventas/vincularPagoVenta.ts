import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { listarPagosDeVenta } from "@/lib/actualizarSaldoCliente";
import { resolverSaldoPendienteRecibo, type PagoReciboCompra } from "@/lib/reciboCompraTelefono";
import {
  calcularUsdDesdeARS,
  esVentaSoloUSD,
  ventaEstaPagada,
} from "@/lib/ventas/pagoDualHelpers";

export type VentaPendienteCliente = {
  id: string;
  nroVenta: string | number;
  fecha: string;
  resumen: string;
  saldoARS: number;
  saldoUSD: number;
  totalARS: number;
  totalUSD: number;
  etiqueta: string;
};

export type PagoEnRemito = {
  formaPago: string;
  monto: number;
  montoUSD: number;
  moneda: string;
  fecha: string;
  observaciones: string;
};

export type SaldoRemito = {
  pagos: PagoEnRemito[];
  saldoPendienteARS: number;
  saldoPendienteUSD: number;
  saldoAproximado: number;
};

type VentaComoDoc = {
  id?: string;
  nroVenta?: string | number;
  cliente?: string;
  fecha?: string;
  estado?: string;
  moneda?: string;
  total?: number;
  totalARS?: number;
  totalUSD?: number;
  cotizacionUsada?: number;
  saldoPendiente?: number;
  saldoPendienteARS?: number;
  saldoPendienteUSD?: number;
  productos?: { precioUnitario?: number; cantidad?: number; moneda?: string; descripcion?: string; producto?: string; modelo?: string }[];
  pago?: {
    forma?: string;
    monto?: number | null;
    montoUSD?: number | null;
    moneda?: string;
    cotizacion?: number;
    cotizacionPago?: number;
    pagoARSAplicadoAUSD?: boolean;
    lineas?: { moneda?: string; monto?: number; formaPago?: string }[];
  } | null;
  telefonoComoPago?: { valorPago?: number; moneda?: string } | null;
  telefonosComoPago?: { valorPago?: number; moneda?: string }[];
};

function fmtSaldo(ars: number, usd: number): string {
  const partes: string[] = [];
  if (usd > 0.009) partes.push(`USD ${usd.toLocaleString("es-AR")}`);
  if (ars > 0.009) partes.push(`$${Math.round(ars).toLocaleString("es-AR")}`);
  return partes.join(" + ") || "saldada";
}

function resumenVenta(data: VentaComoDoc): string {
  const productos = Array.isArray(data.productos) ? data.productos : [];
  const primero = productos[0];
  const nombre = String(
    primero?.descripcion || primero?.producto || primero?.modelo || "Venta"
  ).trim();
  const extra = productos.length > 1 ? ` +${productos.length - 1}` : "";
  return `${nombre}${extra}`;
}

function totalesVentaDoc(venta: VentaComoDoc): { totalARS: number; totalUSD: number } {
  const guardadoARS = Number(venta.totalARS);
  const guardadoUSD = Number(venta.totalUSD);
  if (
    (Number.isFinite(guardadoARS) && guardadoARS > 0) ||
    (Number.isFinite(guardadoUSD) && guardadoUSD > 0)
  ) {
    return {
      totalARS: Number.isFinite(guardadoARS) ? guardadoARS : 0,
      totalUSD: Number.isFinite(guardadoUSD) ? guardadoUSD : 0,
    };
  }

  let totalARS = 0;
  let totalUSD = 0;
  for (const p of venta.productos || []) {
    const sub = (Number(p.precioUnitario) || 0) * (Number(p.cantidad) || 0);
    if (String(p.moneda || "").toUpperCase() === "USD") totalUSD += sub;
    else totalARS += sub;
  }
  if (totalARS <= 0 && totalUSD <= 0 && Number(venta.total) > 0) {
    if (String(venta.moneda || "").toUpperCase() === "USD") totalUSD = Number(venta.total);
    else totalARS = Number(venta.total);
  }
  return { totalARS, totalUSD };
}

function pagosEmbebidos(venta: VentaComoDoc): PagoReciboCompra[] {
  const pago = venta.pago;
  if (!pago) return [];
  const cotizacionPago = Number(pago.cotizacionPago || pago.cotizacion) || 0;
  if (Array.isArray(pago.lineas) && pago.lineas.length > 0) {
    return pago.lineas
      .filter((l) => Number(l.monto) > 0)
      .map((l) => {
        const moneda = String(l.moneda || "").toUpperCase() === "USD" ? "USD" : "ARS";
        const aplicado =
          moneda === "ARS" && Boolean(pago.pagoARSAplicadoAUSD) && cotizacionPago > 0;
        return {
          fecha: String(venta.fecha || ""),
          forma: String(l.formaPago || pago.forma || "Pago"),
          monto: moneda === "ARS" ? Number(l.monto) || 0 : 0,
          montoUSD: moneda === "USD" ? Number(l.monto) || 0 : 0,
          moneda,
          detallesPago: aplicado
            ? { tipo: "ARS_a_USD", cotizacionPago }
            : { tipo: moneda },
        };
      });
  }
  const monto = Number(pago.monto) || 0;
  const montoUSD = Number(pago.montoUSD) || 0;
  if (monto <= 0 && montoUSD <= 0) return [];
  const aplicado = Boolean(pago.pagoARSAplicadoAUSD) && cotizacionPago > 0 && monto > 0;
  return [
    {
      fecha: String(venta.fecha || ""),
      forma: String(pago.forma || "Pago"),
      monto,
      montoUSD,
      moneda: String(pago.moneda || (montoUSD > 0 ? "USD" : "ARS")),
      detallesPago: aplicado ? { tipo: "ARS_a_USD", cotizacionPago } : null,
    },
  ];
}

/** Ventas del cliente que todavía tienen saldo, para vincular un cobro posterior. */
export async function listarVentasPendientesCliente(
  negocioID: string,
  nombreCliente: string
): Promise<VentaPendienteCliente[]> {
  const nombre = String(nombreCliente || "").trim();
  if (!negocioID || !nombre) return [];

  const snap = await getDocs(
    query(collection(db, `negocios/${negocioID}/ventasGeneral`), where("cliente", "==", nombre))
  );

  const docs = [...snap.docs].sort((a, b) => {
    const ta = (a.data().timestamp as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const tb = (b.data().timestamp as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return tb - ta;
  });

  const lista: VentaPendienteCliente[] = [];
  for (const d of docs) {
    const data = d.data() as VentaComoDoc;
    let saldoARS = Math.max(0, Number(data.saldoPendienteARS) || 0);
    let saldoUSD = Math.max(0, Number(data.saldoPendienteUSD) || 0);
    const saldoAprox = Math.max(0, Number(data.saldoPendiente) || 0);
    if (saldoARS <= 0.01 && saldoUSD <= 0.01 && saldoAprox > 0.01) {
      if (String(data.moneda || "").toUpperCase() === "ARS") saldoARS = saldoAprox;
      else saldoUSD = saldoAprox;
    }
    if (saldoARS <= 0.01 && saldoUSD <= 0.01) continue;

    const { totalARS, totalUSD } = totalesVentaDoc(data);
    const nro = data.nroVenta ?? d.id.slice(-6);
    const fecha = String(data.fecha || "");
    const resumen = resumenVenta(data);
    const deuda =
      saldoARS > 0.01 || saldoUSD > 0.01
        ? fmtSaldo(saldoARS, saldoUSD)
        : "pendiente";
    lista.push({
      id: d.id,
      nroVenta: nro,
      fecha,
      resumen,
      saldoARS,
      saldoUSD,
      totalARS,
      totalUSD,
      etiqueta: `#${nro}${fecha ? ` · ${fecha}` : ""} · ${resumen} · ${deuda}`,
    });
  }
  return lista;
}

export type ImpactoPagoCliente = {
  ars: number;
  usd: number;
  detallesPago: Record<string, unknown>;
};

/**
 * Cómo impacta el cobro en la cuenta del cliente y cómo debe guardarse
 * para que el remito lo tome (en venta solo USD, los pesos cancelan dólares).
 */
export function impactoClienteDePago(opts: {
  moneda: "ARS" | "USD";
  monto: number;
  cotizacion: number;
  totalARS: number;
  totalUSD: number;
}): ImpactoPagoCliente {
  const monto = Math.max(0, Number(opts.monto) || 0);
  const cotizacion = Number(opts.cotizacion) || 0;
  const soloUSD = esVentaSoloUSD(Number(opts.totalARS) || 0, Number(opts.totalUSD) || 0);

  if (soloUSD && opts.moneda === "ARS") {
    const usd = calcularUsdDesdeARS(monto, cotizacion);
    return {
      ars: 0,
      usd: -usd,
      detallesPago: {
        tipo: "ARS_a_USD",
        montoUSDEquivalente: usd,
        montoARSOriginal: monto,
        cotizacionPago: cotizacion,
      },
    };
  }

  if (opts.moneda === "USD") {
    return { ars: 0, usd: -monto, detallesPago: { tipo: "USD" } };
  }

  return { ars: -monto, usd: 0, detallesPago: { tipo: "ARS" } };
}

/** Pagos de la venta (los del día y los posteriores) y el saldo que queda. */
export async function cargarPagosYSaldoRemito(
  negocioID: string,
  venta: VentaComoDoc
): Promise<SaldoRemito> {
  const { totalARS, totalUSD } = totalesVentaDoc(venta);
  const vinculados = await listarPagosDeVenta(
    negocioID,
    venta.nroVenta,
    venta.cliente,
    venta.id
  );

  const desdeColeccion: PagoReciboCompra[] = vinculados
    .filter((p) => {
      const forma = String(p.forma || "");
      const esEntrega = p.tipoPago === "entrega_equipo" || /entrega equipo/i.test(forma);
      return !esEntrega && (p.monto > 0 || p.montoUSD > 0);
    })
    .map((p) => ({
      fecha: p.fecha,
      forma: p.forma,
      monto: p.monto,
      montoUSD: p.montoUSD,
      moneda: p.moneda,
      observaciones: p.observaciones,
      detallesPago: p.detallesPago,
    }));

  const pagosFuente = desdeColeccion.length > 0 ? desdeColeccion : pagosEmbebidos(venta);

  const lineas = [];
  if (totalARS > 0) lineas.push({ nombre: "ARS", precio: totalARS, moneda: "ARS" });
  if (totalUSD > 0) lineas.push({ nombre: "USD", precio: totalUSD, moneda: "USD" });

  const equipos = Array.isArray(venta.telefonosComoPago)
    ? venta.telefonosComoPago
    : venta.telefonoComoPago
      ? [venta.telefonoComoPago]
      : [];
  const partePago = equipos
    .map((t) => ({
      nombre: "Parte de pago",
      precio: Number(t?.valorPago) || 0,
      moneda: String(t?.moneda || "USD"),
    }))
    .filter((t) => t.precio > 0);

  const cotizacion =
    Number(venta.pago?.cotizacionPago || venta.pago?.cotizacion || venta.cotizacionUsada) || 0;

  const { ars, usd } = resolverSaldoPendienteRecibo({
    lineas,
    partePago,
    pagos: pagosFuente,
    saldoPendienteARS: venta.saldoPendienteARS,
    saldoPendienteUSD: venta.saldoPendienteUSD,
    saldoPendiente: venta.saldoPendiente,
    monedaFallback: venta.moneda,
    cotizacion,
  });

  const cot = cotizacion > 0 ? cotizacion : 1;
  return {
    pagos: pagosFuente.map((p) => ({
      formaPago: String(p.forma || "Pago"),
      monto: Number(p.monto) || 0,
      montoUSD: Number(p.montoUSD) || 0,
      moneda: String(p.moneda || ""),
      fecha: String(p.fecha || ""),
      observaciones: String(p.observaciones || ""),
    })),
    saldoPendienteARS: ars,
    saldoPendienteUSD: usd,
    saldoAproximado: Math.max(0, Math.round((ars + usd * cot) * 100) / 100),
  };
}

/** Deja la venta (y los teléfonos del mismo número) con el saldo real después del cobro. */
export async function sincronizarVentaTrasPago(
  negocioID: string,
  ventaId: string
): Promise<void> {
  if (!negocioID || !ventaId) return;
  const ref = doc(db, `negocios/${negocioID}/ventasGeneral/${ventaId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as VentaComoDoc;
  const saldo = await cargarPagosYSaldoRemito(negocioID, { ...data, id: snap.id });
  const pagada = ventaEstaPagada(saldo.saldoPendienteARS, saldo.saldoPendienteUSD);
  const estado = pagada ? "pagado" : "pendiente";

  await updateDoc(ref, {
    saldoPendienteARS: saldo.saldoPendienteARS,
    saldoPendienteUSD: saldo.saldoPendienteUSD,
    saldoPendiente: pagada ? 0 : saldo.saldoAproximado,
    estado,
  });

  const nro = data.nroVenta;
  if (nro === undefined || nro === null || String(nro).trim() === "") return;

  const claves = new Set<string | number>([nro, String(nro)]);
  const numerico = Number(nro);
  if (!Number.isNaN(numerico)) claves.add(numerico);

  try {
    const col = collection(db, `negocios/${negocioID}/ventaTelefonos`);
    const vistos = new Set<string>();
    for (const clave of Array.from(claves)) {
      const telSnap = await getDocs(query(col, where("nroVenta", "==", clave)));
      for (const tel of telSnap.docs) {
        if (vistos.has(tel.id)) continue;
        vistos.add(tel.id);
        const indice = Number(tel.data().indiceEnVenta);
        const esPrincipal = !Number.isFinite(indice) || indice === 0;
        await updateDoc(tel.ref, {
          estado,
          ...(pagada || esPrincipal
            ? { saldoPendiente: pagada ? 0 : saldo.saldoAproximado }
            : {}),
        });
      }
    }
  } catch (error) {
    console.error("No se pudo actualizar el estado de los teléfonos de la venta:", error);
  }
}
