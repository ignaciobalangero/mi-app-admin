import { NextResponse } from "next/server";
import "@/lib/firebaseAdmin";
import { auth as adminAuth } from "@/lib/firebaseAdmin";
import { getSuperAdminUidServer } from "@/lib/superAdminConstants";

export const runtime = "nodejs";

/**
 * Solo el superadmin puede fijar la contraseña de cualquier usuario (Firebase Auth).
 * Útil para entrar con la cuenta del cliente o recuperar acceso.
 */
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

    const superUid = getSuperAdminUidServer();
    if (callerUid !== superUid) {
      return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres (Firebase)" },
        { status: 400 }
      );
    }

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (e: any) {
      if (e?.code === "auth/user-not-found") {
        return NextResponse.json({ error: "No existe usuario con ese email" }, { status: 404 });
      }
      throw e;
    }

    await adminAuth.updateUser(userRecord.uid, { password: newPassword });

    return NextResponse.json({ ok: true, uid: userRecord.uid });
  } catch (e: any) {
    console.error("superadmin/set-password:", e);
    return NextResponse.json(
      { error: e?.message || "Error al actualizar contraseña" },
      { status: 500 }
    );
  }
}
