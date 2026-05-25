import { NextResponse } from "next/server";
import { auth as adminAuth, db } from "@/lib/firebaseAdmin";
import { negocioIdValido, refClienteTienda, asegurarRaizTienda } from "@/lib/tiendaAuthServer";
import type { ClienteTiendaPerfil } from "@/lib/tiendaClienteTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const nombre = String(body.nombre ?? "").trim();
    const telefono = String(body.telefono ?? "").trim().replace(/\D/g, "");
    const dniCuit = String(body.dniCuit ?? "").trim();

    if (!negocioIdValido(negocioId)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }
    if (!nombre) {
      return NextResponse.json({ error: "Ingresá tu nombre." }, { status: 400 });
    }
    if (telefono.length < 10) {
      return NextResponse.json({ error: "Ingresá un teléfono válido (con código de área)." }, { status: 400 });
    }

    const negSnap = await db.doc(`negocios/${negocioId}`).get();
    if (!negSnap.exists) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    await asegurarRaizTienda(negocioId);

    let uid: string;

    try {
      const existente = await adminAuth.getUserByEmail(email);
      uid = existente.uid;

      const yaTienda = await db.doc(refClienteTienda(negocioId, uid)).get();
      if (yaTienda.exists) {
        return NextResponse.json(
          { error: "Ya tenés cuenta en esta tienda. Iniciá sesión." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Este email ya está registrado (Gestione u otra cuenta). Iniciá sesión en la tienda con la misma contraseña y completá tu perfil.",
          emailYaExiste: true,
        },
        { status: 409 }
      );
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== "auth/user-not-found") throw e;

      const userRecord = await adminAuth.createUser({ email, password, emailVerified: false });
      uid = userRecord.uid;
    }

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

    await db.doc(refClienteTienda(negocioId, uid)).set(perfil);

    return NextResponse.json({ ok: true, uid });
  } catch (e: unknown) {
    console.error("[tienda/registro]", e);
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}
