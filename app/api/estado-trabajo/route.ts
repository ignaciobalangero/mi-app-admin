import { NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebaseAdmin";
import { etiquetaEstadoTrabajo, normalizarFotosTrabajo } from "@/lib/trabajosFotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function negocioIdValido(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

function tokenValido(t: string): boolean {
  return /^[a-zA-Z0-9_-]{12,64}$/.test(t);
}

/** GET /api/estado-trabajo?negocioID=&token= — consulta pública del trabajo. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const negocioID = String(searchParams.get("negocioID") || "").trim();
    const token = String(searchParams.get("token") || "").trim();

    if (!negocioIdValido(negocioID) || !tokenValido(token)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const snap = await adminDb
      .collection(`negocios/${negocioID}/trabajos`)
      .where("tokenPublico", "==", token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }

    const doc = snap.docs[0];
    const d = doc.data();

    const fotosIngreso = normalizarFotosTrabajo(d.fotosIngreso, "ingreso");
    const fotosProceso = normalizarFotosTrabajo(d.fotosProceso, "proceso");

    let nombreNegocio = negocioID;
    try {
      const cfg = await adminDb.doc(`negocios/${negocioID}/configuracion/datos`).get();
      if (cfg.exists) {
        const c = cfg.data() || {};
        nombreNegocio = String(c.nombreComercial || c.nombre || c.empresa || negocioID);
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      ok: true,
      negocio: { id: negocioID, nombre: nombreNegocio },
      trabajo: {
        id: d.id || "",
        nroOrden: d.nroOrden || "",
        cliente: d.cliente || "",
        modelo: d.modelo || "",
        trabajo: d.trabajo || "",
        estado: d.estado || "",
        estadoLabel: etiquetaEstadoTrabajo(String(d.estado || "")),
        fecha: d.fecha || "",
        observaciones: d.observaciones || "",
        reparacionRealizada: d.reparacionRealizada || "",
        fotosIngreso: fotosIngreso.map((f) => f.url),
        fotosProceso: fotosProceso.map((f) => f.url),
      },
    });
  } catch (e) {
    console.error("[api/estado-trabajo]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
