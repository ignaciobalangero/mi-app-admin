/**
 * Costeo Zinguería — fórmulas puras (Excel del dueño).
 * Criterio: solo se actualiza el precio de la chapa; el resto se calcula.
 */

export type AcabadoChapa = "galva" | "color";

export type CategoriaMaterial =
  | "canaleta"
  | "cano_rectangular"
  | "cano_redondo"
  | "cenefa"
  | "babeta"
  | "cumbrera"
  | "plegado_varios"
  | "maceta"
  | "accesorio"
  | "soporte"
  | "reventa"
  | "otro";

export type TipoCalculo =
  | "plegado"
  | "accesorio"
  | "soporte"
  | "reventa"
  | "maceta"
  | "stock_simple";

export type TipoDesarrollo = "estandar_406" | "estandar_305" | "especial";

export interface ChapaInput {
  anchoMm: number;
  largoMm: number;
  precioCosto: number;
  acabado?: AcabadoChapa;
  calibre?: string;
}

export interface PlanchuelaInput {
  largoBarraMm: number;
  precioCosto: number;
}

export interface FactoresColocacion {
  canaletasPb: number;
  canaletasPaMult: number;
  canosPb: number;
  canosPaMult: number;
  babetasPb: number;
  babetasPaMult: number;
  cenefasPb: number;
  cenefasPaMult: number;
}

export interface ParametrosCosteo {
  pctDiseno: number;
  pctManoObra: number;
  pctManoObraBabetas: number;
  pctRecargoPublico: number;
  pctRecargoPublicoPlegadosVarios: number;
  pctListaRioCuarto: number;
  pctListaRioCuartoTubos: number;
  pctColocacionBase: number;
  redondearCortes: boolean;
  pctIva: number;
  factoresColocacion: FactoresColocacion;
}

