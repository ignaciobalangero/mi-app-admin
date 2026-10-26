import { collection, doc, getDoc, getDocs } from "firebase/firestore";
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
  cajaAbierta: boolean;
};

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
    if (porUnidad && data.consignacion === true) return;
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
  const [repuestos, accesorios, telefonos, extra, cajon, cuentas] = await Promise.all([
    costoColeccion(negocioId, "stockRepuestos"),
    costoColeccion(negocioId, "stockAccesorios"),
    costoColeccion(negocioId, "stockTelefonos", true),
    costoColeccion(negocioId, "stockExtra"),
    efectivoCajon(negocioId),
    cuentasCorrientes(negocioId),
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
    cajaAbierta: cajon.cajaAbierta,
  };
}

export function totalesCapital(capital: CapitalNegocio): MontosCapital {
  return [capital.repuestos, capital.accesorios, capital.telefonos, capital.extra, capital.cajaMayor, capital.cajon, capital.cuentas].reduce(
    sumar,
    cero()
  );
}
