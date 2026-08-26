import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Colecciones donde el cliente se guarda como campo de texto `cliente`. */
export const COLECCIONES_CLIENTE_TEXTO = [
  "trabajos",
  "pagos",
  "ventasGeneral",
  "ventaTelefonos",
  "ventaAccesorios",
] as const;

export type ColeccionClienteTexto = (typeof COLECCIONES_CLIENTE_TEXTO)[number];

export type ConteoPorColeccion = Record<string, number>;

export type ResultadoRenombrarCliente = {
  total: number;
  porColeccion: ConteoPorColeccion;
};

const BATCH_LIMIT = 450;

async function refsConCliente(
  negocioID: string,
  coleccion: string,
  nombreExacto: string
): Promise<DocumentReference[]> {
  const snap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/${coleccion}`),
      where("cliente", "==", nombreExacto)
    )
  );
  return snap.docs.map((d) => d.ref);
}

/**
 * Cuenta (sin modificar) cuántos docs tienen `cliente === nombreExacto`
 * en cada colección del negocio.
 */
export async function previsualizarRenombrarCliente(
  negocioID: string,
  nombreExacto: string
): Promise<ResultadoRenombrarCliente> {
  const nid = String(negocioID ?? "").trim();
  if (!nid || nombreExacto === "") {
    return { total: 0, porColeccion: {} };
  }

  const porColeccion: ConteoPorColeccion = {};
  let total = 0;

  const errores: string[] = [];

  for (const col of COLECCIONES_CLIENTE_TEXTO) {
    try {
      const refs = await refsConCliente(nid, col, nombreExacto);
      porColeccion[col] = refs.length;
      total += refs.length;
    } catch (e) {
      porColeccion[col] = 0;
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`${col}: ${msg}`);
    }
  }

  if (errores.length === COLECCIONES_CLIENTE_TEXTO.length) {
    throw new Error(
      `No se pudo leer el negocio "${nid}". Revisá el negocioID o permisos. Detalle: ${errores[0]}`
    );
  }

  return { total, porColeccion };
}

/**
 * Renombra el campo `cliente` en trabajos, pagos, ventas, etc. de UN negocio.
 * La comparación es exacta (incluye espacios al final). No toca otros negocios.
 */
export async function renombrarClienteEnSistema(
  negocioID: string,
  nombreAnterior: string,
  nombreNuevo: string
): Promise<ResultadoRenombrarCliente> {
  const nid = String(negocioID ?? "").trim();
  if (!nid) throw new Error("Falta negocioID");
  if (nombreAnterior === "") throw new Error("Falta el nombre anterior");
  if (nombreNuevo === "") throw new Error("Falta el nombre nuevo");
  if (nombreAnterior === nombreNuevo) {
    return { total: 0, porColeccion: {} };
  }

  const porColeccion: ConteoPorColeccion = {};
  let total = 0;
  const pendientes: DocumentReference[] = [];

  for (const col of COLECCIONES_CLIENTE_TEXTO) {
    try {
      const refs = await refsConCliente(nid, col, nombreAnterior);
      porColeccion[col] = refs.length;
      total += refs.length;
      pendientes.push(...refs);
    } catch {
      porColeccion[col] = 0;
    }
  }

  for (let i = 0; i < pendientes.length; i += BATCH_LIMIT) {
    const chunk = pendientes.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.update(ref, { cliente: nombreNuevo });
    }
    await batch.commit();
  }

  return { total, porColeccion };
}

/**
 * Opcional: si existe una ficha en `clientes` con `nombre === nombreAnterior`,
 * actualiza también ese campo (no borra ni fusiona fichas).
 */
export async function renombrarFichaClienteSiExiste(
  negocioID: string,
  nombreAnterior: string,
  nombreNuevo: string
): Promise<number> {
  const nid = String(negocioID ?? "").trim();
  if (!nid || nombreAnterior === "" || nombreAnterior === nombreNuevo) return 0;

  const snap = await getDocs(
    query(
      collection(db, `negocios/${nid}/clientes`),
      where("nombre", "==", nombreAnterior)
    )
  );

  let n = 0;
  for (const d of snap.docs) {
    await updateDoc(d.ref, { nombre: nombreNuevo });
    n++;
  }
  return n;
}
