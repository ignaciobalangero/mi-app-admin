import { mismoCategoria } from "@/lib/categoriaRepuesto";
import { normalizarMoneda, pesosDesdeMoneda } from "@/lib/monedaRepuesto";

export type FiltroTiendaControl = "todos" | "tienda" | "no_tienda";

export interface ProductoControlStock {
  id: string;
  codigo: string;
  categoria: string;
  producto: string;
  marca: string;
  proveedor: string;
  cantidad: number;
  publicarEnCatalogoWeb: boolean;
  moneda: "ARS" | "USD";
  cotizacion: number;
  precio1: number;
  precio1Pesos: number;
}

export interface FiltrosControlStock {
  categoria?: string;
  marca?: string;
  proveedor?: string;
  filtroTienda: FiltroTiendaControl;
}

export interface LineaConteoStock {
  producto: ProductoControlStock;
  contado: boolean;
  stockReal: string;
  /** Precio unitario editable en USD (independiente del ARS). */
  precioUsd: string;
  /** Precio unitario editable en ARS. */
  precioArs: string;
}

export interface DiferenciaConteoStock {
  id: string;
  codigo: string;
  producto: string;
  categoria: string;
  stockSistema: number;
  stockReal: number;
  diferencia: number;
}

export interface DiferenciaPrecioStock {
  id: string;
  codigo: string;
  producto: string;
  moneda: "ARS" | "USD";
  precio1Antes: number;
  precio1PesosAntes: number;
  precio1: number;
  precio1Pesos: number;
}

export function docAProductoControlStock(
  id: string,
  data: Record<string, unknown>
): ProductoControlStock {
  const moneda = normalizarMoneda(data.moneda);
  const cotizacion = Number(data.cotizacion) || 0;
  const precio1 = Number(data.precio1) || 0;
  const precio1PesosRaw = Number(data.precio1Pesos);
  const precio1Pesos =
    Number.isFinite(precio1PesosRaw) && precio1PesosRaw > 0
      ? precio1PesosRaw
      : pesosDesdeMoneda(precio1, moneda, cotizacion > 0 ? cotizacion : 1);

  return {
    id,
    codigo: String(data.codigo ?? id),
    categoria: String(data.categoria ?? "").trim() || "Sin categoría",
    producto: String(data.producto ?? "").trim() || "Sin nombre",
    marca: String(data.marca ?? "").trim(),
    proveedor: String(data.proveedor ?? "").trim(),
    cantidad: Number(data.cantidad) || 0,
    publicarEnCatalogoWeb: Boolean(data.publicarEnCatalogoWeb),
    moneda,
    cotizacion,
    precio1,
    precio1Pesos,
  };
}

/** Valores iniciales USD/ARS para editar en el conteo. */
export function preciosUnitariosDesdeProducto(p: ProductoControlStock): {
  usd: number;
  ars: number;
} {
  const cot = p.cotizacion > 0 ? p.cotizacion : 0;
  if (p.moneda === "USD") {
    return {
      usd: p.precio1,
      ars: p.precio1Pesos || (cot > 0 ? pesosDesdeMoneda(p.precio1, "USD", cot) : 0),
    };
  }
  const ars = p.precio1Pesos || p.precio1;
  return {
    ars,
    usd: cot > 0 ? Math.round((ars / cot) * 100) / 100 : 0,
  };
}

