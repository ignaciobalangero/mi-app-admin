export type EntradaStockIndex = {
  id: string;
  codigo: string;
  categoria?: string;
  tipo?: "accesorio" | "repuesto" | "general";
  producto?: string;
  marca?: string;
  modelo?: string;
  color?: string;
  coleccion: "stockRepuestos" | "stockAccesorios" | "stockExtra";
};

export type StockIndex = {
  porDocId: Map<string, EntradaStockIndex>;
  porCodigo: Map<string, EntradaStockIndex>;
  codigosDuplicados: Map<string, EntradaStockIndex[]>;
};

export type ProductoStockMinimo = {
  id: string;
  codigo: string;
  producto: string;
  categoria: string;
  coleccion: string;
};

function normalizarCodigo(c: string): string {
  return String(c ?? "").trim().toLowerCase();
}

function entradaDesdeDoc(
  docId: string,
  data: Record<string, unknown>,
  coleccion: EntradaStockIndex["coleccion"],
  tipo: EntradaStockIndex["tipo"]
): EntradaStockIndex {
  return {
    id: docId,
    codigo: String(data.codigo ?? docId).trim(),
    categoria: String(data.categoria ?? (tipo === "repuesto" ? "Repuesto" : "Accesorio")),
    tipo,
    producto: String(data.producto ?? data.modelo ?? "").trim(),
    marca: String(data.marca ?? ""),
    modelo: String(data.modelo ?? data.producto ?? "").trim(),
    color: String(data.color ?? ""),
    coleccion,
  };
}

/** Indexa stock por doc id (único) y por código (puede repetirse). */
export function crearStockIndex(
  docs: Array<{
    id: string;
    data: Record<string, unknown>;
    coleccion: EntradaStockIndex["coleccion"];
    tipo: EntradaStockIndex["tipo"];
  }>
): StockIndex {
  const porDocId = new Map<string, EntradaStockIndex>();
  const porCodigo = new Map<string, EntradaStockIndex>();
  const duplicadosRaw = new Map<string, EntradaStockIndex[]>();

  for (const { id, data, coleccion, tipo } of docs) {
    const entry = entradaDesdeDoc(id, data, coleccion, tipo);
    porDocId.set(id.toLowerCase(), entry);

    const key = normalizarCodigo(entry.codigo);
    if (!key) continue;

    const lista = duplicadosRaw.get(key) ?? [];
    lista.push(entry);
    duplicadosRaw.set(key, lista);

    if (!porCodigo.has(key)) {
      porCodigo.set(key, entry);
    }
  }

  const codigosDuplicados = new Map<string, EntradaStockIndex[]>();
  duplicadosRaw.forEach((lista, key) => {
    if (lista.length > 1) codigosDuplicados.set(key, lista);
  });

  return { porDocId, porCodigo, codigosDuplicados };
}

/**
 * Busca stock para una línea de pedido tienda.
 * Prioridad: itemId (doc Firestore) → código del pedido.
 */
export function buscarStockParaLineaPedido(
  index: StockIndex,
  itemId: string,
  codigo: string
): EntradaStockIndex | null {
  const item = String(itemId ?? "").trim().toLowerCase();
  const cod = normalizarCodigo(codigo);

  if (item) {
    const porId = index.porDocId.get(item);
    if (porId) return porId;
  }
  if (cod) {
    const porCod = index.porCodigo.get(cod);
    if (porCod) {
      const dupes = index.codigosDuplicados.get(cod);
      if (dupes && dupes.length > 1) {
        console.warn(
          `[pedido→venta] Código "${codigo}" duplicado en stock (${dupes.length} productos). ` +
            `Usando doc id del pedido si existe; si no, primer match: ${porCod.producto}`
        );
      }
      return porCod;
    }
  }
  return null;
}

export function detectarCodigosDuplicadosRepuestos(
  productos: ProductoStockMinimo[]
): Array<{ codigo: string; items: ProductoStockMinimo[] }> {
  const mapa = new Map<string, ProductoStockMinimo[]>();
  for (const p of productos) {
    const key = normalizarCodigo(p.codigo);
    if (!key) continue;
    const lista = mapa.get(key) ?? [];
    lista.push(p);
    mapa.set(key, lista);
  }
  return Array.from(mapa.entries())
    .filter(([, items]) => items.length > 1)
    .map(([codigo, items]) => ({ codigo, items }))
    .sort((a, b) => b.items.length - a.items.length);
}
