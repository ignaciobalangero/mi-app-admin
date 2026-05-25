import { NextResponse } from "next/server";
import { negocioIdValido } from "@/lib/tiendaAuthServer";
import { verificarSuperAdmin } from "@/lib/tiendaPanelAuth";
import {
  cargarCheckoutConfigTienda,
  guardarCheckoutConfigTienda,
} from "@/lib/tiendaWebConfigServer";
import {
  parseTiendaWebCheckout,
  type TiendaWebCheckoutConfig,
} from "@/lib/tiendaWebConfigTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";

  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const sesion = await verificarSuperAdmin(req.headers.get("authorization"));
  if (!sesion) {
    return NextResponse.json({ error: "Solo superadmin." }, { status: 403 });
  }

  const config = await cargarCheckoutConfigTienda(negocioId);
  return NextResponse.json({ config, negocioId });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();

    if (!negocioIdValido(negocioId)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }

    const sesion = await verificarSuperAdmin(req.headers.get("authorization"));
    if (!sesion) {
      return NextResponse.json({ error: "Solo superadmin." }, { status: 403 });
    }

    const config = parseTiendaWebCheckout(body.config) as TiendaWebCheckoutConfig;

    if (config.transportistas.filter((t) => t.activo).length === 0) {
      return NextResponse.json({ error: "Debe haber al menos un transportista activo." }, { status: 400 });
    }
    if (config.metodosPago.filter((m) => m.activo).length === 0) {
      return NextResponse.json({ error: "Debe haber al menos un método de pago activo." }, { status: 400 });
    }
    if (config.valoresDeclarados.length === 0) {
      return NextResponse.json({ error: "Definí al menos un valor declarado." }, { status: 400 });
    }

    await guardarCheckoutConfigTienda(negocioId, config);
    return NextResponse.json({ ok: true, config });
  } catch (e: unknown) {
    console.error("[tienda/config/admin PUT]", e);
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json(
      { error: msg.includes("Firestore") ? "No se pudo guardar la configuración." : msg || "No se pudo guardar la configuración." },
      { status: 500 }
    );
  }
}
