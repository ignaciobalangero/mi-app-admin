import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Incrementa y devuelve el nro de venta en una transacción (evita duplicados por carrera). */
export async function obtenerYSumarNumeroVenta(negocioID: string): Promise<string> {
  const ref = doc(db, `negocios/${negocioID}/configuracion/contadorVentas`);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    let siguiente: number;

    if (!snap.exists()) {
      siguiente = 1;
      transaction.set(ref, { ultimo: 1 });
    } else {
      const ultimo = Number(snap.data()?.ultimo ?? 0);
      siguiente = ultimo + 1;
      transaction.update(ref, { ultimo: siguiente });
    }

    return siguiente.toString().padStart(5, "0");
  });
}

/** Solo visual (ModalVenta); no incrementa. */
export async function obtenerUltimoNumeroVenta(negocioID: string): Promise<string> {
  const ref = doc(db, `negocios/${negocioID}/configuracion/contadorVentas`);
  const snap = await getDoc(ref);

  if (!snap.exists()) return "00001";

  const data = snap.data();
  const actual = data.ultimo || 0;
  const estimado = actual + 1;
  return estimado.toString().padStart(5, "0");
}
