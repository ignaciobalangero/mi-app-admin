import { NextResponse } from "next/server";
import { db as adminDb, subirPngPublicoAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function negocioIdValido(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

function tokenValido(t: string): boolean {
  return /^[a-zA-Z0-9_-]{12,64}$/.test(t);
}

async function buscarTrabajoPorToken(negocioID: string, token: string) {
  const snap = await adminDb
    .collection(`negocios/${negocioID}/trabajos`)
    .where("tokenPublico", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0];
}

/** GET — datos mínimos para firmar en iPad (sin login). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const negocioID = String(searchParams.get("negocioID") || "").trim();
    const token = String(searchParams.get("token") || "").trim();

    if (!negocioIdValido(negocioID) || !tokenValido(token)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const doc = await buscarTrabajoPorToken(negocioID, token);
    if (!doc) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }

    const d = doc.data();
    let nombreNegocio = negocioID;
    try {
      const cfg = await adminDb.doc(`negocios/${negocioID}/configuracion/datos`).get();
      if (cfg.exists) {
        const c = cfg.data() || {};
        nombreNegocio = String(
          c.nombreNegocio || c.nombreComercial || c.nombre || c.empresa || negocioID
        );
      }
    } catch {
      /* ignore */
    }

    const firmaUrl = String(d.firmaClienteUrl || "").trim();

    return NextResponse.json({
      ok: true,
      negocio: { id: negocioID, nombre: nombreNegocio },
      trabajo: {
        id: d.id || "",
        nroOrden: d.nroOrden || "",
        cliente: d.cliente || "",
        modelo: d.modelo || "",
        trabajo: d.trabajo || "",
        fecha: d.fecha || "",
        yaFirmado: Boolean(firmaUrl),
        firmaClienteUrl: firmaUrl || null,
      },
    });
  } catch (e) {
    console.error("[api/firmar-trabajo GET]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** POST — guarda firma del cliente (data URL PNG). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const negocioID = String(body?.negocioID || "").trim();
    const token = String(body?.token || "").trim();
    const dataUrl = String(body?.dataUrl || "").trim();

    if (!negocioIdValido(negocioID) || !tokenValido(token)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    if (!dataUrl.startsWith("data:image/png")) {
      return NextResponse.json({ error: "Firma inválida (se espera PNG)" }, { status: 400 });
    }
    // ~1.5MB en base64 ≈ límite razonable
    if (dataUrl.length > 2_000_000) {
      return NextResponse.json({ error: "La firma es demasiado pesada" }, { status: 400 });
    }

    const doc = await buscarTrabajoPorToken(negocioID, token);
    if (!doc) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length < 100) {
      return NextResponse.json({ error: "Firma vacía" }, { status: 400 });
    }

    const path = `negocios/${negocioID}/trabajos/${doc.id}/firma/firma-cliente-${Date.now()}.png`;
    const firmaClienteUrl = await subirPngPublicoAdmin({ path, buffer });

    await doc.ref.update({
      firmaClienteUrl,
      firmaClienteEn: new Date().toISOString(),
      firmaClienteOrigen: "ipad-publico",
    });

    return NextResponse.json({ ok: true, firmaClienteUrl });
  } catch (e) {
    console.error("[api/firmar-trabajo POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar la firma" },
      { status: 500 }
    );
  }
}
