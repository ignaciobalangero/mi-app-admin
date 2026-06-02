import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { negocioIdValido, verificarTokenClienteTienda, refClienteTienda } from "@/lib/tiendaAuthServer";
import {
  CARRITO_TIENDA_TTL_MS,
  type CarritoPersistidoPayload,
  type LineaCarritoPersistida,
} from "@/lib/tiendaCarritoTypes";
import type { ItemStockPublico } from "@/lib/stockPublicoTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LINEAS = 80;

function sanitizarItem(raw: Record<string, unknown>): ItemStockPublico | null {
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    codigo: String(raw.codigo ?? ""),
    producto: String(raw.producto ?? ""),
    modelo: String(raw.modelo ?? ""),
    marca: String(raw.marca ?? ""),
    categoria: String(raw.categoria ?? ""),
    stock: Math.max(0, Math.round(Number(raw.stock) || 0)),
    moneda: raw.moneda === "USD" ? "USD" : "ARS",
    precio1: Number(raw.precio1) || 0,
    precioVentaARS: Number(raw.precioVentaARS) || 0,
    fotoURL: raw.fotoURL ? String(raw.fotoURL) : null,
    fotosURLs: Array.isArray(raw.fotosURLs)
      ? raw.fotosURLs.map(String).slice(0, 8)
      : undefined,
    observacion: raw.observacion ? String(raw.observacion) : null,
  };
}

function parseLineas(raw: unknown): LineaCarritoPersistida[] {
  if (!Array.isArray(raw)) return [];
  const out: LineaCarritoPersistida[] = [];
  for (const row of raw.slice(0, MAX_LINEAS)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const itemId = String(r.itemId ?? "").trim();
    const itemRaw = r.item as Record<string, unknown> | undefined;
    if (!itemId || !itemRaw) continue;
    const item = sanitizarItem({ ...itemRaw, id: itemId });
    if (!item) continue;
    out.push({
      itemId,
      cantidad: Math.max(1, Math.min(999, Math.round(Number(r.cantidad) || 1))),
      item,
    });
  }
  return out;
}

function leerCarritoDoc(data: Record<string, unknown>): CarritoPersistidoPayload | null {
  const raw = data.carritoGuardado;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const actualizadoEn = String(o.actualizadoEn ?? "");
  if (!actualizadoEn) return null;
  const t = new Date(actualizadoEn).getTime();
  if (!Number.isFinite(t) || Date.now() - t > CARRITO_TIENDA_TTL_MS) {
    return null;
  }
  const lineas = parseLineas(o.lineas);
  return { lineas, actualizadoEn };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";
  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const sesion = await verificarTokenClienteTienda(req.headers.get("authorization"), negocioId);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const snap = await db.doc(refClienteTienda(negocioId, sesion.uid)).get();
  if (!snap.exists) {
    return NextResponse.json({ lineas: [], actualizadoEn: null });
  }

  const carrito = leerCarritoDoc(snap.data()!);
  return NextResponse.json(carrito ?? { lineas: [], actualizadoEn: null });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();
    if (!negocioIdValido(negocioId)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }

    const sesion = await verificarTokenClienteTienda(req.headers.get("authorization"), negocioId);
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const lineas = parseLineas(body.lineas);
    const ahora = new Date().toISOString();
    const ref = db.doc(refClienteTienda(negocioId, sesion.uid));

    if (lineas.length === 0) {
      await ref.update({
        carritoGuardado: null,
        actualizadoEn: ahora,
      });
      return NextResponse.json({ ok: true, lineas: [], actualizadoEn: ahora });
    }

    await ref.update({
      carritoGuardado: { lineas, actualizadoEn: ahora },
      actualizadoEn: ahora,
    });

    return NextResponse.json({ ok: true, lineas, actualizadoEn: ahora });
  } catch (e: unknown) {
    console.error("[tienda/carrito PUT]", e);
    return NextResponse.json({ error: "Error al guardar carrito." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";
  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const sesion = await verificarTokenClienteTienda(req.headers.get("authorization"), negocioId);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const ahora = new Date().toISOString();
  await db.doc(refClienteTienda(negocioId, sesion.uid)).update({
    carritoGuardado: null,
    actualizadoEn: ahora,
  });

  return NextResponse.json({ ok: true });
}
