import { DEFAULT_PARAMETROS, type ParametrosCosteo } from "./costeo";
import type { ZingueriaConfig } from "./types";

export function configToParams(
  cfg: Partial<ZingueriaConfig> | null | undefined
): ParametrosCosteo {
  if (!cfg) return { ...DEFAULT_PARAMETROS };
  return {
    pctDiseno: Number(cfg.pctDiseno ?? DEFAULT_PARAMETROS.pctDiseno),
    pctManoObra: Number(cfg.pctManoObra ?? DEFAULT_PARAMETROS.pctManoObra),
    pctManoObraBabetas: Number(
      cfg.pctManoObraBabetas ?? DEFAULT_PARAMETROS.pctManoObraBabetas
    ),
    pctRecargoPublico: Number(
      cfg.pctRecargoPublico ?? DEFAULT_PARAMETROS.pctRecargoPublico
    ),
    pctRecargoPublicoPlegadosVarios: Number(
      cfg.pctRecargoPublicoPlegadosVarios ??
        DEFAULT_PARAMETROS.pctRecargoPublicoPlegadosVarios
    ),
    pctListaRioCuarto: Number(
      cfg.pctListaRioCuarto ?? DEFAULT_PARAMETROS.pctListaRioCuarto
    ),
    pctListaRioCuartoTubos: Number(
      cfg.pctListaRioCuartoTubos ?? DEFAULT_PARAMETROS.pctListaRioCuartoTubos
    ),
    pctColocacionBase: Number(
      cfg.pctColocacionBase ?? DEFAULT_PARAMETROS.pctColocacionBase
    ),
    redondearCortes: Boolean(
      cfg.redondearCortes ?? DEFAULT_PARAMETROS.redondearCortes
    ),
    pctIva: Number(cfg.pctIva ?? DEFAULT_PARAMETROS.pctIva),
    factoresColocacion: {
      ...DEFAULT_PARAMETROS.factoresColocacion,
      ...(cfg.factoresColocacion || {}),
    },
  };
}

export function defaultConfigDoc(ownerUid: string): ZingueriaConfig {
  return {
    ownerUid,
    ...DEFAULT_PARAMETROS,
    materialReferenciaColocacionId: null,
  };
}

/** UI: fracción 0–1 → porcentaje 0–100 para inputs. */
export function fracToPctInput(frac: number): number {
  return Math.round(frac * 10000) / 100;
}

export function pctInputToFrac(pct: number): number {
  if (pct > 1) return pct / 100;
  return pct;
}