export function parsePrecioControl(valor: string, fallback = 0): number {
  const n = Number(String(valor).replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Mapea los inputs USD/ARS al schema del repuesto (precio1 + precio1Pesos). */
export function payloadPreciosControl(
  moneda: "ARS" | "USD",
  precioUsd: number,
  precioArs: number,
  cotizacion: number
): { precio1: number; precio1Pesos: number } {
  if (moneda === "USD") {
    const precio1 = Math.round(precioUsd * 100) / 100;
    const precio1Pesos =
      precioArs > 0
        ? Math.round(precioArs)
        : pesosDesdeMoneda(precio1, "USD", cotizacion > 0 ? cotizacion : 1);
    return { precio1, precio1Pesos };
  }
  const precio1 = Math.round(precioArs);
  return { precio1, precio1Pesos: precio1 };
}

function coincideTextoExacto(valor: string, filtro: string): boolean {
  return valor.trim().toLowerCase() === filtro.trim().toLowerCase();
}

export function filtrarProductosControl(
  productos: ProductoControlStock[],
  filtros: FiltrosControlStock
): ProductoControlStock[] {
  let lista = [...productos];

  if (filtros.categoria) {
    lista = lista.filter((p) => mismoCategoria(p.categoria, filtros.categoria!));
  }

  if (filtros.marca) {
    lista = lista.filter((p) => coincideTextoExacto(p.marca, filtros.marca!));
  }

  if (filtros.proveedor) {
    lista = lista.filter((p) =>
      coincideTextoExacto(p.proveedor, filtros.proveedor!)
    );
  }

  if (filtros.filtroTienda === "tienda") {
    lista = lista.filter((p) => p.publicarEnCatalogoWeb);
  } else if (filtros.filtroTienda === "no_tienda") {
    lista = lista.filter((p) => !p.publicarEnCatalogoWeb);
  }

  return lista.sort((a, b) =>
    String(a.codigo).localeCompare(String(b.codigo), "es", { numeric: true })
  );
}

export function subtituloFiltrosControl(filtros: FiltrosControlStock): string {
  const partes: string[] = [];
  if (filtros.categoria) partes.push(`Categoría: ${filtros.categoria}`);
  if (filtros.marca) partes.push(`Marca: ${filtros.marca}`);
  if (filtros.proveedor) partes.push(`Proveedor: ${filtros.proveedor}`);
  partes.push(etiquetaFiltroTienda(filtros.filtroTienda));
  return partes.join(" · ");
}

export function crearLineasConteo(
  productos: ProductoControlStock[]
): LineaConteoStock[] {
  return productos.map((producto) => {
    const { usd, ars } = preciosUnitariosDesdeProducto(producto);
    return {
      producto,
      contado: false,
      stockReal: String(producto.cantidad),
      precioUsd: usd ? String(usd) : "",
      precioArs: ars ? String(ars) : "",
    };
  });
}

export function parseStockReal(valor: string, fallback: number): number {
  const n = Number(String(valor).replace(",", ".").trim());
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

export function calcularDiferenciasConteo(
  lineas: LineaConteoStock[]
): DiferenciaConteoStock[] {
  const difs: DiferenciaConteoStock[] = [];

  for (const linea of lineas) {
    if (!linea.contado) continue;
    const stockSistema = linea.producto.cantidad;
    const stockReal = parseStockReal(linea.stockReal, stockSistema);
    if (stockReal === stockSistema) continue;

    difs.push({
      id: linea.producto.id,
      codigo: linea.producto.codigo,
      producto: linea.producto.producto,
      categoria: linea.producto.categoria,
      stockSistema,
      stockReal,
      diferencia: stockReal - stockSistema,
    });
  }

  return difs;
}

export function calcularDiferenciasPrecio(
  lineas: LineaConteoStock[]
): DiferenciaPrecioStock[] {
  const difs: DiferenciaPrecioStock[] = [];

  for (const linea of lineas) {
    const p = linea.producto;
    const orig = preciosUnitariosDesdeProducto(p);
    const usd = parsePrecioControl(linea.precioUsd, orig.usd);
    const ars = parsePrecioControl(linea.precioArs, orig.ars);
    const payload = payloadPreciosControl(p.moneda, usd, ars, p.cotizacion);

    const mismoPrecio1 = Math.abs(payload.precio1 - p.precio1) < 0.005;
    const mismoPesos = Math.round(payload.precio1Pesos) === Math.round(p.precio1Pesos);
    if (mismoPrecio1 && mismoPesos) continue;

    difs.push({
      id: p.id,
      codigo: p.codigo,
      producto: p.producto,
      moneda: p.moneda,
      precio1Antes: p.precio1,
      precio1PesosAntes: p.precio1Pesos,
      precio1: payload.precio1,
      precio1Pesos: payload.precio1Pesos,
    });
  }

  return difs;
}

export function etiquetaFiltroTienda(filtro: FiltroTiendaControl): string {
  switch (filtro) {
    case "tienda":
      return "Solo aptos para tienda web";
    case "no_tienda":
      return "Solo NO publicados en tienda";
    default:
      return "Todo el stock";
  }
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generarHtmlImpresionControlStock(opts: {
  titulo: string;
  subtitulo: string;
  productos: ProductoControlStock[];
  mostrarTienda?: boolean;
}): string {
  const filas = opts.productos
    .map(
      (p) => `
      <tr>
        <td class="c-check">☐</td>
        <td class="c-cod">${escHtml(p.codigo)}</td>
        <td class="c-prod">${escHtml(p.producto)}${p.marca ? ` <span class="muted">${escHtml(p.marca)}</span>` : ""}</td>
        <td class="c-cat">${escHtml(p.categoria)}</td>
        <td class="c-st">${p.cantidad}</td>
        ${opts.mostrarTienda ? `<td class="c-web">${p.publicarEnCatalogoWeb ? "🌐" : ""}</td>` : ""}
        <td class="c-real"></td>
      </tr>`
    )
    .join("");

  const colWeb = opts.mostrarTienda
    ? `<th class="c-web">Web</th>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(opts.titulo)}</title>
  <style>
    @page { size: A4 portrait; margin: 7mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.5pt;
      line-height: 1.15;
      color: #111;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 11pt;
      margin: 0 0 2px;
    }
    .meta {
      font-size: 7pt;
      color: #444;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 0.5px solid #bbb;
      padding: 1px 3px;
      vertical-align: top;
    }
    th {
      background: #eee;
      font-size: 7pt;
      font-weight: 700;
    }
    .c-check { width: 14px; text-align: center; }
    .c-cod { width: 42px; white-space: nowrap; font-family: monospace; font-size: 7pt; }
    .c-cat { width: 58px; font-size: 6.5pt; }
    .c-st, .c-real, .c-web { width: 22px; text-align: center; }
    .c-prod { font-size: 7pt; }
    .muted { color: #666; font-size: 6.5pt; }
    tr:nth-child(even) td { background: #fafafa; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>${escHtml(opts.titulo)}</h1>
  <div class="meta">${escHtml(opts.subtitulo)} · ${opts.productos.length} ítems · ${new Date().toLocaleString("es-AR")}</div>
  <table>
    <thead>
      <tr>
        <th class="c-check">✓</th>
        <th class="c-cod">Cód</th>
        <th class="c-prod">Producto</th>
        <th class="c-cat">Cat.</th>
        <th class="c-st">St.</th>
        ${colWeb}
        <th class="c-real">Real</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}

export function imprimirControlStock(html: string): boolean {
  const ventana = window.open("", "_blank", "width=900,height=700");
  if (!ventana) return false;
  ventana.document.write(html);
  ventana.document.close();
  return true;
}
