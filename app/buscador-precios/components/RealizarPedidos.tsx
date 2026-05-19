"use client";

import { Fragment, useCallback, useMemo, useState } from "react";

function newProvId() {
  return `prov_${Math.random().toString(36).slice(2, 11)}`;
}

/** Líneas no vacías (trim por línea). */
function linesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, "").trimEnd())
    .filter((l) => l.trim().length > 0);
}

function stripAccents(s: string): string {
  try {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return s;
  }
}

function normalizeMatchKey(s: string): string {
  return stripAccents(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "");
}

/**
 * Clave para emparejar grilla ↔ proveedor: misma normalización y sin prefijo
 * «módulo» / «modulo» / «mod.» al inicio (a veces solo en una de las dos listas).
 */
function claveEmparejamientoProducto(raw: string): string {
  let k = normalizeMatchKey(raw);
  if (!k) return "";
  let prev: string;
  do {
    prev = k;
    k = k.replace(/^(modulo|módulo|mod\.)\s+/i, "").trim();
  } while (k !== prev);
  return k.replace(/\s+/g, " ").trim();
}

const TOKENS_RUIDO = new Set([
  "de",
  "la",
  "el",
  "un",
  "una",
  "los",
  "las",
  "del",
  "al",
  "con",
  "por",
  "para",
  "y",
  "o",
  "en",
  "ic",
  "lcd",
]);

function tokenizarNombreClave(s: string): string[] {
  return s
    .split(/[^a-z0-9]+/i)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2 && !TOKENS_RUIDO.has(t));
}

/** Similitud 0..1 (claves ya normalizadas con claveEmparejamientoProducto). */
function scoreSimilitudNombreProveedorRef(prov: string, ref: string): number {
  if (!prov || !ref) return 0;
  if (prov === ref) return 1;
  if (prov.includes(ref) || ref.includes(prov)) return 1;

  const tp = tokenizarNombreClave(prov);
  const tr = tokenizarNombreClave(ref);
  if (tp.length === 0 || tr.length === 0) return 0;

  const setP = new Set(tp);
  const setR = new Set(tr);

  const covRP = tr.filter((t) => setP.has(t)).length / tr.length;
  const covPR = tp.filter((t) => setR.has(t)).length / tp.length;

  const shorter = tp.length <= tr.length ? tp : tr;
  const longerSet = tp.length > tr.length ? setP : setR;
  const covShortInLong = shorter.filter((t) => longerSet.has(t)).length / shorter.length;

  return Math.max(covRP, covPR, covShortInLong);
}

/**
 * Nombre (con espacios) + cantidad entera + precio al final de la línea.
 * Precio: con coma/punto decimal, o entero (pesos).
 * Usa captura greedy del nombre para que "… ORIGINAL 68 3552,5" funcione.
 */
function parseNombreCantPrecioDesdeFinal(t: string): { producto: string; cant: string; precio: string } | null {
  const s = t.replace(/\u00a0/g, " ").trim();
  if (!s) return null;

  // cant + precio con decimales (coma o punto)
  let m = s.match(/^(.+)\s+(\d+)\s+(\d+[.,]\d+)\s*$/);
  if (m) return { producto: m[1].trim(), cant: m[2], precio: m[3] };

  // cant + precio entero (ej. pesos sin decimales), precio al menos 3 dígitos
  m = s.match(/^(.+)\s+(\d{1,4})\s+(\d{3,})\s*$/);
  if (m) return { producto: m[1].trim(), cant: m[2], precio: m[3] };

  // cant + precio entero corto (ej. 2 2842)
  m = s.match(/^(.+)\s+(\d{1,3})\s+(\d{2,4})\s*$/);
  if (m && Number(m[3]) >= Number(m[2])) {
    return { producto: m[1].trim(), cant: m[2], precio: m[3] };
  }

  return null;
}

/**
 * Tabs (Excel) o texto plano: intenta siempre dejar [producto, cantidad, precio] cuando el formato es nombre|cant|precio.
 */
function splitLineProveedor(line: string): string[] {
  const t = line.replace(/\u00a0/g, " ").trim();
  if (!t) return [];

  if (t.includes("\t")) {
    const cols = t.split(/\t+/).map((c) => c.trim());
    const nonEmpty = cols.filter((c) => c.length > 0);

    if (cols.length >= 3) {
      return cols;
    }
    if (nonEmpty.length >= 3) {
      return nonEmpty;
    }
    if (nonEmpty.length === 2) {
      const [a, b] = nonEmpty;
      const splitB = b.match(/^(\d+)\s+(\d+[.,]\d+|\d{3,})\s*$/);
      if (splitB) return [a, splitB[1], splitB[2]];
      const joined = nonEmpty.join(" ");
      const intel = parseNombreCantPrecioDesdeFinal(joined);
      if (intel) return [intel.producto, intel.cant, intel.precio];
      return nonEmpty;
    }
    if (nonEmpty.length === 1) {
      const intel = parseNombreCantPrecioDesdeFinal(nonEmpty[0]);
      if (intel) return [intel.producto, intel.cant, intel.precio];
      return nonEmpty;
    }
    return cols;
  }

  const intel = parseNombreCantPrecioDesdeFinal(t);
  if (intel) return [intel.producto, intel.cant, intel.precio];
  return [t];
}

