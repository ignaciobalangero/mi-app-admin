import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const reponerAccesoriosAlStock = async ({
  productos,
  negocioID,
}: {
  productos: any[];
  negocioID: string;
}) => {
  console.log("REPONIENDO:", productos);

  for (const producto of productos) {
    if (!producto.codigo || typeof producto.cantidad !== "number") {
      console.log("❌ Producto inválido:", producto);
      continue;
    }
  
    const ref = doc(db, `negocios/${negocioID}/stockAccesorios/${producto.codigo}`);
    const snap = await getDoc(ref);
  
    if (!snap.exists()) {
      console.log("❌ No existe en stock:", producto.codigo);
      continue;
    }
  
    const data = snap.data();
    const nuevaCantidad = (data.cantidad || 0) + producto.cantidad;
  
    console.log(`✅ Sumando ${producto.cantidad} a ${producto.codigo}, nueva cantidad: ${nuevaCantidad}`);
  
    await updateDoc(ref, {
      cantidad: nuevaCantidad,
    });
  }
  
};
