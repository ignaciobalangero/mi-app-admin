import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";

export const reponerRepuestosAlStock = async ({
  productos,
  negocioID,
}: {
  productos: any[];
  negocioID: string;
}): Promise<void> => {
  const errores: string[] = [];

  for (const producto of productos) {
    const cantidadAReponer = Number(producto.cantidad) || 0;
    const codigo = String(producto.codigo ?? "").trim();
    const docId = String(producto.stockDocId ?? producto.id ?? "").trim();
    if (cantidadAReponer <= 0) continue;

    const ids = Array.from(new Set([docId, codigo].filter(Boolean)));
    let repuesto = false;

    for (const id of ids) {
      for (const colName of ["stockRepuestos", "stockExtra"] as const) {
        const refRep = doc(db, `negocios/${negocioID}/${colName}/${id}`);
        const snapRep = await getDoc(refRep);
        if (snapRep.exists()) {
          const stockActual = Number(snapRep.data().cantidad) || 0;
          await updateDoc(refRep, { cantidad: stockActual + cantidadAReponer });
          console.log(`✅ Stock devuelto: ${id} (+${cantidadAReponer}) en ${colName}`);
          repuesto = true;
          break;
        }
      }
      if (repuesto) break;
    }

    if (repuesto || !codigo) continue;

    for (const colName of ["stockRepuestos", "stockExtra"] as const) {
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
      errores.push(codigo || ids.join(",") || "sin código");
    }
  }

  if (errores.length > 0) {
    throw new Error(`No se pudo reponer en stock: ${errores.join(", ")}`);
  }
};
