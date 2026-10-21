import { NextResponse } from "next/server";
import { auth as adminAuth, db } from "@/lib/firebaseAdmin";
import { esSuperAdminEmail, esSuperAdminUid } from "@/lib/superAdminConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

function urlDeStorage(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (host !== "firebasestorage.googleapis.com" && host !== "storage.googleapis.com") {
    return null;
  }
  return parsed;
}

/** El logo y la firma viven en Firebase Storage y el navegador no puede leerlos por CORS. */
async function sesionValida(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
    if (esSuperAdminUid(decoded.uid) || esSuperAdminEmail(String(decoded.email ?? ""))) {
      return true;
    }
    const snap = await db.doc(`usuarios/${decoded.uid}`).get();
    if (!snap.exists) return false;
    const data = snap.data()!;
    const rol = String(data.rol ?? "");
    const negocioID = String(data.negocioID ?? "").trim();
    return (rol === "admin" || rol === "empleado") && Boolean(negocioID);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!(await sesionValida(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const url = urlDeStorage(new URL(req.url).searchParams.get("url") || "");
  if (!url) {
    return NextResponse.json({ error: "Imagen no permitida." }, { status: 400 });
  }

  const origen = await fetch(url.toString(), { cache: "no-store" });
  if (!origen.ok) {
    return NextResponse.json({ error: "No se pudo leer la imagen." }, { status: 502 });
  }

  const tipo = origen.headers.get("content-type") || "image/png";
  if (!tipo.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ error: "No es una imagen." }, { status: 415 });
  }

  const buffer = Buffer.from(await origen.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande." }, { status: 413 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": tipo.split(";")[0] || "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}
