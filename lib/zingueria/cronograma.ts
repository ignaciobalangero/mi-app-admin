import type { Trabajo } from "./types";
import { parseLocalDate, toISODate } from "./format";

export type GrupoCronograma =
  | "atrasados"
  | "hoy"
  | "manana"
  | "semana"
  | "proximos"
  | "sin_fecha";

export const LABELS_CRONOGRAMA: Record<GrupoCronograma, string> = {
  atrasados: "Atrasados",
  hoy: "Hoy",
  manana: "Mañana",
  semana: "Esta semana",
  proximos: "Próximos",
  sin_fecha: "Sin fecha",
};

export interface CronogramaGrupos {
  atrasados: Trabajo[];
  hoy: Trabajo[];
  manana: Trabajo[];
  semana: Trabajo[];
  proximos: Trabajo[];
  sin_fecha: Trabajo[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Agrupa trabajos por fechaInicio relativa a hoy. */
export function agruparCronograma(
  trabajos: Trabajo[],
  ahora: Date = new Date()
): CronogramaGrupos {
  const hoy = startOfDay(ahora);
  const manana = addDays(hoy, 1);
  const finSemana = addDays(hoy, 7);
  const groups: CronogramaGrupos = {
    atrasados: [],
    hoy: [],
    manana: [],
    semana: [],
    proximos: [],
    sin_fecha: [],
  };

  const activos = trabajos.filter(
    (t) => t.estado !== "finalizado" && t.estado !== "cancelado"
  );

  for (const t of activos) {
    if (!t.fechaInicio) {
      groups.sin_fecha.push(t);
      continue;
    }
    const d = parseLocalDate(t.fechaInicio);
    if (!d) {
      groups.sin_fecha.push(t);
      continue;
    }
    const day = startOfDay(d);
    if (day.getTime() < hoy.getTime()) groups.atrasados.push(t);
    else if (day.getTime() === hoy.getTime()) groups.hoy.push(t);
    else if (day.getTime() === manana.getTime()) groups.manana.push(t);
    else if (day.getTime() < finSemana.getTime()) groups.semana.push(t);
    else groups.proximos.push(t);
  }

  const sortByFecha = (a: Trabajo, b: Trabajo) =>
    (a.fechaInicio || "").localeCompare(b.fechaInicio || "");
  (Object.keys(groups) as GrupoCronograma[]).forEach((k) => {
    groups[k].sort(sortByFecha);
  });

  return groups;
}

export function countUrgentes(grupos: CronogramaGrupos): number {
  return grupos.atrasados.length + grupos.hoy.length;
}

export function fechaReferenciaISO(offsetDays: number): string {
  return toISODate(addDays(startOfDay(new Date()), offsetDays));
}

/** Días del mes para grilla de calendario (incluye padding del mes anterior/siguiente). */
export function diasDelMes(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // lunes = 0
  const start = addDays(first, -startPad);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  return days;
}

/** Trabajos activos indexados por fechaInicio YYYY-MM-DD. */
export function trabajosPorFecha(
  trabajos: Trabajo[]
): Map<string, Trabajo[]> {
  const map = new Map<string, Trabajo[]>();
  for (const t of trabajos) {
    if (t.estado === "finalizado" || t.estado === "cancelado") continue;
    if (!t.fechaInicio) continue;
    const key = t.fechaInicio.slice(0, 10);
    const arr = map.get(key) || [];
    arr.push(t);
    map.set(key, arr);
  }
  return map;
}
