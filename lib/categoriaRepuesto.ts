/** Clave estable para comparar categorías sin importar mayúsculas/espacios. */
export function normalizarCategoriaKey(c: unknown): string {
  return String(c ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function mismoCategoria(a: unknown, b: unknown): boolean {
  const ka = normalizarCategoriaKey(a);
  const kb = normalizarCategoriaKey(b);
  return ka.length > 0 && ka === kb;
}

/** Una sola entrada por categoría lógica; la última del listado gana (códigos más nuevos al final). */
export function fusionarCategoriasUnicas(valores: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of valores) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    map.set(normalizarCategoriaKey(t), t);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

export function fusionarValoresUnicos(valores: string[]): string[] {
  return Array.from(new Set(valores.map((v) => String(v ?? "").trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, "es", { sensitivity: "base" })
  );
}
