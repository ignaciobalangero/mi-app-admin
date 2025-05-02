// Archivo: app/ventas/accesorios/components/descontarAccesorioDelStock.ts

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function descontarAccesorioDelStock(negocioID: string, codigo: string, cantidadVendida: number) {
  try {
    const ref = doc(db, `negocios/${negocioID}/stockAccesorios`, codigo);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("❌ Producto no encontrado en el stock de accesorios");
      return;
    }

    const datos = snap.data();
    const cantidadActual = datos.cantidad || 0;
    const nuevaCantidad = cantidadActual - cantidadVendida;

    await updateDoc(ref, { cantidad: nuevaCantidad });
    console.log("✅ Stock actualizado en accesorios, nueva cantidad:", nuevaCantidad);
  } catch (error) {
    console.error("❌ Error al descontar accesorio del stock:", error);
  }
}