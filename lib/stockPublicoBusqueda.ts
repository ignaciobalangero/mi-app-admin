import type { ItemStockPublico } from "@/lib/stockPublicoTypes";

export function normalizarBusqueda(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function tokensBusqueda(q: string): string[] {
  const n = normalizarBusqueda(q);
  if (!n) return [];
  return n.split(/\s+/).filter(Boolean);
}

export function coincideBusqueda(it: ItemStockPublico, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const blob = normalizarBusqueda(
    [it.codigo, it.producto, it.modelo, it.marca, it.categoria, it.observacion ?? ""]
      .filter(Boolean)
      .join(" ")
  );
  return tokens.every((tok) => blob.includes(tok));
}

export function filtrarItemsBusqueda(items: ItemStockPublico[], q: string): ItemStockPublico[] {
  const tokens = tokensBusqueda(q);
  if (tokens.length === 0) return items;
  return items.filter((it) => coincideBusqueda(it, tokens));
}
