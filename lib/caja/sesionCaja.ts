import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ArqueoMedioPago, SesionCaja } from "@/lib/caja/cajaTypes";
import { docIdDesdeFecha, fechaCajaHoy } from "@/lib/caja/fechaCaja";
import { registrarMovimientoCajaMayor } from "@/lib/caja/cajaMayor";

function sesionesRef(negocioId: string) {
  return collection(db, `negocios/${negocioId}/sesionesCaja`);
}

export async function obtenerSesionAbierta(negocioId: string): Promise<SesionCaja | null> {
  const q = query(sesionesRef(negocioId), where("estado", "==", "abierta"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as SesionCaja;
}

export async function obtenerSesionDelDia(
  negocioId: string,
  fecha: string = fechaCajaHoy()
): Promise<SesionCaja | null> {
  const q = query(sesionesRef(negocioId), where("fecha", "==", fecha), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as SesionCaja;
}

export async function obtenerUltimoCierreSaldo(negocioId: string): Promise<number> {
  const cierresSnap = await getDocs(
    query(collection(db, `negocios/${negocioId}/cierresCaja`), orderBy("fechaCierre", "desc"), limit(1))
  );
  if (cierresSnap.empty) {
    const cfg = await getDoc(doc(db, `negocios/${negocioId}/configuracion/caja`));
    if (cfg.exists()) return Number(cfg.data().efectivoARS ?? 0);
    return 0;
  }
  const data = cierresSnap.docs[0].data();
  return Number(data.fondoSiguienteDiaARS ?? data.efectivoRealARS ?? 0);
}

export async function abrirSesionCaja(params: {
  negocioId: string;
  saldoInicialARS: number;
  saldoInicialUSD: number;
  usuario: string;
  usuarioId: string;
  notas?: string;
}): Promise<SesionCaja> {
  const abierta = await obtenerSesionAbierta(params.negocioId);
  if (abierta) {
    throw new Error("Ya hay una caja abierta sin cerrar. Cerrala antes de abrir otra.");
  }

  const fecha = fechaCajaHoy();
  const existente = await obtenerSesionDelDia(params.negocioId, fecha);
  if (existente?.estado === "cerrada") {
    throw new Error("La caja de hoy ya fue cerrada. No se puede reabrir el mismo día.");
  }

  const saldoAnterior = await obtenerUltimoCierreSaldo(params.negocioId);
  const docId = docIdDesdeFecha(fecha);

  const sesion: Omit<SesionCaja, "id"> = {
    fecha,
    horaApertura: serverTimestamp() as unknown as Date,
    usuarioApertura: params.usuario,
    usuarioAperturaId: params.usuarioId,
    saldoInicialARS: params.saldoInicialARS,
    saldoInicialUSD: params.saldoInicialUSD,
    saldoAnteriorCierreARS: saldoAnterior,
    estado: "abierta",
    notas: params.notas?.trim() || "",
  };

  await setDoc(doc(db, `negocios/${params.negocioId}/sesionesCaja/${docId}`), sesion);
  return { id: docId, ...sesion };
}

export async function cerrarSesionCaja(params: {
  negocioId: string;
  sesionId: string;
  totales: {
    saldoFinalEsperadoARS: number;
    saldoFinalContadoARS: number;
    diferenciaARS: number;
    diferenciaUSD: number;
    fondoSiguienteDiaARS: number;
    enviadoCajaMayorARS: number;
    arqueo: ArqueoMedioPago[];
    arqueoJustificacion: string;
    resumenCierre: Record<string, unknown>;
  };
  usuario: string;
  usuarioId: string;
}): Promise<string> {
  const sesionRef = doc(db, `negocios/${params.negocioId}/sesionesCaja/${params.sesionId}`);
  const sesionSnap = await getDoc(sesionRef);
  if (!sesionSnap.exists()) throw new Error("Sesión de caja no encontrada.");
  const sesion = sesionSnap.data() as SesionCaja;
  if (sesion.estado === "cerrada") throw new Error("Esta caja ya está cerrada.");

  const cierreId = params.sesionId;
  const cierreDoc = {
    fecha: sesion.fecha,
    sesionId: params.sesionId,
    efectivoEsperadoARS: params.totales.saldoFinalEsperadoARS,
    efectivoEsperadoUSD: 0,
    efectivoRealARS: params.totales.saldoFinalContadoARS,
    efectivoRealUSD: 0,
    diferenciaARS: params.totales.diferenciaARS,
    diferenciaUSD: params.totales.diferenciaUSD,
    fondoSiguienteDiaARS: params.totales.fondoSiguienteDiaARS,
    enviadoCajaMayorARS: params.totales.enviadoCajaMayorARS,
    arqueo: params.totales.arqueo,
    arqueoJustificacion: params.totales.arqueoJustificacion,
    saldoInicialARS: sesion.saldoInicialARS,
    saldoInicialUSD: sesion.saldoInicialUSD,
    usuarioApertura: sesion.usuarioApertura,
    usuarioCierre: params.usuario,
    observaciones: sesion.notas || "",
    cerradoPor: params.usuario,
    fechaCierre: serverTimestamp(),
    bloqueado: true,
    ...params.totales.resumenCierre,
  };

  await setDoc(doc(db, `negocios/${params.negocioId}/cierresCaja/${cierreId}`), cierreDoc);

  await setDoc(
    sesionRef,
    {
      estado: "cerrada",
      horaCierre: serverTimestamp(),
      usuarioCierre: params.usuario,
      usuarioCierreId: params.usuarioId,
      saldoFinalEsperadoARS: params.totales.saldoFinalEsperadoARS,
      saldoFinalContadoARS: params.totales.saldoFinalContadoARS,
      diferenciaARS: params.totales.diferenciaARS,
      diferenciaUSD: params.totales.diferenciaUSD,
      fondoSiguienteDiaARS: params.totales.fondoSiguienteDiaARS,
      enviadoCajaMayorARS: params.totales.enviadoCajaMayorARS,
      arqueo: params.totales.arqueo,
      arqueoJustificacion: params.totales.arqueoJustificacion,
      cierreId,
    },
    { merge: true }
  );

  if (params.totales.enviadoCajaMayorARS > 0) {
    await registrarMovimientoCajaMayor({
      negocioId: params.negocioId,
      tipo: "ingreso",
      categoria: "cierre_diario",
      montoARS: params.totales.enviadoCajaMayorARS,
      descripcion: `Cierre caja ${sesion.fecha} — traslado a Caja Mayor`,
      origen: "cierre_diario",
      sesionId: params.sesionId,
      usuario: params.usuario,
      usuarioId: params.usuarioId,
      fecha: sesion.fecha,
    });
  }

  await setDoc(
    doc(db, `negocios/${params.negocioId}/configuracion/caja`),
    {
      efectivoARS: params.totales.fondoSiguienteDiaARS,
      efectivoUSD: sesion.saldoInicialUSD,
      ultimaActualizacion: serverTimestamp(),
    },
    { merge: true }
  );

  return cierreId;
}
