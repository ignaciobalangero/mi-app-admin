import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Resta del stock un repuesto según código y cantidad
 */
export async function descontarRepuestoDelStock(
  negocioID: string,
  codigo: string,
  cantidadVendida: number
) {
  if (!codigo) return;

  const ref = doc(db, `negocios/${negocioID}/stockExtra/${codigo}`);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();
  const cantidadActual = data.cantidad || 0;
  const nuevaCantidad = Math.max(cantidadActual - cantidadVendida, 0);

  await updateDoc(ref, {
    cantidad: nuevaCantidad,
  });
}