/** Parsea TSV; rellena filas al ancho máximo. */
function parseTsvTable(
  text: string,
  primeraFilaEncabezado: boolean
): { labels: string[]; dataRows: string[][] } {
  const lines = linesFromText(text);
  if (lines.length === 0) return { labels: [], dataRows: [] };

  const rows = lines.map((l) => l.split("\t").map((c) => c.trim()));
  let maxCols = 1;
  for (const r of rows) maxCols = Math.max(maxCols, r.length);
  const pad = (r: string[]) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push("");
    return copy.slice(0, maxCols);
  };

  if (primeraFilaEncabezado) {
    const labels = pad(rows[0]).map((c, i) => (c.trim() ? c.trim() : `Col ${i + 1}`));
    const dataRows = rows.slice(1).map(pad);
    return { labels, dataRows };
  }

  const dataRows = rows.map(pad);
  const labels = Array.from({length: maxCols}, (_, i) => `Col ${i + 1}`);
  return { labels, dataRows };
}

/** Por línea: si hay tab, col1 = cantidad, col2 = precio. */
function parseCantPrecioPorLinea(text: string): { cant: string; precio: string }[] {
  return linesFromText(text).map((line) => {
    const cols = line.split("\t");
    if (cols.length >= 2) {
      return { cant: cols[0].trim(), precio: cols[1].trim() };
    }
    return { cant: line.trim(), precio: "" };
  });
}

type ProvCol = { id: string; nombre: string };

type ProvCell = { stock: string; precio: string; pedir: string };

type Row = {
  wishCells: string[];
  byProv: Record<string, ProvCell>;
};

/** Evita crash si algún estado quedó sin wishCells (p. ej. hot reload). */
function wishCellsOf(row: Row): string[] {
  const w = row.wishCells;
  return Array.isArray(w) ? w : [];
}

function emptyCell(): ProvCell {
  return { stock: "", precio: "", pedir: "" };
}

function tieneAlgunPedir(row: Row, provIds: string[]): boolean {
  for (const id of provIds) {
    if ((row.byProv[id]?.pedir ?? "").trim() !== "") return true;
  }
  return false;
}

function filaTieneReferencia(row: Row, matchColIndex0: number): boolean {
  return normalizeMatchKey(wishCellsOf(row)[matchColIndex0] ?? "").length > 0;
}

function emptyByProv(provIds: string[]): Record<string, ProvCell> {
  return Object.fromEntries(provIds.map((id) => [id, emptyCell()]));
}

/** Convierte índice 1-based desde UI a 0-based; 0 o inválido = -1 (no usar). */
function col1To0(n: number): number {
  if (!Number.isFinite(n) || n < 1) return -1;
  return n - 1;
}

