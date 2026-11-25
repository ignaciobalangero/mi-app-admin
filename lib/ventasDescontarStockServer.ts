import { db } from "@/lib/firebaseAdmin";
import {
  clasificarProductoStock,
  codigoProductoStock,
  coleccionesRepuestoExtra,
  type ColeccionRepuestoExtra,
  type ProductoStockLike,
} from "@/lib/ventasStockProducto";
import {
  buscarProveedor,
  deudaSiConsignacion,
  documentoCompraConsignacion,
  planRevertir,
  type DeudaGuardada,
  type ProveedorAgenda,
} from "@/lib/proveedores/deudaConsignacion";

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
  docId?: string,
  colecciones: ColeccionRepuestoExtra[] = ["stockRepuestos", "stockExtra"]
): Promise<StockHit | null> {
  const cod = codigo.trim();
  const ids = Array.from(new Set([String(docId ?? "").trim(), cod].filter(Boolean)));
  const codigos = Array.from(
    new Set([cod, cod.toUpperCase(), cod.toLowerCase()].filter(Boolean))
  );

  for (const col of colecciones) {
    for (const id of ids) {
      const ref = db.doc(`negocios/${negocioId}/${col}/${id}`);
      const snap = await ref.get();
      if (snap.exists) {
        return { ref, cantidadActual: Number(snap.data()?.cantidad ?? 0) };
      }
    }
  }

  for (const col of colecciones) {
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

async function proveedoresDelNegocio(negocioId: string): Promise<ProveedorAgenda[]> {
  const snap = await db.collection(`negocios/${negocioId}/proveedores`).get();
  return snap.docs.map((item) => ({
    id: item.id,
    nombre: String(item.data().nombre || ""),
  }));
}

function deudaGuardada(
  id: string,
  data: FirebaseFirestore.DocumentData,
  stockDocId: string
): DeudaGuardada {
  const productos = Array.isArray(data.productos) ? data.productos : [];
  const primero = (productos[0] || {}) as { precio?: unknown; producto?: unknown; cantidad?: unknown };
  return {
    id,
    origen: data.origen,
    stockColeccion: data.stockColeccion,
    stockDocId: String(data.stockDocId || stockDocId),
    cantidadUnidades: Number(data.cantidadUnidades ?? primero.cantidad) || 0,
    precio: Number(primero.precio) || 0,
    producto: String(primero.producto || "Consignación"),
    fechaCreacion: String(data.fechaCreacion || ""),
  };
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
      const cols = coleccionesRepuestoExtra(p as ProductoStockLike);
      const hit = await buscarRepuesto(negocioId, codigo, docId, cols);
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

  let proveedores: ProveedorAgenda[] = [];
  try {
    proveedores = await proveedoresDelNegocio(negocioId);
  } catch (error) {
    console.error("[descontarStockVentaServer] No se pudo leer proveedores:", error);
  }

  try {
    await db.runTransaction(async (tx) => {
      const merged = new Map<string, { ref: StockHit["ref"]; cantidad: number }>();
      for (const { hit, cantidad } of ops) {
        const key = hit.ref.path;
        const prev = merged.get(key);
        if (prev) prev.cantidad += cantidad;
        else merged.set(key, { ref: hit.ref, cantidad });
      }

      const entries = Array.from(merged.values());
      const snaps = await Promise.all(entries.map(({ ref }) => tx.get(ref)));

      for (let i = 0; i < entries.length; i++) {
        const { ref, cantidad } = entries[i];
        const snap = snaps[i];
        if (!snap.exists) throw new Error("Producto no encontrado al descontar.");
        const data = snap.data() || {};
        const actual = Number(data.cantidad ?? 0);
        if (actual < cantidad) {
          throw new Error(`Stock insuficiente (actualizado): hay ${actual}, vendiste ${cantidad}`);
        }
        tx.update(ref, { cantidad: Math.max(0, actual - cantidad) });
        const deuda = deudaSiConsignacion(data, cantidad);
        if (!deuda) continue;
        const proveedor = buscarProveedor(proveedores, deuda.proveedorNombre);
        tx.set(
          db.collection(`negocios/${negocioId}/compras`).doc(),
          documentoCompraConsignacion({
            deuda,
            proveedorId: proveedor?.id || "",
            coleccion: ref.parent.id,
            stockDocId: ref.id,
          })
        );
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
      const cols = coleccionesRepuestoExtra(p as ProductoStockLike);
      const hit = await buscarRepuesto(negocioId, codigo, docId, cols);
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
      const merged = new Map<string, { ref: StockHit["ref"]; cantidad: number }>();
      for (const { hit, cantidad } of ops) {
        const key = hit.ref.path;
        const prev = merged.get(key);
        if (prev) prev.cantidad += cantidad;
        else merged.set(key, { ref: hit.ref, cantidad });
      }

      const entries = Array.from(merged.values());
      const snaps = await Promise.all(entries.map(({ ref }) => tx.get(ref)));
      const deudas = await Promise.all(
        entries.map(({ ref }) =>
          tx.get(db.collection(`negocios/${negocioId}/compras`).where("stockDocId", "==", ref.id))
        )
      );

      for (let i = 0; i < entries.length; i++) {
        const { ref, cantidad } = entries[i];
        const snap = snaps[i];
        if (!snap.exists) throw new Error("Producto no encontrado al reponer.");
        const actual = Number(snap.data()?.cantidad ?? 0);
        tx.update(ref, { cantidad: actual + cantidad });
        const plan = planRevertir(
          deudas[i].docs.map((item) => deudaGuardada(item.id, item.data(), ref.id)),
          ref.parent.id,
          cantidad
        );
        for (const id of plan.borrar) {
          tx.delete(db.collection(`negocios/${negocioId}/compras`).doc(id));
        }
        for (const cambio of plan.actualizar) {
          tx.update(db.collection(`negocios/${negocioId}/compras`).doc(cambio.id), {
            cantidadUnidades: cambio.cantidadUnidades,
            montoTotal: cambio.montoTotal,
            productos: cambio.productos,
          });
        }
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al reponer stock.";
    return { ok: false, error: msg };
  }

  return { ok: true };
}
