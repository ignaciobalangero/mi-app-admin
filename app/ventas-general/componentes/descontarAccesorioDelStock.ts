import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { anotarDeudaConsignacionVenta } from "@/lib/proveedores/deudaConsignacionCliente";

/**
 * Resta del stock un accesorio según código y cantidad
 */
export const descontarAccesorioDelStock = async (
  negocioID: string,
  codigo: string,
  cantidadVendida: number
) => {
  if (!codigo) return;

  console.log('🔍 Buscando accesorio con código:', codigo);

  // ✅ QUERY OPTIMIZADO - Solo busca documentos con este código específico
  const stockRef = collection(db, `negocios/${negocioID}/stockAccesorios`);
  const q = query(stockRef, where("codigo", "==", codigo));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('❌ No se encontró accesorio con código:', codigo);
    return;
  }

  // Tomar el primer documento encontrado
  const documentoEncontrado = snapshot.docs[0];
  const data = documentoEncontrado.data();

  console.log('✅ Accesorio encontrado:', data);

  const cantidadActual = Number(data.cantidad) || 0;
  const descontado = Math.min(Math.max(0, cantidadVendida), cantidadActual);
  const nuevaCantidad = Math.max(cantidadActual - descontado, 0);

  console.log('📊 Descuento de stock:', {
    codigo,
    cantidadActual,
    cantidadVendida,
    nuevaCantidad
  });

  // Actualizar usando la referencia del documento encontrado
  await updateDoc(documentoEncontrado.ref, {
    cantidad: nuevaCantidad,
  });

  if (descontado > 0) {
    await anotarDeudaConsignacionVenta({
      negocioID,
      coleccion: "stockAccesorios",
      stockDocId: documentoEncontrado.id,
      data,
      cantidad: descontado,
    });
  }

  console.log('✅ Stock actualizado correctamente');
};