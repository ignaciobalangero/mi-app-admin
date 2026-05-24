/** Asegura https:// para enlaces externos (evita rutas relativas tipo /consulta-stock/www.ejemplo.com). */
export function normalizarUrlExterna(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  return `https://${t.replace(/^\/+/, "")}`;
}

export function esUrlExternaValida(raw: string | null | undefined): boolean {
  const url = normalizarUrlExterna(raw);
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
