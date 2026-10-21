import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ClienteLista = {
  id: string;
  nombre: string;
  telefono: string;
  dni: string;
  direccion: string;
  email: string;
};

const CACHE_MS = 10 * 60 * 1000;
const LOTE = 250;
const memoria = new Map<string, { ts: number; lista: ClienteLista[] }>();

function clave(negocioID: string) {
  return `clientes_lista_v2_${negocioID}`;
}

function mapDoc(id: string, data: DocumentData): ClienteLista {
  return {
    id,
    nombre: String(data.nombre || "").trim(),
    telefono: String(data.telefono || ""),
    dni: String(data.dni || ""),
    direccion: String(data.direccion || ""),
    email: String(data.email || ""),
  };
}

function leerLocal(negocioID: string): ClienteLista[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(clave(negocioID));
    const ts = Number(localStorage.getItem(`${clave(negocioID)}_ts`) || 0);
    if (!raw || !ts || Date.now() - ts > CACHE_MS) return null;
    const lista = JSON.parse(raw) as ClienteLista[];
    if (!Array.isArray(lista)) return null;
    memoria.set(negocioID, { ts, lista });
    return lista;
  } catch {
    return null;
  }
}

function guardar(negocioID: string, lista: ClienteLista[]) {
  const ts = Date.now();
  memoria.set(negocioID, { ts, lista });
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(clave(negocioID), JSON.stringify(lista));
    localStorage.setItem(`${clave(negocioID)}_ts`, String(ts));
  } catch {
    /* el navegador no acepta más caché */
  }
}

export function reemplazarCacheClientes(negocioID: string, lista: ClienteLista[]) {
  guardar(negocioID, lista);
}

async function bajarDesdeFirebase(
  negocioID: string,
  onLote?: (lista: ClienteLista[]) => void
): Promise<ClienteLista[]> {
  const col = collection(db, `negocios/${negocioID}/clientes`);
  const todos: ClienteLista[] = [];
  let ultimo: QueryDocumentSnapshot<DocumentData> | null = null;

  const tomar = (docs: QueryDocumentSnapshot<DocumentData>[]) => {
    for (const d of docs) todos.push(mapDoc(d.id, d.data()));
    onLote?.(todos.slice());
  };

  try {
    while (true) {
      const q = ultimo
        ? query(col, orderBy("nombre"), startAfter(ultimo), limit(LOTE))
        : query(col, orderBy("nombre"), limit(LOTE));
      const snap = await getDocs(q);
      tomar(snap.docs);
      if (snap.size < LOTE) break;
      ultimo = snap.docs[snap.docs.length - 1] ?? null;
      if (!ultimo) break;
    }
  } catch (error) {
    console.warn("Lista de clientes sin orden, se carga completa:", error);
    todos.length = 0;
    const snap = await getDocs(col);
    tomar(snap.docs);
    todos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    onLote?.(todos.slice());
  }

  guardar(negocioID, todos);
  return todos;
}

/** Nombres livianos. Si hay caché reciente, vuelve al instante y no vuelve a leer Firebase. */
export async function cargarClientesLista(
  negocioID: string,
  onLote?: (lista: ClienteLista[]) => void,
  forzar = false
): Promise<ClienteLista[]> {
  if (!negocioID) return [];
  if (!forzar) {
    const enMemoria = memoria.get(negocioID);
    if (enMemoria && Date.now() - enMemoria.ts < CACHE_MS) {
      onLote?.(enMemoria.lista);
      return enMemoria.lista;
    }
    const local = leerLocal(negocioID);
    if (local) {
      onLote?.(local);
      return local;
    }
  }
  return bajarDesdeFirebase(negocioID, onLote);
}
