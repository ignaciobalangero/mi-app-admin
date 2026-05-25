import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { negocioIdValido, colPedidosTienda } from "@/lib/tiendaAuthServer";
import { verificarAccesoPedidosTienda } from "@/lib/tiendaPanelAuth";
import type { PedidoTienda } from "@/lib/tiendaClienteTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sinConvertir(data: PedidoTienda & { ventaGeneralId?: string }): boolean {
  if (data.ventaGeneralId) return false;
  if (data.estado === "cancelado") return false;
  return data.estado === "pendiente" || data.estado === "confirmado";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";

  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const sesion = await verificarAccesoPedidosTienda(req.headers.get("authorization"), negocioId);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const snap = await db.collection(colPedidosTienda(negocioId)).limit(200).get();

  const pedidos = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as PedidoTienda) }))
    .filter((p) => sinConvertir(p))
    .sort((a, b) => String(b.creadoEn).localeCompare(String(a.creadoEn)));

  return NextResponse.json({
    count: pedidos.length,
    negocioId,
    pedidos,
  });
}
