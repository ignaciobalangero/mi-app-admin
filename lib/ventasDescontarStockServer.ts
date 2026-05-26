import { db } from "@/lib/firebaseAdmin";
import {
  clasificarProductoStock,
  codigoProductoStock,
} from "@/lib/ventasStockProducto";

type LineaStock = {
  codigo?: string;
  id?: string;
  stockDocId?: string;
  cantidad?: number;
  tipo?: string;
  categoria?: string;
  origenStock?: string;
  hoja?: string;
};

type StockHit = {
  ref: FirebaseFirestore.DocumentReference;
  cantidadActual: number;
};

async function buscarRepuesto(
  negocioId: string,
  codigo: string,
  docId?: string
): Promise<StockHit | null> {
  const cod = codigo.trim();
  const ids = Array.from(new Set([String(docId ?? "").trim(), cod].filter(Boolean)));
  const codigos = Array.from(
    new Set([cod, cod.toUpperCase(), cod.toLowerCase()].filter(Boolean))
  );

  for (const id of ids) {
    const ref = db.doc(`negocios/${negocioId}/stockRepuestos/${id}`);
    const snap = await ref.get();
    if (snap.exists) {
      return { ref, cantidadActual: Number(snap.data()?.cantidad ?? 0) };
    }
  }

  for (const col of ["stockRepuestos", "stockExtra"] as const) {
    for (const c of codigos) {
      const q = await db
        .collection(`negocios/${negocioId}/${col}`)
        .where("codigo", "==", c)
        .limit(1)
        .get();
      if (!q.empty) {
        const d = q.docs[0];
        return { ref: d.ref, cantidadActual: Number(d.data()?.cantidad ?? 0) };
      }
    }

    const byId = await db.doc(`negocios/${negocioId}/${col}/${cod}`).get();
    if (byId.exists) {
      return { ref: byId.ref, cantidadActual: Number(byId.data()?.cantidad ?? 0) };
    }
  }

  return null;
}

async function buscarAccesorio(
  negocioId: string,
  codigo: string,
  docId?: string
): Promise<StockHit | null> {
  const cod = codigo.trim();
  const ids = Array.from(new Set([String(docId ?? "").trim(), cod].filter(Boolean)));
  const codigos = [cod, cod.toUpperCase(), cod.toLowerCase()].filter(Boolean);

  for (const id of ids) {
    const ref = db.doc(`negocios/${negocioId}/stockAccesorios/${id}`);
    const snap = await ref.get();
    if (snap.exists) {
      return { ref, cantidadActual: Number(snap.data()?.cantidad ?? 0) };
    }
  }

  for (const c of codigos) {
    const q = await db
      .collection(`negocios/${negocioId}/stockAccesorios`)
      .where("codigo", "==", c)
      .limit(1)
      .get();
    if (!q.empty) {
      const d = q.docs[0];
      return { ref: d.ref, cantidadActual: Number(d.data()?.cantidad ?? 0) };
    }
  }
  return null;
}

export async function descontarStockVentaServer(
  negocioId: string,
  productos: LineaStock[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ops: Array<{ hit: StockHit; cantidad: number; label: string }> = [];

  for (const p of productos) {
    const cantidad = Math.max(1, Number(p.cantidad) || 1);
    const codigo = codigoProductoStock(p);
    if (!codigo) continue;
    const docId = String(p.stockDocId ?? p.id ?? "").trim() || undefined;
    const tipo = clasificarProductoStock(p);

    if (tipo === "accesorio") {
      const hit = await buscarAccesorio(negocioId, codigo, docId);
      if (!hit) {
        return { ok: false, error: `Accesorio no encontrado en stock: ${codigo}` };
      }
      if (hit.cantidadActual < cantidad) {
        return {
          ok: false,
          error: `Stock insuficiente para accesorio ${codigo}: hay ${hit.cantidadActual}, vendiste ${cantidad}`,
        };
      }
      ops.push({ hit, cantidad, label: codigo });
      continue;
    }

    if (tipo === "repuesto") {
      const hit = await buscarRepuesto(negocioId, codigo, docId);
      if (!hit) {
        return { ok: false, error: `Repuesto no encontrado en stock: ${codigo}` };
      }
      if (hit.cantidadActual < cantidad) {
        return {
          ok: false,
          error: `Stock insuficiente para ${codigo}: hay ${hit.cantidadActual}, vendiste ${cantidad}`,
        };
      }
      ops.push({ hit, cantidad, label: codigo });
    }
  }

  if (ops.length === 0) {
    return { ok: false, error: "Ningún producto de la venta coincide con stock repuestos/accesorios." };
  }

  try {
    await db.runTransaction(async (tx) => {
      for (const { hit, cantidad } of ops) {
        const snap = await tx.get(hit.ref);
        if (!snap.exists) throw new Error("Producto no encontrado al descontar.");
        const actual = Number(snap.data()?.cantidad ?? 0);
        if (actual < cantidad) {
          throw new Error(`Stock insuficiente (actualizado): hay ${actual}, vendiste ${cantidad}`);
        }
        tx.update(hit.ref, { cantidad: Math.max(0, actual - cantidad) });
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al descontar stock.";
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export async function reponerStockVentaServer(
  negocioId: string,
  productos: LineaStock[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ops: Array<{ hit: StockHit; cantidad: number; label: string }> = [];

  for (const p of productos) {
    const cantidad = Math.max(1, Number(p.cantidad) || 1);
    const codigo = codigoProductoStock(p);
    if (!codigo) continue;
    const docId = String(p.stockDocId ?? p.id ?? "").trim() || undefined;
    const tipo = clasificarProductoStock(p);

    if (tipo === "accesorio") {
      const hit = await buscarAccesorio(negocioId, codigo, docId);
      if (!hit) {
        return { ok: false, error: `Accesorio no encontrado para reponer: ${codigo}` };
      }
      ops.push({ hit, cantidad, label: codigo });
      continue;
    }

    if (tipo === "repuesto") {
      const hit = await buscarRepuesto(negocioId, codigo, docId);
      if (!hit) {
        return { ok: false, error: `Repuesto no encontrado para reponer: ${codigo}` };
      }
      ops.push({ hit, cantidad, label: codigo });
    }
  }

  if (ops.length === 0) {
    return { ok: false, error: "Ningún producto de la venta coincide con stock para reponer." };
  }

  try {
    await db.runTransaction(async (tx) => {
      for (const { hit, cantidad } of ops) {
        const snap = await tx.get(hit.ref);
        if (!snap.exists) throw new Error("Producto no encontrado al reponer.");
        const actual = Number(snap.data()?.cantidad ?? 0);
        tx.update(hit.ref, { cantidad: actual + cantidad });
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al reponer stock.";
    return { ok: false, error: msg };
  }

  return { ok: true };
}
