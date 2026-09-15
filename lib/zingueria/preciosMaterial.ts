import {
  calcularAccesorio,
  calcularMaceta,
  calcularPlegado,
  calcularReventa,
  calcularSoporte,
  colocacionBase,
  colocacionSugerida,
  descripcionConvencion,
  type ResultadoAccesorio,
  type ResultadoPlegado,
  type ResultadoReventa,
  type ResultadoSoporte,
} from "./costeo";
import { configToParams } from "./config";
import type {
  Chapa,
  ListaPrecios,
  Material,
  Planchuela,
  PlantaLinea,
  ZingueriaConfig,
} from "./types";

export interface PrecioMaterialResuelto {
  ok: boolean;
  sinPrecio?: boolean;
  error?: string;
  costoUnitario: number;
  precioMayorista: number;
  precioPublico: number;
  precioRioCuarto: number;
  coeficiente?: number;
  detalle?:
    | ResultadoPlegado
    | ResultadoAccesorio
    | ResultadoSoporte
    | ResultadoReventa;
  unidad: "metro" | "unidad";
  descripcionSugerida: string;
  colocacionPb: number;
  colocacionPa: number;
}

export function precioSegunLista(
  r: PrecioMaterialResuelto,
  lista: ListaPrecios
): number {
  if (lista === "mayorista") return r.precioMayorista;
  if (lista === "rio_cuarto") return r.precioRioCuarto || r.precioPublico;
  return r.precioPublico;
}

