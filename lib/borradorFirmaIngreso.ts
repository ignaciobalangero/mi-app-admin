import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generarTokenPublicoTrabajo } from "@/lib/trabajosFotos";

export type BorradorFirmaIngreso = {
  trabajoFirebaseId: string;
  tokenPublico: string;
};

/** Crea un trabajo borrador en Firebase para que el iPad pueda firmar antes de guardar la orden completa. */
export async function crearBorradorFirmaIngreso(
  negocioID: string,
  opts: {
    nroOrden: string;
    cliente: string;
    idTrabajo: string;
    tokenPublico: string;
  }
): Promise<BorradorFirmaIngreso> {
  const ref = await addDoc(collection(db, `negocios/${negocioID}/trabajos`), {
    id: opts.idTrabajo,
    nroOrden: opts.nroOrden,
    cliente: opts.cliente,
    modelo: "",
    trabajo: "",
    estado: "BORRADOR_INGRESO",
    esBorradorIngreso: true,
    tokenPublico: opts.tokenPublico,
    creadoEn: serverTimestamp(),
  });

  return { trabajoFirebaseId: ref.id, tokenPublico: opts.tokenPublico };
}

export async function eliminarBorradorFirmaIngreso(
  negocioID: string,
  firebaseId: string
): Promise<void> {
  if (!firebaseId) return;
  try {
    const snap = await getDoc(doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`));
    if (snap.exists() && snap.data()?.esBorradorIngreso) {
      await deleteDoc(snap.ref);
    }
  } catch (e) {
    console.warn("No se pudo eliminar borrador de firma:", e);
  }
}

export function nuevoTokenPublicoIngreso(): string {
  return generarTokenPublicoTrabajo();
}
