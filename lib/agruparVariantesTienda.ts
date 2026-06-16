import { esItemTapa } from "@/lib/catalogoChipCategoria";
import type { ItemStockPublico } from "@/lib/stockPublicoTypes";
import { precioListaARS } from "@/lib/stockPublicoPrecios";

export type GrupoVariantesTienda = {
  clave: string;
  titulo: string;
  marca: string;
  categoria: string;
  variantes: ItemStockPublico[];
};

export type FilaCatalogoTienda =
  | { tipo: "item"; item: ItemStockPublico }
  | { tipo: "grupo"; grupo: GrupoVariantesTienda };

function normalizarTitulo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function etiquetaVariante(it: ItemStockPublico): string {
  const color = String(it.color ?? "").trim();
  if (color) return color;
  const obs = String(it.observacion ?? "").trim();
  if (obs) return obs;
  return it.codigo || "Variante";
}

export function ordenarVariantes(lista: ItemStockPublico[]): ItemStockPublico[] {
  return [...lista].sort((a, b) => {
    const sa = a.stock > 0 ? 0 : 1;
    const sb = b.stock > 0 ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return etiquetaVariante(a).localeCompare(etiquetaVariante(b), "es", { sensitivity: "base" });
  });
}

export function variantePorDefecto(variantes: ItemStockPublico[]): ItemStockPublico {
  return variantes.find((v) => v.stock > 0) ?? variantes[0];
}

export function precioDesdeGrupo(
  variantes: ItemStockPublico[],
  cotizacionUSD: number
): { texto: string; min: number; max: number } {
  const precios = variantes
    .map((v) => precioListaARS(v, cotizacionUSD))
    .filter((p) => p > 0);
  if (precios.length === 0) {
    return { texto: "Consultá precio", min: 0, max: 0 };
  }
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  if (min === max) {
    return { texto: `$${min.toLocaleString("es-AR")}`, min, max };
  }
  return { texto: `Desde $${min.toLocaleString("es-AR")}`, min, max };
}

/** Agrupa ítems TAPAS con el mismo título en una sola tarjeta con selector. */
export function prepararFilasCatalogoTapas(items: ItemStockPublico[]): FilaCatalogoTienda[] {
  const porTitulo = new Map<string, ItemStockPublico[]>();
  const ordenTitulos: string[] = [];
  const idsEnGrupo = new Set<string>();

  for (const it of items) {
    if (!esItemTapa(it)) continue;
    const key = normalizarTitulo(it.producto);
    if (!key) continue;
    if (!porTitulo.has(key)) {
      porTitulo.set(key, []);
      ordenTitulos.push(key);
    }
    porTitulo.get(key)!.push(it);
  }

  const grupos = new Map<string, GrupoVariantesTienda>();
  for (const key of ordenTitulos) {
    const lista = porTitulo.get(key)!;
    if (lista.length < 2) continue;
    const ordenadas = ordenarVariantes(lista);
    ordenadas.forEach((v) => idsEnGrupo.add(v.id));
    const ref = ordenadas[0];
    grupos.set(key, {
      clave: key,
      titulo: ref.producto,
      marca: ref.marca,
      categoria: ref.categoria,
      variantes: ordenadas,
    });
  }

  const filas: FilaCatalogoTienda[] = [];
  const gruposYa = new Set<string>();

  for (const it of items) {
    if (idsEnGrupo.has(it.id)) {
      const key = normalizarTitulo(it.producto);
      if (!gruposYa.has(key)) {
        gruposYa.add(key);
        const g = grupos.get(key);
        if (g) filas.push({ tipo: "grupo", grupo: g });
      }
      continue;
    }
    filas.push({ tipo: "item", item: it });
  }

  return filas;
}
