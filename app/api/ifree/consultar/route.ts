import { NextResponse } from "next/server";
import { negocioIdValido } from "@/lib/tiendaAuthServer";
import { verificarAccesoPanelTienda } from "@/lib/tiendaPanelAuth";
import { consultarImeiIfree, leerClaveIfreePlataforma, leerPlanControlImei } from "@/lib/ifree/ifreeServer";
import { consultaIncluida, type ConsultaImeiId } from "@/lib/ifree/consultasImei";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONSULTAS = new Set<ConsultaImeiId>(["fmi", "icloud", "blacklist"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const negocioID = String(body.negocioID ?? "").trim();
    const consulta = String(body.consulta ?? "") as ConsultaImeiId;
    const imei = String(body.imei ?? "").replace(/\D/g, "");

    if (!negocioIdValido(negocioID)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }
    if (!CONSULTAS.has(consulta)) {
      return NextResponse.json({ error: "Consulta inválida." }, { status: 400 });
    }
    if (imei.length !== 15) {
      return NextResponse.json({ error: "El IMEI tiene que tener 15 dígitos." }, { status: 400 });
    }

    const sesion = await verificarAccesoPanelTienda(req.headers.get("authorization"), negocioID);
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const plan = await leerPlanControlImei(negocioID);
    if (!consultaIncluida(plan, consulta)) {
      return NextResponse.json(
        { error: "Esa consulta no está incluida en el plan de este negocio." },
        { status: 403 }
      );
    }

    const apiKey = await leerClaveIfreePlataforma();
    if (!apiKey) {
      return NextResponse.json(
        { error: "El control de IMEI todavía no está listo. Avisanos y lo activamos." },
        { status: 400 }
      );
    }

    const resultado = await consultarImeiIfree(apiKey, consulta, imei);
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo consultar el IMEI.";
    console.error("[ifree/consultar]", mensaje);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
