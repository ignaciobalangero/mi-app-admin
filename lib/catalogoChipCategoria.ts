import type { ItemStockPublico } from "@/lib/stockPublicoTypes";
import { normalizarCategoriaKey } from "@/lib/categoriaRepuesto";

/**
 * Categorías del catálogo web (chips + filtros).
 *
 * Para agregar una categoría nueva:
 * 1. Sumá el id al type ChipCategoria y a CHIPS_VALIDOS en app/api/stock-publico/route.ts
 * 2. Definí CLAVES_* y esItem…() acá; actualizá coincideChipCategoria y el chip "otros"
 * 3. Sumá entrada en CATEGORIAS_TIENDA_INICIO y en CHIPS de ConsultaStockCliente.tsx
 */
export type ChipCategoria =
  | "todas"
  | "pantallas"
  | "baterias"
  | "placas_carga"
  | "tapas"
  | "herramientas"
  | "insumos"
  | "otros";

/** Tarjetas grandes del inicio (sin "todas" ni "otros"). */
export const CATEGORIAS_TIENDA_INICIO: {
  id: Exclude<ChipCategoria, "todas" | "otros">;
  label: string;
  hint: string;
}[] = [
  { id: "pantallas", label: "Pantallas", hint: "Módulos, LCD, OLED…" },
  { id: "baterias", label: "Baterías", hint: "Baterías y pilas" },
  { id: "placas_carga", label: "Placa de carga", hint: "Flex, dock, puerto de carga…" },
  { id: "tapas", label: "Tapas", hint: "Tapas traseras por modelo y color" },
  { id: "herramientas", label: "Herramientas", hint: "Soldadores, pinzas, extractores…" },
  { id: "insumos", label: "Insumos", hint: "Cintas, pastas, adhesivos…" },
];

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

const CLAVES_PLACA_CARGA = [
  "placa de carga",
  "placas de carga",
  "placa carga",
  "placas carga",
  "flex de carga",
  "flex carga",
  "dock",
  "charging board",
  "charging port",
  "puerto de carga",
  "puerto carga",
  "ic de carga",
  "modulo de carga",
  "modulos de carga",
  "sub placa",
  "subplaca",
];

const CLAVES_HERRAMIENTAS = [
  "herramienta",
  "herramientas",
  "destornill",
  "soldador",
  "soldadura",
  "pistola",
  "calor",
  "pinza",
  "pinzas",
  "extractor",
  "tweezer",
  "esd",
  "bancada",
  "mat",
];

const CLAVES_TAPAS = [
  "tapa",
  "tapas",
  "tapa trasera",
  "tapas traseras",
  "back cover",
  "back glass",
  "glass back",
];

const CLAVES_INSUMOS = [
  "insumo",
  "insumos",
  "cinta",
  "mica",
  "alcohol",
  "isopropil",
  "flux",
  "pasta termica",
  "termica",
  "film",
  "adhesivo",
  "pegamento",
  "b7000",
  "t7000",
  "wick",
  "desoldante",
  "hilo",
  "cobre",
  "gasa",
  "broche",
  "broches",
  "t676",
];

/** Evita que flex/placa/conector se clasifiquen como pantalla por el nombre. */
const CLAVES_OTROS_PRIORITARIO = [
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
  "cargador",
  "cargadores",
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

export function esItemPlacaCarga(it: ItemStockPublico): boolean {
  const cat = categoriaNorm(it);
  const blob = blobItem(it);
  if (coincideClaves(cat, CLAVES_PLACA_CARGA) || coincideClaves(blob, CLAVES_PLACA_CARGA)) {
    return true;
  }
  const tienePlaca = blob.includes("placa") || cat.includes("placa");
  const tieneCarga =
    blob.includes("carga") ||
    cat.includes("carga") ||
    blob.includes("dock") ||
    cat.includes("dock");
  const esCargadorPared =
    blob.includes("cargador") ||
    cat.includes("cargador") ||
    blob.includes("wall charger");
  return tienePlaca && tieneCarga && !esCargadorPared;
}

export function esItemPantalla(it: ItemStockPublico): boolean {
  if (esItemPlacaCarga(it)) return false;
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

export function esItemHerramienta(it: ItemStockPublico): boolean {
  const cat = categoriaNorm(it);
  const blob = blobItem(it);
  return coincideClaves(cat, CLAVES_HERRAMIENTAS) || coincideClaves(blob, CLAVES_HERRAMIENTAS);
}

export function esItemInsumo(it: ItemStockPublico): boolean {
  const cat = categoriaNorm(it);
  const blob = blobItem(it);
  return coincideClaves(cat, CLAVES_INSUMOS) || coincideClaves(blob, CLAVES_INSUMOS);
}

export function esItemTapa(it: ItemStockPublico): boolean {
  if (esItemPantalla(it) || esItemPlacaCarga(it)) return false;
  const cat = categoriaNorm(it);
  if (cat === "tapas" || cat === "tapa") return true;
  const blob = blobItem(it);
  return coincideClaves(cat, CLAVES_TAPAS) || coincideClaves(blob, CLAVES_TAPAS);
}

export function coincideChipCategoria(it: ItemStockPublico, chip: ChipCategoria): boolean {
  if (chip === "todas") return true;
  if (chip === "pantallas") return esItemPantalla(it);
  if (chip === "baterias") return esItemBateria(it);
  if (chip === "placas_carga") return esItemPlacaCarga(it);
  if (chip === "tapas") return esItemTapa(it);
  if (chip === "herramientas") return esItemHerramienta(it);
  if (chip === "insumos") return esItemInsumo(it);
  if (chip === "otros") {
    return (
      !esItemPantalla(it) &&
      !esItemBateria(it) &&
      !esItemPlacaCarga(it) &&
      !esItemTapa(it) &&
      !esItemHerramienta(it) &&
      !esItemInsumo(it)
    );
  }
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
