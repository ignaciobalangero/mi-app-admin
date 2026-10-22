import { NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebaseAdmin";
import { extraerLogoUrl, rutasConfigLogo } from "@/lib/logoNegocio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_EQUIPOS = 400;
const MAX_FOTOS = 12;

function negocioIdValido(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

function parseNumero(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fotosPublicas(d: Record<string, unknown>): string[] {
  const crudas: unknown[] = [];
  if (Array.isArray(d.fotosURLs)) crudas.push(...d.fotosURLs);
  crudas.push(d.fotoURL);
  const urls: string[] = [];
  for (const c of crudas) {
    if (typeof c !== "string") continue;
    const t = c.trim();
    if (!t.startsWith("https://")) continue;
    if (!urls.includes(t)) urls.push(t);
    if (urls.length >= MAX_FOTOS) break;
  }
  return urls;
}

function etiqueta(estado: string): string {
  const e = estado.trim().toLowerCase();
  if (e === "nuevo") return "Nuevo";
  if (e === "usado") return "Usado";
  if (e === "sellado" || e === "sellados") return "Sellado";
  if (!e) return "";
  return e.charAt(0).toUpperCase() + e.slice(1);
}

/**
 * Catálogo público de celulares.
 * Solo devuelve modelo, estado, condición y el precio de UNA lista.
 * No incluye costo, IMEI, serial, proveedor ni observaciones.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = String(searchParams.get("negocioId") || "").trim();
  const listaRaw = String(searchParams.get("lista") || "venta").trim().toLowerCase();
  const lista = listaRaw === "mayorista" ? "mayorista" : "minorista";

  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  }

  try {
    const negocioRef = adminDb.doc(`negocios/${negocioId}`);
    const datosRef = adminDb.doc(`negocios/${negocioId}/configuracion/datos`);
    const [negSnap, datosSnap, stockSnap] = await Promise.all([
      negocioRef.get(),
      datosRef.get(),
      adminDb.collection(`negocios/${negocioId}/stockTelefonos`).limit(MAX_EQUIPOS).get(),
    ]);

    if (!negSnap.exists) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const neg = (negSnap.data() || {}) as Record<string, unknown>;
    const datos = datosSnap.exists
      ? ((datosSnap.data() || {}) as Record<string, unknown>)
      : {};

    let logoUrl = extraerLogoUrl(datos) || extraerLogoUrl(neg);
    if (!logoUrl) {
      for (const ruta of rutasConfigLogo(negocioId).slice(1)) {
        const snap = await adminDb.doc(ruta).get();
        if (!snap.exists) continue;
        logoUrl = extraerLogoUrl(snap.data() as Record<string, unknown>);
        if (logoUrl) break;
      }
    }

    const nombre = String(
      datos.nombreNegocio || datos.nombre || neg.nombre || neg.nombreNegocio || "Celulares"
    ).trim();

    const equipos = stockSnap.docs
      .map((docu) => {
        const d = docu.data() as Record<string, unknown>;
        if (d.enServicio === true) return null;
        const modelo = String(d.modelo || "").trim();
        const marca = String(d.marca || "").trim();
        if (!modelo && !marca) return null;
        const precioRaw =
          lista === "mayorista" ? d.precioMayorista : d.precioVenta ?? d.precio;
        const moneda = String(d.moneda || "USD").toUpperCase() === "ARS" ? "ARS" : "USD";
        const estado = String(d.estado || "").trim();
        return {
          id: docu.id,
          marca,
          modelo: modelo || marca,
          color: String(d.color || "").trim(),
          gb: String(d.gb || "").trim(),
          bateria: String(d.bateria || "").trim(),
          estado: etiqueta(estado),
          moneda,
          precio: Math.max(0, parseNumero(precioRaw)),
          fotos: fotosPublicas(d),
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) =>
        `${a.modelo} ${a.gb} ${a.color}`.localeCompare(
          `${b.modelo} ${b.gb} ${b.color}`,
          "es",
          { numeric: true, sensitivity: "base" }
        )
      );

    return NextResponse.json(
      {
        nombre,
        logoUrl,
        lista,
        equipos,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex",
        },
      }
    );
  } catch (error) {
    console.error("celulares-publicos", error);
    return NextResponse.json({ error: "No se pudo abrir el catálogo" }, { status: 500 });
  }
}
