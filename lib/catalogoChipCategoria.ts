import type { ItemStockPublico } from "@/lib/stockPublicoTypes";
import { normalizarCategoriaKey } from "@/lib/categoriaRepuesto";

export type ChipCategoria = "todas" | "pantallas" | "baterias" | "otros";

const CLAVES_PANTALLA = [
  "pantalla",
  "pantallas",
  "modulo",
  "modulos",
  "lcd",
  "oled",
  "display",
  "touch",
  "incell",
  "in cell",
];

const CLAVES_BATERIA = ["bateria", "baterias", "bater", "pila", "pilas", "battery"];

/** Repuestos que suelen ir en "Otros" aunque el nombre tenga "módulo" u otra palabra ambigua. */
const CLAVES_OTROS_PRIORITARIO = [
  "placa",
  "placas",
  "carga",
  "cargador",
  "cargadores",
  "flex",
  "conector",
  "conectores",
  "tapa",
  "tapas",
  "auricular",
  "microfono",
  "camara",
  "antena",
  "buzzer",
  "parlante",
];

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function blobItem(it: ItemStockPublico): string {
  return normalizarTexto([it.categoria, it.producto, it.marca].filter(Boolean).join(" "));
}

function categoriaNorm(it: ItemStockPublico): string {
  return normalizarCategoriaKey(it.categoria);
}

function coincideClaves(texto: string, claves: string[]): boolean {
  return claves.some((k) => texto.includes(k.replace(/\s+/g, " ")));
}

export function esItemPantalla(it: ItemStockPublico): boolean {
  const cat = categoriaNorm(it);
  const blob = blobItem(it);
  const catEsPantalla = coincideClaves(cat, CLAVES_PANTALLA);
  if (coincideClaves(blob, CLAVES_OTROS_PRIORITARIO) && !catEsPantalla) {
    return false;
  }
  return catEsPantalla || coincideClaves(blob, CLAVES_PANTALLA);
}

export function esItemBateria(it: ItemStockPublico): boolean {
  const cat = categoriaNorm(it);
  const blob = blobItem(it);
  return coincideClaves(cat, CLAVES_BATERIA) || coincideClaves(blob, CLAVES_BATERIA);
}

export function coincideChipCategoria(it: ItemStockPublico, chip: ChipCategoria): boolean {
  if (chip === "todas") return true;
  if (chip === "pantallas") return esItemPantalla(it);
  if (chip === "baterias") return esItemBateria(it);
  if (chip === "otros") return !esItemPantalla(it) && !esItemBateria(it);
  return true;
}

export function marcasUnicas(items: ItemStockPublico[]): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const m = String(it.marca ?? "").trim();
    if (m) set.add(m);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function coincideMarca(it: ItemStockPublico, marcaFiltro: string): boolean {
  if (!marcaFiltro.trim()) return true;
  return String(it.marca ?? "").trim().toLowerCase() === marcaFiltro.trim().toLowerCase();
}
