import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ProductoCodigoBarras = {
  id: string;
  coleccion: "stockAccesorios" | "stockRepuestos";
  tipo: "accesorio" | "repuesto";
  codigo: string;
  codigoBarras?: string;
  producto: string;
  cantidad: number;
  precioCosto: number;
  precioCostoPesos?: number;
  moneda?: "ARS" | "USD" | string;
};

const PREFIJO_ACC = "G1:ACC:";
const PREFIJO_REP = "G1:REP:";

export function normalizarCodigoEscaneado(raw: string): string {
  return String(raw || "").trim();
}

function origenApp(): string {
  const envUrl = String(process.env.NEXT_PUBLIC_URL || "").replace(/\/$/, "");
  // Preferí la URL pública configurada (etiquetas usables desde el celular)
  if (envUrl) return envUrl;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/** Ruta interna del producto en stock. */
export function pathProductoStock(
  tipo: "accesorio" | "repuesto",
  id: string
): string {
  const base =
    tipo === "accesorio"
      ? "/ventas/stock-accesorios-repuestos/accesorios"
      : "/ventas/stock-accesorios-repuestos/repuestos";
  return `${base}?id=${encodeURIComponent(id)}&ingreso=1`;
}

/** URL absoluta para QR: al escanear con el celular abre el producto en la app. */
export function urlEtiquetaProducto(
  tipo: "accesorio" | "repuesto",
  id: string,
  origin?: string
): string {
  const base = String(origin || origenApp()).replace(/\/$/, "");
  return `${base}${pathProductoStock(tipo, id)}`;
}

/** Payload corto para código de barras 1D. */
export function payloadEtiquetaProducto(
  tipo: "accesorio" | "repuesto",
  id: string
): string {
  return tipo === "accesorio" ? `${PREFIJO_ACC}${id}` : `${PREFIJO_REP}${id}`;
}

/** Código corto (barras): prioriza codigoBarras del producto. */
export function codigoParaEtiqueta(p: {
  id: string;
  tipo: "accesorio" | "repuesto";
  codigoBarras?: string;
  codigo?: string;
}): string {
  const barras = String(p.codigoBarras || "").trim();
  if (barras) return barras;
  return payloadEtiquetaProducto(p.tipo, p.id);
}

/** Contenido del QR: siempre un link que abre el producto. */
export function codigoParaEtiquetaQr(p: {
  id: string;
  tipo: "accesorio" | "repuesto";
}): string {
  return urlEtiquetaProducto(p.tipo, p.id);
}

/** Si el escaneo es una URL de stock, extrae tipo + id. */
export function parsearUrlProductoStock(raw: string): {
  tipo: "accesorio" | "repuesto";
  id: string;
} | null {
  const texto = normalizarCodigoEscaneado(raw);
  if (!texto) return null;

  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://local.invalid";
    const u = new URL(texto, base);
    const id = u.searchParams.get("id")?.trim() || "";
    if (!id) return null;
    if (u.pathname.includes("/accesorios")) return { tipo: "accesorio", id };
    if (u.pathname.includes("/repuestos")) return { tipo: "repuesto", id };
  } catch {
    /* no es URL */
  }
  return null;
}

function mapDoc(
  id: string,
  data: Record<string, unknown>,
  coleccion: "stockAccesorios" | "stockRepuestos"
): ProductoCodigoBarras {
  return {
    id,
    coleccion,
    tipo: coleccion === "stockAccesorios" ? "accesorio" : "repuesto",
    codigo: String(data.codigo ?? id),
    codigoBarras: data.codigoBarras ? String(data.codigoBarras) : undefined,
    producto: String(data.producto || data.modelo || "Producto"),
    cantidad: Number(data.cantidad) || 0,
    precioCosto: Number(data.precioCosto) || 0,
    precioCostoPesos:
      data.precioCostoPesos != null ? Number(data.precioCostoPesos) : undefined,
    moneda: (data.moneda as string) || "ARS",
  };
}

function coincideCodigo(data: Record<string, unknown>, id: string, codigo: string): boolean {
  const c = codigo.toLowerCase();
  const barras = String(data.codigoBarras || "").trim().toLowerCase();
  const interno = String(data.codigo || "").trim().toLowerCase();
  return barras === c || interno === c || id.toLowerCase() === c;
}

/**
 * Busca accesorio o repuesto por código de barras, URL de etiqueta,
 * código interno, id o payload G1:ACC:/G1:REP:.
 */
export async function buscarProductoPorCodigoBarras(
  negocioID: string,
  raw: string
): Promise<ProductoCodigoBarras | null> {
  const codigo = normalizarCodigoEscaneado(raw);
  if (!negocioID || !codigo) return null;

  const desdeUrl = parsearUrlProductoStock(codigo);
  if (desdeUrl) {
    const coleccion =
      desdeUrl.tipo === "accesorio" ? "stockAccesorios" : "stockRepuestos";
    const snap = await getDoc(
      doc(db, `negocios/${negocioID}/${coleccion}/${desdeUrl.id}`)
    );
    if (!snap.exists()) return null;
    return mapDoc(snap.id, snap.data() as Record<string, unknown>, coleccion);
  }

  if (codigo.startsWith(PREFIJO_ACC)) {
    const id = codigo.slice(PREFIJO_ACC.length).trim();
    if (!id) return null;
    const snap = await getDoc(doc(db, `negocios/${negocioID}/stockAccesorios/${id}`));
    if (!snap.exists()) return null;
    return mapDoc(snap.id, snap.data() as Record<string, unknown>, "stockAccesorios");
  }

  if (codigo.startsWith(PREFIJO_REP)) {
    const id = codigo.slice(PREFIJO_REP.length).trim();
    if (!id) return null;
    const snap = await getDoc(doc(db, `negocios/${negocioID}/stockRepuestos/${id}`));
    if (!snap.exists()) return null;
    return mapDoc(snap.id, snap.data() as Record<string, unknown>, "stockRepuestos");
  }

  const [accSnap, repSnap] = await Promise.all([
    getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`)),
    getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`)),
  ]);

  for (const d of accSnap.docs) {
    if (coincideCodigo(d.data() as Record<string, unknown>, d.id, codigo)) {
      return mapDoc(d.id, d.data() as Record<string, unknown>, "stockAccesorios");
    }
  }

  for (const d of repSnap.docs) {
    if (coincideCodigo(d.data() as Record<string, unknown>, d.id, codigo)) {
      return mapDoc(d.id, d.data() as Record<string, unknown>, "stockRepuestos");
    }
  }

  return null;
}
