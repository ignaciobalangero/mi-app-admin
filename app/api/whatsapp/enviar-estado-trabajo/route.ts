import { NextResponse } from "next/server";
import { negocioIdValido } from "@/lib/tiendaAuthServer";
import { verificarAccesoPanelTienda } from "@/lib/tiendaPanelAuth";
import { enviarWhatsappEstadoTrabajo } from "@/lib/whatsapp/whatsappBusinessServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const negocioID = String(body.negocioID ?? "").trim();

    if (!negocioIdValido(negocioID)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }

    const sesion = await verificarAccesoPanelTienda(req.headers.get("authorization"), negocioID);
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const trabajoId = String(body.trabajoId ?? "").trim();
    const cliente = String(body.cliente ?? "").trim();
    const nuevoEstado = String(body.nuevoEstado ?? "").trim();

    if (!trabajoId || !cliente || !nuevoEstado) {
      return NextResponse.json(
        { error: "Faltan trabajoId, cliente o nuevoEstado." },
        { status: 400 }
      );
    }

    const telefonoPrueba = String(body.telefonoPrueba ?? "").trim() || undefined;

    const result = await enviarWhatsappEstadoTrabajo(
      {
        negocioID,
        trabajoId,
        cliente,
        modelo: String(body.modelo ?? "").trim(),
        trabajo: String(body.trabajo ?? "").trim(),
        estadoAnterior: String(body.estadoAnterior ?? "").trim(),
        nuevoEstado,
        ordenId: String(body.ordenId ?? body.id ?? "").trim() || undefined,
      },
      telefonoPrueba ? { telefonoOverride: telefonoPrueba } : undefined
    );

    if (!result.ok && !result.skipped) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[whatsapp/enviar-estado-trabajo]", e);
    return NextResponse.json(
      { ok: false, reason: "Error interno al enviar WhatsApp." },
      { status: 500 }
    );
  }
}
