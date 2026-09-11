export type EstadoTrabajo =
  | "presupuesto"
  | "aprobado"
  | "en_curso"
  | "finalizado"
  | "cancelado";

export type TipoMovimiento = "entrada" | "salida" | "ajuste";

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
  precioTrabajo: number;
  precioMaterial: number;
  costoMaterial: number;
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

export interface Material {
  id: string;
  ownerUid: string;
  nombre: string;
  tipo: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  precioCosto: number;
  precioVenta: number;
  notas?: string;
  creado: unknown;
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
  { value: "cancelado", label: "Cancelado" },
];

export const ESTADOS_ACTIVOS: EstadoTrabajo[] = [
  "presupuesto",
  "aprobado",
  "en_curso",
];
