import { NextResponse } from "next/server";
import { negocioIdValido } from "@/lib/tiendaAuthServer";
import { verificarAccesoPanelTienda } from "@/lib/tiendaPanelAuth";
import {
  descontarStockVentaServer,
  reponerStockVentaServer,
} from "@/lib/ventasDescontarStockServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();
    const accion = String(body.accion ?? "descontar").trim();
    const productos = Array.isArray(body.productos) ? body.productos : [];

    if (!negocioIdValido(negocioId)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }
    if (productos.length === 0) {
      return NextResponse.json({ error: "Sin productos." }, { status: 400 });
    }

    const sesion = await verificarAccesoPanelTienda(req.headers.get("authorization"), negocioId);
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (accion === "reponer") {
      console.log("[ventas/descontar-stock] reponer", negocioId, productos.length);
      const result = await reponerStockVentaServer(negocioId, productos);
      if (result.ok === false) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      return NextResponse.json({ ok: true });
    }

    const result = await descontarStockVentaServer(negocioId, productos);
    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[ventas/descontar-stock POST]", e);
    return NextResponse.json({ error: "No se pudo actualizar el stock." }, { status: 500 });
  }
}
