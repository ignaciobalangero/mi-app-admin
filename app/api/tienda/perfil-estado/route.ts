import { NextResponse } from "next/server";
import { auth as adminAuth, db } from "@/lib/firebaseAdmin";
import { negocioIdValido, refClienteTienda } from "@/lib/tiendaAuthServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tras login Firebase: indica si ya tiene perfil de tienda y sugiere nombre desde Gestione. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";

  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
    const uid = decoded.uid;

    const [tiendaSnap, usuarioSnap] = await Promise.all([
      db.doc(refClienteTienda(negocioId, uid)).get(),
      db.doc(`usuarios/${uid}`).get(),
    ]);

    const u = usuarioSnap.exists ? usuarioSnap.data() : null;
    const nombreSugerido = String(u?.nombre ?? u?.nombreCompleto ?? "").trim();
    const telefonoSugerido = String(u?.telefono ?? "").trim();

    return NextResponse.json({
      tienePerfil: tiendaSnap.exists,
      email: decoded.email ?? "",
      nombreSugerido,
      telefonoSugerido,
      rolGestione: u?.rol ? String(u.rol) : null,
    });
  } catch {
    return NextResponse.json({ error: "Token inválido o vencido." }, { status: 401 });
  }
}
