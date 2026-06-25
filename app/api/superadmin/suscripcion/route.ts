import { NextResponse } from "next/server";
import { auth as adminAuth } from "@/lib/firebaseAdmin";
import { getSuperAdminUidServer } from "@/lib/superAdminConstants";
import {
  ejecutarAccionSuscripcionSuperadmin,
  type AccionSuscripcionSuperadmin,
} from "@/lib/superadminSuscripcionServer";

export const runtime = "nodejs";

const ACCIONES: AccionSuscripcionSuperadmin[] = [
  "extender",
  "pago",
  "habilitar",
  "suspender",
];

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    let callerUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    if (callerUid !== getSuperAdminUidServer()) {
      return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action as AccionSuscripcionSuperadmin;
    if (!ACCIONES.includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const result = await ejecutarAccionSuscripcionSuperadmin(action, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("superadmin/suscripcion:", e);
    const msg = e instanceof Error ? e.message : "Error al actualizar suscripción";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
