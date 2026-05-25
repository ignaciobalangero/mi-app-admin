import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { negocioIdValido, colPedidosTienda } from "@/lib/tiendaAuthServer";
import { verificarAccesoPedidosTienda } from "@/lib/tiendaPanelAuth";
import type { PedidoTienda } from "@/lib/tiendaClienteTypes";
import { reponerStockPedidoTienda } from "@/lib/tiendaDescontarStockServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESTADOS_VALIDOS = ["pendiente", "confirmado", "enviado", "cancelado"] as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";
  const estado = searchParams.get("estado")?.trim() ?? "";

  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const sesion = await verificarAccesoPedidosTienda(req.headers.get("authorization"), negocioId);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let query = db.collection(colPedidosTienda(negocioId)).limit(200);

  if (estado && ESTADOS_VALIDOS.includes(estado as (typeof ESTADOS_VALIDOS)[number])) {
    query = query.where("estado", "==", estado) as typeof query;
  }

  const snap = await query.get();
  const pedidos = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as PedidoTienda) }))
    .sort((a, b) => String(b.creadoEn).localeCompare(String(a.creadoEn)));

  const pendientes = pedidos.filter((p) => p.estado === "pendiente").length;

  return NextResponse.json({ pedidos, pendientes, negocioId });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();
    const pedidoId = String(body.pedidoId ?? "").trim();
    const estado = body.estado != null ? String(body.estado).trim() : "";
    const ventaGeneralId = String(body.ventaGeneralId ?? "").trim();

    if (!negocioIdValido(negocioId) || !pedidoId) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    if (estado && !ESTADOS_VALIDOS.includes(estado as (typeof ESTADOS_VALIDOS)[number])) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    if (!estado && !ventaGeneralId) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    const sesion = await verificarAccesoPedidosTienda(req.headers.get("authorization"), negocioId);
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const ref = db.doc(`${colPedidosTienda(negocioId)}/${pedidoId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    const pedidoActual = snap.data() as PedidoTienda;

    const ahora = new Date().toISOString();
    const update: Record<string, unknown> = { actualizadoEn: ahora };

    if (estado) {
      update.estado = estado;
      if (estado === "confirmado") {
        update.confirmadoEn = ahora;
        update.confirmadoPor = sesion.uid;
      }
      if (estado === "enviado") {
        update.enviadoEn = ahora;
        update.enviadoPor = sesion.uid;
      }
    }

    if (ventaGeneralId) {
      update.ventaGeneralId = ventaGeneralId;
      update.convertidoEn = ahora;
      if (!estado) update.estado = "confirmado";
    }

    if (
      estado === "cancelado" &&
      pedidoActual.stockDescontadoEn &&
      pedidoActual.estado !== "cancelado"
    ) {
      await reponerStockPedidoTienda(negocioId, pedidoActual.lineas);
      update.stockDescontadoEn = null;
    }

    await ref.update(update);

    const actualizado = await ref.get();
    return NextResponse.json({ ok: true, pedido: { id: actualizado.id, ...actualizado.data() } });
  } catch (e: unknown) {
    console.error("[tienda/pedidos/admin PATCH]", e);
    return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 500 });
  }
}
