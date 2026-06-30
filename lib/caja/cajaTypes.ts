import type { Timestamp } from "firebase/firestore";

/** Medios de pago normalizados para arqueo y sub-saldos. */
export type MedioPagoCaja =
  | "efectivo_ars"
  | "transferencia"
  | "tarjeta_debito"
  | "tarjeta_credito"
  | "usd_billete"
  | "mercado_pago"
  | "otro";

export type TipoMovimientoCaja = "ingreso" | "egreso";

export type CategoriaIngresoCaja =
  | "cobro_trabajo"
  | "cobro_venta"
  | "cobro_cta_cte"
  | "ingreso_manual"
  | "transferencia_caja_mayor";

export type CategoriaEgresoCaja =
  | "gasto_operativo"
  | "pago_proveedor"
  | "retiro_dueno"
  | "egreso_manual"
  | "transferencia_caja_mayor";

export type CategoriaMovimientoCaja = CategoriaIngresoCaja | CategoriaEgresoCaja;

export type SubcategoriaVentaCaja =
  | "venta_telefono_ars"
  | "venta_telefono_usd"
  | "venta_accesorio"
  | "venta_repuesto_stock"
  | "venta_repuesto_extra";

export type EstadoSesionCaja = "abierta" | "cerrada";

export type MovimientoCaja = {
  id?: string;
  sesionId: string;
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimientoCaja;
  subcategoria?: SubcategoriaVentaCaja;
  montoARS: number;
  montoUSD?: number;
  cotizacionUSD?: number;
  medioPago: MedioPagoCaja;
  idReferencia?: string;
  tablaReferencia?: "trabajos" | "ventasGeneral" | "pagos" | "gastos";
  descripcion: string;
  usuario: string;
  usuarioId: string;
  fecha: string;
  timestamp: Timestamp | Date;
  esAnulado?: boolean;
  anuladoPorId?: string;
  origenSync?: "pagos" | "gastos" | "manual";
};

export type ArqueoMedioPago = {
  medio: MedioPagoCaja;
  label: string;
  esperadoARS: number;
  contadoARS: number;
  diferenciaARS: number;
  /** Billetes USD físicos (solo medio usd_billete). */
  esperadoUSD?: number;
  contadoUSD?: number;
  diferenciaUSD?: number;
};

export type SesionCaja = {
  id?: string;
  fecha: string;
  horaApertura: Timestamp | Date;
  horaCierre?: Timestamp | Date;
  usuarioApertura: string;
  usuarioAperturaId: string;
  usuarioCierre?: string;
  usuarioCierreId?: string;
  saldoInicialARS: number;
  saldoInicialUSD: number;
  saldoFinalEsperadoARS?: number;
  saldoFinalContadoARS?: number;
  diferenciaARS?: number;
  diferenciaUSD?: number;
  fondoSiguienteDiaARS?: number;
  enviadoCajaMayorARS?: number;
  arqueo?: ArqueoMedioPago[];
  arqueoJustificacion?: string;
  estado: EstadoSesionCaja;
  notas?: string;
  cierreId?: string;
  saldoAnteriorCierreARS?: number;
};

export type CategoriaCajaMayor =
  | "cierre_diario"
  | "ingreso_manual"
  | "egreso_manual"
  | "transferencia_caja_diaria"
  | "retiro_dueno"
  | "deposito_banco";

export type MovimientoCajaMayor = {
  id?: string;
  tipo: TipoMovimientoCaja;
  categoria: CategoriaCajaMayor;
  montoARS: number;
  montoUSD?: number;
  descripcion: string;
  origen: "cierre_diario" | "manual";
  sesionId?: string;
  usuario: string;
  usuarioId: string;
  fecha: string;
  timestamp: Timestamp | Date;
  esAnulado?: boolean;
};

export type ResumenIngresosCaja = {
  cobrosTrabajos: number;
  ventasContado: number;
  ventasTelefonoARS: number;
  ventasTelefonoUSDEquivARS: number;
  ventasAccesorios: number;
  ventasRepuestoStock: number;
  ventasRepuestoExtra: number;
  cobrosCuentaCorriente: number;
  ingresosManuales: number;
  transferenciasDesdeMayor: number;
  total: number;
};

export type ResumenEgresosCaja = {
  gastosOperativos: number;
  pagosProveedores: number;
  retirosDueno: number;
  egresosManuales: number;
  transferenciasAMayor: number;
  total: number;
};

export type ResumenMediosPago = Record<MedioPagoCaja, number>;

/** Monto físico en USD por medio (p. ej. billetes contados en arqueo). */
export type ResumenMediosFisicoUSD = Record<MedioPagoCaja, number>;

/** Montos cobrados en ventas/trabajos/cuenta corriente, desglosados por moneda del pago. */
export type TotalesMonedaCaja = {
  ingresosARS: number;
  ingresosUSD: number;
  ingresosUSDEquivARS: number;
  egresosARS: number;
  egresosUSD: number;
  egresosUSDEquivARS: number;
};

export type ResumenCajaDia = {
  saldoInicialARS: number;
  saldoInicialUSD: number;
  ingresos: ResumenIngresosCaja;
  egresos: ResumenEgresosCaja;
  netoDiaARS: number;
  medios: ResumenMediosPago;
  mediosFisicoUSD: ResumenMediosFisicoUSD;
  movimientos: MovimientoCaja[];
  totalesPorMoneda: TotalesMonedaCaja;
};
