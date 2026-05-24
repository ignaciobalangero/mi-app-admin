import { normalizarUrlExterna } from "@/lib/urlExterna";

/** Datos de contacto e información del pie de la tienda web pública. */
export type TiendaPublicaInfo = {
  nombre: string;
  logoUrl: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  direccion: string | null;
  horarios: string | null;
  comoComprar: string;
  pagoEnvios: string;
  productosGarantia: string;
  mediosPago: string | null;
  mediosEnvio: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  tiktok: string | null;
  /** Logo Gestione para banner promocional en consulta-stock. */
  gestioneLogoUrl: string | null;
  /** Enlace opcional al hacer clic en el banner Gestione. */
  gestioneEnlace: string | null;
  /** URL Google Drive u otro enlace — banner lista precios gremio. */
  listaPreciosGremioUrl: string | null;
  /** Texto del banner clicable (lista gremio). */
  listaPreciosGremioTitulo: string;
};

export const DEFAULT_LISTA_PRECIOS_GREMIO_TITULO =
  "Lista de precios de trabajos a gremio";

export const DEFAULT_TIENDA_PUBLICA_TEXTOS = {
  comoComprar:
    "Elegí los repuestos, agregalos al carrito y tocá «Finalizar por WhatsApp». Te confirmamos stock, precio y forma de pago.",
  pagoEnvios:
    "Coordinamos pago y envío al confirmar el pedido. Retiro en local o envíos a todo el país según disponibilidad.",
  productosGarantia:
    "Trabajamos con repuestos originales y alternativos. La garantía depende del producto — consultanos al hacer el pedido.",
};

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

function strField(obj: Record<string, unknown>, key: string, fallback: string): string {
  const v = strOrNull(obj[key]);
  return v ?? fallback;
}

/** Lee `tiendaPublica` y campos sueltos de `configuracion/datos`. */
export function parseTiendaPublica(
  datos: Record<string, unknown>,
  neg: Record<string, unknown>,
  negocioId: string,
  whatsappPedidos: string | null,
  logoUrl: string | null
): TiendaPublicaInfo {
  const tp =
    datos.tiendaPublica && typeof datos.tiendaPublica === "object"
      ? (datos.tiendaPublica as Record<string, unknown>)
      : {};

  const nombre =
    strOrNull(datos.nombreNegocio) ||
    strOrNull(neg.nombre) ||
    negocioId;

  const telefono =
    strOrNull(tp.telefono) ||
    strOrNull(datos.telefono) ||
    strOrNull(datos.telefonoContacto) ||
    whatsappPedidos;

  const email =
    strOrNull(tp.email) ||
    strOrNull(datos.email) ||
    strOrNull(datos.emailContacto);

  return {
    nombre,
    logoUrl,
    telefono,
    whatsapp: whatsappPedidos,
    email,
    direccion: strOrNull(tp.direccion) || strOrNull(datos.direccion) || strOrNull(datos.domicilio),
    horarios:
      strOrNull(tp.horarios) ||
      strOrNull(datos.horarios) ||
      strOrNull(datos.horarioAtencion),
    comoComprar: strField(tp, "comoComprar", DEFAULT_TIENDA_PUBLICA_TEXTOS.comoComprar),
    pagoEnvios: strField(tp, "pagoEnvios", DEFAULT_TIENDA_PUBLICA_TEXTOS.pagoEnvios),
    productosGarantia: strField(tp, "productosGarantia", DEFAULT_TIENDA_PUBLICA_TEXTOS.productosGarantia),
    mediosPago: strOrNull(tp.mediosPago) || strOrNull(datos.mediosPago),
    mediosEnvio: strOrNull(tp.mediosEnvio) || strOrNull(datos.mediosEnvio),
    instagram: strOrNull(tp.instagram),
    facebook: strOrNull(tp.facebook),
    youtube: strOrNull(tp.youtube),
    tiktok: strOrNull(tp.tiktok),
    gestioneLogoUrl: strOrNull(tp.gestioneLogoUrl),
    gestioneEnlace: (() => {
      const u = normalizarUrlExterna(strOrNull(tp.gestioneEnlace) ?? "");
      return u || null;
    })(),
    listaPreciosGremioUrl: (() => {
      const u = normalizarUrlExterna(strOrNull(tp.listaPreciosGremioUrl) ?? "");
      return u || null;
    })(),
    listaPreciosGremioTitulo:
      strOrNull(tp.listaPreciosGremioTitulo) ?? DEFAULT_LISTA_PRECIOS_GREMIO_TITULO,
  };
}

export type TiendaPublicaEditable = {
  telefono: string;
  email: string;
  direccion: string;
  horarios: string;
  comoComprar: string;
  pagoEnvios: string;
  productosGarantia: string;
  mediosPago: string;
  mediosEnvio: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  gestioneLogoUrl: string;
  gestioneEnlace: string;
  listaPreciosGremioUrl: string;
  listaPreciosGremioTitulo: string;
};

export const TIENDA_PUBLICA_VACIA: TiendaPublicaEditable = {
  telefono: "",
  email: "",
  direccion: "",
  horarios: "",
  comoComprar: DEFAULT_TIENDA_PUBLICA_TEXTOS.comoComprar,
  pagoEnvios: DEFAULT_TIENDA_PUBLICA_TEXTOS.pagoEnvios,
  productosGarantia: DEFAULT_TIENDA_PUBLICA_TEXTOS.productosGarantia,
  mediosPago: "",
  mediosEnvio: "",
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  gestioneLogoUrl: "",
  gestioneEnlace: "",
  listaPreciosGremioUrl: "",
  listaPreciosGremioTitulo: DEFAULT_LISTA_PRECIOS_GREMIO_TITULO,
};

export function tiendaPublicaDesdeFirestore(raw: unknown): TiendaPublicaEditable {
  if (!raw || typeof raw !== "object") return { ...TIENDA_PUBLICA_VACIA };
  const tp = raw as Record<string, unknown>;
  return {
    telefono: String(tp.telefono ?? ""),
    email: String(tp.email ?? ""),
    direccion: String(tp.direccion ?? ""),
    horarios: String(tp.horarios ?? ""),
    comoComprar: String(tp.comoComprar ?? DEFAULT_TIENDA_PUBLICA_TEXTOS.comoComprar),
    pagoEnvios: String(tp.pagoEnvios ?? DEFAULT_TIENDA_PUBLICA_TEXTOS.pagoEnvios),
    productosGarantia: String(tp.productosGarantia ?? DEFAULT_TIENDA_PUBLICA_TEXTOS.productosGarantia),
    mediosPago: String(tp.mediosPago ?? ""),
    mediosEnvio: String(tp.mediosEnvio ?? ""),
    instagram: String(tp.instagram ?? ""),
    facebook: String(tp.facebook ?? ""),
    youtube: String(tp.youtube ?? ""),
    tiktok: String(tp.tiktok ?? ""),
    gestioneLogoUrl: String(tp.gestioneLogoUrl ?? ""),
    gestioneEnlace: String(tp.gestioneEnlace ?? ""),
    listaPreciosGremioUrl: String(tp.listaPreciosGremioUrl ?? ""),
    listaPreciosGremioTitulo: String(
      tp.listaPreciosGremioTitulo ?? DEFAULT_LISTA_PRECIOS_GREMIO_TITULO
    ),
  };
}
