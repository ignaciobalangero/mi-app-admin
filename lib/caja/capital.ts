import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  calcularEsperadoUsdBilleteFisico,
  calcularResumenCajaDia,
} from "@/lib/caja/calcularResumenDia";
import { obtenerSesionAbierta } from "@/lib/caja/sesionCaja";

export type MontosCapital = { ars: number; usd: number };

export type CapitalNegocio = {
  repuestos: MontosCapital;
  accesorios: MontosCapital;
  telefonos: MontosCapital;
  extra: MontosCapital;
  cajaMayor: MontosCapital;
  cajon: MontosCapital;
  cuentas: MontosCapital;
  /** Positivo: lo que el negocio les debe. Se resta del capital. */
  proveedores: MontosCapital;
  cajaAbierta: boolean;
};

export type PosicionCapital = {
  usd: number;
  efectivoARS: number;
  cryptoUSD: number;
};

export const posicionVacia = (): PosicionCapital => ({ usd: 0, efectivoARS: 0, cryptoUSD: 0 });

function redondear(n: number) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export async function leerPosicionCapital(negocioId: string): Promise<PosicionCapital> {
  const snap = await getDoc(doc(db, `negocios/${negocioId}/configuracion/posicionCapital`));
  if (!snap.exists()) return posicionVacia();
  const data = snap.data();
  return {
    usd: redondear(Number(data.usd || 0)),
    efectivoARS: redondear(Number(data.efectivoARS || 0)),
    cryptoUSD: redondear(Number(data.cryptoUSD || 0)),
  };
}

export async function guardarPosicionCapital(negocioId: string, posicion: PosicionCapital) {
  const monto = (n: number) => redondear(Math.max(0, Number(n) || 0));
  const limpia = {
    usd: monto(posicion.usd),
    efectivoARS: monto(posicion.efectivoARS),
    cryptoUSD: monto(posicion.cryptoUSD),
  };
  await setDoc(doc(db, `negocios/${negocioId}/configuracion/posicionCapital`), limpia, { merge: true });
  return limpia;
}

export const CLAVES_CAPITAL = [
  "repuestos",
  "accesorios",
  "telefonos",
  "extra",
  "cajaMayor",
  "cajaDia",
  "efectivo",
  "usd",
  "cripto",
  "cuentas",
  "proveedores",
] as const;

export type ClaveCapital = (typeof CLAVES_CAPITAL)[number];
export type InclusionCapital = Record<ClaveCapital, boolean>;

export function inclusionInicial(): InclusionCapital {
  return {
    repuestos: true,
    accesorios: true,
    telefonos: true,
    extra: true,
    cajaMayor: true,
    cajaDia: false,
    efectivo: true,
    usd: true,
    cripto: true,
    cuentas: true,
    proveedores: true,
  };
}

export async function leerInclusionCapital(negocioId: string): Promise<InclusionCapital> {
  const snap = await getDoc(doc(db, `negocios/${negocioId}/configuracion/posicionCapital`));
  const base = inclusionInicial();
  const guardada = snap.exists() ? snap.data().incluir : null;
  if (!guardada || typeof guardada !== "object") return base;
  for (const clave of CLAVES_CAPITAL) {
    if (typeof guardada[clave] === "boolean") base[clave] = guardada[clave];
  }
  return base;
}

export async function guardarInclusionCapital(negocioId: string, inclusion: InclusionCapital) {
  await setDoc(
    doc(db, `negocios/${negocioId}/configuracion/posicionCapital`),
    { incluir: inclusion },
    { merge: true }
  );
}

const cero = (): MontosCapital => ({ ars: 0, usd: 0 });

function sumar(a: MontosCapital, b: MontosCapital): MontosCapital {
  return {
    ars: Math.round((a.ars + b.ars) * 100) / 100,
    usd: Math.round((a.usd + b.usd) * 100) / 100,
  };
}

function acumularCosto(
  destino: MontosCapital,
  data: Record<string, unknown>,
  cantidadFija?: number
) {
  const moneda = String(data.moneda || "ARS").toUpperCase() === "USD" ? "USD" : "ARS";
  const costo = Number(data.precioCosto ?? data.precioCompra ?? 0);
  const cantidad =
    cantidadFija != null
      ? cantidadFija
      : data.cantidad == null || data.cantidad === ""
        ? 1
        : Number(data.cantidad);
  if (!(costo > 0) || !(cantidad > 0)) return;
  const total = Math.round(costo * cantidad * 100) / 100;
  if (moneda === "USD") destino.usd += total;
  else destino.ars += total;
}

