"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Package,
  LayoutGrid,
  Monitor,
  Battery,
  Layers,
  X,
  ZoomIn,
} from "lucide-react";
import type { CatalogoPublicoOpciones, ItemStockPublico } from "@/lib/stockPublicoTypes";
import {
  itemConPrecioARS,
  subtotalLineaARS,
  textoPrecioTienda,
  sinPrecioLista,
} from "@/lib/stockPublicoPrecios";
import { coincideBusqueda, tokensBusqueda } from "@/lib/stockPublicoBusqueda";
import FooterTienda from "../components/FooterTienda";
import type { TiendaPublicaInfo } from "@/lib/tiendaPublicaTypes";
import { useLogo } from "@/app/components/LogoProvider";

const DEFAULT_OPS: CatalogoPublicoOpciones = {
  mostrarCodigo: true,
  mostrarMarca: true,
  mostrarCategoria: true,
  mostrarStock: true,
  mostrarPrecio: true,
  mostrarFoto: true,
  agruparPorMarca: false,
};

type Payload = {
  negocioId: string;
  nombreTienda: string;
  logoUrl?: string | null;
  tiendaPublica?: TiendaPublicaInfo;
  whatsappPedidos: string | null;
  catalogoPublico?: CatalogoPublicoOpciones;
  cotizacionUSD: number;
  actualizadoISO: string;
  modo: "browse" | "search";
  limite: number;
  total: number;
  hayMas: boolean;
  items: ItemStockPublico[];
};

const MIN_BUSQUEDA_CHARS = 2;
const BROWSE_LIMIT = 24;

type LineaCarrito = {
  item: ItemStockPublico;
  cantidad: number;
};

