import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";

export const reponerRepuestosAlStock = async ({
  productos,
  negocioID,
}: {
  productos: any[];
  negocioID: string;
}) => {
  for (const producto of productos) {
    const cantidadAReponer = Number(producto.cantidad) || 0;
    const codigo = String(producto.codigo ?? "").trim();
    const docId = String(producto.id ?? "").trim();
    if (cantidadAReponer <= 0) continue;

    const ids = Array.from(new Set([docId, codigo].filter(Boolean)));

    for (const id of ids) {
      const refRep = doc(db, `negocios/${negocioID}/stockRepuestos/${id}`);
      const snapRep = await getDoc(refRep);
      if (snapRep.exists()) {
        const stockActual = Number(snapRep.data().cantidad) || 0;
        await updateDoc(refRep, { cantidad: stockActual + cantidadAReponer });
        console.log(`✅ Stock devuelto: ${id} (+${cantidadAReponer}) en stockRepuestos`);
        break;
      }
    }

    if (!codigo) continue;

    const colecciones = ["stockRepuestos", "stockExtra"];
    let repuesto = false;

    for (const colName of colecciones) {
      const colRef = collection(db, `negocios/${negocioID}/${colName}`);
      const q = query(colRef, where("codigo", "==", codigo));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0];
        const stockActual = Number(docRef.data().cantidad) || 0;

        await updateDoc(docRef.ref, {
          cantidad: stockActual + cantidadAReponer,
        });
        console.log(`✅ Stock devuelto: ${codigo} (+${cantidadAReponer}) en ${colName}`);
        repuesto = true;
        break;
      }
    }

    if (!repuesto) {
      console.warn(`⚠️ No se encontró stock para reponer: ${codigo || ids.join(",")}`);
    }
  }
};
