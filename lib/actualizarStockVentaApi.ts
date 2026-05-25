import { auth } from "@/lib/auth";
import { esProductoAccesorio, esProductoRepuestoOGeneral } from "@/lib/ventasStockProducto";

export async function actualizarStockVentaViaApi(
  negocioId: string,
  items: Array<Record<string, unknown>>,
  accion: "descontar" | "reponer" = "descontar"
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sesión expirada. Volvé a iniciar sesión.");

  const productos = items
    .filter((p) => {
      const codigo = String(p.codigo ?? p.id ?? "").trim();
      return codigo && (esProductoAccesorio(p) || esProductoRepuestoOGeneral(p));
    })
    .map((p) => ({
      codigo: p.codigo,
      id: p.id,
      cantidad: p.cantidad,
      tipo: p.tipo,
      categoria: p.categoria,
      origenStock: p.origenStock,
      hoja: p.hoja,
    }));

  if (productos.length === 0) return;

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
  return productos.filter((p) => {
    const codigo = String(p.codigo ?? p.id ?? "").trim();
    return codigo && (esProductoAccesorio(p) || esProductoRepuestoOGeneral(p));
  });
}
