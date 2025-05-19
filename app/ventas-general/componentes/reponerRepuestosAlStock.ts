// lib/stock/reponerRepuestosAlStock.ts
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function reponerRepuestosAlStock({
  productos,
  negocioID,
}: {
  productos: any[];
  negocioID: string;
}) {
  for (const p of productos) {
    if (!p.codigo || !p.cantidad) continue;

    const ref = doc(db, `negocios/${negocioID}/stockExtra/${p.codigo}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        cantidad: increment(p.cantidad),
      });
    }
  }
}