function normalizarBusqueda(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

type ChipCategoria = "todas" | "pantallas" | "baterias" | "otros";

const CHIPS: {
  id: ChipCategoria;
  label: string;
  hint: string;
  Icon: typeof LayoutGrid;
}[] = [
  { id: "todas", label: "Todos", hint: "Ver catálogo completo", Icon: LayoutGrid },
  { id: "pantallas", label: "Pantallas", hint: "Módulos, LCD, OLED…", Icon: Monitor },
  { id: "baterias", label: "Baterías", hint: "Baterías y pilas", Icon: Battery },
  { id: "otros", label: "Otros", hint: "Resto de repuestos", Icon: Layers },
];

/** Filtro en cliente (siguiente paso: query Firestore por categoría para menos lecturas). */
function coincideChipCategoria(it: ItemStockPublico, chip: ChipCategoria): boolean {
  if (chip === "todas") return true;
  const blob = normalizarBusqueda(
    [it.categoria, it.producto, it.marca].filter(Boolean).join(" ")
  );
  const esPantalla = ["pantalla", "modulo", "módulo", "lcd", "oled", "display", "touch"].some((k) =>
    blob.includes(k)
  );
  const esBateria = ["bater", "pila"].some((k) => blob.includes(k));
  if (chip === "pantallas") return esPantalla;
  if (chip === "baterias") return esBateria;
  if (chip === "otros") return !esPantalla && !esBateria;
  return true;
}

function mergeOps(raw?: CatalogoPublicoOpciones): CatalogoPublicoOpciones {
  return { ...DEFAULT_OPS, ...raw };
}

function MiniFoto({
  url,
  alt,
  className,
  onClick,
  priority = false,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
  onClick?: () => void;
  /** Primeras tarjetas visibles: cargar antes (móvil / above the fold). */
  priority?: boolean;
}) {
  const [fallo, setFallo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const clickable = Boolean(onClick && url && !fallo);

  if (!url || fallo) {
    return (
      <div
        className={`flex items-center justify-center bg-white text-neutral-300 ${className ?? ""}`}
      >
        <Package className="h-1/2 w-1/2 max-h-10 max-w-10" strokeWidth={1.25} />
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-white [color-scheme:light] ${clickable ? "cursor-zoom-in touch-manipulation group/foto" : ""} ${className ?? ""}`}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Ver imagen de ${alt}` : undefined}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-white" aria-hidden />
      {cargando && (
        <div className="absolute inset-0 z-[1] animate-pulse bg-neutral-100" aria-hidden />
      )}
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
        className={`relative z-[2] bg-white object-contain transition-opacity duration-300 ${cargando ? "opacity-0" : "opacity-100"}`}
        style={{ backgroundColor: "#ffffff" }}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setCargando(false)}
        onError={() => {
          setFallo(true);
          setCargando(false);
        }}
      />
      {clickable && (
        <span className="pointer-events-none absolute bottom-2 right-2 z-[3] rounded-full bg-black/50 p-1.5 text-white opacity-80 sm:opacity-0 sm:transition sm:group-hover/foto:opacity-100">
          <ZoomIn className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}

const MAX_MSJ_WHATSAPP = 3500;

function soloDigitosWa(s: string): string {
  return s.replace(/\D/g, "");
}

function construirUrlWhatsApp(telefonoDigitos: string, mensaje: string): string {
  const t = mensaje.slice(0, MAX_MSJ_WHATSAPP);
  return `https://wa.me/${telefonoDigitos}?text=${encodeURIComponent(t)}`;
}

export default function ConsultaStockCliente({ negocioID }: { negocioID: string }) {
  const { logoUrl: logoNegocio, cargandoLogo } = useLogo();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [chipCategoria, setChipCategoria] = useState<ChipCategoria>("todas");
  const [carrito, setCarrito] = useState<Record<string, LineaCarrito>>({});
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<{
    url: string;
    alt: string;
    titulo: string;
  } | null>(null);
  const primeraCargaRef = useRef(true);
  const qRef = useRef(q);
  qRef.current = q;

  const recargarStock = useCallback(async (query: string, esInicial: boolean) => {
    if (esInicial) setLoading(true);
    else setSearching(true);
    setError(null);

    const params = new URLSearchParams({
      negocioId: negocioID,
      limit: String(BROWSE_LIMIT),
      _: String(Date.now()),
    });
    const qTrim = query.trim();
    if (qTrim.length >= MIN_BUSQUEDA_CHARS) {
      params.set("q", qTrim);
    }

    try {
      const res = await fetch(`/api/stock-publico?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el stock.");
      setPayload(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error de red.");
    } finally {
      if (esInicial) setLoading(false);
      else setSearching(false);
    }
  }, [negocioID]);

  useEffect(() => {
    let cancel = false;

    async function cargar(query: string, esInicial: boolean) {
      if (cancel) return;
      await recargarStock(query, esInicial);
    }

    const qTrim = q.trim();
    if (qTrim.length === 0) {
      void cargar("", primeraCargaRef.current);
      primeraCargaRef.current = false;
      return () => {
        cancel = true;
      };
    }

    if (qTrim.length < MIN_BUSQUEDA_CHARS) {
      return;
    }

    const timer = window.setTimeout(() => {
      void cargar(qTrim, false);
    }, 350);

    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [negocioID, q, recargarStock]);

  /** Al volver a la pestaña (ej. después de cargar stock en el panel), refrescar datos. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void recargarStock(qRef.current, false);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [recargarStock]);

  useEffect(() => setPortalReady(true), []);

  const ops = useMemo(() => mergeOps(payload?.catalogoPublico), [payload?.catalogoPublico]);

  /** Misma cotización que Ventas general → `negocios/{id}/configuracion/moneda` (solo lectura en la tienda). */
  const cotizacionSistema = useMemo(() => {
    const n = payload?.cotizacionUSD;
    return typeof n === "number" && n > 0 ? n : 1200;
  }, [payload?.cotizacionUSD]);

  useEffect(() => {
    if (!payload?.items?.length) return;
    const byId = new Map(payload.items.map((i) => [i.id, i]));
    setCarrito((prev) => {
      let changed = false;
      const next: Record<string, LineaCarrito> = {};
      for (const id of Object.keys(prev)) {
        const fresh = byId.get(id);
        if (!fresh) {
          changed = true;
          continue;
        }
        const item = itemConPrecioARS(fresh, cotizacionSistema);
        next[id] = { ...prev[id], item };
        if (item.precioVentaARS !== prev[id].item.precioVentaARS) changed = true;
      }
      return changed ? next : prev;
    });
  }, [payload?.items, cotizacionSistema]);

  const telefonoPedidos = useMemo(() => {
    const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_WHATSAPP_PEDIDOS : undefined;
    const deEnv = env ? soloDigitosWa(String(env)) : "";
    const deApi = payload?.whatsappPedidos ? soloDigitosWa(payload.whatsappPedidos) : "";
    const n = deApi.length >= 10 ? deApi : deEnv;
    return n.length >= 10 ? n : "";
  }, [payload?.whatsappPedidos]);

  const tokens = useMemo(() => tokensBusqueda(q), [q]);

  const filtrados = useMemo(() => {
    if (!payload?.items.length) return [];
    let list = payload.items;
    if (payload.modo === "browse" && tokens.length > 0) {
      list = list.filter((it) => coincideBusqueda(it, tokens));
    }
    return list.filter((it) => coincideChipCategoria(it, chipCategoria));
  }, [payload, tokens, chipCategoria]);

  const visibles = filtrados;

  const gruposPorMarca = useMemo(() => {
    if (!ops.agruparPorMarca) return null;
    const map = new Map<string, ItemStockPublico[]>();
    for (const it of visibles) {
      const m = (it.marca || "").trim() || "Sin marca";
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(it);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "es", { sensitivity: "base" })
    );
  }, [visibles, ops.agruparPorMarca]);

  const cantItemsCarrito = useMemo(
    () => Object.values(carrito).reduce((a, l) => a + l.cantidad, 0),
    [carrito]
  );

  const totalCarritoARS = useMemo(
    () =>
      Object.values(carrito).reduce(
        (a, l) => a + subtotalLineaARS(l.item, l.cantidad, cotizacionSistema),
        0
      ),
    [carrito, cotizacionSistema]
  );

  const agregar = useCallback(
    (it: ItemStockPublico) => {
      const item = itemConPrecioARS(it, cotizacionSistema);
      setCarrito((prev) => {
        const cur = prev[it.id];
        const max = Math.max(0, item.stock);
        const nextQty = (cur?.cantidad ?? 0) + 1;
        if (max > 0 && nextQty > max) return prev;
        return { ...prev, [it.id]: { item, cantidad: nextQty } };
      });
    },
    [cotizacionSistema]
  );

  const menos = useCallback((id: string) => {
    setCarrito((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      if (cur.cantidad <= 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...cur, cantidad: cur.cantidad - 1 } };
    });
  }, []);

  const mas = useCallback((id: string) => {
    setCarrito((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const max = Math.max(0, cur.item.stock);
      if (max > 0 && cur.cantidad >= max) return prev;
      return { ...prev, [id]: { ...cur, cantidad: cur.cantidad + 1 } };
    });
  }, []);

  const quitarLinea = useCallback((id: string) => {
    setCarrito((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const vaciarCarrito = useCallback(() => setCarrito({}), []);

  const finalizarWhatsApp = useCallback(() => {
    if (!telefonoPedidos) {
      window.alert(
        "Falta configurar el WhatsApp para pedidos.\n\n" +
          "Opción A: agregá en Firebase el campo «whatsappPedidos» (solo números, con código país) en el documento:\n" +
          `negocios/${negocioID}/configuracion/datos\n\n` +
          "Opción B: variable de entorno NEXT_PUBLIC_WHATSAPP_PEDIDOS en el servidor (ej. 54911…)."
      );
      return;
    }
    const lineas = Object.values(carrito);
    if (lineas.length === 0) {
      window.alert("Tu carrito está vacío. Agregá productos antes de finalizar.");
      return;
    }

    const nombreTienda = payload?.nombreTienda ?? "Tienda";
    let body = `*Pedido desde la tienda*\n_${nombreTienda}_\n\n`;
    lineas.forEach((l, i) => {
      const sub = subtotalLineaARS(l.item, l.cantidad, cotizacionSistema);
      body += `${i + 1}. ${l.item.producto}\n`;
      body += `   Cód: ${l.item.codigo} · Cant: ${l.cantidad} · ${textoPrecioTienda(l.item, cotizacionSistema)} c/u\n`;
      body += `   *Subtotal ref.: $${sub.toLocaleString("es-AR")}*\n\n`;
    });
    body += `*Total referencia (lista 1): $${totalCarritoARS.toLocaleString("es-AR")}*\n\n`;
    body += "_Precios y stock sujetos a confirmación._";

    const url = construirUrlWhatsApp(telefonoPedidos, body);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [carrito, negocioID, payload?.nombreTienda, telefonoPedidos, totalCarritoARS, cotizacionSistema]);

  function renderTarjeta(it: ItemStockPublico, indice = 0) {
    const enCarrito = carrito[it.id];
    const sinStock = it.stock <= 0;
    const precioLabel = textoPrecioTienda(it, cotizacionSistema);
    const faltaPrecio = sinPrecioLista(it);
    return (
      <article
        key={it.id}
        className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition active:scale-[0.99] sm:hover:shadow-md"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-white p-2 sm:p-3 [color-scheme:light]">
          {ops.mostrarFoto !== false ? (
            <MiniFoto
              url={it.fotoURL}
              alt={it.producto}
              className="h-full w-full"
              priority={indice < 6}
              onClick={
                it.fotoURL
                  ? () =>
                      setFotoAmpliada({
                        url: it.fotoURL!,
                        alt: it.producto,
                        titulo: it.producto,
                      })
                  : undefined
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
              <Package className="h-14 w-14 text-neutral-300" strokeWidth={1.25} />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h2 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-neutral-900 sm:min-h-[2.75rem] sm:text-[15px]">
            {it.producto}
          </h2>
          {ops.mostrarMarca !== false && it.marca && (
            <p className="mt-1 text-xs leading-snug text-neutral-500">
              <span className="font-medium text-neutral-500">Marca:</span>{" "}
              <span className="font-semibold text-neutral-800">{it.marca}</span>
            </p>
          )}
          {it.observacion && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-500">
              {it.observacion}
            </p>
          )}
          {(ops.mostrarCodigo !== false || ops.mostrarCategoria !== false) && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
              {ops.mostrarCodigo !== false && <span className="font-mono">{it.codigo}</span>}
              {ops.mostrarCategoria !== false && it.categoria && (
                <span>
                  {ops.mostrarCodigo !== false ? " · " : ""}
                  {it.categoria}
                </span>
              )}
            </p>
          )}
          {ops.mostrarPrecio !== false && (
            <p
              className={`mt-2 text-lg font-bold tracking-tight sm:text-xl ${
                faltaPrecio ? "text-neutral-500" : "text-neutral-900"
              }`}
            >
              {precioLabel}
            </p>
          )}
          {ops.mostrarStock !== false && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {sinStock ? (
                <span className="font-medium text-amber-700">Sin stock</span>
              ) : (
                <span>
                  Stock: <span className="font-semibold text-neutral-800">{it.stock}</span>
                </span>
              )}
            </p>
          )}

          <div className="mt-4 flex flex-1 items-end gap-2">
            {enCarrito ? (
              <div className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/80 px-1 py-1">
                <button
                  type="button"
                  onClick={() => menos(it.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white hover:text-neutral-900"
                  aria-label="Quitar uno"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2ch] text-center text-sm font-bold tabular-nums">{enCarrito.cantidad}</span>
                <button
                  type="button"
                  onClick={() => mas(it.id)}
                  disabled={sinStock || (it.stock > 0 && enCarrito.cantidad >= it.stock)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white hover:text-neutral-900 disabled:opacity-40"
                  aria-label="Agregar uno"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => agregar(it)}
                disabled={sinStock}
                className="flex w-full min-h-[44px] items-center justify-center rounded-md bg-[#2563eb] py-3 text-xs font-bold uppercase tracking-wide text-white transition active:bg-[#1d4ed8] sm:py-2.5 sm:hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Comprar
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  const nombreMostrar = payload?.nombreTienda ?? "Repuestos";
  const logoTienda =
    logoNegocio ||
    payload?.logoUrl?.trim() ||
    payload?.tiendaPublica?.logoUrl?.trim() ||
    null;

  const irInicioTienda = useCallback(() => {
    setQ("");
    setChipCategoria("todas");
    setDrawerAbierto(false);
    setFotoAmpliada(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 antialiased [color-scheme:light]">
      <div className="bg-[#1e3a5f] py-2 text-center text-xs font-medium text-white sm:text-sm">
        Pedidos por WhatsApp · Precios en pesos argentinos
      </div>

      <header className="sticky top-0 z-40 bg-neutral-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:py-4">
          <button
            type="button"
            onClick={irInicioTienda}
            className="min-w-0 flex-1 text-left sm:max-w-[12rem] md:max-w-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg"
            aria-label={`Inicio - ${nombreMostrar}`}
          >
            {logoTienda ? (
              <img
                src={logoTienda}
                alt={nombreMostrar}
                className="h-11 max-w-[55vw] object-contain object-left sm:h-12 sm:max-w-[180px]"
              />
            ) : cargandoLogo ? (
              <span className="block h-11 w-[120px] animate-pulse rounded-lg bg-white/10 sm:h-12" />
            ) : (
              <>
                <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{nombreMostrar}</h1>
                <p className="mt-0.5 text-xs text-neutral-400 sm:text-sm">Tienda de repuestos</p>
              </>
            )}
          </button>
          <label className="relative mx-auto hidden min-w-0 max-w-xl flex-1 sm:block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="¿Qué estás buscando?"
              className="w-full rounded-full bg-white py-2.5 pl-4 pr-11 text-sm text-neutral-900 focus:ring-2 focus:ring-[#3b82f6]"
            />
          </label>
          <button
            type="button"
            onClick={() => setDrawerAbierto(true)}
            className="relative flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 sm:px-4"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="h-5 w-5 sm:h-5 sm:w-5" />
            <span>Carrito</span>
            {cantItemsCarrito > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-bold text-white">
                {cantItemsCarrito > 99 ? "99+" : cantItemsCarrito}
              </span>
            )}
          </button>
        </div>
        <label className="relative mx-4 mb-3.5 block sm:hidden">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="¿Qué estás buscando?"
            className="w-full rounded-full bg-white py-3.5 pl-4 pr-11 text-base text-neutral-900 touch-manipulation"
          />
        </label>
        <nav className="border-t border-white/10 bg-neutral-900">
          <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-2 py-2.5 sm:py-2">
            {CHIPS.map(({ id, label, hint, Icon }) => (
              <button
                key={id}
                type="button"
                title={hint}
                onClick={() => setChipCategoria(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2.5 text-xs font-semibold uppercase sm:text-xs ${
                  chipCategoria === id ? "bg-white text-neutral-900" : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {payload && !loading && (
        <div className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-neutral-600">
            <span>
            {searching ? (
              <span className="text-neutral-500">Buscando…</span>
            ) : filtrados.length > 0 ? (
              <>
                {filtrados.length} producto{filtrados.length === 1 ? "" : "s"}
                {payload.modo === "browse" && !q.trim() && (
                  <span className="text-neutral-400">
                    {" "}
                    · mostrando {BROWSE_LIMIT} para empezar
                  </span>
                )}
                {payload.modo === "search" && payload.hayMas && (
                  <span className="text-neutral-400">
                    {" "}
                    · refiná la búsqueda para acotar
                  </span>
                )}
              </>
            ) : q.trim().length >= MIN_BUSQUEDA_CHARS ? (
              "Sin resultados"
            ) : q.trim().length > 0 ? (
              <span className="text-neutral-400">Escribí al menos {MIN_BUSQUEDA_CHARS} letras para buscar en todo el stock</span>
            ) : null}
            </span>
            <button
              type="button"
              onClick={() => void recargarStock(q, false)}
              disabled={searching || loading}
              className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              ↻ Actualizar stock
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 pb-28 pt-4 sm:px-4 sm:pb-10 sm:pt-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00a650] border-t-transparent" />
            <p className="mt-4 text-sm text-neutral-500">Cargando productos…</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50/90 px-5 py-4 text-sm text-red-900 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && payload && (
          <>
            {searching && (
              <div className="mb-4 flex items-center justify-center gap-2 py-2 text-sm text-neutral-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00a650] border-t-transparent" />
                Buscando productos…
              </div>
            )}
            {gruposPorMarca ? (
              <div className="space-y-10">
                {gruposPorMarca.map(([marca, lista]) => (
                  <section key={marca}>
                    <h2 className="mb-4 border-b border-neutral-200 pb-2 text-lg font-bold text-neutral-800">
                      {marca}
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {lista.map((it, i) => renderTarjeta(it, i))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {visibles.map((it, i) => renderTarjeta(it, i))}
              </div>
            )}

            {filtrados.length === 0 && !searching && (
              <p className="py-16 text-center text-sm text-neutral-500">
                {payload.modo === "search" || q.trim().length >= MIN_BUSQUEDA_CHARS
                  ? "No encontramos productos con esa búsqueda."
                  : "No hay productos para mostrar."}
              </p>
            )}
            {payload.modo === "browse" && !q.trim() && filtrados.length > 0 && (
              <p className="mt-6 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-xs text-neutral-600">
                Mostramos algunos productos para empezar. Usá el buscador (mín. {MIN_BUSQUEDA_CHARS}{" "}
                letras) para encontrar el resto del catálogo.
              </p>
            )}
          </>
        )}
      </main>

      {payload?.tiendaPublica && !loading && (
        <FooterTienda
          info={{
            ...payload.tiendaPublica,
            logoUrl: logoTienda || payload.tiendaPublica.logoUrl,
          }}
          onIrInicio={irInicioTienda}
        />
      )}

      {cantItemsCarrito > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-neutral-500">{cantItemsCarrito} ítem(s)</p>
              <p className="text-sm font-bold text-neutral-900">Total ref. ${totalCarritoARS.toLocaleString("es-AR")}</p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerAbierto(true)}
              className="rounded-xl bg-[#00a650] px-4 py-2.5 text-sm font-bold text-white shadow-md"
            >
              Ver carrito
            </button>
          </div>
        </div>
      )}

      {telefonoPedidos && (
        <a
          href={`https://wa.me/${telefonoPedidos}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 sm:bottom-6"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}

      {portalReady &&
        drawerAbierto &&
        createPortal(
          <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label="Carrito">
            {/* Capa oscura siempre por debajo del panel (z-0 vs z-10) */}
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={() => setDrawerAbierto(false)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-y-0 right-0 z-10 flex h-full w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl sm:inset-y-3 sm:right-3 sm:max-h-[calc(100vh-1.5rem)] sm:rounded-2xl sm:border sm:border-neutral-200 antialiased">
            <div className="flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-4">
              <h2 className="text-lg font-bold text-neutral-900">Tu carrito</h2>
              <button
                type="button"
                onClick={() => setDrawerAbierto(false)}
                className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Cerrar carrito"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fafafa] px-3 py-3">
              {Object.keys(carrito).length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 text-center text-neutral-500 shadow-sm">
                  <ShoppingBag className="mb-3 h-12 w-12 opacity-25" />
                  <p className="text-sm">Todavía no agregaste productos.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {Object.values(carrito).map((l) => (
                    <li
                      key={l.item.id}
                      className="flex gap-3 rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-white [color-scheme:light]">
                        {ops.mostrarFoto !== false ? (
                          <MiniFoto url={l.item.fotoURL} alt="" className="h-full w-full" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-neutral-300">
                            <Package className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-neutral-900">{l.item.producto}</p>
                        {ops.mostrarCodigo !== false && (
                          <p className="font-mono text-[11px] text-neutral-500">{l.item.codigo}</p>
                        )}
                        {ops.mostrarPrecio !== false && (
                          <p className="mt-1 text-xs text-neutral-600">
                            {textoPrecioTienda(l.item, cotizacionSistema)} c/u
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => menos(l.item.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-white"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{l.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => mas(l.item.id)}
                            disabled={l.item.stock > 0 && l.cantidad >= l.item.stock}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-white disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => quitarLinea(l.item.id)}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                            aria-label="Quitar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {ops.mostrarPrecio !== false && (
                          <p className="mt-2 text-right text-sm font-bold text-[#00a650]">
                            $ {subtotalLineaARS(l.item, l.cantidad, cotizacionSistema).toLocaleString("es-AR")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-neutral-100 bg-white p-4">
              {ops.mostrarPrecio !== false && (
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-sm text-neutral-600">Total referencia</span>
                  <span className="text-xl font-bold text-neutral-900">
                    ${totalCarritoARS.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
                Lista 1 en pesos de referencia. Confirmamos precio y stock al recibir el mensaje.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={finalizarWhatsApp}
                  disabled={Object.keys(carrito).length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  <MessageCircle className="h-5 w-5" />
                  Finalizar y enviar por WhatsApp
                </button>
                {Object.keys(carrito).length > 0 && (
                  <button
                    type="button"
                    onClick={vaciarCarrito}
                    className="py-2 text-center text-xs font-semibold text-neutral-500 hover:underline"
                  >
                    Vaciar carrito
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}

      {portalReady &&
        fotoAmpliada &&
        createPortal(
          <div
            className="fixed inset-0 z-[500]"
            role="dialog"
            aria-modal="true"
            aria-label={`Imagen: ${fotoAmpliada.titulo}`}
          >
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/75"
              onClick={() => setFotoAmpliada(null)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
              <div
                className="pointer-events-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative z-20 flex items-center justify-between gap-3 border-b border-neutral-100 bg-white px-4 py-3">
                  <p className="truncate text-sm font-semibold text-neutral-900">{fotoAmpliada.titulo}</p>
                  <button
                    type="button"
                    onClick={() => setFotoAmpliada(null)}
                    className="shrink-0 rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative z-20 flex min-h-[240px] flex-1 items-center justify-center bg-white p-4 [color-scheme:light] sm:p-6">
                  <img
                    src={fotoAmpliada.url}
                    alt={fotoAmpliada.alt}
                    className="max-h-[75vh] max-w-full bg-white object-contain"
                    style={{ backgroundColor: "#ffffff" }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