export function resolverPrecioMaterial(opts: {
  material: Material;
  chapa?: Chapa | null;
  planchuela?: Planchuela | null;
  config?: Partial<ZingueriaConfig> | null;
  precioPublicoReferenciaColocacion?: number;
}): PrecioMaterialResuelto {
  const { material, chapa, planchuela, config } = opts;
  const params = configToParams(config);
  const tipo = material.tipoCalculo || "stock_simple";
  const categoria = material.categoria || "otro";
  const acabado = chapa?.acabado || "galva";
  const calibre = chapa?.calibre || "";
  const desarrollo = Number(material.desarrolloMm) || 0;

  const descBase =
    material.codigo ||
    material.nombre ||
    (desarrollo && calibre
      ? descripcionConvencion({
          categoria,
          desarrolloMm: desarrollo,
          calibre,
          acabado,
        })
      : material.nombre);

  const colBase = colocacionBase(
    opts.precioPublicoReferenciaColocacion || 0,
    params.pctColocacionBase
  );
  const colSug = colocacionSugerida(
    categoria,
    colBase,
    params.factoresColocacion
  );
  const colocacionPb =
    material.colocacion?.plantaBajaManual != null
      ? Number(material.colocacion.plantaBajaManual)
      : colSug.plantaBaja;
  const colocacionPa =
    material.colocacion?.plantaAltaManual != null
      ? Number(material.colocacion.plantaAltaManual)
      : colSug.plantaAlta;

  if (tipo === "stock_simple") {
    return {
      ok: true,
      costoUnitario: Number(material.precioCosto) || 0,
      precioMayorista: Number(material.precioVenta) || 0,
      precioPublico: Number(material.precioVenta) || 0,
      precioRioCuarto: Number(material.precioVenta) || 0,
      unidad: material.unidad === "m" || material.unidad === "metro" ? "metro" : "unidad",
      descripcionSugerida: descBase,
      colocacionPb: 0,
      colocacionPa: 0,
    };
  }

  if (tipo === "reventa") {
    const r = calcularReventa({
      precioCosto: Number(material.precioCosto) || 0,
      costoEmbalaje: Number(material.costoEmbalaje) || 0,
      costoFlete: Number(material.costoFlete) || 0,
      margen: Number(material.margen) || 1.7,
    });
    if (!r.ok) {
      return {
        ok: false,
        error: r.error,
        costoUnitario: 0,
        precioMayorista: 0,
        precioPublico: 0,
        precioRioCuarto: 0,
        unidad: "unidad",
        descripcionSugerida: descBase,
        colocacionPb: 0,
        colocacionPa: 0,
      };
    }
    return {
      ok: true,
      costoUnitario: r.costoTotal,
      precioMayorista: r.precioVenta,
      precioPublico: r.precioVenta,
      precioRioCuarto: r.precioVenta,
      unidad: "unidad",
      descripcionSugerida: descBase,
      colocacionPb: 0,
      colocacionPa: 0,
      detalle: r,
    };
  }

  if (tipo === "soporte") {
    if (!planchuela) {
      return {
        ok: false,
        error: "Falta planchuela",
        costoUnitario: 0,
        precioMayorista: 0,
        precioPublico: 0,
        precioRioCuarto: 0,
        unidad: "unidad",
        descripcionSugerida: descBase,
        colocacionPb: 0,
        colocacionPa: 0,
      };
    }
    const r = calcularSoporte({
      planchuela,
      desarrolloMm: desarrollo,
      params,
      pctDiseno: material.pctDiseno,
      pctManoObra: material.pctManoObra,
    });
    if (!r.ok) {
      return {
        ok: false,
        error: r.error,
        costoUnitario: 0,
        precioMayorista: 0,
        precioPublico: 0,
        precioRioCuarto: 0,
        unidad: "unidad",
        descripcionSugerida: descBase,
        colocacionPb: 0,
        colocacionPa: 0,
      };
    }
    return {
      ok: true,
      costoUnitario: r.costoPieza,
      precioMayorista: r.precioNeto,
      precioPublico: r.precioPublico,
      precioRioCuarto: r.precioPublico,
      unidad: "unidad",
      descripcionSugerida: descBase,
      colocacionPb: 0,
      colocacionPa: 0,
      detalle: r,
    };
  }

  if (!chapa) {
    return {
      ok: false,
      sinPrecio: true,
      error: "Falta chapa",
      costoUnitario: 0,
      precioMayorista: 0,
      precioPublico: 0,
      precioRioCuarto: 0,
      unidad: "metro",
      descripcionSugerida: descBase,
      colocacionPb,
      colocacionPa,
    };
  }

  if (tipo === "accesorio") {
    const r = calcularAccesorio({
      chapa,
      desarrolloMm: desarrollo,
      factorLargo: Number(material.factorLargo) || 0.5,
      multMaterial: Number(material.multMaterial) || 1,
      multManoObra: Number(material.multManoObra) || 1,
      params,
      pctDiseno: material.pctDiseno,
      pctManoObra: material.pctManoObra,
      pctRecargoPublico: material.pctRecargoPublico,
    });
    if (!r.ok) {
      return {
        ok: false,
        error: r.error,
        costoUnitario: 0,
        precioMayorista: 0,
        precioPublico: 0,
        precioRioCuarto: 0,
        unidad: "unidad",
        descripcionSugerida: descBase,
        colocacionPb,
        colocacionPa,
      };
    }
    return {
      ok: true,
      costoUnitario: r.base,
      precioMayorista: r.precioNeto,
      precioPublico: r.precioPublico,
      precioRioCuarto: r.precioPublico,
      unidad: "unidad",
      descripcionSugerida: descBase,
      colocacionPb,
      colocacionPa,
      detalle: r,
    };
  }

  const plegado = calcularPlegado({
    chapa,
    desarrolloMm: desarrollo,
    categoria,
    params,
    pctDiseno: material.pctDiseno,
    pctManoObra: material.pctManoObra,
    pctRecargoPublico: material.pctRecargoPublico,
    pctListaRioCuarto: material.pctListaRioCuarto,
    precioPublicoManual: material.precioPublicoManual,
  });

  if (!plegado.ok) {
    return {
      ok: false,
      sinPrecio: plegado.sinPrecio,
      error: plegado.error,
      costoUnitario: 0,
      precioMayorista: 0,
      precioPublico: 0,
      precioRioCuarto: 0,
      unidad: "metro",
      descripcionSugerida: descBase,
      colocacionPb,
      colocacionPa,
    };
  }

  if (tipo === "maceta") {
    const m = calcularMaceta(
      plegado,
      Number(material.cantidadMetrosPorUnidad) || 1
    );
    return {
      ok: true,
      costoUnitario: m.costoUnidad,
      precioMayorista: roundLike(plegado.precioNeto * (Number(material.cantidadMetrosPorUnidad) || 1)),
      precioPublico: m.precioUnidad,
      precioRioCuarto: roundLike(
        plegado.precioRioCuarto * (Number(material.cantidadMetrosPorUnidad) || 1)
      ),
      coeficiente: plegado.coeficienteGanancia,
      unidad: "unidad",
      descripcionSugerida: descBase,
      colocacionPb,
      colocacionPa,
      detalle: plegado,
    };
  }

  return {
    ok: true,
    costoUnitario: plegado.costoMetro,
    precioMayorista: plegado.precioNeto,
    precioPublico: plegado.precioPublico,
    precioRioCuarto: plegado.precioRioCuarto,
    coeficiente: plegado.coeficienteGanancia,
    unidad: "metro",
    descripcionSugerida:
      material.nombre ||
      descripcionConvencion({
        categoria,
        desarrolloMm: desarrollo,
        calibre,
        acabado,
      }),
    colocacionPb,
    colocacionPa,
    detalle: plegado,
  };
}

function roundLike(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Precio público del material que se usa como base de colocación
 * (config.materialReferenciaColocacionId). 0 si no está configurado.
 */
export function precioReferenciaColocacion(opts: {
  materiales: Material[];
  chapas: Chapa[];
  planchuelas?: Planchuela[];
  config?: Partial<ZingueriaConfig> | null;
}): number {
  const refId = opts.config?.materialReferenciaColocacionId;
  if (!refId) return 0;
  const material = opts.materiales.find((m) => m.id === refId);
  if (!material) return 0;
  const r = resolverPrecioMaterial({
    material,
    chapa: opts.chapas.find((c) => c.id === material.chapaId) || null,
    planchuela:
      opts.planchuelas?.find((p) => p.id === material.planchuelaId) || null,
    config: opts.config,
  });
  return r.ok ? r.precioPublico : 0;
}

export function precioColocacionLinea(
  planta: PlantaLinea,
  pb: number,
  pa: number
): number {
  if (planta === "baja") return pb;
  if (planta === "alta") return pa;
  return 0;
}
