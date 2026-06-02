"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ItemStockPublico } from "@/lib/stockPublicoTypes";
import { itemConPrecioARS, subtotalLineaARS } from "@/lib/stockPublicoPrecios";
import {
  type CarritoTiendaState,
  carritoALineas,
  fusionarCarritos,
  lineasACarrito,
} from "@/lib/tiendaCarritoTypes";
import {
  guardarCarritoLocal,
  leerCarritoLocal,
  limpiarCarritoLocal,
} from "@/lib/tiendaCarritoPersistencia";

const DEBOUNCE_GUARDAR_MS = 600;

async function fetchCarritoServidor(
  negocioId: string,
  token: string
): Promise<CarritoTiendaState> {
  const res = await fetch(
    `/api/tienda/carrito?negocioId=${encodeURIComponent(negocioId)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) return {};
  const data = await res.json();
  if (!Array.isArray(data.lineas) || data.lineas.length === 0) return {};
  return lineasACarrito(data.lineas);
}

async function guardarCarritoServidor(
  negocioId: string,
  token: string,
  carrito: CarritoTiendaState
): Promise<void> {
  await fetch("/api/tienda/carrito", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      negocioId,
      lineas: carritoALineas(carrito),
    }),
  });
}

async function borrarCarritoServidor(
  negocioId: string,
  token: string
): Promise<void> {
  await fetch(
    `/api/tienda/carrito?negocioId=${encodeURIComponent(negocioId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

type Params = {
  negocioID: string;
  uid: string | null | undefined;
  esClienteTienda: boolean;
  getToken: () => Promise<string | null>;
  cotizacionSistema: number;
  payloadItems?: ItemStockPublico[];
};

export function useCarritoTienda({
  negocioID,
  uid,
  esClienteTienda,
  getToken,
  cotizacionSistema,
  payloadItems,
}: Params) {
  const [carrito, setCarrito] = useState<CarritoTiendaState>({});
  const [hidratado, setHidratado] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const skipSaveRef = useRef(true);

  const persistir = useCallback(
    async (next: CarritoTiendaState) => {
      guardarCarritoLocal(negocioID, next, uid ?? null);
      if (esClienteTienda && uid) {
        const token = await getToken();
        if (token) {
          if (Object.keys(next).length === 0) {
            await borrarCarritoServidor(negocioID, token);
          } else {
            await guardarCarritoServidor(negocioID, token, next);
          }
        }
      }
    },
    [negocioID, uid, esClienteTienda, getToken]
  );

  useEffect(() => {
    let cancel = false;
    skipSaveRef.current = true;
    setHidratado(false);

    async function hidratar() {
      const localGuest = leerCarritoLocal(negocioID, null);
      const localUser = uid ? leerCarritoLocal(negocioID, uid) : {};
      let servidor: CarritoTiendaState = {};

      if (esClienteTienda && uid) {
        const token = await getToken();
        if (token) {
          servidor = await fetchCarritoServidor(negocioID, token);
        }
      }

      if (cancel) return;

      const merged = fusionarCarritos(localGuest, localUser, servidor);
      setCarrito(merged);
      setHidratado(true);
      skipSaveRef.current = false;
    }

    void hidratar();
    return () => {
      cancel = true;
    };
  }, [negocioID, uid, esClienteTienda, getToken]);

  useEffect(() => {
    if (!hidratado || skipSaveRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistir(carrito);
    }, DEBOUNCE_GUARDAR_MS);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [carrito, hidratado, persistir]);

  useEffect(() => {
    if (!hidratado) return;
    setCarrito((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;

      const byId = payloadItems?.length
        ? new Map(payloadItems.map((i) => [i.id, i]))
        : new Map<string, ItemStockPublico>();

      let changed = false;
      const next: CarritoTiendaState = {};

      for (const id of ids) {
        const linea = prev[id];
        const fresh = byId.get(id);
        const source = fresh ?? linea.item;
        const item = itemConPrecioARS(source, cotizacionSistema);
        let cantidad = linea.cantidad;

        if (fresh) {
          const max = Math.max(0, fresh.stock);
          if (max > 0 && cantidad > max) {
            cantidad = max;
          }
        }

        const igual =
          cantidad === linea.cantidad &&
          item.precioVentaARS === linea.item.precioVentaARS &&
          item.stock === linea.item.stock;

        if (!igual) changed = true;
        next[id] = igual ? linea : { item, cantidad };
      }

      return changed ? next : prev;
    });
  }, [payloadItems, cotizacionSistema, hidratado]);

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

  const vaciarCarrito = useCallback(() => {
    setCarrito({});
    limpiarCarritoLocal(negocioID, uid ?? null);
    if (esClienteTienda && uid) {
      void getToken().then((token) => {
        if (token) void borrarCarritoServidor(negocioID, token);
      });
    }
  }, [negocioID, uid, esClienteTienda, getToken]);

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

  return {
    carrito,
    agregar,
    menos,
    mas,
    quitarLinea,
    vaciarCarrito,
    cantItemsCarrito,
    totalCarritoARS,
  };
}
