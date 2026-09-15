export type EstadoTrabajo =
  | "presupuesto"
  | "aprobado"
  | "en_curso"
  | "finalizado"
  | "cancelado"
  | "rechazado"
  | "anulado";

export type TipoMovimiento = "entrada" | "salida" | "ajuste";

export type AcabadoChapa = "galva" | "color";

export type TipoDesarrollo = "estandar_406" | "estandar_305" | "especial";

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

export type ListaPrecios = "publico" | "mayorista" | "rio_cuarto";

export type PlantaLinea = "baja" | "alta" | "sin_colocacion";

export interface ZingueriaPerfil {
  email: string;
  nombreTaller: string;
  activo: boolean;
  ownerUid: string;
  creado: unknown;
}

export interface Cliente {
  id: string;
  ownerUid: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
  creado: unknown;
}

export interface Trabajo {
  id: string;
  ownerUid: string;
  clienteId: string;
  clienteNombre: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoTrabajo;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  /** Totales derivados / legacy */
  precioTrabajo: number;
  precioMaterial: number;
  costoMaterial: number;
  /** Lista de precios usada al cargar líneas */
  listaPrecios?: ListaPrecios;
  aplicarIva?: boolean;
  notas?: string;
  creado: unknown;
}

export interface Medida {
  id: string;
  descripcion: string;
  valor: string;
  creado: unknown;
}

export interface Foto {
  id: string;
  url: string;
  storagePath: string;
  descripcion?: string;
  creado: unknown;
}

export interface Pago {
  id: string;
  monto: number;
  fecha: string;
  metodo?: string;
  notas?: string;
}

export interface Chapa {
  id: string;
  ownerUid: string;
  calibre: string;
  acabado: AcabadoChapa;
  anchoMm: number;
  largoMm: number;
  precioCosto: number;
  fechaActualizacion?: string | null;
  precioReferencia2015?: number | null;
  stockCantidad: number;
  activo: boolean;
  creado: unknown;
}

export interface ChapaHistorial {
  id: string;
  precioAnterior: number;
  precioNuevo: number;
  fecha: string;
  usuarioUid: string;
  usuarioEmail?: string;
}

export interface Planchuela {
  id: string;
  ownerUid: string;
  medida: string;
  largoBarraMm: number;
  precioCosto: number;
  fechaActualizacion?: string | null;
  activo: boolean;
  creado: unknown;
}

export interface FactoresColocacionConfig {
  canaletasPb: number;
  canaletasPaMult: number;
  canosPb: number;
  canosPaMult: number;
  babetasPb: number;
  babetasPaMult: number;
  cenefasPb: number;
  cenefasPaMult: number;
}

export interface ZingueriaConfig {
  ownerUid: string;
  pctDiseno: number;
  pctManoObra: number;
  pctManoObraBabetas: number;
  pctRecargoPublico: number;
  pctRecargoPublicoPlegadosVarios: number;
  pctListaRioCuarto: number;
  pctListaRioCuartoTubos: number;
  pctColocacionBase: number;
  materialReferenciaColocacionId?: string | null;
  redondearCortes: boolean;
  pctIva: number;
  factoresColocacion: FactoresColocacionConfig;
  actualizado?: unknown;
}

export interface ColocacionMaterial {
  plantaBajaManual?: number | null;
  plantaAltaManual?: number | null;
}

/**
 * Catálogo de materiales.
 * tipoCalculo ausente o stock_simple = stock legacy (precios fijos).
 */
export interface Material {
  id: string;
  ownerUid: string;
  /** Legacy / agrupación UI */
  nombre: string;
  tipo: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  /** Precios fijos (stock_simple / cache opcional) */
  precioCosto: number;
  precioVenta: number;
  notas?: string;
  creado: unknown;

  tipoCalculo?: TipoCalculo;
  categoria?: CategoriaMaterial;
  codigo?: string;
  perfil?: string;
  desarrolloMm?: number;
  tipoDesarrollo?: TipoDesarrollo;
  chapaId?: string | null;
  planchuelaId?: string | null;
  pctDiseno?: number | null;
  pctManoObra?: number | null;
  pctRecargoPublico?: number | null;
  pctListaRioCuarto?: number | null;
  precioPublicoManual?: number | null;
  colocacion?: ColocacionMaterial;
  activo?: boolean;

  /** Accesorio */
  factorLargo?: number;
  multMaterial?: number;
  multManoObra?: number;

  /** Reventa */
  medidaPulgadas?: number;
  costoEmbalaje?: number;
  costoFlete?: number;
  margen?: number;

  /** Maceta */
  cantidadMetrosPorUnidad?: number;
}

export interface LineaTrabajo {
  id: string;
  materialId?: string | null;
  descripcion: string;
  cantidad: number;
  listaPrecios?: ListaPrecios;
  precioUnitarioMaterial: number;
  subtotalMaterial: number;
  planta: PlantaLinea;
  precioUnitarioColocacion: number;
  subtotalColocacion: number;
  totalLinea: number;
  costoUnitarioSnapshot: number;
  orden?: number;
  creado?: unknown;
}

export interface MovimientoStock {
  id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  trabajoId?: string | null;
  fecha: string;
  notas?: string;
  creado: unknown;
}

export const ESTADOS_TRABAJO: { value: EstadoTrabajo; label: string }[] = [
  { value: "presupuesto", label: "Presupuesto" },
  { value: "aprobado", label: "Aprobado" },
  { value: "en_curso", label: "En curso" },
  { value: "finalizado", label: "Finalizado" },
  { value: "rechazado", label: "Rechazado" },
  { value: "anulado", label: "Anulado" },
  { value: "cancelado", label: "Cancelado" },
];

export const ESTADOS_ACTIVOS: EstadoTrabajo[] = [
  "presupuesto",
  "aprobado",
  "en_curso",
];

export const CATEGORIAS_MATERIAL: {
  value: CategoriaMaterial;
  label: string;
}[] = [
  { value: "canaleta", label: "Canaleta" },
  { value: "cenefa", label: "Cenefa" },
  { value: "babeta", label: "Babeta" },
  { value: "cumbrera", label: "Cumbrera" },
  { value: "cano_rectangular", label: "Caño rectangular" },
  { value: "cano_redondo", label: "Caño redondo" },
  { value: "plegado_varios", label: "Plegado varios" },
  { value: "maceta", label: "Maceta" },
  { value: "accesorio", label: "Accesorio" },
  { value: "soporte", label: "Soporte" },
  { value: "reventa", label: "Reventa" },
  { value: "otro", label: "Otro" },
];
