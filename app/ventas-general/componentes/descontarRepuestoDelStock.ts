// archivo: /ventas-general/componentes/descontarRepuestoDelStock.ts

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface Repuesto {
  codigo: string;
  cantidad: number;
}

export async function descontarRepuestoDelStock({
  productos,
  negocioID,
}: {
  productos: Repuesto[];
  negocioID: string;
}) {
  for (const p of productos) {
    if (!p.codigo) continue;

    const ref = doc(db, `negocios/${negocioID}/stockExtra`, p.codigo);
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;

    const data = snap.data();
    const nuevaCantidad = (data.cantidad || 0) - p.cantidad;

    await updateDoc(ref, {
      cantidad: nuevaCantidad >= 0 ? nuevaCantidad : 0,
    });
  }
}
