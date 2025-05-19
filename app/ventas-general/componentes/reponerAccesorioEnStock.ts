import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const reponerAccesoriosAlStock = async ({
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

    if (snap.exists()) {
      const data = snap.data();
      const nuevaCantidad = (data.cantidad || 0) + producto.cantidad;

      await updateDoc(ref, {
        cantidad: nuevaCantidad,
      });
    }
  }
};