export default function RealizarPedidos() {
  const [provCols, setProvCols] = useState<ProvCol[]>([]);
  const [rows, setRows] = useState<Row[]>([{ wishCells: [""], byProv: {} }]);

  const [pegadoTablaDeseos, setPegadoTablaDeseos] = useState("");
  const [encabezadoDeseos, setEncabezadoDeseos] = useState(false);
  const [colCompararDeseos, setColCompararDeseos] = useState(1);
  const [wishLabels, setWishLabels] = useState<string[]>(["Col 1"]);

  const [pegadoCant, setPegadoCant] = useState<Record<string, string>>({});
  const [pegadoPrecio, setPegadoPrecio] = useState<Record<string, string>>({});
  const [bloqueDosCols, setBloqueDosCols] = useState<Record<string, string>>({});

  const [provTabla, setProvTabla] = useState<Record<string, string>>({});
  const [provEncabezado, setProvEncabezado] = useState<Record<string, boolean>>({});
  const [provColModelo, setProvColModelo] = useState<Record<string, number>>({});
  const [provColCant, setProvColCant] = useState<Record<string, number>>({});
  const [provColPrecio, setProvColPrecio] = useState<Record<string, number>>({});
  /** Si no hay coincidencia exacta de texto, intentar emparejar cuando un texto contiene al otro. */
  const [provMatchSuave, setProvMatchSuave] = useState<Record<string, boolean>>({});
  const [soloVerSinPedido, setSoloVerSinPedido] = useState(false);

  const provIds = useMemo(() => provCols.map((p) => p.id), [provCols]);

  const matchColIndex0 = useMemo(() => Math.max(0, colCompararDeseos - 1), [colCompararDeseos]);

  const rowMatchKey = useCallback(
    (row: Row) => claveEmparejamientoProducto(wishCellsOf(row)[matchColIndex0] ?? ""),
    [matchColIndex0]
  );

  const asegurarByProv = useCallback(
    (by: Record<string, ProvCell>) => {
      const next = { ...by };
      for (const id of provIds) {
        if (!next[id]) next[id] = emptyCell();
        else {
          const c = next[id];
          if (!("stock" in c)) {
            const legacy = c as unknown as { cant?: string; precio?: string; pedir?: string };
            next[id] = {
              stock: legacy.cant ?? "",
              precio: legacy.precio ?? "",
              pedir: legacy.pedir ?? "",
            };
          }
        }
      }
      return next;
    },
    [provIds]
  );

  const aplicarTablaDeseos = () => {
    const { labels, dataRows } = parseTsvTable(pegadoTablaDeseos, encabezadoDeseos);
    if (dataRows.length === 0) return;

    setWishLabels(labels.length ? labels : ["Col 1"]);
    const mc = Math.min(Math.max(1, colCompararDeseos), Math.max(1, labels.length));
    setColCompararDeseos(mc);

    setRows((prev) =>
      dataRows.map((cells, i) => ({
        wishCells: cells,
        byProv: asegurarByProv(prev[i]?.byProv ?? {}),
      }))
    );
  };

  const agregarProveedor = () => {
    const id = newProvId();
    const n = provCols.length + 1;
    setProvCols((c) => [...c, { id, nombre: `Proveedor ${n}` }]);
    setProvColModelo((m) => ({ ...m, [id]: 1 }));
    setProvColCant((m) => ({ ...m, [id]: 2 }));
    setProvColPrecio((m) => ({ ...m, [id]: 3 }));
    setProvEncabezado((m) => ({ ...m, [id]: false }));
    setProvMatchSuave((m) => ({ ...m, [id]: false }));
    setRows((r) => r.map((row) => ({ ...row, byProv: { ...row.byProv, [id]: emptyCell() } })));
  };

  const quitarProveedor = (id: string) => {
    setProvCols((c) => c.filter((p) => p.id !== id));
    setRows((r) =>
      r.map((row) => {
        const { [id]: _, ...rest } = row.byProv;
        return { ...row, byProv: rest };
      })
    );
    const rm = (m: Record<string, unknown>) => {
      const { [id]: _, ...rest } = m;
      return rest as Record<string, string>;
    };
    setPegadoCant((m) => rm(m));
    setPegadoPrecio((m) => rm(m));
    setBloqueDosCols((m) => rm(m));
    setProvTabla((m) => rm(m));
    setProvEncabezado((m) => {
      const { [id]: __, ...rest } = m;
      return rest;
    });
    setProvColModelo((m) => {
      const { [id]: __, ...rest } = m;
      return rest;
    });
    setProvColCant((m) => {
      const { [id]: __, ...rest } = m;
      return rest;
    });
    setProvColPrecio((m) => {
      const { [id]: __, ...rest } = m;
      return rest;
    });
    setProvMatchSuave((m) => {
      const { [id]: __, ...rest } = m;
      return rest;
    });
  };

  const renombrarProveedor = (id: string, nombre: string) => {
    setProvCols((c) => c.map((p) => (p.id === id ? { ...p, nombre } : p)));
  };

  /** Empareja filas del proveedor con la grilla por modelo/código (texto normalizado). */
  const emparejarProveedorPorModelo = (provId: string) => {
    const text = provTabla[provId] ?? "";
    const lines = linesFromText(text);
    if (lines.length === 0) return;

    const enc = provEncabezado[provId] ?? false;
    const dataLines = enc ? lines.slice(1) : lines;

    const modelo0 = col1To0(provColModelo[provId] ?? 1);
    const cant0 = col1To0(provColCant[provId] ?? 0);
    const precio0 = col1To0(provColPrecio[provId] ?? 0);

    if (modelo0 < 0) {
      alert("Indicá la columna del modelo/código en la lista del proveedor (≥ 1).");
      return;
    }

    const suave = provMatchSuave[provId] ?? false;

    setRows((prev) => {
      const keyToIndices = new Map<string, number[]>();
      prev.forEach((row, idx) => {
        const k = rowMatchKey(row);
        if (!k) return;
        if (!keyToIndices.has(k)) keyToIndices.set(k, []);
        keyToIndices.get(k)!.push(idx);
      });

      if (keyToIndices.size === 0) {
        window.setTimeout(() => {
          alert(
            "No hay textos en la columna ★ de tu grilla para emparejar.\n\n" +
              "Primero pegá «Tu tabla» y tocá «Cargar tabla en la grilla». Revisá el nº de columna para comparar."
          );
        }, 0);
        return prev;
      }

      const next = prev.map((r) => ({
        ...r,
        byProv: { ...asegurarByProv(r.byProv) },
      }));

      const buscarIndices = (keyNorm: string): number[] | undefined => {
        const exact = keyToIndices.get(keyNorm);
        if (exact?.length) return exact;
        if (!suave || keyNorm.length < 2) return undefined;

        for (const [wk, list] of Array.from(keyToIndices.entries())) {
          if (!wk || wk.length < 2) continue;
          if (keyNorm.includes(wk) || wk.includes(keyNorm)) return list;
        }

        let bestWk: string | null = null;
        let bestScore = 0;
        let secondScore = 0;
        for (const wk of Array.from(keyToIndices.keys())) {
          if (!wk || wk.length < 2) continue;
          const sc = scoreSimilitudNombreProveedorRef(keyNorm, wk);
          if (sc > bestScore) {
            secondScore = bestScore;
            bestScore = sc;
            bestWk = wk;
          } else if (sc > secondScore) {
            secondScore = sc;
          }
        }

        const UMBRAL = 0.7;
        const MARGEN = 0.08;
        if (
          bestWk !== null &&
          bestScore >= UMBRAL &&
          (bestScore - secondScore >= MARGEN || bestScore >= 0.9)
        ) {
          return keyToIndices.get(bestWk);
        }
        return undefined;
      };

      let mat = 0;
      let sinPar = 0;

      for (const line of dataLines) {
        const cols = splitLineProveedor(line);
        if (cols.length <= modelo0) continue;

        const key = claveEmparejamientoProducto(cols[modelo0] ?? "");
        if (!key) continue;

        const stock =
          cant0 >= 0 && cols.length > cant0 ? String(cols[cant0] ?? "") : "";
        const precio =
          precio0 >= 0 && cols.length > precio0 ? String(cols[precio0] ?? "") : "";

        const indices = buscarIndices(key);
        if (indices && indices.length > 0) {
          for (const idx of indices) {
            const cur = next[idx].byProv[provId] ?? emptyCell();
            next[idx].byProv[provId] = {
              stock,
              precio,
              pedir: cur.pedir ?? "",
            };
          }
          mat += 1;
        } else {
          sinPar += 1;
        }
      }

      if (sinPar > 0 || mat === 0) {
        window.setTimeout(() => {
          const tips = [
            "Si la primera línea pegada es un producto (no título), desmarcá «Primera fila del proveedor es encabezado».",
            "Con o sin tabs (Excel), el sistema intenta leer al final de cada línea: texto del producto + cantidad + precio (coma o punto decimal). Si solo pegás el modelo en una columna, alcanza.",
            "Al comparar se ignoran mayúsculas, acentos y el prefijo «Módulo» / «módulo» / «mod.» al inicio del texto (por si solo figura en el proveedor o solo en tu grilla).",
            "El resto del texto de la columna ★ debe alinearse con el proveedor. Con «Emparejar flexible»: subcadena o similitud por palabras (ej. «modulo moto g32» ↔ «moto g32»); si el empate es ambiguo, no asigna.",
          ].join("\n• ");
          alert(
            `Emparejado: ${mat} línea(s) del proveedor con fila en la grilla.\n` +
              `${sinPar} línea(s) sin fila coincidente.\n\nTips:\n• ${tips}`
          );
        }, 0);
      }

      return next;
    });
  };

  /** Por orden de fila (sin emparejar por modelo). */
  const aplicarCantPrecioProveedor = (provId: string) => {
    const cantLines = linesFromText(pegadoCant[provId] ?? "");
    const precioLines = linesFromText(pegadoPrecio[provId] ?? "");
    const n = Math.max(rows.length, cantLines.length, precioLines.length);
    const merged: { stock: string; precio: string }[] = [];
    for (let i = 0; i < n; i++) {
      merged.push({
        stock: cantLines[i] ?? "",
        precio: precioLines[i] ?? "",
      });
    }
    if (merged.length > rows.length) {
      const padLen = wishLabels.length;
      setRows((prev) => {
        const base = [...prev];
        while (base.length < merged.length) {
          base.push({ wishCells: Array(padLen).fill(""), byProv: emptyByProv(provIds) });
        }
        return base.map((row, i) => ({
          ...row,
          byProv: {
            ...asegurarByProv(row.byProv),
            [provId]: {
              stock: merged[i]?.stock ?? "",
              precio: merged[i]?.precio ?? "",
              pedir: row.byProv[provId]?.pedir ?? "",
            },
          },
        }));
      });
    } else {
      setRows((prev) =>
        prev.map((row, i) => ({
          ...row,
          byProv: {
            ...asegurarByProv(row.byProv),
            [provId]: {
              stock: merged[i]?.stock ?? "",
              precio: merged[i]?.precio ?? "",
              pedir: row.byProv[provId]?.pedir ?? "",
            },
          },
        }))
      );
    }
  };

  const aplicarBloqueDosColumnas = (provId: string, text: string) => {
    const parsed = parseCantPrecioPorLinea(text);
    if (parsed.length === 0) return;
    const padLen = wishLabels.length;
    setRows((prev) => {
      const base = [...prev];
      while (base.length < parsed.length) {
        base.push({ wishCells: Array(padLen).fill(""), byProv: emptyByProv(provIds) });
      }
      return base.map((row, i) => ({
        ...row,
        byProv: {
          ...asegurarByProv(row.byProv),
          [provId]: {
            stock: parsed[i]?.cant ?? "",
            precio: parsed[i]?.precio ?? "",
            pedir: row.byProv[provId]?.pedir ?? "",
          },
        },
      }));
    });
  };

  const setCell = (rowIndex: number, provId: string, field: keyof ProvCell, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        const cur = row.byProv[provId] ?? emptyCell();
        return {
          ...row,
          byProv: {
            ...asegurarByProv(row.byProv),
            [provId]: { ...cur, [field]: value },
          },
        };
      })
    );
  };

  /** Copia el stock de la lista al campo Pedir (solo donde Pedir está vacío). */
  const rellenarPedirConStock = (provId: string) => {
    setRows((prev) =>
      prev.map((row) => {
        const c = row.byProv[provId] ?? emptyCell();
        const pedir = c.pedir.trim() ? c.pedir : c.stock.trim();
        return {
          ...row,
          byProv: {
            ...asegurarByProv(row.byProv),
            [provId]: { ...c, pedir },
          },
        };
      })
    );
  };

  const setWishCell = (rowIndex: number, colIndex: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        const cells = [...wishCellsOf(row)];
        while (cells.length <= colIndex) cells.push("");
        cells[colIndex] = value;
        return { ...row, wishCells: cells };
      })
    );
  };

  const agregarFila = () => {
    const len = Math.max(1, wishLabels.length);
    setRows((r) => [...r, { wishCells: Array(len).fill(""), byProv: emptyByProv(provIds) }]);
  };

  const quitarUltimaFila = () => {
    setRows((r) => (r.length <= 1 ? r : r.slice(0, -1)));
  };

  const limpiarTodo = () => {
    setPegadoTablaDeseos("");
    setEncabezadoDeseos(false);
    setColCompararDeseos(1);
    setWishLabels(["Col 1"]);
    setPegadoCant({});
    setPegadoPrecio({});
    setBloqueDosCols({});
    setProvTabla({});
    setProvEncabezado({});
    setProvColModelo({});
    setProvColCant({});
    setProvColPrecio({});
    setProvMatchSuave({});
    setProvCols([]);
    setSoloVerSinPedido(false);
    setRows([{ wishCells: [""], byProv: {} }]);
  };

  const exportarTSV = () => {
    const headers = [
      ...wishLabels.map((l) => l || "Col"),
      ...provCols.flatMap((p) => [`${p.nombre} (stock)`, `${p.nombre} (precio)`, `${p.nombre} (pedir)`]),
    ];
    const body = rows.map((row) => {
      const cells = [...wishCellsOf(row)];
      while (cells.length < wishLabels.length) cells.push("");
      for (const p of provCols) {
        const v = row.byProv[p.id] ?? emptyCell();
        cells.push(v.stock, v.precio, v.pedir);
      }
      return cells.join("\t");
    });
    const tsv = [headers.join("\t"), ...body].join("\n");
    void navigator.clipboard.writeText(tsv);
  };

  /** TSV para pegar en Excel o enviar al proveedor: solo filas con cantidad (pedido) cargada. */
  const textoPedidoProveedorTSV = (provId: string) => {
    const p = provCols.find((x) => x.id === provId);
    const nombre = p?.nombre ?? "Proveedor";
    const esc = (s: string) => s.replace(/\r?\n/g, " ").replace(/\t/g, " ");
    const lineas: string[] = [];
    lineas.push(`Proveedor\t${esc(nombre)}`);
    lineas.push(`Descripción / producto\tCantidad pedida\tPrecio unit.`);
    rows.forEach((row, i) => {
      const v = row.byProv[provId];
      if (!v || !v.pedir.trim()) return;
      const desc = esc((wishCellsOf(row)[matchColIndex0] ?? "").trim() || `Fila ${i + 1}`);
      const cant = esc(v.pedir.trim());
      const pre = esc(v.precio.trim());
      lineas.push([desc, cant, pre].join("\t"));
    });
    return lineas.join("\n");
  };

  const textoPedidoProveedorLegible = (provId: string) => {
    const p = provCols.find((x) => x.id === provId);
    const nombre = p?.nombre ?? "Proveedor";
    const bloques: string[] = [];
    bloques.push(`Pedido — ${nombre}`);
    bloques.push("");
    rows.forEach((row, i) => {
      const v = row.byProv[provId];
      if (!v || !v.pedir.trim()) return;
      const desc = (wishCellsOf(row)[matchColIndex0] ?? "").trim() || `Fila ${i + 1}`;
      const cant = v.pedir.trim();
      const pre = v.precio.trim();
      bloques.push(`• ${desc}`);
      bloques.push(`  Cantidad: ${cant}${pre ? `  |  Precio: ${pre}` : ""}`);
      bloques.push("");
    });
    return bloques.join("\n").trimEnd();
  };

  const copiarPedidoProveedorTSV = (provId: string) => {
    const t = textoPedidoProveedorTSV(provId);
    const lineas = t.split("\n").filter((l) => l.trim().length > 0);
    if (lineas.length <= 2) {
      alert(
        "No hay líneas para copiar: completá la columna «Pedir» en la grilla con la cantidad que querés pedir (podés usar «Rellenar Pedir con stock» y después editar)."
      );
      return;
    }
    void navigator.clipboard.writeText(t);
  };

  const copiarPedidoProveedorLegible = (provId: string) => {
    const t = textoPedidoProveedorLegible(provId);
    if (t.split("\n").filter((l) => l.startsWith("•")).length === 0) {
      alert("No hay ítems con «Pedir» cargado para este proveedor en la grilla.");
      return;
    }
    void navigator.clipboard.writeText(t);
  };

  const aplicarPresetListaExcelTresColumnas = (provId: string) => {
    setProvColModelo((m) => ({ ...m, [provId]: 1 }));
    setProvColCant((m) => ({ ...m, [provId]: 2 }));
    setProvColPrecio((m) => ({ ...m, [provId]: 3 }));
    setProvEncabezado((m) => ({ ...m, [provId]: false }));
  };

  const statsSinPedido = useMemo(() => {
    const conRef = rows.filter((r) => filaTieneReferencia(r, matchColIndex0));
    const sin = conRef.filter((r) => !tieneAlgunPedir(r, provIds));
    return { conRef: conRef.length, sinPedido: sin.length };
  }, [rows, matchColIndex0, provIds]);

  const filasGrilla = useMemo(() => {
    const out: { row: Row; i: number }[] = [];
    rows.forEach((row, i) => {
      if (soloVerSinPedido) {
        if (!filaTieneReferencia(row, matchColIndex0)) return;
        if (tieneAlgunPedir(row, provIds)) return;
      }
      out.push({ row, i });
    });
    return out;
  }, [rows, soloVerSinPedido, matchColIndex0, provIds]);

  const copiarListaSinPedido = () => {
    const esc = (s: string) => s.replace(/\r?\n/g, " ").replace(/\t/g, " ");
    const lineas = rows
      .filter((r) => filaTieneReferencia(r, matchColIndex0) && !tieneAlgunPedir(r, provIds))
      .map((r) => esc((wishCellsOf(r)[matchColIndex0] ?? "").trim()));
    if (lineas.length === 0) {
      alert(
        provIds.length === 0
          ? "Agregá al menos un proveedor para comparar, o no hay filas con referencia en la columna ★."
          : "No hay artículos pendientes: en todas las filas con referencia ya cargaste «Pedir» en algún proveedor."
      );
      return;
    }
    void navigator.clipboard.writeText(lineas.join("\n"));
  };

  const numCols = rows.reduce((m, r) => Math.max(m, wishCellsOf(r).length), Math.max(wishLabels.length, 1));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
      <div className="bg-gradient-to-r from-[#16a085] to-[#1abc9c] text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Realizar pedidos</h2>
            <p className="text-teal-50 text-sm mt-2 max-w-3xl">
              Cargá tu tabla y la del proveedor. <strong>Stock</strong> y <strong>Precio</strong> vienen de la lista;
              en <strong>Pedir</strong> cargás la cantidad del pedido. <strong>Copiar pedido</strong> usa solo «Pedir» +
              precio para enviarle al proveedor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={agregarProveedor}
              className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold text-sm border border-white/30"
            >
              + Proveedor
            </button>
            <button
              type="button"
              onClick={agregarFila}
              className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold text-sm border border-white/30"
            >
              + Fila
            </button>
            <button
              type="button"
              onClick={exportarTSV}
              className="px-4 py-2 rounded-lg bg-white text-teal-800 hover:bg-teal-50 font-semibold text-sm"
            >
              Copiar tabla (TSV)
            </button>
            <button
              type="button"
              onClick={limpiarTodo}
              className="px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-600 font-semibold text-sm border border-white/20"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Tabla de deseos */}
        <div className="border border-[#d5dbdb] rounded-xl p-4 bg-[#f8f9fa]">
          <h3 className="font-bold text-[#2c3e50] mb-2 flex items-center gap-2">
            <span>📋</span> Tu tabla (todo lo que querés pedir)
          </h3>
          <p className="text-sm text-[#7f8c8d] mb-3">
            Copiá desde Excel varias columnas (separadas por tab). Marcá si la <strong>primera fila son títulos</strong>.
            Indicá el <strong>nº de columna</strong> (desde 1) que usamos para emparejar con el proveedor (modelo, código,
            SKU, etc.). Las coincidencias ignoran mayúsculas, acentos y espacios de más.
          </p>
          <textarea
            value={pegadoTablaDeseos}
            onChange={(e) => setPegadoTablaDeseos(e.target.value)}
            placeholder="Pegá acá la tabla completa desde Excel…"
            rows={8}
            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#1abc9c] focus:border-[#1abc9c] bg-white text-[#2c3e50]"
          />
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-[#2c3e50] cursor-pointer">
              <input
                type="checkbox"
                checked={encabezadoDeseos}
                onChange={(e) => setEncabezadoDeseos(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Primera fila es encabezado
            </label>
            <div>
              <label className="block text-xs font-semibold text-[#7f8c8d] mb-1">Columna para comparar (1 = primera)</label>
              <input
                type="number"
                min={1}
                value={colCompararDeseos}
                onChange={(e) => setColCompararDeseos(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 px-3 py-2 border-2 border-[#bdc3c7] rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={aplicarTablaDeseos}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#16a085] to-[#1abc9c] text-white font-semibold shadow-md hover:opacity-95"
            >
              Cargar tabla en la grilla
            </button>
            <span className="text-sm text-[#7f8c8d]">{rows.length} fila(s)</span>
          </div>
        </div>

        {/* Proveedores */}
        {provCols.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-[#2c3e50]">Listas del proveedor → emparejar con tu grilla</h3>
            <p className="text-sm text-[#7f8c8d] -mt-2 mb-1">
              Formato típico: <strong>col. 1</strong> producto, <strong>col. 2</strong> stock/cantidad lista,{" "}
              <strong>col. 3</strong> precio. Si una fila queda en una sola columna o mezcla tabs y espacios, se intenta leer{" "}
              <strong>texto + cantidad + precio</strong> desde el final de la línea; si solo pegás el modelo, usá col. 1 y
              poné cant./precio en 0. Al emparejar se ignora el prefijo <strong>Módulo</strong> / <strong>módulo</strong> /{" "}
              <strong>mod.</strong> al inicio del texto en la grilla y en el proveedor. En la grilla: <strong>Stock</strong> y{" "}
              <strong>Precio</strong> vienen del proveedor; <strong>Pedir</strong> es lo que le mandás en el pedido.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {provCols.map((p) => (
                <div key={p.id} className="border border-[#ecf0f1] rounded-xl p-4 bg-white shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.nombre}
                      onChange={(e) => renombrarProveedor(p.id, e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-[#bdc3c7] rounded-lg font-semibold text-[#2c3e50]"
                      placeholder="Nombre proveedor"
                    />
                    <button
                      type="button"
                      onClick={() => quitarProveedor(p.id)}
                      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm font-medium"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7f8c8d] mb-1">
                      Pegá la lista o tabla del proveedor (Excel)
                    </label>
                    <textarea
                      value={provTabla[p.id] ?? ""}
                      onChange={(e) => setProvTabla((m) => ({ ...m, [p.id]: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                      placeholder="Excel con tabs o texto plano: PRODUCTO… cantidad precio (ej. PLACA … ORIGINAL 68 3552,5)"
                    />
                    <button
                      type="button"
                      onClick={() => aplicarPresetListaExcelTresColumnas(p.id)}
                      className="mt-2 text-xs font-semibold text-[#16a085] hover:underline"
                    >
                      Preset: producto col 1, cantidad col 2, precio col 3 (sin fila encabezado)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <label className="flex items-center gap-2 col-span-2 sm:col-span-4">
                      <input
                        type="checkbox"
                        checked={provEncabezado[p.id] ?? false}
                        onChange={(e) =>
                          setProvEncabezado((m) => ({ ...m, [p.id]: e.target.checked }))
                        }
                        className="w-4 h-4"
                      />
                      Primera fila del proveedor es encabezado (solo si la 1ª línea es título, no un producto)
                    </label>
                    <label className="flex items-center gap-2 col-span-2 sm:col-span-4">
                      <input
                        type="checkbox"
                        checked={provMatchSuave[p.id] ?? false}
                        onChange={(e) =>
                          setProvMatchSuave((m) => ({ ...m, [p.id]: e.target.checked }))
                        }
                        className="w-4 h-4"
                      />
                      Emparejar flexible (subcadena o similitud por palabras entre textos distintos; ej. «módulo moto g32» con referencia «moto g32»)
                    </label>
                    <div>
                      <span className="text-xs text-[#7f8c8d] block mb-0.5">Col. producto (emparejar, ≥1)</span>
                      <input
                        type="number"
                        min={1}
                        className="w-full px-2 py-1.5 border rounded"
                        value={provColModelo[p.id] ?? 1}
                        onChange={(e) =>
                          setProvColModelo((m) => ({
                            ...m,
                            [p.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <span className="text-xs text-[#7f8c8d] block mb-0.5">Col. cantidad (0=no)</span>
                      <input
                        type="number"
                        min={0}
                        className="w-full px-2 py-1.5 border rounded"
                        value={provColCant[p.id] ?? 2}
                        onChange={(e) =>
                          setProvColCant((m) => ({
                            ...m,
                            [p.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <span className="text-xs text-[#7f8c8d] block mb-0.5">Col. precio (0=no)</span>
                      <input
                        type="number"
                        min={0}
                        className="w-full px-2 py-1.5 border rounded"
                        value={provColPrecio[p.id] ?? 3}
                        onChange={(e) =>
                          setProvColPrecio((m) => ({
                            ...m,
                            [p.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => emparejarProveedorPorModelo(p.id)}
                        className="flex-1 min-w-[140px] py-2 rounded-lg bg-gradient-to-r from-[#16a085] to-[#1abc9c] text-white text-sm font-semibold"
                      >
                        Emparejar por modelo
                      </button>
                      <button
                        type="button"
                        onClick={() => rellenarPedirConStock(p.id)}
                        className="flex-1 min-w-[140px] py-2 rounded-lg bg-[#ecf0f1] hover:bg-[#d5dbdb] text-[#2c3e50] text-sm font-semibold border border-[#bdc3c7]"
                        title="Copia Stock a Pedir donde Pedir está vacío"
                      >
                        Rellenar «Pedir» con stock
                      </button>
                    </div>
                  </div>

                  <details className="text-xs text-[#7f8c8d] border-t pt-2">
                    <summary className="cursor-pointer font-semibold text-[#2c3e50]">
                      Opciones si el orden de filas ya coincide (sin emparejar por texto)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={pegadoCant[p.id] ?? ""}
                        onChange={(e) => setPegadoCant((m) => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="Cantidades (una por línea)"
                        rows={2}
                        className="w-full px-2 py-1 border rounded font-mono"
                      />
                      <textarea
                        value={pegadoPrecio[p.id] ?? ""}
                        onChange={(e) => setPegadoPrecio((m) => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="Precios (una por línea)"
                        rows={2}
                        className="w-full px-2 py-1 border rounded font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => aplicarCantPrecioProveedor(p.id)}
                        className="w-full py-1.5 rounded bg-[#ecf0f1] hover:bg-[#d5dbdb] font-semibold text-[#2c3e50]"
                      >
                        Aplicar por orden de fila
                      </button>
                      <textarea
                        rows={2}
                        placeholder="Cant [tab] Precio por línea"
                        value={bloqueDosCols[p.id] ?? ""}
                        onChange={(e) => setBloqueDosCols((m) => ({ ...m, [p.id]: e.target.value }))}
                        className="w-full px-2 py-1 border rounded font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => aplicarBloqueDosColumnas(p.id, bloqueDosCols[p.id] ?? "")}
                        className="w-full py-1.5 rounded bg-[#d5f4e6] font-semibold text-[#145a32]"
                      >
                        Aplicar bloque 2 cols (por orden)
                      </button>
                    </div>
                  </details>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => copiarPedidoProveedorTSV(p.id)}
                      className="py-2.5 rounded-lg bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white text-sm font-semibold shadow"
                      title="Solo filas con «Pedir» en la grilla. Pegá en Excel o enviá por WhatsApp/mail."
                    >
                      Copiar pedido (Excel / TSV)
                    </button>
                    <button
                      type="button"
                      onClick={() => copiarPedidoProveedorLegible(p.id)}
                      className="py-2.5 rounded-lg bg-[#ecf0f1] hover:bg-[#d5dbdb] text-[#2c3e50] text-sm font-semibold border border-[#bdc3c7]"
                    >
                      Copiar pedido (texto legible)
                    </button>
                  </div>
                  <p className="text-[11px] text-[#95a5a6] text-center">
                    Solo ítems con <strong>Pedir</strong> cargado (no cuenta solo el stock).
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grilla */}
        <div>
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-[#2c3e50]">Grilla comparativa</h3>
              <button type="button" onClick={quitarUltimaFila} className="text-sm text-[#e74c3c] hover:underline">
                Quitar última fila
              </button>
            </div>
            <p className="text-xs text-[#7f8c8d] max-w-4xl">
              <strong>Stock</strong> = dato de la lista del proveedor. <strong>Pedir</strong> = cantidad que le pedís
              (completala a mano o con «Rellenar Pedir con stock»). <strong>Copiar pedido</strong> solo exporta filas
              con «Pedir» cargado. Los que <strong>no pediste a ningún proveedor</strong> los ves abajo y podés copiarlos
              para buscarlos en la lista de otro mayorista.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 rounded-xl border border-[#f0e6d2] bg-[#fffbeb] px-4 py-3 text-sm text-[#7d6608]">
              <div className="font-semibold text-[#856404]">
                Sin pedir a ningún proveedor:{" "}
                <span className="text-[#c0392b]">{statsSinPedido.sinPedido}</span> / {statsSinPedido.conRef} con
                referencia (columna ★)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSoloVerSinPedido((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    soloVerSinPedido
                      ? "bg-[#f39c12] text-white border-[#d68910]"
                      : "bg-white text-[#856404] border-[#e0c68a] hover:bg-[#fef5e7]"
                  }`}
                >
                  {soloVerSinPedido ? "Ver toda la grilla" : "Solo ver artículos sin pedido"}
                </button>
                <button
                  type="button"
                  onClick={copiarListaSinPedido}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#2980b9] border border-[#aed6f1] hover:bg-[#ebf5fb]"
                >
                  Copiar lista (columna ★) para otro proveedor
                </button>
              </div>
            </div>
          </div>
          <div
            className={`overflow-x-auto border rounded-xl ${
              soloVerSinPedido ? "border-[#f39c12] border-2 ring-2 ring-[#fdebd0]" : "border-[#bdc3c7]"
            }`}
          >
            <table className="w-full min-w-[640px] text-sm border-collapse">
              <thead>
                <tr className="bg-[#ecf0f1]">
                  <th className="border border-[#bdc3c7] p-2 text-left sticky left-0 bg-[#ecf0f1] z-10 w-10">#</th>
                  {Array.from({ length: numCols }, (_, ci) => {
                    const label = wishLabels[ci] ?? `Col ${ci + 1}`;
                    const isMatch = ci === matchColIndex0;
                    return (
                      <th
                        key={ci}
                        className={`border border-[#bdc3c7] p-2 text-left min-w-[120px] ${
                          isMatch ? "bg-[#d5f4e6] text-[#145a32] font-bold" : ""
                        }`}
                        title={isMatch ? "Columna usada para emparejar con proveedores" : undefined}
                      >
                        {label}
                        {isMatch ? " ★" : ""}
                      </th>
                    );
                  })}
                  {provCols.map((p) => (
                    <th
                      key={p.id}
                      colSpan={3}
                      className="border border-[#bdc3c7] p-0 align-bottom bg-[#d5f4e6]"
                    >
                      <div className="px-2 py-2 font-semibold text-[#1e8449] text-center border-b border-[#a9dfbf]">
                        {p.nombre || "Proveedor"}
                      </div>
                      <div className="grid grid-cols-3 bg-[#ecf0f1] text-xs font-medium text-[#2c3e50]">
                        <div className="border-r border-[#bdc3c7] p-2 text-center">Stock</div>
                        <div className="border-r border-[#bdc3c7] p-2 text-center">Precio</div>
                        <div className="p-2 text-center">Pedir ★</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasGrilla.map(({ row, i }, idx) => {
                  const stripe = idx % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]";
                  return (
                    <tr key={i}>
                      <td
                        className={`border border-[#bdc3c7] p-1 text-center text-[#7f8c8d] sticky left-0 z-[1] ${stripe}`}
                      >
                        {i + 1}
                      </td>
                      {Array.from({ length: numCols }, (_, ci) => {
                        const v = wishCellsOf(row)[ci] ?? "";
                        return (
                          <td key={ci} className={`border border-[#bdc3c7] p-1 min-w-[100px] ${stripe}`}>
                            <input
                              value={v}
                              onChange={(e) => setWishCell(i, ci, e.target.value)}
                              className="w-full min-w-[90px] px-2 py-1.5 border border-transparent hover:border-[#bdc3c7] rounded bg-transparent text-[#2c3e50]"
                            />
                          </td>
                        );
                      })}
                      {provCols.map((p) => {
                        const v = row.byProv[p.id] ?? emptyCell();
                        return (
                          <Fragment key={p.id}>
                            <td className={`border border-[#bdc3c7] p-1 w-20 ${stripe}`}>
                              <input
                                value={v.stock}
                                onChange={(e) => setCell(i, p.id, "stock", e.target.value)}
                                className="w-full px-2 py-1.5 border border-transparent hover:border-[#bdc3c7] rounded text-right bg-transparent text-[#5d6d7e]"
                                inputMode="numeric"
                                title="Stock según lista del proveedor"
                              />
                            </td>
                            <td className={`border border-[#bdc3c7] p-1 w-24 ${stripe}`}>
                              <input
                                value={v.precio}
                                onChange={(e) => setCell(i, p.id, "precio", e.target.value)}
                                className="w-full px-2 py-1.5 border border-transparent hover:border-[#bdc3c7] rounded text-right bg-transparent"
                                inputMode="decimal"
                              />
                            </td>
                            <td className={`border border-[#bdc3c7] p-1 w-20 ${stripe} bg-[#fffbeb]`}>
                              <input
                                value={v.pedir}
                                onChange={(e) => setCell(i, p.id, "pedir", e.target.value)}
                                className="w-full px-2 py-1.5 border border-transparent hover:border-[#f39c12] rounded text-right bg-transparent font-semibold text-[#2c3e50]"
                                inputMode="numeric"
                                title="Cantidad que pedís (va al copiar pedido)"
                              />
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {provCols.length === 0 && (
            <p className="text-sm text-[#7f8c8d] mt-3">
              Agregá proveedores con <strong>+ Proveedor</strong>, pegá su lista y tocá <strong>Emparejar por modelo</strong>{" "}
              para que cada producto quede en la misma fila que en tu tabla.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
