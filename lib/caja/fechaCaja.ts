/** Fecha del día en formato es-AR (ej. 19/5/2026). */
export function fechaCajaHoy(): string {
  return new Date().toLocaleDateString("es-AR");
}

export function docIdDesdeFecha(fecha: string): string {
  const partes = fecha.split("/");
  if (partes.length !== 3) return fecha.replace(/\//g, "-");
  const [d, m, y] = partes;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function formatearHora(d: Date): string {
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
