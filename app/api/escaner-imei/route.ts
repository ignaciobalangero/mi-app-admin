import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { negocioIdValido } from "@/lib/tiendaAuthServer";
import { verificarAccesoPanelTienda } from "@/lib/tiendaPanelAuth";
import { extraerImei } from "@/lib/extraerImei";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLECCION = "sesionesEscaneoImei";
const VIGENCIA_MS = 8 * 60 * 60 * 1000;
const CONECTADO_MS = 12_000;

function tokenValido(token: string): boolean {
  return /^[a-f0-9]{32}$/.test(token);
}

function imeiDe(raw: unknown): string | null {
  const imei = extraerImei(String(raw ?? ""));
  if (!imei || imei.length < 14 || imei.length > 15) return null;
  return imei;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accion = String(body.accion ?? "");

    if (accion === "crear") {
      const negocioID = String(body.negocioID ?? "").trim();
      if (!negocioIdValido(negocioID)) {
        return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
      }
      const sesion = await verificarAccesoPanelTienda(req.headers.get("authorization"), negocioID);
      if (!sesion) {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
      }

      const modo = body.modo === "codigo" ? "codigo" : "imei";
      const token = randomBytes(16).toString("hex");
      const ahora = Date.now();
      await db.collection(COLECCION).doc(token).set({
        negocioID,
        uid: sesion.uid,
        modo,
        creadoEn: ahora,
        expiraEn: ahora + VIGENCIA_MS,
        imei: "",
        codigo: "",
        seq: 0,
        pingEn: 0,
      });
      return NextResponse.json({ ok: true, token, modo });
    }

    const token = String(body.token ?? "").trim();
    if (!tokenValido(token)) {
      return NextResponse.json({ error: "El link no sirve. Generá otro en la computadora." }, { status: 400 });
    }

    const ref = db.collection(COLECCION).doc(token);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "El link venció. Generá otro QR en la computadora." }, { status: 404 });
    }
    const data = snap.data() || {};
    if (Number(data.expiraEn || 0) < Date.now()) {
      return NextResponse.json({ error: "El link venció. Generá otro QR en la computadora." }, { status: 410 });
    }

    if (accion === "ping") {
      await ref.update({ pingEn: Date.now() });
      return NextResponse.json({ ok: true });
    }

    if (accion === "enviar") {
      if (String(data.modo || "imei") === "codigo") {
        const codigo = String(body.codigo ?? "")
          .replace(/[\u0000-\u001F\u007F]/g, "")
          .trim()
          .slice(0, 500);
        if (!codigo) {
          return NextResponse.json({ error: "No se leyó un código." }, { status: 400 });
        }
        await ref.update({
          codigo,
          seq: FieldValue.increment(1),
          enviadoEn: Date.now(),
          pingEn: Date.now(),
        });
        return NextResponse.json({ ok: true, codigo });
      }

      const imei = imeiDe(body.imei);
      if (!imei) {
        return NextResponse.json({ error: "Ese código no tiene un IMEI de 15 dígitos." }, { status: 400 });
      }
      await ref.update({
        imei,
        seq: FieldValue.increment(1),
        enviadoEn: Date.now(),
        pingEn: Date.now(),
      });
      return NextResponse.json({ ok: true, imei });
    }

    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  } catch (error) {
    console.error("[escaner-imei]", error);
    return NextResponse.json({ error: "No se pudo usar el escáner." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = String(url.searchParams.get("token") || "").trim();
    const negocioID = String(url.searchParams.get("negocioID") || "").trim();
    if (!tokenValido(token) || !negocioIdValido(negocioID)) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
    }

    const sesion = await verificarAccesoPanelTienda(req.headers.get("authorization"), negocioID);
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const snap = await db.collection(COLECCION).doc(token).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "La sesión no existe." }, { status: 404 });
    }
    const data = snap.data() || {};
    if (String(data.negocioID || "") !== negocioID) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const pingEn = Number(data.pingEn || 0);
    return NextResponse.json({
      ok: true,
      imei: String(data.imei || ""),
      codigo: String(data.codigo || ""),
      modo: String(data.modo || "imei"),
      seq: Number(data.seq || 0),
      conectado: Date.now() - pingEn < CONECTADO_MS,
    });
  } catch (error) {
    console.error("[escaner-imei]", error);
    return NextResponse.json({ error: "No se pudo leer el escáner." }, { status: 500 });
  }
}
