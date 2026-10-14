import { NextResponse } from "next/server";
import { verificarSuperAdmin } from "@/lib/tiendaPanelAuth";
import {
  consultarSaldoIfree,
  guardarClaveIfreePlataforma,
  leerClaveIfreePlataforma,
} from "@/lib/ifree/ifreeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sesion = await verificarSuperAdmin(req.headers.get("authorization"));
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const apiKey = String(body.apiKey ?? "").trim();
    const accion = String(body.accion ?? "estado");

    if (accion === "guardar") {
      if (apiKey.length < 8) {
        return NextResponse.json({ error: "Pegá la PHP API Key de iFree." }, { status: 400 });
      }
      await guardarClaveIfreePlataforma(apiKey);
      return NextResponse.json({ ok: true, hayClave: true });
    }

    const clave = await leerClaveIfreePlataforma();
    if (accion === "saldo") {
      if (!clave) {
        return NextResponse.json({ error: "Todavía no hay una clave de iFree guardada." }, { status: 400 });
      }
      const saldo = await consultarSaldoIfree(clave);
      return NextResponse.json({ ok: true, hayClave: true, saldo });
    }

    return NextResponse.json({ ok: true, hayClave: Boolean(clave) });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo usar la clave de iFree.";
    console.error("[ifree/clave]", mensaje);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
