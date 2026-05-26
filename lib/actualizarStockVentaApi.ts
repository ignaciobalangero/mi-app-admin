import { auth } from "@/lib/auth";
import {
  clasificarProductoStock,
  codigoProductoStock,
  productoAfectaStock,
} from "@/lib/ventasStockProducto";

function normalizarLineaStock(p: Record<string, unknown>) {
  const codigo = codigoProductoStock(p);
  return {
    codigo,
    id: p.stockDocId ?? p.id,
    stockDocId: p.stockDocId ?? p.id,
    cantidad: p.cantidad,
    tipo: p.tipo,
    categoria: p.categoria,
    origenStock: p.origenStock,
    hoja: p.hoja,
  };
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

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(String(data.error || "No se pudo actualizar el stock."));
  }
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
    } catch (apiError) {
      console.warn("[reponerStockAlEliminarVenta] API repuestos falló, intentando cliente:", apiError);
      try {
        const { reponerRepuestosAlStock } = await import(
          "@/app/ventas-general/componentes/reponerRepuestosAlStock"
        );
        await reponerRepuestosAlStock({ productos: repuestos, negocioID: negocioId });
      } catch (clientError) {
        errores.push(
          clientError instanceof Error
            ? clientError.message
            : "No se pudo reponer repuestos al stock."
        );
      }
    }
  }

  if (errores.length > 0) {
    throw new Error(errores.join(" · "));
  }
}
