/**
 * Dominios personalizados de tienda pública → negocioID en Firebase.
 * Ej.: iphonetec.com.ar muestra el catálogo de `iphonetec` sin mezclar con el panel Gestione.
 *
 * Opcional en Vercel: DOMINIOS_TIENDA=otro.com.ar:negocioId,www.otro.com.ar:negocioId
 */
export const DOMINIOS_TIENDA_DEFECTO: Record<string, string> = {
  "iphonetec.com.ar": "iphonetec",
  "www.iphonetec.com.ar": "iphonetec",
};

function parseDominiosEnv(): Record<string, string> {
  const raw = process.env.DOMINIOS_TIENDA?.trim();
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [host, negocioId] = part.split(":").map((s) => s.trim().toLowerCase());
    if (host && negocioId) out[host] = negocioId;
  }
  return out;
}

export function mapaDominiosTienda(): Record<string, string> {
  return { ...DOMINIOS_TIENDA_DEFECTO, ...parseDominiosEnv() };
}

export function normalizarHost(host: string): string {
  return host.split(":")[0].trim().toLowerCase();
}

export function negocioIdDesdeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = normalizarHost(host);
  return mapaDominiosTienda()[h] ?? null;
}

export function esHostDominioTienda(host: string | null | undefined): boolean {
  return negocioIdDesdeHost(host) !== null;
}

/** Ruta interna del catálogo para un negocio. */
export function rutaConsultaStock(negocioId: string): string {
  return `/consulta-stock/${encodeURIComponent(negocioId)}`;
}
