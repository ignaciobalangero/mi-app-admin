/** URLs de fotos importadas de otros sitios (proxies Next, etc.) → URL directa de la imagen. */
export function resolverUrlFotoProducto(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";

  try {
    const u = new URL(t);
    if (u.pathname.includes("/_next/image")) {
      const inner = u.searchParams.get("url");
      if (inner) return decodeURIComponent(inner);
    }
  } catch {
    /* URL relativa o inválida: usar tal cual */
  }

  return t;
}
