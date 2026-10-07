import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ColeccionCodigoBarras =
  | "stockAccesorios"
  | "stockRepuestos"
  | "stockExtra";

export type TipoProductoCodigoBarras = "accesorio" | "repuesto" | "extra";

export type ProductoCodigoBarras = {
  id: string;
  coleccion: ColeccionCodigoBarras;
  tipo: TipoProductoCodigoBarras;
  codigo: string;
  codigoBarras?: string;
  producto: string;
  cantidad: number;
  precioCosto: number;
  precioCostoPesos?: number;
  moneda?: "ARS" | "USD" | string;
  marca?: string;
  categoria?: string;
};

const PREFIJO_ACC = "G1:ACC:";
const PREFIJO_REP = "G1:REP:";
const PREFIJO_EXT = "G1:EXT:";

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
  tipo: TipoProductoCodigoBarras,
  id: string
): string {
  if (tipo === "extra") {
    return `/integracion-sheet/stock-repuestos-sheet?id=${encodeURIComponent(id)}&ingreso=1`;
  }
  const base =
    tipo === "accesorio"
      ? "/ventas/stock-accesorios-repuestos/accesorios"
      : "/ventas/stock-accesorios-repuestos/repuestos";
  return `${base}?id=${encodeURIComponent(id)}&ingreso=1`;
}

/** URL absoluta para QR: al escanear con el celular abre el producto en la app. */
export function urlEtiquetaProducto(
  tipo: TipoProductoCodigoBarras,
  id: string,
  origin?: string
): string {
  const base = String(origin || origenApp()).replace(/\/$/, "");
  return `${base}${pathProductoStock(tipo, id)}`;
}

/** Payload corto para código de barras 1D. */
export function payloadEtiquetaProducto(
  tipo: TipoProductoCodigoBarras,
  id: string
): string {
  if (tipo === "accesorio") return `${PREFIJO_ACC}${id}`;
  if (tipo === "extra") return `${PREFIJO_EXT}${id}`;
  return `${PREFIJO_REP}${id}`;
}

/** Código corto (barras): prioriza codigoBarras del producto. */
export function codigoParaEtiqueta(p: {
  id: string;
  tipo: TipoProductoCodigoBarras;
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
  tipo: TipoProductoCodigoBarras;
}): string {
  return urlEtiquetaProducto(p.tipo, p.id);
}

/** Si el escaneo es una URL de stock, extrae tipo + id. */
export function parsearUrlProductoStock(raw: string): {
  tipo: TipoProductoCodigoBarras;
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
    if (
      u.pathname.includes("/integracion-sheet") ||
      u.pathname.includes("/stock-repuestos-sheet") ||
      u.pathname.includes("/stock-sheet")
    ) {
      return { tipo: "extra", id };
    }
  } catch {
    /* no es URL */
  }
  return null;
}

function tipoDeColeccion(coleccion: ColeccionCodigoBarras): TipoProductoCodigoBarras {
  if (coleccion === "stockAccesorios") return "accesorio";
  if (coleccion === "stockExtra") return "extra";
  return "repuesto";
}

function monedaDefault(coleccion: ColeccionCodigoBarras): string {
  return coleccion === "stockExtra" ? "USD" : "ARS";
}

function mapDoc(
  id: string,
  data: Record<string, unknown>,
  coleccion: ColeccionCodigoBarras
): ProductoCodigoBarras {
  return {
    id,
    coleccion,
    tipo: tipoDeColeccion(coleccion),
    codigo: String(data.codigo ?? id),
    codigoBarras: data.codigoBarras ? String(data.codigoBarras) : undefined,
    producto: String(data.producto || data.modelo || "Producto"),
    cantidad: Number(data.cantidad) || 0,
    precioCosto: Number(data.precioCosto) || 0,
    precioCostoPesos:
      data.precioCostoPesos != null ? Number(data.precioCostoPesos) : undefined,
    moneda: (data.moneda as string) || monedaDefault(coleccion),
    marca: data.marca ? String(data.marca) : data.proveedor ? String(data.proveedor) : undefined,
    categoria: data.categoria ? String(data.categoria) : undefined,
  };
}

function coincideCodigo(data: Record<string, unknown>, id: string, codigo: string): boolean {
  const c = codigo.toLowerCase();
  const barras = String(data.codigoBarras || "").trim().toLowerCase();
  const interno = String(data.codigo || "").trim().toLowerCase();
  return barras === c || interno === c || id.toLowerCase() === c;
}

/**
 * Busca accesorio, repuesto o stockExtra por código de barras, URL de etiqueta,
 * código interno, id o payload G1:ACC:/G1:REP:/G1:EXT:.
 */
export async function buscarProductoPorCodigoBarras(
  negocioID: string,
  raw: string
): Promise<ProductoCodigoBarras | null> {
  const codigo = normalizarCodigoEscaneado(raw);
  if (!negocioID || !codigo) return null;

  const desdeUrl = parsearUrlProductoStock(codigo);
  if (desdeUrl) {
    const coleccion: ColeccionCodigoBarras =
      desdeUrl.tipo === "accesorio"
        ? "stockAccesorios"
        : desdeUrl.tipo === "extra"
          ? "stockExtra"
          : "stockRepuestos";
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

  if (codigo.startsWith(PREFIJO_EXT)) {
    const id = codigo.slice(PREFIJO_EXT.length).trim();
    if (!id) return null;
    const snap = await getDoc(doc(db, `negocios/${negocioID}/stockExtra/${id}`));
    if (!snap.exists()) return null;
    return mapDoc(snap.id, snap.data() as Record<string, unknown>, "stockExtra");
  }

  const [accSnap, repSnap, extraSnap] = await Promise.all([
    getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`)),
    getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`)),
    getDocs(collection(db, `negocios/${negocioID}/stockExtra`)),
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

  for (const d of extraSnap.docs) {
    if (coincideCodigo(d.data() as Record<string, unknown>, d.id, codigo)) {
      return mapDoc(d.id, d.data() as Record<string, unknown>, "stockExtra");
    }
  }

  return null;
}