async function costoColeccion(negocioId: string, coleccion: string, porUnidad = false) {
  const destino = cero();
  const snap = await getDocs(collection(db, `negocios/${negocioId}/${coleccion}`));
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.consignacion === true) return;
    acumularCosto(destino, data, porUnidad ? 1 : undefined);
  });
  destino.ars = Math.round(destino.ars * 100) / 100;
  destino.usd = Math.round(destino.usd * 100) / 100;
  return destino;
}

/** Efectivo que todavía está en el cajón del día, no en la caja mayor. */
async function efectivoCajon(negocioId: string): Promise<{ montos: MontosCapital; cajaAbierta: boolean }> {
  const sesion = await obtenerSesionAbierta(negocioId);
  if (sesion) {
    const resumen = await calcularResumenCajaDia({
      negocioId,
      fecha: sesion.fecha,
      sesionId: sesion.id,
      saldoInicialARS: Number(sesion.saldoInicialARS || 0),
      saldoInicialUSD: Number(sesion.saldoInicialUSD || 0),
    });
    return {
      cajaAbierta: true,
      montos: {
        ars: Math.round((Number(resumen.medios.efectivo_ars || 0) + Number(resumen.saldoInicialARS || 0)) * 100) / 100,
        usd: Math.round(calcularEsperadoUsdBilleteFisico(resumen) * 100) / 100,
      },
    };
  }

  const cfg = await getDoc(doc(db, `negocios/${negocioId}/configuracion/caja`));
  const data = cfg.exists() ? cfg.data() : {};
  return {
    cajaAbierta: false,
    montos: {
      ars: Math.round(Number(data.efectivoARS || 0) * 100) / 100,
      usd: Math.round(Number(data.efectivoUSD || 0) * 100) / 100,
    },
  };
}

/** Misma cuenta que en cada proveedor: compras menos pagos, pesos y dólares aparte. */
async function deudaProveedores(negocioId: string): Promise<MontosCapital> {
  const [comprasSnap, pagosSnap] = await Promise.all([
    getDocs(collection(db, `negocios/${negocioId}/compras`)),
    getDocs(collection(db, `negocios/${negocioId}/pagosProveedores`)),
  ]);
  const destino = cero();
  comprasSnap.docs.forEach((d) => {
    const data = d.data();
    const monto = Number(data.montoTotal || 0);
    if (data.moneda === "USD") destino.usd += monto;
    else if (data.moneda === "ARS") destino.ars += monto;
  });
  pagosSnap.docs.forEach((d) => {
    const data = d.data();
    destino.ars -= Number(data.monto || 0);
    destino.usd -= Number(data.montoUSD || 0);
  });
  destino.ars = Math.round(destino.ars * 100) / 100;
  destino.usd = Math.round(destino.usd * 100) / 100;
  return destino;
}

async function cuentasCorrientes(negocioId: string): Promise<MontosCapital> {
  const snap = await getDocs(collection(db, `negocios/${negocioId}/clientes`));
  const destino = cero();
  snap.docs.forEach((d) => {
    destino.ars += Number(d.data().saldoARS || 0);
    destino.usd += Number(d.data().saldoUSD || 0);
  });
  destino.ars = Math.round(destino.ars * 100) / 100;
  destino.usd = Math.round(destino.usd * 100) / 100;
  return destino;
}

export async function calcularCapital(
  negocioId: string,
  cajaMayor: MontosCapital
): Promise<CapitalNegocio> {
  const [repuestos, accesorios, telefonos, extra, cajon, cuentas, proveedores] = await Promise.all([
    costoColeccion(negocioId, "stockRepuestos"),
    costoColeccion(negocioId, "stockAccesorios"),
    costoColeccion(negocioId, "stockTelefonos", true),
    costoColeccion(negocioId, "stockExtra"),
    efectivoCajon(negocioId),
    cuentasCorrientes(negocioId),
    deudaProveedores(negocioId),
  ]);

  return {
    repuestos,
    accesorios,
    telefonos,
    extra,
    cajaMayor: {
      ars: Math.round(Number(cajaMayor.ars || 0) * 100) / 100,
      usd: Math.round(Number(cajaMayor.usd || 0) * 100) / 100,
    },
    cajon: cajon.montos,
    cuentas,
    proveedores,
    cajaAbierta: cajon.cajaAbierta,
  };
}

export function totalesCapital(capital: CapitalNegocio): MontosCapital {
  const enElNegocio = [capital.repuestos, capital.accesorios, capital.telefonos, capital.extra, capital.cajaMayor, capital.cajon, capital.cuentas].reduce(
    sumar,
    cero()
  );
  return {
    ars: Math.round((enElNegocio.ars - capital.proveedores.ars) * 100) / 100,
    usd: Math.round((enElNegocio.usd - capital.proveedores.usd) * 100) / 100,
  };
}
