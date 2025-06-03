import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 👉 esta SÍ incrementa (solo se usa en guardar venta)
export async function obtenerYSumarNumeroVenta(negocioID: string): Promise<string> {
  const ref = doc(db, `negocios/${negocioID}/configuracion/contadorVentas`);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { ultimo: 1 });
    return "00001";
  }

  const data = snap.data();
  const siguiente = (data.ultimo || 0) + 1;

  await updateDoc(ref, { ultimo: increment(1) });
  return siguiente.toString().padStart(5, "0");
}

// 👉 esta NO incrementa, solo visual (usala en ModalVenta)
export async function obtenerUltimoNumeroVenta(negocioID: string): Promise<string> {
  const ref = doc(db, `negocios/${negocioID}/configuracion/contadorVentas`);
  const snap = await getDoc(ref);

  if (!snap.exists()) return "00001";

  const data = snap.data();
  const actual = data.ultimo || 0;
  const estimado = actual + 1;
  return estimado.toString().padStart(5, "0");
}
