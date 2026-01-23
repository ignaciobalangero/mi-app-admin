// lib/stock/reponerRepuestosAlStock.ts
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export const reponerRepuestosAlStock = async ({ productos, negocioID }: { productos: any[], negocioID: string }) => {
  for (const producto of productos) {
    const cantidadAReponer = Number(producto.cantidad) || 0;
    if (!producto.codigo || cantidadAReponer <= 0) continue;

    // Buscamos en ambas colecciones por las dudas
    const colecciones = ["stockRepuestos", "stockExtra"];
    
    for (const colName of colecciones) {
      const colRef = collection(db, `negocios/${negocioID}/${colName}`);
      const q = query(colRef, where("codigo", "==", producto.codigo));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        const stockActual = Number(querySnapshot.docs[0].data().cantidad) || 0;
        
        await updateDoc(docRef, {
          cantidad: stockActual + cantidadAReponer
        });
        console.log(`✅ Stock devuelto: ${producto.codigo} (+${cantidadAReponer}) en ${colName}`);
        break; // Si lo encontró en una, no busca en la otra
      }
    }
  }
};