import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Resta del stock la cantidad de accesorios vendidos
 */
export const descontarAccesorioDelStock = async ({
  productos,
  negocioID,
}: {
  productos: any[];
  negocioID: string;
}) => {
  for (const producto of productos) {
    if (!producto.codigo) continue;

    const ref = doc(db, `negocios/${negocioID}/stockAccesorios/${producto.codigo}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) continue;

    const data = snap.data();
    const cantidadActual = data.cantidad || 0;
    const cantidadVendida = producto.cantidad || 1;
    const nuevaCantidad = Math.max(cantidadActual - cantidadVendida, 0);

    await updateDoc(ref, {
      cantidad: nuevaCantidad,
    });
  }
};
