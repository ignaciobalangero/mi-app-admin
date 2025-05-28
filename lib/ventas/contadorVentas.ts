import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function obtenerUltimoNumeroVenta(negocioID: string): Promise<string> {
  try {
    const ref = collection(db, `negocios/${negocioID}/ventasGeneral`);
    const q = query(ref, orderBy("numero", "desc"), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const ultimo = snap.docs[0].data();
      const ultimoNumero = parseInt(ultimo.numero || "0", 10);
      const nuevoNumero = (ultimoNumero + 1).toString().padStart(5, "0");
      return nuevoNumero;
    } else {
      return "00001";
    }
  } catch (error) {
    console.error("Error al obtener el número de venta:", error);
    return "00001"; // fallback
  }
}
