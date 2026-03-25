import { NextResponse } from "next/server";
import "@/lib/firebaseAdmin";
import { auth as adminAuth, db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type UsuarioFila = {
  uid: string;
  email: string;
  rol: string;
  nombre: string;
  fechaCreacion: string | null;
  creadoPor: string | null;
};

const ORDEN_ROL: Record<string, number> = {
  admin: 0,
  empleado: 1,
  cliente: 2,
};

/**
 * Lista cuentas (usuarios) del negocio del llamador (admin o empleado).
 * Vista multi-negocio para superadmin: /admin/negocios.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    let decoded: { uid: string };
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const callerSnap = await db.doc(`usuarios/${decoded.uid}`).get();
    if (!callerSnap.exists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });
    }

    const caller = callerSnap.data()!;
    const callerRol = String(caller.rol || "");
    const negocioID = String(caller.negocioID || "").trim();

    if (callerRol !== "admin" && callerRol !== "empleado") {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    if (!negocioID) {
      return NextResponse.json({ error: "Sin negocio asignado" }, { status: 403 });
    }

    const [usuariosSnap, metaSnap, configNegocioSnap] = await Promise.all([
      db.collection("usuarios").where("negocioID", "==", negocioID).get(),
      db.collection(`negocios/${negocioID}/usuarios`).get(),
      db.doc(`negocios/${negocioID}/configuracion/datos`).get(),
    ]);

    const nombreNegocio =
      configNegocioSnap.exists && typeof configNegocioSnap.data()?.nombreNegocio === "string"
        ? String(configNegocioSnap.data()!.nombreNegocio).trim() || null
        : null;

    const metaByUid = new Map<string, { fechaCreacion?: string; creadoPor?: string }>();
    metaSnap.forEach((d) => {
      const m = d.data();
      metaByUid.set(d.id, {
        fechaCreacion: typeof m.fechaCreacion === "string" ? m.fechaCreacion : undefined,
        creadoPor: typeof m.creadoPor === "string" ? m.creadoPor : undefined,
      });
    });

    const usuarios: UsuarioFila[] = usuariosSnap.docs.map((d) => {
      const data = d.data();
      const meta = metaByUid.get(d.id);
      return {
        uid: d.id,
        email: String(data.email ?? ""),
        rol: String(data.rol ?? ""),
        nombre: String(data.nombre ?? ""),
        fechaCreacion: meta?.fechaCreacion ?? null,
        creadoPor: meta?.creadoPor ?? null,
      };
    });

    usuarios.sort((a, b) => {
      const oa = ORDEN_ROL[a.rol] ?? 9;
      const ob = ORDEN_ROL[b.rol] ?? 9;
      if (oa !== ob) return oa - ob;
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    });

    const counts = {
      admin: usuarios.filter((u) => u.rol === "admin").length,
      empleado: usuarios.filter((u) => u.rol === "empleado").length,
      cliente: usuarios.filter((u) => u.rol === "cliente").length,
      otros: usuarios.filter(
        (u) => u.rol !== "admin" && u.rol !== "empleado" && u.rol !== "cliente"
      ).length,
    };

    return NextResponse.json({
      usuarios,
      counts,
      negocioID,
      nombreNegocio,
    });
  } catch (e: unknown) {
    console.error("usuarios-negocio:", e);
    return NextResponse.json({ error: "Error al listar usuarios" }, { status: 500 });
  }
}
