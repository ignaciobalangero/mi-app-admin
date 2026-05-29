import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
export {
  esProductoAccesorio,
  esProductoRepuestoOGeneral,
} from "@/lib/ventasStockProducto";

async function restarCantidad(
  ref: ReturnType<typeof doc>,
  cantidadVendida: number
): Promise<boolean> {
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const cantidadActual = Number(snap.data().cantidad) || 0;
  await updateDoc(ref, {
    cantidad: Math.max(0, cantidadActual - cantidadVendida),
  });
  return true;
}

/**
 * Resta del stock un repuesto según doc id o código.
 * Busca en stockRepuestos y stockExtra.
 */
export async function descontarRepuestoDelStock(
  negocioID: string,
  codigo: string,
  cantidadVendida: number,
  docId?: string
) {
  if (!negocioID || cantidadVendida <= 0) return;
  const cod = String(codigo ?? "").trim();
  const ids = Array.from(new Set([String(docId ?? "").trim(), cod].filter(Boolean)));

  for (const id of ids) {
    for (const colName of ["stockRepuestos", "stockExtra"] as const) {
      const ref = doc(db, `negocios/${negocioID}/${colName}/${id}`);
      if (await restarCantidad(ref, cantidadVendida)) return;
    }
  }

  if (cod) {
    for (const colName of ["stockRepuestos", "stockExtra"] as const) {
      const q = query(
        collection(db, `negocios/${negocioID}/${colName}`),
        where("codigo", "==", cod)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await restarCantidad(snap.docs[0].ref, cantidadVendida);
        return;
      }
    }
  }

  console.warn(
    `[descontarRepuestoDelStock] No se encontró ${cod || ids.join(",")} en negocios/${negocioID}`
  );
}
