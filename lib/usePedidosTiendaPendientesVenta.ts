"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import { esSuperAdminUsuario } from "@/lib/superAdminConstants";
import { mapaDominiosTienda } from "@/lib/dominiosTienda";
import type { PedidoTienda } from "@/lib/tiendaClienteTypes";

const NEGOCIO_TIENDA_DEFAULT = "iphonetec";

export function negocioTiendaPanel(negocioRol?: string, esSuperAdmin?: boolean): string {
  if (negocioRol && Object.values(mapaDominiosTienda()).includes(negocioRol)) {
    return negocioRol;
  }
  return esSuperAdmin ? NEGOCIO_TIENDA_DEFAULT : negocioRol || NEGOCIO_TIENDA_DEFAULT;
}

export function usePedidosTiendaPendientesVenta(negocioIdOverride?: string) {
  const [user] = useAuthState(auth);
  const { rol, puedeVerPedidosTienda } = useRol();
  const esSuperAdmin = esSuperAdminUsuario(user);
  const tieneAcceso = esSuperAdmin || puedeVerPedidosTienda;
  const negocioId = negocioIdOverride || negocioTiendaPanel(rol?.negocioID, esSuperAdmin);

  const [count, setCount] = useState(0);
  const [pedidos, setPedidos] = useState<PedidoTienda[]>([]);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (!user || !tieneAcceso || !negocioId) {
      setCount(0);
      setPedidos([]);
      return;
    }
    setCargando(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/tienda/pedidos/pendientes-venta?negocioId=${encodeURIComponent(negocioId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        setCount(0);
        setPedidos([]);
        return;
      }
      const data = await res.json();
      setCount(data.count ?? 0);
      setPedidos((data.pedidos ?? []) as PedidoTienda[]);
    } catch {
      setCount(0);
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, [user, tieneAcceso, negocioId]);

  useEffect(() => {
    void recargar();
    const t = setInterval(() => void recargar(), 60000);
    return () => clearInterval(t);
  }, [recargar]);

  return { count, pedidos, cargando, recargar, tieneAcceso, negocioId };
}

export const STORAGE_PEDIDO_TIENDA = "ventaPedidoTiendaPendiente";
export const STORAGE_PEDIDO_TIENDA_ACTIVO = "ventaPedidoTiendaActivo";
const SESSION_PEDIDOS_PROCESADOS = "pedidosTiendaVentaProcesados";

export function marcarPedidoTiendaProcesado(pedidoId: string) {
  if (!pedidoId) return;
  try {
    const ids = new Set<string>(JSON.parse(sessionStorage.getItem(SESSION_PEDIDOS_PROCESADOS) || "[]"));
    ids.add(pedidoId);
    sessionStorage.setItem(SESSION_PEDIDOS_PROCESADOS, JSON.stringify(Array.from(ids)));
  } catch {
    sessionStorage.setItem(SESSION_PEDIDOS_PROCESADOS, JSON.stringify([pedidoId]));
  }
}

export function pedidoTiendaYaProcesado(pedidoId: string): boolean {
  if (!pedidoId) return false;
  try {
    const ids: string[] = JSON.parse(sessionStorage.getItem(SESSION_PEDIDOS_PROCESADOS) || "[]");
    return ids.includes(pedidoId);
  } catch {
    return false;
  }
}

export function idPedidoDesdeStorage(): string | null {
  const datos = leerPedidoParaVenta();
  const pedido = datos?.pedido as { id?: string } | undefined;
  return pedido?.id ? String(pedido.id) : null;
}

export function guardarPedidoParaVenta(negocioId: string, pedido: unknown) {
  localStorage.setItem(
    STORAGE_PEDIDO_TIENDA,
    JSON.stringify({ negocioId, pedido, ts: Date.now() })
  );
}

export function leerPedidoParaVenta(): { negocioId: string; pedido: Record<string, unknown> } | null {
  const raw = localStorage.getItem(STORAGE_PEDIDO_TIENDA);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data?.pedido || !data?.negocioId) return null;
    return data;
  } catch {
    return null;
  }
}

export function limpiarPedidoParaVenta() {
  localStorage.removeItem(STORAGE_PEDIDO_TIENDA);
}

export function irAVentaDesdePedidoTienda(
  pedido: { id: string; numero?: string; [key: string]: unknown },
  negocioId: string,
  router: { push: (href: string) => void }
) {
  guardarPedidoParaVenta(negocioId, pedido);
  router.push("/ventas-general?desdePedido=1");
}
