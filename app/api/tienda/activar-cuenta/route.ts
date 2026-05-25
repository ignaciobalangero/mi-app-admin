import { NextResponse } from "next/server";
import { auth as adminAuth, db } from "@/lib/firebaseAdmin";
import { negocioIdValido, refClienteTienda, asegurarRaizTienda } from "@/lib/tiendaAuthServer";
import type { ClienteTiendaPerfil } from "@/lib/tiendaClienteTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Activa perfil de tienda para un usuario de Firebase que ya existía (ej. mismo mail que Gestione). */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();
    const nombre = String(body.nombre ?? "").trim();
    const telefono = String(body.telefono ?? "").trim().replace(/\D/g, "");
    const dniCuit = String(body.dniCuit ?? "").trim();

    if (!negocioIdValido(negocioId)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }
    if (!nombre) {
      return NextResponse.json({ error: "Ingresá tu nombre." }, { status: 400 });
    }
    if (telefono.length < 10) {
      return NextResponse.json({ error: "Ingresá un teléfono válido." }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
    const uid = decoded.uid;
    const email = String(decoded.email ?? "").toLowerCase();

    const ref = db.doc(refClienteTienda(negocioId, uid));
    if ((await ref.get()).exists) {
      const snap = await ref.get();
      return NextResponse.json({ ok: true, perfil: snap.data() });
    }

    await asegurarRaizTienda(negocioId);

    const ahora = new Date().toISOString();
    const perfil: ClienteTiendaPerfil = {
      uid,
      negocioId,
      email,
      nombre,
      telefono,
      dniCuit,
      direcciones: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    await ref.set(perfil);

    return NextResponse.json({ ok: true, perfil });
  } catch (e: unknown) {
    console.error("[tienda/activar-cuenta]", e);
    return NextResponse.json({ error: "No se pudo activar la cuenta." }, { status: 500 });
  }
}
