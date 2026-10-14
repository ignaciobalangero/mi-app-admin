import { NextResponse } from "next/server";
import { verificarSuperAdmin } from "@/lib/tiendaPanelAuth";
import { consultarSaldoIfree, leerClaveIfreePlataforma } from "@/lib/ifree/ifreeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sesion = await verificarSuperAdmin(req.headers.get("authorization"));
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const apiKey = await leerClaveIfreePlataforma();
    if (!apiKey) {
      return NextResponse.json({ error: "Todavía no hay una clave de iFree guardada." }, { status: 400 });
    }

    const saldo = await consultarSaldoIfree(apiKey);
    return NextResponse.json({ ok: true, saldo });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo leer el saldo.";
    console.error("[ifree/saldo]", mensaje);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
