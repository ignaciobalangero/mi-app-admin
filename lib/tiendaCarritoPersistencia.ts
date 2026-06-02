import {
  type CarritoTiendaState,
  type LineaCarritoPersistida,
  carritoALineas,
  carritoExpirado,
  lineasACarrito,
} from "@/lib/tiendaCarritoTypes";

const STORAGE_VERSION = 1;

type StoredCarrito = {
  v: number;
  negocioId: string;
  uid: string | null;
  lineas: LineaCarritoPersistida[];
  guardadoEn: number;
};

function claveLocalStorage(negocioId: string, uid?: string | null): string {
  const base = `gestione_carrito_v${STORAGE_VERSION}_${negocioId}`;
  return uid ? `${base}_${uid}` : `${base}_guest`;
}

function leerRaw(key: string): StoredCarrito | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCarrito;
    if (parsed.v !== STORAGE_VERSION || !Array.isArray(parsed.lineas)) return null;
    if (carritoExpirado(parsed.guardadoEn)) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function leerCarritoLocal(
  negocioId: string,
  uid?: string | null
): CarritoTiendaState {
  const keys = uid
    ? [claveLocalStorage(negocioId, uid), claveLocalStorage(negocioId, null)]
    : [claveLocalStorage(negocioId, null)];

  for (const key of keys) {
    const stored = leerRaw(key);
    if (stored?.lineas?.length) {
      return lineasACarrito(stored.lineas);
    }
  }
  return {};
}

export function guardarCarritoLocal(
  negocioId: string,
  carrito: CarritoTiendaState,
  uid?: string | null
): void {
  if (typeof window === "undefined") return;
  const key = claveLocalStorage(negocioId, uid ?? null);
  const lineas = carritoALineas(carrito);

  if (lineas.length === 0) {
    localStorage.removeItem(key);
    return;
  }

  const payload: StoredCarrito = {
    v: STORAGE_VERSION,
    negocioId,
    uid: uid ?? null,
    lineas,
    guardadoEn: Date.now(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota exceeded — ignorar */
  }
}

export function limpiarCarritoLocal(negocioId: string, uid?: string | null): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(claveLocalStorage(negocioId, uid ?? null));
  if (uid) {
    localStorage.removeItem(claveLocalStorage(negocioId, null));
  }
}
