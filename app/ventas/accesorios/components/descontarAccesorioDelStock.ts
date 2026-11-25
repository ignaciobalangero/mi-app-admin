// Archivo: app/ventas/accesorios/components/descontarAccesorioDelStock.ts

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { anotarDeudaConsignacionVenta } from "@/lib/proveedores/deudaConsignacionCliente";

export async function descontarAccesorioDelStock(negocioID: string, codigo: string, cantidadVendida: number) {
  try {
    const ref = doc(db, `negocios/${negocioID}/stockAccesorios`, codigo);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("❌ Producto no encontrado en el stock de accesorios");
      return;
    }

    const datos = snap.data();
    const cantidadActual = Number(datos.cantidad) || 0;
    const descontado = Math.min(Math.max(0, cantidadVendida), cantidadActual);
    const nuevaCantidad = Math.max(0, cantidadActual - descontado);

    await updateDoc(ref, { cantidad: nuevaCantidad });
    if (descontado > 0) {
      await anotarDeudaConsignacionVenta({
        negocioID,
        coleccion: "stockAccesorios",
        stockDocId: snap.id,
        data: datos,
        cantidad: descontado,
      });
    }
    console.log("✅ Stock actualizado en accesorios, nueva cantidad:", nuevaCantidad);
  } catch (error) {
    console.error("❌ Error al descontar accesorio del stock:", error);
  }
}