export const DEFAULT_PARAMETROS: ParametrosCosteo = {
  pctDiseno: 1,
  pctManoObra: 0.8,
  pctManoObraBabetas: 0.4,
  pctRecargoPublico: 0.1,
  pctRecargoPublicoPlegadosVarios: 0.3,
  pctListaRioCuarto: 0.5903,
  pctListaRioCuartoTubos: 0.4355,
  pctColocacionBase: 0.6,
  redondearCortes: false,
  pctIva: 0.21,
  factoresColocacion: {
    canaletasPb: 1,
    canaletasPaMult: 2,
    canosPb: 0.5,
    canosPaMult: 1.7,
    babetasPb: 1.2,
    babetasPaMult: 2,
    cenefasPb: 1,
    cenefasPaMult: 2,
  },
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function pctOr(
  override: number | null | undefined,
  global: number
): number {
  return override == null || Number.isNaN(Number(override))
    ? global
    : Number(override);
}

/** Porcentajes en UI suelen ir 0–100; internamente usamos fracción 0–1. */
export function asFraction(pct: number): number {
  if (pct > 1) return pct / 100;
  return pct;
}

export function cortesPorChapa(
  anchoChapa: number,
  desarrolloMm: number,
  redondear: boolean
): number {
  if (desarrolloMm <= 0) return 0;
  const raw = anchoChapa / desarrolloMm;
  return redondear ? Math.floor(raw) : raw;
}

export interface ResultadoPlegado {
  ok: boolean;
  sinPrecio: boolean;
  error?: string;
  cortesPorChapa: number;
  costoTira: number;
  costoMetro: number;
  diseno: number;
  manoObra: number;
  precioNeto: number;
  precioPublico: number;
  precioRioCuarto: number;
  coeficienteGanancia: number;
  gananciaPorMetro: number;
}

export function calcularPlegado(opts: {
  chapa: ChapaInput;
  desarrolloMm: number;
  categoria: CategoriaMaterial;
  params?: Partial<ParametrosCosteo>;
  pctDiseno?: number | null;
  pctManoObra?: number | null;
  pctRecargoPublico?: number | null;
  pctListaRioCuarto?: number | null;
  precioPublicoManual?: number | null;
}): ResultadoPlegado {
  const p = { ...DEFAULT_PARAMETROS, ...opts.params };
  const empty: ResultadoPlegado = {
    ok: false,
    sinPrecio: false,
    cortesPorChapa: 0,
    costoTira: 0,
    costoMetro: 0,
    diseno: 0,
    manoObra: 0,
    precioNeto: 0,
    precioPublico: 0,
    precioRioCuarto: 0,
    coeficienteGanancia: 0,
    gananciaPorMetro: 0,
  };

  const { chapa, desarrolloMm, categoria } = opts;
  if (!(desarrolloMm > 0)) {
    return { ...empty, error: "desarrolloMm debe ser > 0" };
  }
  if (desarrolloMm > chapa.anchoMm) {
    return {
      ...empty,
      error: "desarrolloMm no puede superar el ancho de la chapa",
    };
  }
  if (!(chapa.precioCosto > 0) || !(chapa.largoMm > 0) || !(chapa.anchoMm > 0)) {
    return { ...empty, sinPrecio: true, error: "sin precio" };
  }

  const cortes = cortesPorChapa(
    chapa.anchoMm,
    desarrolloMm,
    p.redondearCortes
  );
  if (!(cortes > 0)) {
    return { ...empty, error: "cortesPorChapa inválido" };
  }

  const costoTira = chapa.precioCosto / cortes;
  const costoMetro = (costoTira / chapa.largoMm) * 1000;

  const pctDiseno = asFraction(pctOr(opts.pctDiseno, p.pctDiseno));
  const defaultMo =
    categoria === "babeta" ? p.pctManoObraBabetas : p.pctManoObra;
  const pctMo = asFraction(pctOr(opts.pctManoObra, defaultMo));
  const defaultRecargo =
    categoria === "plegado_varios"
      ? p.pctRecargoPublicoPlegadosVarios
      : p.pctRecargoPublico;
  const pctRecargo = asFraction(pctOr(opts.pctRecargoPublico, defaultRecargo));
  const defaultLista =
    categoria === "cano_rectangular" || categoria === "cano_redondo"
      ? p.pctListaRioCuartoTubos
      : p.pctListaRioCuarto;
  const pctLista = asFraction(pctOr(opts.pctListaRioCuarto, defaultLista));

  const diseno = costoMetro * pctDiseno;
  const manoObra = costoMetro * pctMo;
  const precioNeto = costoMetro + diseno + manoObra;
  const precioPublicoCalc = precioNeto * (1 + pctRecargo);
  const precioPublico =
    opts.precioPublicoManual != null && opts.precioPublicoManual > 0
      ? Number(opts.precioPublicoManual)
      : precioPublicoCalc;
  const precioRioCuarto = precioPublico * (1 + pctLista);
  const coeficienteGanancia =
    costoMetro > 0 ? precioPublico / costoMetro : 0;
  const gananciaPorMetro = precioPublico - costoMetro;

  return {
    ok: true,
    sinPrecio: false,
    cortesPorChapa: Math.round(cortes * 10000) / 10000,
    costoTira: round2(costoTira),
    costoMetro: round2(costoMetro),
    diseno: round2(diseno),
    manoObra: round2(manoObra),
    precioNeto: round2(precioNeto),
    precioPublico: round2(precioPublico),
    precioRioCuarto: round2(precioRioCuarto),
    coeficienteGanancia: round2(coeficienteGanancia),
    gananciaPorMetro: round2(gananciaPorMetro),
  };
}

export interface ResultadoAccesorio {
  ok: boolean;
  error?: string;
  base: number;
  diseno: number;
  manoObra: number;
  precioNeto: number;
  precioPublico: number;
}

export function calcularAccesorio(opts: {
  chapa: ChapaInput;
  desarrolloMm: number;
  factorLargo: number;
  multMaterial: number;
  multManoObra: number;
  params?: Partial<ParametrosCosteo>;
  pctDiseno?: number | null;
  pctManoObra?: number | null;
  pctRecargoPublico?: number | null;
}): ResultadoAccesorio {
  const p = { ...DEFAULT_PARAMETROS, ...opts.params };
  const empty: ResultadoAccesorio = {
    ok: false,
    base: 0,
    diseno: 0,
    manoObra: 0,
    precioNeto: 0,
    precioPublico: 0,
  };
  const { chapa, desarrolloMm, factorLargo, multMaterial, multManoObra } = opts;
  if (!(desarrolloMm > 0) || !(chapa.precioCosto > 0) || !(chapa.largoMm > 0)) {
    return { ...empty, error: "datos incompletos" };
  }
  const cortes = cortesPorChapa(
    chapa.anchoMm,
    desarrolloMm,
    p.redondearCortes
  );
  if (!(cortes > 0)) return { ...empty, error: "cortes inválidos" };

  const costoTira = chapa.precioCosto / cortes;
  const base = (costoTira / chapa.largoMm) * 1000 * factorLargo;
  const pctDiseno = asFraction(pctOr(opts.pctDiseno, p.pctDiseno));
  const pctMo = asFraction(pctOr(opts.pctManoObra, p.pctManoObra));
  const pctRecargo = asFraction(
    pctOr(opts.pctRecargoPublico, p.pctRecargoPublico)
  );

  const diseno = base * pctDiseno;
  const manoObra = base * pctMo * multManoObra;
  const precioNeto = diseno + manoObra + base * multMaterial;
  const precioPublico = precioNeto * (1 + pctRecargo);

  return {
    ok: true,
    base: round2(base),
    diseno: round2(diseno),
    manoObra: round2(manoObra),
    precioNeto: round2(precioNeto),
    precioPublico: round2(precioPublico),
  };
}

export interface ResultadoSoporte {
  ok: boolean;
  error?: string;
  piezasPorBarra: number;
  costoPieza: number;
  diseno: number;
  manoObra: number;
  precioNeto: number;
  precioPublico: number;
}

export function calcularSoporte(opts: {
  planchuela: PlanchuelaInput;
  desarrolloMm: number;
  params?: Partial<ParametrosCosteo>;
  pctDiseno?: number | null;
  pctManoObra?: number | null;
}): ResultadoSoporte {
  const p = { ...DEFAULT_PARAMETROS, ...opts.params };
  const empty: ResultadoSoporte = {
    ok: false,
    piezasPorBarra: 0,
    costoPieza: 0,
    diseno: 0,
    manoObra: 0,
    precioNeto: 0,
    precioPublico: 0,
  };
  const { planchuela, desarrolloMm } = opts;
  if (
    !(desarrolloMm > 0) ||
    !(planchuela.largoBarraMm > 0) ||
    !(planchuela.precioCosto > 0)
  ) {
    return { ...empty, error: "datos incompletos" };
  }
  const piezasPorBarra = planchuela.largoBarraMm / desarrolloMm;
  const costoPieza = planchuela.precioCosto / piezasPorBarra;
  const pctDiseno = asFraction(pctOr(opts.pctDiseno, p.pctDiseno));
  const pctMo = asFraction(pctOr(opts.pctManoObra, p.pctManoObra));
  const diseno = costoPieza * pctDiseno;
  const manoObra = costoPieza * pctMo * 10;
  const precioNeto = costoPieza + diseno + manoObra;
  const precioPublico = precioNeto * 1.1;

  return {
    ok: true,
    piezasPorBarra: round2(piezasPorBarra),
    costoPieza: round2(costoPieza),
    diseno: round2(diseno),
    manoObra: round2(manoObra),
    precioNeto: round2(precioNeto),
    precioPublico: round2(precioPublico),
  };
}

export interface ResultadoReventa {
  ok: boolean;
  error?: string;
  costoTotal: number;
  precioVenta: number;
}

export function calcularReventa(opts: {
  precioCosto: number;
  costoEmbalaje?: number;
  costoFlete?: number;
  margen: number;
}): ResultadoReventa {
  const margen = Number(opts.margen);
  if (!(margen >= 1 && margen <= 10)) {
    return {
      ok: false,
      error: "margen debe estar entre 1 y 10 (ej. 1.7, no 1700)",
      costoTotal: 0,
      precioVenta: 0,
    };
  }
  const costoTotal =
    (Number(opts.precioCosto) || 0) +
    (Number(opts.costoEmbalaje) || 0) +
    (Number(opts.costoFlete) || 0);
  return {
    ok: true,
    costoTotal: round2(costoTotal),
    precioVenta: round2(costoTotal * margen),
  };
}

export function calcularMaceta(
  plegado: ResultadoPlegado,
  cantidadMetrosPorUnidad: number
): { costoUnidad: number; precioUnidad: number; ganancia: number } {
  const m = Number(cantidadMetrosPorUnidad) || 0;
  const costoUnidad = round2(plegado.costoMetro * m);
  const precioUnidad = round2(plegado.precioPublico * m);
  return {
    costoUnidad,
    precioUnidad,
    ganancia: round2(precioUnidad - costoUnidad),
  };
}

export function colocacionBase(
  precioPublicoReferencia: number,
  pctColocacionBase = DEFAULT_PARAMETROS.pctColocacionBase
): number {
  // Sin redondear acá: el redondeo se aplica en PB/PA para coincidir con Excel
  // (PA = round(ref × pct × factores), no round(round(PB)×mult)).
  return precioPublicoReferencia * asFraction(pctColocacionBase);
}

export function colocacionSugerida(
  categoria: CategoriaMaterial,
  base: number,
  factores: FactoresColocacion = DEFAULT_PARAMETROS.factoresColocacion
): { plantaBaja: number; plantaAlta: number } {
  let pbMult = 1;
  let paMult = 2;
  if (categoria === "canaleta") {
    pbMult = factores.canaletasPb;
    paMult = factores.canaletasPaMult;
  } else if (
    categoria === "cano_rectangular" ||
    categoria === "cano_redondo"
  ) {
    pbMult = factores.canosPb;
    paMult = factores.canosPaMult;
  } else if (categoria === "babeta") {
    pbMult = factores.babetasPb;
    paMult = factores.babetasPaMult;
  } else if (categoria === "cenefa") {
    pbMult = factores.cenefasPb;
    paMult = factores.cenefasPaMult;
  }
  return {
    plantaBaja: round2(base * pbMult),
    plantaAlta: round2(base * pbMult * paMult),
  };
}

export function sugerirCodigo(opts: {
  prefijo?: string;
  desarrolloMm: number;
  calibre: string;
  acabado: AcabadoChapa;
}): string {
  const pref = opts.prefijo || "";
  const acab = opts.acabado === "color" ? "C" : "";
  const cal = opts.calibre.replace(/C$/i, "");
  return `${pref}${opts.desarrolloMm}/${cal}${acab}`.replace(/\/+/g, "/");
}

export function descripcionConvencion(opts: {
  categoria: CategoriaMaterial;
  desarrolloMm: number;
  calibre: string;
  acabado: AcabadoChapa;
}): string {
  const tipo =
    opts.categoria === "cano_rectangular" || opts.categoria === "cano_redondo"
      ? "caño"
      : opts.categoria;
  return `${tipo} ${opts.desarrolloMm}/${opts.calibre}/${opts.acabado}`;
}

export function valorStockChapa(
  precioCosto: number,
  stockCantidad: number
): number {
  return round2((Number(precioCosto) || 0) * (Number(stockCantidad) || 0));
}

export function pulgadasAMm(pulgadas: number): number {
  return round2(pulgadas * 25.4);
}

export function desarrolloDesdePerfil(perfil: string): number | null {
  const parts = perfil
    .split(/[\/+\s]+/)
    .map((x) => Number(x.replace(",", ".")))
    .filter((n) => n > 0);
  if (!parts.length) return null;
  return parts.reduce((a, b) => a + b, 0);
}
