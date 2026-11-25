import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { revertirDeudaConsignacionVenta } from "@/lib/proveedores/deudaConsignacionCliente";

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

    console.log('🔍 Buscando accesorio para reponer con código:', producto.codigo);

    // ✅ QUERY OPTIMIZADO - Solo busca documentos con este código específico
    const stockRef = collection(db, `negocios/${negocioID}/stockAccesorios`);
    const q = query(stockRef, where("codigo", "==", producto.codigo));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("❌ No existe en stock:", producto.codigo);
      continue;
    }

    // Tomar el primer documento encontrado
    const documentoEncontrado = snapshot.docs[0];
    const data = documentoEncontrado.data();

    const nuevaCantidad = (data.cantidad || 0) + producto.cantidad;

    console.log(`✅ Sumando ${producto.cantidad} a ${producto.codigo}, nueva cantidad: ${nuevaCantidad}`);

    // Actualizar usando la referencia del documento encontrado
    await updateDoc(documentoEncontrado.ref, {
      cantidad: nuevaCantidad,
    });
    await revertirDeudaConsignacionVenta({
      negocioID,
      coleccion: "stockAccesorios",
      stockDocId: documentoEncontrado.id,
      cantidad: producto.cantidad,
    });
  }
};