export type ModoEdicionProducto = "prepend" | "append";

/** Agrega texto al inicio o al final del nombre, sin reemplazar lo existente. */
export function aplicarTextoProducto(
  actual: unknown,
  texto: string,
  modo: ModoEdicionProducto
): string {
  const t = texto.trim();
  const a = String(actual ?? "").trim();
  if (!t) return a;
  if (!a) return t;
  return modo === "prepend" ? `${t} ${a}` : `${a} ${t}`;
}

export function ejemploEdicionProducto(
  actual: unknown,
  texto: string,
  modo: ModoEdicionProducto
): { antes: string; despues: string } | null {
  const t = texto.trim();
  if (!t) return null;
  const a = String(actual ?? "").trim();
  return {
    antes: a || "(vacío)",
    despues: aplicarTextoProducto(actual, texto, modo),
  };
}
