import type { ItemStockPublico } from "@/lib/stockPublicoTypes";

export type LineaCarritoTienda = {
  item: ItemStockPublico;
  cantidad: number;
};

export type CarritoTiendaState = Record<string, LineaCarritoTienda>;

export type LineaCarritoPersistida = {
  itemId: string;
  cantidad: number;
  item: ItemStockPublico;
};

export type CarritoPersistidoPayload = {
  lineas: LineaCarritoPersistida[];
  actualizadoEn: string;
};

/** Carrito guardado en cuenta (Firestore) o localStorage. */
export const CARRITO_TIENDA_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function carritoALineas(
  carrito: CarritoTiendaState
): LineaCarritoPersistida[] {
  return Object.values(carrito).map((l) => ({
    itemId: l.item.id,
    cantidad: l.cantidad,
    item: l.item,
  }));
}

export function lineasACarrito(
  lineas: LineaCarritoPersistida[]
): CarritoTiendaState {
  const out: CarritoTiendaState = {};
  for (const l of lineas) {
    if (!l.itemId || !l.item?.id) continue;
    const cantidad = Math.max(1, Math.round(Number(l.cantidad) || 1));
    out[l.itemId] = { item: l.item, cantidad };
  }
  return out;
}

export function fusionarCarritos(
  ...carritos: CarritoTiendaState[]
): CarritoTiendaState {
  const out: CarritoTiendaState = {};
  for (const c of carritos) {
    for (const [id, linea] of Object.entries(c)) {
      const prev = out[id];
      if (!prev || linea.cantidad > prev.cantidad) {
        out[id] = linea;
      }
    }
  }
  return out;
}

export function carritoExpirado(actualizadoEn: string | number | Date): boolean {
  const t =
    typeof actualizadoEn === "number"
      ? actualizadoEn
      : new Date(actualizadoEn).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > CARRITO_TIENDA_TTL_MS;
}
