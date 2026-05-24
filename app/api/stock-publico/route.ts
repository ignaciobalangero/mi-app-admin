import { NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebaseAdmin";
import { filtrarItemsBusqueda } from "@/lib/stockPublicoBusqueda";
import {
  coincideChipCategoria,
  type ChipCategoria,
} from "@/lib/catalogoChipCategoria";
import type { CatalogoPublicoOpciones, ItemStockPublico } from "@/lib/stockPublicoTypes";
import { parseTiendaPublica, type TiendaPublicaInfo } from "@/lib/tiendaPublicaTypes";
import { extraerLogoUrl, rutasConfigLogo } from "@/lib/logoNegocio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_BROWSE_LIMIT = 24;
const MAX_LIMIT = 80;
const MIN_SEARCH_CHARS = 2;
const CHIPS_VALIDOS: ChipCategoria[] = ["todas", "pantallas", "baterias", "otros"];

function parseChip(raw: string | null | undefined): ChipCategoria {
  const v = String(raw ?? "todas")
    .trim()
    .toLowerCase();
  return CHIPS_VALIDOS.includes(v as ChipCategoria) ? (v as ChipCategoria) : "todas";
}

const DEFAULT_CATALOGO: CatalogoPublicoOpciones = {
  mostrarCodigo: true,
  mostrarMarca: true,
  mostrarCategoria: true,
  mostrarStock: true,
  mostrarPrecio: true,
  mostrarFoto: true,
  agruparPorMarca: false,
  catalogoSoloRepuestosMarcados: false,
};

function mergeCatalogo(raw: unknown): CatalogoPublicoOpciones {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CATALOGO };
  return { ...DEFAULT_CATALOGO, ...(raw as CatalogoPublicoOpciones) };
}

