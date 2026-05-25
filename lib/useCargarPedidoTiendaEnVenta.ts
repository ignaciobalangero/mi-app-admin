"use client";

import { useCallback, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PedidoTienda } from "@/lib/tiendaClienteTypes";
import {
  lineaPedidoAProductoVenta,
  observacionesDesdePedido,
  pagoInicialDesdePedido,
  type ProductoVentaDesdePedido,
} from "@/lib/mapPedidoTiendaAVenta";

type StockIndex = Map<
  string,
  {
    id?: string;
    categoria?: string;
    tipo?: "accesorio" | "repuesto" | "general";
    producto?: string;
    marca?: string;
    modelo?: string;
    color?: string;
  }
>;

async function indexarStock(negocioID: string): Promise<StockIndex> {
  const map: StockIndex = new Map();
  const cols = [
    { path: `negocios/${negocioID}/stockRepuestos`, tipo: "repuesto" as const },
    { path: `negocios/${negocioID}/stockAccesorios`, tipo: "accesorio" as const },
    { path: `negocios/${negocioID}/stockExtra`, tipo: "general" as const },
  ];

  for (const { path, tipo } of cols) {
    const snap = await getDocs(collection(db, path));
    snap.docs.forEach((d) => {
      const data = d.data();
      const codigo = String(data.codigo ?? d.id).trim();
      if (!codigo) return;
      map.set(codigo.toLowerCase(), {
        id: d.id,
        categoria: String(data.categoria ?? (tipo === "repuesto" ? "Repuesto" : "Accesorio")),
        tipo,
        producto: String(data.producto ?? ""),
        marca: String(data.marca ?? ""),
        modelo: String(data.modelo ?? data.producto ?? ""),
        color: String(data.color ?? ""),
      });
    });
  }
  return map;
}

export function useCargarPedidoTiendaEnVenta(negocioGestioneID: string | undefined) {
  const [cargando, setCargando] = useState(false);

  const prepararDesdePedido = useCallback(
    async (pedido: PedidoTienda) => {
      const negocioStock = pedido.negocioId || negocioGestioneID;
      if (!negocioStock) {
        throw new Error("Sin negocio Gestione.");
      }
      setCargando(true);
      try {
        const stock = await indexarStock(negocioStock);
        const productos: ProductoVentaDesdePedido[] = pedido.lineas.map((l) =>
          lineaPedidoAProductoVenta(l, stock.get(l.codigo.trim().toLowerCase()) ?? null)
        );
        return {
          cliente: pedido.cliente.nombre,
          productos,
          observaciones: observacionesDesdePedido(pedido),
          pago: pagoInicialDesdePedido(pedido),
          pedidoId: pedido.id,
          pedidoNumero: pedido.numero,
          negocioTiendaId: pedido.negocioId,
        };
      } finally {
        setCargando(false);
      }
    },
    [negocioGestioneID]
  );

  return { prepararDesdePedido, cargando };
}
