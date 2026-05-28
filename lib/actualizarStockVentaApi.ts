import { auth } from "@/lib/auth";
import {
  clasificarProductoStock,
  codigoProductoStock,
  productoAfectaStock,
  type ProductoStockLike,
} from "@/lib/ventasStockProducto";

type LineaStockNormalizada = ProductoStockLike & { cantidad?: unknown };

function strField(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function normalizarLineaStock(p: Record<string, unknown>): LineaStockNormalizada {
  const base: ProductoStockLike = {
    id: strField(p.stockDocId ?? p.id),
    stockDocId: strField(p.stockDocId ?? p.id),
    tipo: strField(p.tipo),
    categoria: strField(p.categoria),
    origenStock: strField(p.origenStock),
    hoja: strField(p.hoja),
  };
  return {
    ...base,
    codigo: codigoProductoStock(base),
    cantidad: p.cantidad,
  };
}

async function descontarStockViaCliente(
  negocioId: string,
  productos: LineaStockNormalizada[]
) {
  const { descontarRepuestoDelStock } = await import(
    "@/app/ventas-general/componentes/descontarRepuestoDelStock"
  );
  const { descontarAccesorioDelStock } = await import(
    "@/app/ventas-general/componentes/descontarAccesorioDelStock"
  );

  for (const p of productos) {
    const tipo = clasificarProductoStock(p);
    const codigo = codigoProductoStock(p);
    const cantidad = Math.max(1, Number(p.cantidad) || 1);
    const docId = String(p.stockDocId ?? p.id ?? "").trim() || undefined;

    if (tipo === "repuesto") {
      await descontarRepuestoDelStock(negocioId, codigo, cantidad, docId);
    } else if (tipo === "accesorio") {
      await descontarAccesorioDelStock(negocioId, codigo, cantidad);
    }
  }
}

async function reponerStockViaCliente(
  negocioId: string,
  productos: LineaStockNormalizada[]
) {
  const repuestos = productos.filter((p) => clasificarProductoStock(p) === "repuesto");
  const accesorios = productos.filter((p) => clasificarProductoStock(p) === "accesorio");

  if (repuestos.length > 0) {
    const { reponerRepuestosAlStock } = await import(
      "@/app/ventas-general/componentes/reponerRepuestosAlStock"
    );
    await reponerRepuestosAlStock({ productos: repuestos, negocioID: negocioId });
  }

  if (accesorios.length > 0) {
    const { reponerAccesoriosAlStock } = await import(
      "@/app/ventas-general/componentes/reponerAccesorioEnStock"
    );
    await reponerAccesoriosAlStock({ productos: accesorios, negocioID: negocioId });
  }
}

/** Si la API admin no autoriza (p. ej. local sin Firebase Admin), usa Firestore cliente. */
function debeUsarFallbackCliente(status: number, errorMsg: string): boolean {
  if (status === 401 || status === 403) return true;
  return (
    status === 500 &&
    /firebase admin no configurado|project_id|credential/i.test(errorMsg)
  );
}

export async function actualizarStockVentaViaApi(
  negocioId: string,
  items: Array<Record<string, unknown>>,
  accion: "descontar" | "reponer" = "descontar"
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sesión expirada. Volvé a iniciar sesión.");

  const productos = items.filter(productoAfectaStock).map(normalizarLineaStock);

  if (productos.length === 0) {
    if (items.length > 0) {
      throw new Error("Ningún producto de la venta coincide con stock repuestos/accesorios.");
    }
    return;
  }

  const token = await user.getIdToken();
  const res = await fetch("/api/ventas/descontar-stock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ negocioId, productos, accion }),
  });

  if (res.ok) return;

  const data = await res.json().catch(() => ({}));
  const errorMsg = String(data.error || "No se pudo actualizar el stock.");

  if (debeUsarFallbackCliente(res.status, errorMsg)) {
    console.warn(
      `[actualizarStockVentaViaApi] API admin no disponible (${res.status}), usando Firestore cliente:`,
      errorMsg
    );
    if (accion === "reponer") {
      await reponerStockViaCliente(negocioId, productos);
    } else {
      await descontarStockViaCliente(negocioId, productos);
    }
    return;
  }

  throw new Error(errorMsg);
}

export function productosConStockDeVenta(productos: Array<Record<string, unknown>>) {
  return productos.filter(productoAfectaStock);
}

export function negocioIdStockDeVenta(venta: Record<string, unknown>, negocioFallback: string) {
  const id = String(venta.negocioStockId ?? "").trim();
  return id || negocioFallback;
}

function productosRepuesto(items: Array<Record<string, unknown>>) {
  return items.filter((p) => clasificarProductoStock(p) === "repuesto");
}

function productosAccesorio(items: Array<Record<string, unknown>>) {
  return items.filter((p) => clasificarProductoStock(p) === "accesorio");
}

/** Reponer al eliminar. API admin primero; si falla, cliente Firestore para repuestos. */
export async function reponerStockAlEliminarVenta(
  negocioId: string,
  productos: Array<Record<string, unknown>>
) {
  const items = productosConStockDeVenta(productos);
  const candidatos = productos.filter(
    (p) =>
      String(p.categoria ?? "") !== "Teléfono" && codigoProductoStock(p as Record<string, unknown>)
  );

  if (candidatos.length > 0 && items.length === 0) {
    throw new Error(
      "No se pudo identificar el stock a reponer. Recargá la página e intentá de nuevo."
    );
  }
  if (items.length === 0) return;

  const repuestos = productosRepuesto(items);
  const accesorios = productosAccesorio(items);
  const errores: string[] = [];

  if (accesorios.length > 0) {
    try {
      await actualizarStockVentaViaApi(negocioId, accesorios, "reponer");
    } catch (error) {
      errores.push(error instanceof Error ? error.message : "No se pudo reponer accesorios.");
    }
  }

  if (repuestos.length > 0) {
    try {
      await actualizarStockVentaViaApi(negocioId, repuestos, "reponer");
    } catch (error) {
      errores.push(
        error instanceof Error ? error.message : "No se pudo reponer repuestos al stock."
      );
    }
  }

  if (errores.length > 0) {
    throw new Error(errores.join(" · "));
  }
}
