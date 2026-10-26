import { addDoc, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** La misma cotización que se carga en Venta general. */
export async function cotizacionVentaGeneral(negocioID: string): Promise<number | null> {
  if (!negocioID) return null;
  const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/moneda`));
  if (!snap.exists()) return null;
  const data = snap.data();
  const manual = Number(data.dolarManual);
  if (data.usarDolarManual && manual > 0) return manual;
  return null;
}

export type MontosCuentaProveedor = {
  monto: number;
  montoUSD: number;
  montoARSOriginal: number;
  notaConversion: string;
};

/**
 * Si el proveedor se lleva en USD y el pago entra en pesos,
 * el importe que impacta la cuenta es el equivalente en dólares.
 * El movimiento de caja sigue en la moneda en que se pagó.
 */
export function montosPagoEnCuentaProveedor(opts: {
  cuentaUSD: boolean;
  moneda: string;
  monto: number;
  cotizacion: number | null;
}): MontosCuentaProveedor | { error: string } {
  const monedaNorm = String(opts.moneda || "ARS").toUpperCase() === "USD" ? "USD" : "ARS";
  const monto = Math.round((Number(opts.monto) || 0) * 100) / 100;
  if (monto <= 0) {
    return { monto: 0, montoUSD: 0, montoARSOriginal: 0, notaConversion: "" };
  }
  if (!opts.cuentaUSD || monedaNorm === "USD") {
    return monedaNorm === "USD"
      ? { monto: 0, montoUSD: monto, montoARSOriginal: 0, notaConversion: "" }
      : { monto, montoUSD: 0, montoARSOriginal: 0, notaConversion: "" };
  }
  const cot = Number(opts.cotizacion) || 0;
  if (cot <= 0) {
    return {
      error:
        "Este proveedor se lleva en dólares. Cargá la cotización de este pago para pasar los pesos a USD.",
    };
  }
  const usd = Math.round((monto / cot) * 100) / 100;
  return {
    monto: 0,
    montoUSD: usd,
    montoARSOriginal: monto,
    notaConversion: `Pago en ARS $${monto.toLocaleString("es-AR")} aplicado a USD ${usd.toLocaleString("es-AR")} (cotización $${cot.toLocaleString("es-AR")})`,
  };
}

/** Suma el pago en la ficha del proveedor. Si la cuenta es en USD, los pesos se convierten. */
export async function registrarEnCuentaProveedor(opts: {
  negocioID: string;
  nombre: string;
  pagoARS: number;
  pagoUSD: number;
  cotizacion: number | null;
  forma: string;
  referencia: string;
  notas: string;
  fecha: string;
}) {
  const nombre = String(opts.nombre || "").trim();
  if (!opts.negocioID || !nombre) return;
  const proveedoresSnap = await getDocs(collection(db, `negocios/${opts.negocioID}/proveedores`));
  const proveedor = proveedoresSnap.docs.find((d) => d.data().nombre === nombre);
  if (!proveedor) return;

  const cuentaUSD = proveedor.data().cuentaUSD === true;
  let cotizacion = Number(opts.cotizacion) || 0;
  if (cuentaUSD && opts.pagoARS > 0 && cotizacion <= 0) {
    cotizacion = (await cotizacionVentaGeneral(opts.negocioID)) || 0;
  }
  let monto = 0;
  let montoUSD = 0;
  let montoARSOriginal = 0;
  const notas = [opts.notas];

  if (opts.pagoARS > 0) {
    const parte = montosPagoEnCuentaProveedor({
      cuentaUSD,
      moneda: "ARS",
      monto: opts.pagoARS,
      cotizacion,
    });
    if ("error" in parte) {
      alert(parte.error);
      return;
    }
    monto += parte.monto;
    montoUSD += parte.montoUSD;
    montoARSOriginal += parte.montoARSOriginal;
    if (parte.notaConversion) notas.push(parte.notaConversion);
  }
  if (opts.pagoUSD > 0) {
    const parte = montosPagoEnCuentaProveedor({
      cuentaUSD,
      moneda: "USD",
      monto: opts.pagoUSD,
      cotizacion,
    });
    if ("error" in parte) return;
    monto += parte.monto;
    montoUSD += parte.montoUSD;
  }
  if (monto <= 0 && montoUSD <= 0) return;

  await addDoc(collection(db, `negocios/${opts.negocioID}/pagosProveedores`), {
    proveedorId: proveedor.id,
    proveedorNombre: proveedor.data().nombre,
    fecha: opts.fecha,
    monto,
    montoUSD,
    montoARSOriginal,
    cotizacion: cotizacion > 0 ? cotizacion : null,
    forma: opts.forma,
    referencia: opts.referencia,
    notas: notas.filter(Boolean).join(" · "),
    fechaCreacion: new Date().toISOString(),
  });
}
