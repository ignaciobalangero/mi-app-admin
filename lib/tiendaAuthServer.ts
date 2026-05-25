import { auth as adminAuth, db } from "@/lib/firebaseAdmin";
import type { ClienteTiendaPerfil } from "@/lib/tiendaClienteTypes";
import {
  docRaizTienda,
  negocioGestioneParaStock,
  refClienteTienda,
} from "@/lib/tiendaFirestorePaths";

export function negocioIdValido(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

export { refClienteTienda, colPedidosTienda } from "@/lib/tiendaFirestorePaths";
export { negocioGestioneParaStock };

/** Asegura que exista el documento raíz `iphonetec/web` (o `{negocio}/web`). */
export async function asegurarRaizTienda(negocioId: string): Promise<void> {
  const ref = db.doc(docRaizTienda(negocioId));
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      negocioGestioneId: negocioGestioneParaStock(negocioId),
      creadoEn: new Date().toISOString(),
    });
  }
}

export async function verificarTokenClienteTienda(
  authHeader: string | null,
  negocioIdEsperado?: string
): Promise<{ uid: string; negocioId: string; email: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const negocioId = negocioIdEsperado?.trim();
    if (!negocioId) return null;

    const snap = await db.doc(refClienteTienda(negocioId, uid)).get();
    if (!snap.exists) return null;

    const data = snap.data() as ClienteTiendaPerfil;
    return {
      uid,
      negocioId,
      email: String(data.email || decoded.email || ""),
    };
  } catch {
    return null;
  }
}
