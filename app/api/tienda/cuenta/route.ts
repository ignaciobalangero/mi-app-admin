import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { negocioIdValido, verificarTokenClienteTienda, refClienteTienda } from "@/lib/tiendaAuthServer";
import type { ClienteTiendaPerfil, DireccionTienda } from "@/lib/tiendaClienteTypes";
import { generarIdDireccion } from "@/lib/tiendaCheckoutOpciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DIRECCIONES = 2;

function parsePerfil(raw: Record<string, unknown>): ClienteTiendaPerfil {
  return raw as ClienteTiendaPerfil;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";
  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const sesion = await verificarTokenClienteTienda(req.headers.get("authorization"), negocioId);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const snap = await db.doc(refClienteTienda(negocioId, sesion.uid)).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ perfil: parsePerfil(snap.data()!) });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();
    if (!negocioIdValido(negocioId)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }

    const sesion = await verificarTokenClienteTienda(req.headers.get("authorization"), negocioId);
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const ref = db.doc(refClienteTienda(negocioId, sesion.uid));
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }

    const actual = parsePerfil(snap.data()!);
    const ahora = new Date().toISOString();

    if (body.accion === "guardar_direccion") {
      const dir = body.direccion as Partial<DireccionTienda>;
      const nueva: DireccionTienda = {
        id: String(dir.id || generarIdDireccion()),
        etiqueta: String(dir.etiqueta ?? "Principal").trim() || "Principal",
        calle: String(dir.calle ?? "").trim(),
        numero: String(dir.numero ?? "").trim(),
        pisoDepto: String(dir.pisoDepto ?? "").trim(),
        localidad: String(dir.localidad ?? "").trim(),
        provincia: String(dir.provincia ?? "").trim(),
        codigoPostal: String(dir.codigoPostal ?? "").trim(),
        nombreRecepcion: String(dir.nombreRecepcion ?? actual.nombre).trim(),
        telefono: String(dir.telefono ?? actual.telefono).trim(),
      };

      if (!nueva.calle || !nueva.numero || !nueva.localidad || !nueva.provincia || !nueva.codigoPostal) {
        return NextResponse.json({ error: "Completá todos los campos de la dirección." }, { status: 400 });
      }

      let direcciones = [...(actual.direcciones ?? [])];
      const idx = direcciones.findIndex((d) => d.id === nueva.id);
      if (idx >= 0) {
        direcciones[idx] = nueva;
      } else {
        if (direcciones.length >= MAX_DIRECCIONES) {
          return NextResponse.json(
            { error: `Podés guardar hasta ${MAX_DIRECCIONES} direcciones.` },
            { status: 400 }
          );
        }
        direcciones.push(nueva);
      }

      await ref.update({ direcciones, actualizadoEn: ahora });
      await db.doc(`usuarios/${sesion.uid}`).update({
        nombre: String(body.nombre ?? actual.nombre).trim() || actual.nombre,
        telefono: String(body.telefono ?? actual.telefono).trim() || actual.telefono,
      });

      const updated = await ref.get();
      return NextResponse.json({ perfil: parsePerfil(updated.data()!) });
    }

    if (body.accion === "eliminar_direccion") {
      const id = String(body.direccionId ?? "");
      const direcciones = (actual.direcciones ?? []).filter((d) => d.id !== id);
      await ref.update({ direcciones, actualizadoEn: ahora });
      const updated = await ref.get();
      return NextResponse.json({ perfil: parsePerfil(updated.data()!) });
    }

    const patch: Partial<ClienteTiendaPerfil> = { actualizadoEn: ahora };
    if (body.nombre) patch.nombre = String(body.nombre).trim();
    if (body.telefono) patch.telefono = String(body.telefono).trim().replace(/\D/g, "");
    if (body.dniCuit !== undefined) patch.dniCuit = String(body.dniCuit).trim();

    await ref.update(patch);
    if (patch.nombre || patch.telefono) {
      await db.doc(`usuarios/${sesion.uid}`).update({
        ...(patch.nombre ? { nombre: patch.nombre } : {}),
        ...(patch.telefono ? { telefono: patch.telefono } : {}),
      });
    }

    const updated = await ref.get();
    return NextResponse.json({ perfil: parsePerfil(updated.data()!) });
  } catch (e: unknown) {
    console.error("[tienda/cuenta PATCH]", e);
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}
