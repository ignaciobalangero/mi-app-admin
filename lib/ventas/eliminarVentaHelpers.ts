/** Helpers seguros para borrar ventas (teléfonos en grupo, anular pagos ARS→USD). */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type PagoParaAnularSaldo = {
  monto: number;
  montoUSD: number;
  moneda?: string;
  tipoPago?: string;
  excluirDeCaja?: boolean;
  detallesPago?: {
    tipo?: string;
    montoUSDEquivalente?: number;
  } | null;
};

/**
 * Deltas a SUMAR al saldo del cliente al anular pagos.
 * Respeta ARS→USD (se revirtió crédito en USD, no el monto en pesos).
 * Ignora doble conteo: un doc ARS_a_USD no suma ARS bruto.
 */
export function deltasSaldoAlAnularPagos(pagos: PagoParaAnularSaldo[]): {
  ars: number;
  usd: number;
} {
  let ars = 0;
  let usd = 0;

  for (const p of pagos) {
    const det = p.detallesPago;
    if (det?.tipo === "ARS_a_USD") {
      const eq = Number(det.montoUSDEquivalente) || 0;
      if (eq > 0) usd += eq;
      continue;
    }

    const montoARS = Number(p.monto) || 0;
    const montoUSD = Number(p.montoUSD) || 0;
    if (montoUSD > 0) usd += montoUSD;
    if (montoARS > 0) ars += montoARS;
  }

  return { ars, usd };
}

function stockTelefonoYaExiste(
  docs: { id: string; data: DocumentData }[],
  data: DocumentData,
  ventaIdIgnorar?: string
): boolean {
  const modelo = String(data.modelo ?? "").trim();
  const imei = String(data.imei ?? "").trim();
  if (!modelo && !imei) return false;
  return docs.some((d) => {
    const tel = d.data;
    if (ventaIdIgnorar && tel.ventaId === ventaIdIgnorar) return false;
    return (
      String(tel.modelo ?? "").trim() === modelo &&
      String(tel.imei ?? "").trim() === imei
    );
  });
}

async function reponerTelefonoDesdeVentaDoc(
  negocioID: string,
  data: DocumentData,
  stockActual: { id: string; data: DocumentData }[],
  ventaIdIgnorar?: string
): Promise<void> {
  if (stockTelefonoYaExiste(stockActual, data, ventaIdIgnorar)) return;

  await addDoc(collection(db, `negocios/${negocioID}/stockTelefonos`), {
    fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],
    proveedor: data.proveedor || "—",
    modelo: data.modelo || "",
    marca: data.marca || "—",
    estado: data.estado || "usado",
    bateria: data.bateria || "",
    gb: data.gb || "",
    color: data.color || "—",
    imei: data.imei || "",
    serial: data.serie || data.serial || "",
    precioCompra: data.precioCosto ?? data.precioCompra ?? 0,
    precioVenta: data.precioVenta ?? 0,
    moneda: data.moneda || "ARS",
    observaciones: data.observaciones || "",
  });
}

export type ResultadoGrupoTelefonos = {
  /** Id del doc ventaTelefonos con indice 0 (suele ser el id de ventasGeneral). */
  ventaGeneralId: string | null;
  nroVenta: string;
  idsBorrados: string[];
  cantidadRepuestos: number;
};

/**
 * Repone a stock y borra TODOS los ventaTelefonos del mismo nroVenta
 * (ventas multi-equipo). Si solo hay id, resuelve el grupo por nroVenta.
 */
export async function reponerYBorrarGrupoVentaTelefonos(
  negocioID: string,
  opts: {
    nroVenta?: unknown;
    ventaTelefonosId?: string;
    /** Id de ventasGeneral / venta a ignorar al chequear duplicados parte-de-pago */
    ventaIdIgnorarPartePago?: string;
  }
): Promise<ResultadoGrupoTelefonos> {
  const col = collection(db, `negocios/${negocioID}/ventaTelefonos`);
  const porId = new Map<string, DocumentData>();

  let nro = String(opts.nroVenta ?? "").trim();
  const idInicial = String(opts.ventaTelefonosId ?? "").trim();

  if (idInicial) {
    const snap = await getDoc(doc(db, `negocios/${negocioID}/ventaTelefonos/${idInicial}`));
    if (snap.exists()) {
      porId.set(snap.id, snap.data());
      if (!nro) nro = String(snap.data()?.nroVenta ?? "").trim();
    }
  }

  if (nro) {
    const claves = new Set<string | number>([nro]);
    const num = Number(nro);
    if (!Number.isNaN(num)) {
      claves.add(num);
      claves.add(String(num));
    }
    for (const clave of Array.from(claves)) {
      const snap = await getDocs(query(col, where("nroVenta", "==", clave)));
      snap.docs.forEach((d) => porId.set(d.id, d.data()));
    }
  }

  const docs = Array.from(porId.entries()).map(([id, data]) => ({ id, data }));
  docs.sort(
    (a, b) => Number(a.data.indiceEnVenta || 0) - Number(b.data.indiceEnVenta || 0)
  );

  const stockSnap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
  const stockActual = stockSnap.docs.map((d) => ({ id: d.id, data: d.data() }));

  let cantidadRepuestos = 0;
  const idsBorrados: string[] = [];
  const ventaIdIgnorar = opts.ventaIdIgnorarPartePago || idInicial || undefined;

  for (const item of docs) {
    const yaEstaba = stockTelefonoYaExiste(stockActual, item.data, ventaIdIgnorar);
    if (!yaEstaba) {
      await reponerTelefonoDesdeVentaDoc(
        negocioID,
        item.data,
        stockActual,
        ventaIdIgnorar
      );
      stockActual.push({
        id: `nuevo-${item.id}`,
        data: { modelo: item.data.modelo, imei: item.data.imei },
      });
      cantidadRepuestos += 1;
    }
    await deleteDoc(doc(db, `negocios/${negocioID}/ventaTelefonos/${item.id}`));
    idsBorrados.push(item.id);
  }

  const primero =
    docs.find((d) => Number(d.data.indiceEnVenta || 0) === 0)?.id ||
    docs[0]?.id ||
    null;

  return {
    ventaGeneralId: primero,
    nroVenta: nro,
    idsBorrados,
    cantidadRepuestos,
  };
}

/** Busca ventasGeneral por nroVenta (tipo teléfono) si no coincide el id directo. */
export async function resolverVentaGeneralTelefono(
  negocioID: string,
  opts: { ventaId?: string; nroVenta?: string }
): Promise<{ id: string; data: DocumentData } | null> {
  const id = String(opts.ventaId ?? "").trim();
  if (id) {
    const snap = await getDoc(doc(db, `negocios/${negocioID}/ventasGeneral/${id}`));
    if (snap.exists()) return { id: snap.id, data: snap.data() };
  }

  const nro = String(opts.nroVenta ?? "").trim();
  if (!nro) return null;

  const col = collection(db, `negocios/${negocioID}/ventasGeneral`);
  const claves = new Set<string | number>([nro]);
  const num = Number(nro);
  if (!Number.isNaN(num)) {
    claves.add(num);
    claves.add(String(num));
  }

  for (const clave of Array.from(claves)) {
    const snap = await getDocs(query(col, where("nroVenta", "==", clave)));
    const hit =
      snap.docs.find((d) => d.data()?.tipo === "telefono") || snap.docs[0];
    if (hit) return { id: hit.id, data: hit.data() };
  }
  return null;
}
