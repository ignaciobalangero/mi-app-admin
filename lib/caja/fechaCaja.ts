/** Fecha del día en formato es-AR (ej. 06/10/2026). Siempre con día/mes en 2 dígitos. */
export function fechaCajaHoy(): string {
  return formatearFechaCaja(new Date());
}

/** Formatea Date o parsea variantes a fecha caja canónica DD/MM/YYYY. */
export function formatearFechaCaja(input: Date | string): string {
  if (input instanceof Date) {
    const d = input.getDate().toString().padStart(2, "0");
    const m = (input.getMonth() + 1).toString().padStart(2, "0");
    const y = input.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const s = String(input || "").trim();
  if (!s) return fechaCajaHoy();

  // YYYY-MM-DD (input type=date)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const [, y, m, d] = iso;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  // D/M/YYYY o DD/MM/YYYY
  const ar = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (ar) {
    const [, d, m, y] = ar;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return formatearFechaCaja(parsed);
  return s;
}

/** Variantes de la misma fecha (con y sin cero a la izquierda) para queries legacy. */
export function variantesFechaCaja(fecha: string): string[] {
  const canon = formatearFechaCaja(fecha);
  const ar = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(canon);
  if (!ar) return [canon];
  const [, d, m, y] = ar;
  const sinCero = `${Number(d)}/${Number(m)}/${y}`;
  return sinCero === canon ? [canon] : [canon, sinCero];
}

export function docIdDesdeFecha(fecha: string): string {
  const canon = formatearFechaCaja(fecha);
  const partes = canon.split("/");
  if (partes.length !== 3) return canon.replace(/\//g, "-");
  const [d, m, y] = partes;
  return `${y}-${m}-${d}`;
}

export function formatearHora(d: Date): string {
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
