import { auth as adminAuth, db } from "@/lib/firebaseAdmin";
import {
  esSuperAdminEmail,
  esSuperAdminUid,
} from "@/lib/superAdminConstants";

export type AccesoPanelTienda = {
  uid: string;
  rol: string;
  negocioID: string;
  esSuperAdmin: boolean;
};

/** Solo superadmin de la plataforma (config tienda web, checkout, etc.). */
export async function verificarSuperAdmin(
  authHeader: string | null
): Promise<{ uid: string; email: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
    const uid = decoded.uid;
    const email = String(decoded.email ?? "").toLowerCase();
    if (!esSuperAdminUid(uid) && !esSuperAdminEmail(email)) return null;
    return { uid, email };
  } catch {
    return null;
  }
}

/** Solo superadmin o empleados marcados con `pedidosTienda: true` (creados por superadmin). */
export async function verificarAccesoPedidosTienda(
  authHeader: string | null,
  negocioIdEsperado: string
): Promise<AccesoPanelTienda | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const negocioId = negocioIdEsperado.trim();
  if (!negocioId) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
    const uid = decoded.uid;
    const email = String(decoded.email ?? "").toLowerCase();

    if (esSuperAdminUid(uid) || esSuperAdminEmail(email)) {
      return { uid, rol: "superadmin", negocioID: negocioId, esSuperAdmin: true };
    }

    const snap = await db.doc(`usuarios/${uid}`).get();
    if (!snap.exists) return null;

    const data = snap.data()!;
    if (data.pedidosTienda !== true) return null;

    const rol = String(data.rol ?? "");
    if (rol !== "empleado") return null;

    const negocioID = String(data.negocioID ?? "").trim();
    if (negocioID !== negocioId) return null;

    return { uid, rol, negocioID, esSuperAdmin: false };
  } catch {
    return null;
  }
}

/** Admin, empleado del negocio, o superadmin (cualquier negocio). */
export async function verificarAccesoPanelTienda(
  authHeader: string | null,
  negocioIdEsperado: string
): Promise<AccesoPanelTienda | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const negocioId = negocioIdEsperado.trim();
  if (!negocioId) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
    const uid = decoded.uid;
    const email = String(decoded.email ?? "").toLowerCase();
    const esSuperAdmin = esSuperAdminUid(uid) || esSuperAdminEmail(email);

    if (esSuperAdmin) {
      return { uid, rol: "superadmin", negocioID: negocioId, esSuperAdmin: true };
    }

    const snap = await db.doc(`usuarios/${uid}`).get();
    if (!snap.exists) return null;

    const data = snap.data()!;
    const rol = String(data.rol ?? "");
    const negocioID = String(data.negocioID ?? "").trim();

    if (rol !== "admin" && rol !== "empleado") return null;
    if (negocioID !== negocioId) return null;

    return { uid, rol, negocioID, esSuperAdmin: false };
  } catch {
    return null;
  }
}
