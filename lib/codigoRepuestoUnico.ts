export type ItemCodigoRepuesto = {
  id: string;
  codigo: string;
  producto?: string;
};

export function normalizarCodigoRepuesto(c: string): string {
  return String(c ?? "").trim();
}

export function indiceCodigosRepuestos(
  items: ItemCodigoRepuesto[]
): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const item of items) {
    const key = normalizarCodigoRepuesto(item.codigo).toLowerCase();
    if (!key) continue;
    const ids = mapa.get(key) ?? [];
    ids.push(item.id);
    mapa.set(key, ids);
  }
  return mapa;
}

export function codigoRepuestoOcupado(
  items: ItemCodigoRepuesto[],
  codigo: string,
  excluirDocId?: string
): boolean {
  const key = normalizarCodigoRepuesto(codigo).toLowerCase();
  if (!key) return false;
  const excluir = String(excluirDocId ?? "").trim();
  return items.some(
    (i) =>
      i.id !== excluir &&
      normalizarCodigoRepuesto(i.codigo).toLowerCase() === key
  );
}

export function sugerirCodigoUnicoRepuesto(
  base: string,
  codigosExistentes: Set<string>
): string {
  const limpio = normalizarCodigoRepuesto(base) || "REP";
  const lower = new Set(Array.from(codigosExistentes).map((c) => c.toLowerCase()));

  if (!lower.has(limpio.toLowerCase())) return limpio;

  for (let n = 2; n <= 999; n++) {
    const candidato = `${limpio}-${String(n).padStart(2, "0")}`;
    if (!lower.has(candidato.toLowerCase())) return candidato;
  }

  return `${limpio}-${Date.now().toString(36).slice(-4)}`;
}

export type CambioCodigoRepuesto = {
  id: string;
  codigoAnterior: string;
  codigoNuevo: string;
  producto: string;
};

/** Mantiene el primer producto de cada grupo; renombra el resto con sufijo -02, -03… */
export function planificarRenumeracionDuplicados(
  grupos: Array<{ codigo: string; items: ItemCodigoRepuesto[] }>
): CambioCodigoRepuesto[] {
  const todos = new Set<string>();
  for (const g of grupos) {
    for (const i of g.items) {
      todos.add(normalizarCodigoRepuesto(i.codigo).toLowerCase());
    }
  }

  const cambios: CambioCodigoRepuesto[] = [];

  for (const g of grupos) {
    const ordenados = [...g.items].sort((a, b) => a.id.localeCompare(b.id));
    const [conservar, ...resto] = ordenados;
    if (!conservar) continue;

    todos.add(normalizarCodigoRepuesto(conservar.codigo).toLowerCase());

    for (const item of resto) {
      const base = normalizarCodigoRepuesto(g.codigo) || normalizarCodigoRepuesto(item.codigo);
      const nuevo = sugerirCodigoUnicoRepuesto(base, todos);
      todos.add(nuevo.toLowerCase());
      cambios.push({
        id: item.id,
        codigoAnterior: item.codigo,
        codigoNuevo: nuevo,
        producto: item.producto || "Sin nombre",
      });
    }
  }

  return cambios;
}

export function mensajeCodigoDuplicado(codigo: string): string {
  return `El código "${codigo}" ya existe en otro producto. Usá un código distinto.`;
}

export function setCodigosRepuestos(items: ItemCodigoRepuesto[]): Set<string> {
  return new Set(
    items.map((i) => normalizarCodigoRepuesto(i.codigo).toLowerCase()).filter(Boolean)
  );
}

export type ResultadoCodigoAltaRepuesto =
  | { ok: true; codigo: string }
  | { ok: false; error: string };

/** Código manual si es único; si está vacío, genera REP### único. */
export function resolverCodigoAltaRepuesto(
  codigoIngresado: string,
  items: ItemCodigoRepuesto[],
  totalProductos: number
): ResultadoCodigoAltaRepuesto {
  const cod = normalizarCodigoRepuesto(codigoIngresado);

  if (cod) {
    if (codigoRepuestoOcupado(items, cod)) {
      return { ok: false, error: mensajeCodigoDuplicado(cod) };
    }
    return { ok: true, codigo: cod };
  }

  const codigosSet = setCodigosRepuestos(items);
  const generado = sugerirCodigoUnicoRepuesto(
    `REP${String(totalProductos + 1).padStart(3, "0")}`,
    codigosSet
  );
  return { ok: true, codigo: generado };
}
