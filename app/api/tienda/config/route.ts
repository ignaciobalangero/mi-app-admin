import { NextResponse } from "next/server";
import { negocioIdValido } from "@/lib/tiendaAuthServer";
import { cargarCheckoutConfigTienda } from "@/lib/tiendaWebConfigServer";
import {
  metodosPagoActivos,
  transportistasActivos,
} from "@/lib/tiendaWebConfigTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Config de checkout para la tienda pública (transportistas, CBU, etc.). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";

  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const config = await cargarCheckoutConfigTienda(negocioId);

  return NextResponse.json({
    transportistas: transportistasActivos(config),
    valoresDeclarados: config.valoresDeclarados,
    metodosPago: metodosPagoActivos(config),
    transferencia: config.transferencia,
  });
}
