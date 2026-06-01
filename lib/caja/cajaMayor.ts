import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MovimientoCajaMayor } from "@/lib/caja/cajaTypes";
import { fechaCajaHoy } from "@/lib/caja/fechaCaja";

export type RegistrarMovimientoCajaMayorParams = Omit<
  MovimientoCajaMayor,
  "id" | "timestamp" | "esAnulado" | "fecha"
> & { negocioId: string; fecha?: string };

export async function registrarMovimientoCajaMayor(
  params: RegistrarMovimientoCajaMayorParams
): Promise<string> {
  const { negocioId, ...rest } = params;
  const payload: Omit<MovimientoCajaMayor, "id"> = {
    ...rest,
    fecha: rest.fecha ?? fechaCajaHoy(),
    timestamp: serverTimestamp() as unknown as Date,
    esAnulado: false,
  };
  const ref = await addDoc(
    collection(db, `negocios/${negocioId}/cajaMayorMovimientos`),
    payload
  );
  return ref.id;
}

export async function listarMovimientosCajaMayor(
  negocioId: string,
  limite = 200
): Promise<MovimientoCajaMayor[]> {
  const snap = await getDocs(
    query(
      collection(db, `negocios/${negocioId}/cajaMayorMovimientos`),
      orderBy("timestamp", "desc")
    )
  );
  return snap.docs.slice(0, limite).map((d) => ({ id: d.id, ...d.data() } as MovimientoCajaMayor));
}

export async function calcularSaldoCajaMayor(negocioId: string): Promise<{ ARS: number; USD: number }> {
  const cfg = await getDoc(doc(db, `negocios/${negocioId}/configuracion/cajaMayor`));
  let baseARS = 0;
  let baseUSD = 0;
  if (cfg.exists()) {
    baseARS = Number(cfg.data().saldoARS ?? 0);
    baseUSD = Number(cfg.data().saldoUSD ?? 0);
  }

  const movs = await listarMovimientosCajaMayor(negocioId, 5000);
  let deltaARS = 0;
  let deltaUSD = 0;
  for (const m of movs) {
    if (m.esAnulado) continue;
    const sign = m.tipo === "ingreso" ? 1 : -1;
    deltaARS += sign * (m.montoARS || 0);
    deltaUSD += sign * (m.montoUSD || 0);
  }

  return { ARS: baseARS + deltaARS, USD: baseUSD + deltaUSD };
}

export async function transferirDesdeCajaMayor(params: {
  negocioId: string;
  montoARS: number;
  descripcion: string;
  sesionId: string;
  usuario: string;
  usuarioId: string;
}): Promise<void> {
  await registrarMovimientoCajaMayor({
    negocioId: params.negocioId,
    tipo: "egreso",
    categoria: "transferencia_caja_diaria",
    montoARS: params.montoARS,
    descripcion: params.descripcion,
    origen: "manual",
    sesionId: params.sesionId,
    usuario: params.usuario,
    usuarioId: params.usuarioId,
  });
}
