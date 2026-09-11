export function formatMoney(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMoneyExact(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? parseLocalDate(value) : value;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? parseLocalDate(value) : value;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

/** Parse YYYY-MM-DD as local date (avoids UTC shift). */
export function parseLocalDate(iso: string): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}
