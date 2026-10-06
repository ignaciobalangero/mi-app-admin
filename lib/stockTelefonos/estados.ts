import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const ESTADOS_BASE = [
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
  { value: "sellado", label: "Sellado" },
] as const;

export function normalizarEstado(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Nuevo/sellado no piden batería. Usado y cualquier estado agregado sí. */
export function estadoPideCondicion(estado: string): boolean {
  const e = normalizarEstado(estado);
  return e !== "nuevo" && e !== "sellado" && e !== "sellados" && e !== "";
}

export function etiquetaEstado(estado: string): string {
  const e = normalizarEstado(estado);
  if (e === "nuevo") return "Nuevo";
  if (e === "usado") return "Usado";
  if (e === "sellado" || e === "sellados") return "Sellado";
  if (e === "reparacion" || e === "reparación") return "Reparación";
  if (!e) return "";
  return e.charAt(0).toUpperCase() + e.slice(1);
}

/** Paleta suave para estados custom (siempre el mismo color por nombre). */
const PALETA_EXTRA = [
  { badge: "bg-rose-100 text-rose-800", fila: "bg-rose-50/80 hover:bg-rose-100/70" },
  { badge: "bg-teal-100 text-teal-800", fila: "bg-teal-50/80 hover:bg-teal-100/70" },
  { badge: "bg-amber-100 text-amber-900", fila: "bg-amber-50/80 hover:bg-amber-100/70" },
  { badge: "bg-cyan-100 text-cyan-800", fila: "bg-cyan-50/80 hover:bg-cyan-100/70" },
  { badge: "bg-fuchsia-100 text-fuchsia-800", fila: "bg-fuchsia-50/80 hover:bg-fuchsia-100/70" },
  { badge: "bg-lime-100 text-lime-800", fila: "bg-lime-50/80 hover:bg-lime-100/70" },
  { badge: "bg-orange-100 text-orange-900", fila: "bg-orange-50/80 hover:bg-orange-100/70" },
  { badge: "bg-indigo-100 text-indigo-800", fila: "bg-indigo-50/80 hover:bg-indigo-100/70" },
] as const;

function hashEstado(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function claveEstadoVisual(estado: string): string {
  const e = normalizarEstado(estado);
  if (e === "sellados") return "sellado";
  if (e === "reparación") return "reparacion";
  return e;
}

/** Badge del estado: colores calmados y fijos para base + hash para extras. */
export function estiloBadgeEstado(estado: string): string {
  const e = claveEstadoVisual(estado);
  if (e === "nuevo") return "bg-emerald-100 text-emerald-800";
  if (e === "usado") return "bg-sky-100 text-sky-800";
  if (e === "sellado") return "bg-violet-100 text-violet-800";
  if (e === "reparacion") return "bg-amber-100 text-amber-900";
  if (!e) return "bg-slate-100 text-slate-600";
  return PALETA_EXTRA[hashEstado(e) % PALETA_EXTRA.length].badge;
}

/** Fondo de fila suave según estado (para escanear la tabla de un vistazo). */
export function estiloFilaEstado(estado: string, enServicio?: boolean): string {
  if (enServicio) return "bg-slate-200/80 opacity-80 hover:bg-slate-200";
  const e = claveEstadoVisual(estado);
  if (e === "nuevo") return "bg-emerald-50/70 hover:bg-emerald-100/80";
  if (e === "usado") return "bg-sky-50/70 hover:bg-sky-100/80";
  if (e === "sellado") return "bg-violet-50/70 hover:bg-violet-100/80";
  if (e === "reparacion") return "bg-amber-50/70 hover:bg-amber-100/80";
  if (!e) return "bg-white hover:bg-slate-50";
  return PALETA_EXTRA[hashEstado(e) % PALETA_EXTRA.length].fila;
}

export async function cargarEstadosExtra(negocioID: string): Promise<string[]> {
  if (!negocioID) return [];
  const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
  const lista = snap.exists() ? snap.data()?.estadosTelefonoExtra : [];
  if (!Array.isArray(lista)) return [];
  const vistos = new Set<string>(["nuevo", "usado", "sellado", "sellados"]);
  const out: string[] = [];
  for (const item of lista) {
    const value = normalizarEstado(String(item || ""));
    if (!value || vistos.has(value)) continue;
    vistos.add(value);
    out.push(value);
  }
  return out;
}

export async function guardarEstadosExtra(
  negocioID: string,
  estados: string[]
): Promise<void> {
  await setDoc(
    doc(db, `negocios/${negocioID}/configuracion/datos`),
    { estadosTelefonoExtra: estados },
    { merge: true }
  );
}
