/** Misma lógica de logo que el panel admin (Configuraciones → Logo del Sistema). */

export function rutasConfigLogo(negocioId: string): string[] {
  return [
    `negocios/${negocioId}/configuracion/datos`,
    `negocios/${negocioId}/configuracion/general`,
    `negocios/${negocioId}/configuracion/logo`,
  ];
}

export function extraerLogoUrl(
  data: Record<string, unknown> | undefined | null
): string | null {
  if (!data) return null;
  for (const key of ["logoUrl", "logo"] as const) {
    const v = data[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (/^https?:\/\//i.test(t) || t.startsWith("/")) return t;
    }
  }
  return null;
}

export function negocioIdDesdeRutaConsultaStock(pathname: string): string | null {
  const match = pathname.match(/^\/consulta-stock\/([^/?#]+)/);
  return match?.[1]?.trim() || null;
}
