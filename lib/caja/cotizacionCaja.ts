import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Cotización del negocio para convertir USD → ARS en caja y pagos. */
export async function cotizacionNegocioCaja(negocioId: string): Promise<number> {
  const cfg = await getDoc(doc(db, `negocios/${negocioId}/configuracion/datos`));
  if (!cfg.exists()) return 0;
  const d = cfg.data();
  const cot = Number(d.cotizacion ?? d.cotizacionDolar ?? 0);
  return cot > 0 ? cot : 0;
}
