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
import { buscarStockParaLineaPedido, crearStockIndex, type StockIndex } from "@/lib/stockLookup";

async function indexarStock(negocioID: string): Promise<StockIndex> {
  const docs: Parameters<typeof crearStockIndex>[0] = [];
  const cols = [
    { path: `negocios/${negocioID}/stockRepuestos`, tipo: "repuesto" as const, coleccion: "stockRepuestos" as const },
    { path: `negocios/${negocioID}/stockAccesorios`, tipo: "accesorio" as const, coleccion: "stockAccesorios" as const },
    { path: `negocios/${negocioID}/stockExtra`, tipo: "general" as const, coleccion: "stockExtra" as const },
  ];

  for (const { path, tipo, coleccion } of cols) {
    const snap = await getDocs(collection(db, path));
    snap.docs.forEach((d) => {
      docs.push({ id: d.id, data: d.data() as Record<string, unknown>, coleccion, tipo });
    });
  }

  const index = crearStockIndex(docs);
  if (index.codigosDuplicados.size > 0) {
    console.warn(
      `[pedido→venta] ${index.codigosDuplicados.size} códigos duplicados en stock. ` +
        "Se usa itemId del pedido (doc id) como identificador principal."
    );
  }
  return index;
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
        const productos: ProductoVentaDesdePedido[] = pedido.lineas.map((l) => {
          const match = buscarStockParaLineaPedido(stock, l.itemId, l.codigo);
          return lineaPedidoAProductoVenta(l, match);
        });
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
