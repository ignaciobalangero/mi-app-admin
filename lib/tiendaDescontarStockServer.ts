import { db } from "@/lib/firebaseAdmin";
import type { LineaPedidoTienda } from "@/lib/tiendaClienteTypes";

type StockDoc = {
  ref: FirebaseFirestore.DocumentReference;
  cantidadActual: number;
  coleccion: string;
};

const COLECCIONES_STOCK = ["stockRepuestos", "stockAccesorios", "stockExtra"] as const;

async function buscarStockPorCodigo(negocioId: string, codigo: string): Promise<StockDoc | null> {
  for (const col of COLECCIONES_STOCK) {
    const q = await db
      .collection(`negocios/${negocioId}/${col}`)
      .where("codigo", "==", codigo)
      .limit(1)
      .get();

    if (!q.empty) {
      const doc = q.docs[0];
      return {
        ref: doc.ref,
        cantidadActual: Number(doc.data().cantidad ?? 0),
        coleccion: col,
      };
    }

    if (col === "stockExtra") {
      const byId = await db.doc(`negocios/${negocioId}/stockExtra/${codigo}`).get();
      if (byId.exists) {
        return {
          ref: byId.ref,
          cantidadActual: Number(byId.data()?.cantidad ?? 0),
          coleccion: col,
        };
      }
    }
  }
  return null;
}

function agregarCantidadesPorCodigo(lineas: LineaPedidoTienda[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lineas) {
    const codigo = l.codigo.trim();
    if (!codigo) continue;
    map.set(codigo, (map.get(codigo) ?? 0) + l.cantidad);
  }
  return map;
}

export type ResultadoDescontarStock =
  | { ok: true; stockDescontadoEn: string }
  | { ok: false; error: string };

/**
 * Descuenta stock al confirmar un pedido de tienda web.
 * Busca por código en repuestos, accesorios y stock extra.
 */
export async function descontarStockPedidoTienda(
  negocioId: string,
  lineas: LineaPedidoTienda[]
): Promise<ResultadoDescontarStock> {
  const agregado = agregarCantidadesPorCodigo(lineas);
  if (agregado.size === 0) {
    return { ok: false, error: "El pedido no tiene productos con código." };
  }

  const resueltos: Array<{ codigo: string; cantidad: number; doc: StockDoc }> = [];

  for (const [codigo, cantidad] of Array.from(agregado.entries())) {
    const doc = await buscarStockPorCodigo(negocioId, codigo);
    if (!doc) {
      return { ok: false, error: `No hay stock registrado para el código ${codigo}.` };
    }
    if (doc.cantidadActual < cantidad) {
      return {
        ok: false,
        error: `Stock insuficiente para ${codigo}: hay ${doc.cantidadActual}, se pidieron ${cantidad}.`,
      };
    }
    resueltos.push({ codigo, cantidad, doc });
  }

  const stockDescontadoEn = new Date().toISOString();

  try {
    await db.runTransaction(async (tx) => {
      for (const { codigo, cantidad, doc } of resueltos) {
        const snap = await tx.get(doc.ref);
        if (!snap.exists) {
          throw new Error(`El producto ${codigo} ya no está en stock.`);
        }
        const actual = Number(snap.data()?.cantidad ?? 0);
        if (actual < cantidad) {
          throw new Error(
            `Stock insuficiente para ${codigo}: hay ${actual}, se pidieron ${cantidad}.`
          );
        }
        tx.update(doc.ref, { cantidad: Math.max(0, actual - cantidad) });
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo actualizar el stock.";
    return { ok: false, error: msg };
  }

  return { ok: true, stockDescontadoEn };
}

/**
 * Devuelve stock si se cancela un pedido que ya lo descontó.
 */
export async function reponerStockPedidoTienda(
  negocioId: string,
  lineas: LineaPedidoTienda[]
): Promise<void> {
  const agregado = agregarCantidadesPorCodigo(lineas);
  const batch = db.batch();

  for (const [codigo, cantidad] of Array.from(agregado.entries())) {
    const doc = await buscarStockPorCodigo(negocioId, codigo);
    if (!doc) continue;
    batch.update(doc.ref, { cantidad: doc.cantidadActual + cantidad });
  }

  await batch.commit();
}