function negocioIdValido(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/** Acepta número o string (coma decimal o miles tipo 1.234,56). */
function parseNumeroFirestore(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function monedaEsUSD(d: Record<string, unknown>): boolean {
  const m = String(d.moneda ?? "")
    .trim()
    .toUpperCase();
  return m === "USD" || m === "US$" || m === "DOLAR" || m === "DÓLAR";
}

function extraerFotoURL(
  d: Record<string, unknown>,
  campoFoto?: string
): string | null {
  const list: unknown[] = [];
  if (campoFoto?.trim()) list.push(d[campoFoto.trim()]);
  list.push(
    d.fotoURL,
    d.imagen,
    d.urlFoto,
    d.photoURL,
    d.img,
    d.imagenURL,
    d.foto,
    d.imageUrl
  );
  for (const c of list) {
    if (typeof c === "string") {
      const t = c.trim();
      if (t.startsWith("https://") || t.startsWith("http://")) return t;
    }
  }
  return null;
}

function resolverPreciosVenta(
  d: Record<string, unknown>,
  cotizacionUSD: number
): { moneda: "ARS" | "USD"; precio1: number; precioVentaARS: number } {
  const esUSD = monedaEsUSD(d);
  const moneda: "ARS" | "USD" = esUSD ? "USD" : "ARS";

  /** Primera lista de precios con dato (muchas planillas solo cargan lista 2 o 3). */
  let pLista = 0;
  let pPesos = 0;
  const niveles: [unknown, unknown][] = [
    [d.precio1, d.precio1Pesos],
    [d.precio2, d.precio2Pesos],
    [d.precio3, d.precio3Pesos],
  ];
  for (const [rawLista, rawPesos] of niveles) {
    const lista = parseNumeroFirestore(rawLista);
    const pesos = parseNumeroFirestore(rawPesos);
    if (lista > 0 || pesos > 0) {
      pLista = lista;
      pPesos = pesos;
      break;
    }
  }

  if (!pLista && !pPesos) {
    pLista = parseNumeroFirestore(
      d.precio1 ??
        d.precioLista1 ??
        d.precioVenta ??
        d.precioPublico ??
        d.precioPvp ??
        d.precio
    );
    pPesos = parseNumeroFirestore(
      d.precio1Pesos ?? d.precioARS ?? d.precioPesos ?? d.precioEnPesos
    );
  }

  if (esUSD) {
    let precioUSD = pLista;
    if (!precioUSD && pPesos > 0 && cotizacionUSD > 0) {
      precioUSD = pPesos / cotizacionUSD;
    }
    let precioARS = pPesos;
    if (!precioARS && precioUSD > 0 && cotizacionUSD > 0) {
      precioARS = Math.round(precioUSD * cotizacionUSD);
    }
    return {
      moneda: "USD",
      precio1: Math.round(precioUSD * 100) / 100,
      precioVentaARS: Math.round(precioARS || 0),
    };
  }

  const precioARS = pPesos > 0 ? pPesos : pLista;
  const precioListaNum = pLista > 0 ? pLista : precioARS;
  return {
    moneda: "ARS",
    precio1: Math.round(precioListaNum * 100) / 100,
    precioVentaARS: Math.round(precioARS || 0),
  };
}

function esPublicadoEnCatalogo(d: Record<string, unknown>): boolean {
  return (
    d.publicarEnCatalogoWeb === true ||
    d.publicarEnCatalogoWeb === 1 ||
    String(d.publicarEnCatalogoWeb).toLowerCase() === "true"
  );
}

function docAItemStockPublico(
  docId: string,
  d: Record<string, unknown>,
  cotizacionUSD: number,
  campoFoto?: string
): ItemStockPublico {
  const { moneda, precio1, precioVentaARS } = resolverPreciosVenta(d, cotizacionUSD);
  const producto = String(d.producto || d.modelo || "").trim();
  const modelo = String(d.modelo || "").trim();

  return {
    id: docId,
    codigo: String(d.codigo ?? docId),
    producto: producto || modelo || docId,
    modelo,
    marca: String(d.marca ?? ""),
    categoria: String(d.categoria ?? ""),
    stock: parseNumeroFirestore(d.cantidad ?? d.stock),
    moneda,
    precio1,
    precioVentaARS,
    fotoURL: extraerFotoURL(d, campoFoto),
    observacion: String(d.observacion ?? "").trim() || null,
  };
}

function ordenarItems(items: ItemStockPublico[]): ItemStockPublico[] {
  return [...items].sort((a, b) =>
    (a.producto || a.codigo).localeCompare(b.producto || b.codigo, "es", { sensitivity: "base" })
  );
}

async function fetchStockPublicoInterno(
  negocioId: string,
  opts?: { q?: string; limit?: number; chip?: ChipCategoria }
): Promise<{
  negocioId: string;
  nombreTienda: string;
  logoUrl: string | null;
  tiendaPublica: TiendaPublicaInfo;
  whatsappPedidos: string | null;
  catalogoPublico: CatalogoPublicoOpciones;
  cotizacionUSD: number;
  actualizadoISO: string;
  modo: "browse" | "search";
  chip: ChipCategoria;
  limite: number;
  total: number;
  hayMas: boolean;
  items: ItemStockPublico[];
}> {
  const qBusqueda = (opts?.q ?? "").trim();
  const chip = parseChip(opts?.chip);
  const modo: "browse" | "search" =
    qBusqueda.length >= MIN_SEARCH_CHARS ? "search" : "browse";
  const needsFullCatalog = modo === "search" || chip !== "todas";
  const limite = Math.min(
    Math.max(
      Number(opts?.limit) ||
        (modo === "search" ? 80 : chip !== "todas" ? 80 : DEFAULT_BROWSE_LIMIT),
      1
    ),
    MAX_LIMIT
  );

  const negocioRef = adminDb.doc(`negocios/${negocioId}`);
  const monedaRef = adminDb.doc(`negocios/${negocioId}/configuracion/moneda`);
  const datosRef = adminDb.doc(`negocios/${negocioId}/configuracion/datos`);
  const stockCol = adminDb.collection(`negocios/${negocioId}/stockRepuestos`);

  const [negSnap, monedaSnap, datosSnap] = await Promise.all([
    negocioRef.get(),
    monedaRef.get(),
    datosRef.get(),
  ]);

  const neg = negSnap.exists ? negSnap.data() : {};
  const datos = datosSnap.exists ? (datosSnap.data() as Record<string, unknown>) : {};

  let logoUrl =
    extraerLogoUrl(datos) || extraerLogoUrl(neg as Record<string, unknown>);

  if (!logoUrl) {
    for (const ruta of rutasConfigLogo(negocioId).slice(1)) {
      const subId = ruta.split("/").pop()!;
      if (subId === "datos") continue;
      const snap = await adminDb.doc(ruta).get();
      if (snap.exists) {
        logoUrl = extraerLogoUrl(snap.data() as Record<string, unknown>);
        if (logoUrl) break;
      }
    }
  }

  const rawWa = String(
    datos?.whatsappPedidos ??
      datos?.whatsappPedido ??
      datos?.telefonoPedidos ??
      (typeof datos?.telefono === "string" ? datos.telefono : "") ??
      (typeof datos?.celular === "string" ? datos.celular : "")
  ).trim();
  const soloDigitos = rawWa.replace(/\D/g, "");
  const whatsappPedidos = soloDigitos.length >= 10 ? soloDigitos : null;

  const tiendaPublica = parseTiendaPublica(
    datos,
    (neg ?? {}) as Record<string, unknown>,
    negocioId,
    whatsappPedidos,
    logoUrl
  );
  const nombreTienda = tiendaPublica.nombre;

  const catalogoPublico = mergeCatalogo(datos?.catalogoPublico);

  let cotizacionUSD = 1000;
  if (monedaSnap.exists) {
    const m = monedaSnap.data();
    cotizacionUSD = Number(m?.dolarManual) || 1000;
  }

  const campoFoto = catalogoPublico.campoFoto;
  const soloMarcados = catalogoPublico.catalogoSoloRepuestosMarcados === true;

  let stockSnap;
  if (needsFullCatalog) {
    stockSnap = soloMarcados
      ? await stockCol.where("publicarEnCatalogoWeb", "==", true).get()
      : await stockCol.get();
  } else if (soloMarcados) {
    stockSnap = await stockCol.where("publicarEnCatalogoWeb", "==", true).limit(500).get();
  } else {
    try {
      stockSnap = await stockCol.orderBy("codigo", "asc").limit(limite).get();
    } catch {
      stockSnap = await stockCol.limit(limite).get();
    }
  }

  let items: ItemStockPublico[] = stockSnap.docs
    .map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      if (soloMarcados && !esPublicadoEnCatalogo(d)) return null;
      return docAItemStockPublico(doc.id, d, cotizacionUSD, campoFoto);
    })
    .filter((x): x is ItemStockPublico => x !== null);

  items = ordenarItems(items);

  let total = items.length;
  let hayMas = false;

  if (modo === "search") {
    items = filtrarItemsBusqueda(items, qBusqueda);
  }
  if (chip !== "todas") {
    items = items.filter((it) => coincideChipCategoria(it, chip));
  }

  total = items.length;
  hayMas = total > limite;
  items = items.slice(0, limite);

  return {
    negocioId,
    nombreTienda,
    logoUrl,
    tiendaPublica,
    whatsappPedidos,
    catalogoPublico,
    cotizacionUSD,
    actualizadoISO: new Date().toISOString(),
    modo,
    chip,
    limite,
    total,
    hayMas,
    items,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";

  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Parámetro negocioId inválido." }, { status: 400 });
  }

  try {
    const q = searchParams.get("q")?.trim() ?? "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const chip = parseChip(searchParams.get("chip"));

    const payload = await fetchStockPublicoInterno(negocioId, { q, limit, chip });
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al leer stock.";
    console.error("[stock-publico]", negocioId, e);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
