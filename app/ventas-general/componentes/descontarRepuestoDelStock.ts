import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";

/**
 * Resta del stock un repuesto según código y cantidad.
 * Busca en stockRepuestos y stockExtra (misma lógica que al reponer).
 */
export async function descontarRepuestoDelStock(
  negocioID: string,
  codigo: string,
  cantidadVendida: number
) {
  if (!codigo) return;

  const colecciones = ["stockRepuestos", "stockExtra"];

  for (const colName of colecciones) {
    const q = query(
      collection(db, `negocios/${negocioID}/${colName}`),
      where("codigo", "==", codigo)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docRef = snap.docs[0];
      const cantidadActual = Number(docRef.data().cantidad) || 0;
      await updateDoc(docRef.ref, {
        cantidad: Math.max(0, cantidadActual - cantidadVendida),
      });
      return;
    }
  }

  const refExtra = doc(db, `negocios/${negocioID}/stockExtra/${codigo}`);
  const snapExtra = await getDoc(refExtra);
  if (snapExtra.exists()) {
    const cantidadActual = Number(snapExtra.data().cantidad) || 0;
    await updateDoc(refExtra, {
      cantidad: Math.max(0, cantidadActual - cantidadVendida),
    });
  }
}
