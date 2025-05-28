import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Resta del stock un accesorio según código y cantidad
 */
export const descontarAccesorioDelStock = async (
  negocioID: string,
  codigo: string,
  cantidadVendida: number
) => {
  if (!codigo) return;

  const ref = doc(db, `negocios/${negocioID}/stockAccesorios/${codigo}`);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();
  const cantidadActual = data.cantidad || 0;
  const nuevaCantidad = Math.max(cantidadActual - cantidadVendida, 0);

  await updateDoc(ref, {
    cantidad: nuevaCantidad,
  });
};
