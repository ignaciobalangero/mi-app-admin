import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const ESTADOS_BASE = [
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
] as const;

export function normalizarEstado(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Nuevo no pide batería. Usado y cualquier estado agregado sí. */
export function estadoPideCondicion(estado: string): boolean {
  return normalizarEstado(estado) !== "nuevo" && normalizarEstado(estado) !== "";
}

export function etiquetaEstado(estado: string): string {
  const e = normalizarEstado(estado);
  if (e === "nuevo") return "Nuevo";
  if (e === "usado") return "Usado";
  if (!e) return "";
  return e.charAt(0).toUpperCase() + e.slice(1);
}

export async function cargarEstadosExtra(negocioID: string): Promise<string[]> {
  if (!negocioID) return [];
  const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
  const lista = snap.exists() ? snap.data()?.estadosTelefonoExtra : [];
  if (!Array.isArray(lista)) return [];
  const vistos = new Set<string>(["nuevo", "usado"]);
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
