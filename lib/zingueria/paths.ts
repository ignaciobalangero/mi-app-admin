import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Root: Zingueria/app/{users|clientes|trabajos|materiales}/... */
const ROOT = "Zingueria";
const APP = "app";

export function zUserRef(uid: string): DocumentReference {
  return doc(db, ROOT, APP, "users", uid);
}

export function zClientesCol(): CollectionReference {
  return collection(db, ROOT, APP, "clientes");
}

export function zClienteRef(id: string): DocumentReference {
  return doc(db, ROOT, APP, "clientes", id);
}

export function zTrabajosCol(): CollectionReference {
  return collection(db, ROOT, APP, "trabajos");
}

export function zTrabajoRef(id: string): DocumentReference {
  return doc(db, ROOT, APP, "trabajos", id);
}

export function zMedidasCol(trabajoId: string): CollectionReference {
  return collection(db, ROOT, APP, "trabajos", trabajoId, "medidas");
}

export function zFotosCol(trabajoId: string): CollectionReference {
  return collection(db, ROOT, APP, "trabajos", trabajoId, "fotos");
}

export function zPagosCol(trabajoId: string): CollectionReference {
  return collection(db, ROOT, APP, "trabajos", trabajoId, "pagos");
}

export function zMaterialesCol(): CollectionReference {
  return collection(db, ROOT, APP, "materiales");
}

export function zMaterialRef(id: string): DocumentReference {
  return doc(db, ROOT, APP, "materiales", id);
}

export function zMovimientosCol(materialId: string): CollectionReference {
  return collection(db, ROOT, APP, "materiales", materialId, "movimientos");
}

export function storageFotoPath(
  uid: string,
  trabajoId: string,
  fileId: string
): string {
  return `Zingueria/${uid}/${trabajoId}/${fileId}.jpg`;
}
