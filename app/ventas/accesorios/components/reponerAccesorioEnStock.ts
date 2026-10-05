import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Reponer stock de accesorio (por id=codigo o por campo codigo). */
export async function reponerAccesorioEnStock(
  negocioID: string,
  codigo: string,
  cantidad: number
) {
  if (!negocioID || !codigo || cantidad <= 0) return;

  const porId = doc(db, `negocios/${negocioID}/stockAccesorios`, codigo);
  const snapId = await getDoc(porId);
  if (snapId.exists()) {
    const actual = Number(snapId.data()?.cantidad || 0);
    await updateDoc(porId, { cantidad: actual + cantidad });
    return;
  }

  const q = query(
    collection(db, `negocios/${negocioID}/stockAccesorios`),
    where("codigo", "==", codigo)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    console.warn("No se encontró accesorio para reponer:", codigo);
    return;
  }
  const ref = snap.docs[0].ref;
  const actual = Number(snap.docs[0].data()?.cantidad || 0);
  await updateDoc(ref, { cantidad: actual + cantidad });
}
