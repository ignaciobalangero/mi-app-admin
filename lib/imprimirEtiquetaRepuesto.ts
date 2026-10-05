import { doc, getDoc } from "firebase/firestore";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { db } from "@/lib/firebase";
import {
  codigoParaEtiqueta,
  codigoParaEtiquetaQr,
  type ProductoCodigoBarras,
} from "@/lib/buscarProductoPorCodigoBarras";

export type TipoCodigoEtiqueta = "qr" | "barras" | "ninguno";

export type EtiquetaRepuestoConfig = {
  mostrarBorde?: boolean;
  tipoCodigo?: TipoCodigoEtiqueta;
};

export type ItemEtiquetaStock = {
  producto?: string;
  id?: string;
  tipo?: "accesorio" | "repuesto";
  codigoBarras?: string;
  codigo?: string;
  /** Código ya resuelto para QR/barras */
  codigoEscaneable?: string;
};

function tamanoTextoProducto(texto: string, conCodigo: boolean): string {
  const len = texto.length;
  if (conCodigo) {
    if (len <= 24) return "8px";
    if (len <= 40) return "7px";
    if (len <= 60) return "6px";
    return "5px";
  }
  if (len <= 28) return "10px";
  if (len <= 45) return "9px";
  if (len <= 65) return "8px";
  if (len <= 90) return "7px";
  return "6px";
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function generarDataUrlCodigo(
  valor: string,
  tipo: TipoCodigoEtiqueta
): Promise<string> {
  if (!valor || tipo === "ninguno") return "";
  if (tipo === "qr") {
    return QRCode.toDataURL(valor, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 180,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }

  const canvas =
    typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) return "";
  try {
    JsBarcode(canvas, valor, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 40,
      width: 1.4,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    // Si CODE128 falla (caracteres raros), caer a QR
    return QRCode.toDataURL(valor, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 180,
    });
  }
}

function resolverCodigoItem(
  item: ItemEtiquetaStock | string,
  tipoCodigo: TipoCodigoEtiqueta
): string {
  if (typeof item === "string") return "";
  if (tipoCodigo === "qr" && item.id && item.tipo) {
    return codigoParaEtiquetaQr({ id: item.id, tipo: item.tipo });
  }
  if (tipoCodigo === "barras") {
    if (item.id && item.tipo) {
      return codigoParaEtiqueta({
        id: item.id,
        tipo: item.tipo,
        codigoBarras: item.codigoBarras,
        codigo: item.codigo,
      });
    }
    return String(item.codigoBarras || item.codigo || item.codigoEscaneable || "").trim();
  }
  return String(item.codigoEscaneable || item.codigoBarras || item.codigo || "").trim();
}

function tituloItem(item: ItemEtiquetaStock | string): string {
  if (typeof item === "string") return item;
  return String(item.producto || item.codigo || "Sin nombre").trim();
}

function bloqueEtiqueta(
  nombreNegocio: string,
  titulo: string,
  codigoImg: string,
  codigoTexto: string,
  tipoCodigo: TipoCodigoEtiqueta,
  config: EtiquetaRepuestoConfig,
  esUltima: boolean
): string {
  const nombre = escapeHtml(String(nombreNegocio || "MI NEGOCIO").trim().toUpperCase());
  const tituloSafe = escapeHtml(String(titulo || "Sin nombre").trim());
  const mostrarBorde = config.mostrarBorde !== false;
  const conCodigo = Boolean(codigoImg) && tipoCodigo !== "ninguno";
  const fontProducto = tamanoTextoProducto(titulo, conCodigo);
  const codigoSafe = escapeHtml(codigoTexto);

  const bloqueCodigo = conCodigo
    ? tipoCodigo === "qr"
      ? `<div class="codigo codigo-qr"><img src="${codigoImg}" alt="QR" /></div>`
      : `<div class="codigo codigo-barras"><img src="${codigoImg}" alt="Barras" /><div class="codigo-txt">${codigoSafe}</div></div>`
    : "";

  return `
    <section class="label${esUltima ? " label-last" : ""}${conCodigo ? " label-con-codigo" : ""}" style="${mostrarBorde ? "" : "border:none!important;"}">
      <div class="header">${nombre}</div>
      <div class="body">
        <div class="producto" style="font-size:${fontProducto}">${tituloSafe}</div>
        ${bloqueCodigo}
      </div>
    </section>`;
}

async function armarCuerpoEtiquetas(
  nombreNegocio: string,
  items: Array<ItemEtiquetaStock | string>,
  config: EtiquetaRepuestoConfig
): Promise<string> {
  const tipoCodigo = config.tipoCodigo ?? "ninguno";
  const lista =
    items.length > 0
      ? items
      : (["Sin nombre"] as Array<ItemEtiquetaStock | string>);

  const bloques: string[] = [];
  for (let i = 0; i < lista.length; i++) {
    const item = lista[i];
    const titulo = tituloItem(item);
    const codigo = tipoCodigo === "ninguno" ? "" : resolverCodigoItem(item, tipoCodigo);
    const img = codigo ? await generarDataUrlCodigo(codigo, tipoCodigo) : "";
    bloques.push(
      bloqueEtiqueta(
        nombreNegocio,
        titulo,
        img,
        codigo,
        tipoCodigo,
        config,
        i === lista.length - 1
      )
    );
  }
  return bloques.join("");
}

function wrapHtml(cuerpo: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta stock</title>
  <style>
    @page { size: 62mm 29mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: Arial, sans-serif; }
    body { margin: 0; }
    .label {
      width: 62mm;
      height: 29mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 3px solid #000;
      page-break-after: always;
      break-after: page;
    }
    .label-last { page-break-after: auto; break-after: auto; }
    .header {
      text-align: center;
      padding: 1.2mm 2mm 0.8mm;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 0.6px;
      border-bottom: 2px solid #000;
      flex-shrink: 0;
      line-height: 1.1;
    }
    .body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5mm;
      padding: 1mm 2mm 1.5mm;
      min-height: 0;
    }
    .label-con-codigo .body { justify-content: space-between; }
    .producto {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-weight: 900;
      line-height: 1.12;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
      min-width: 0;
    }
    .codigo { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .codigo-qr img { width: 14mm; height: 14mm; }
    .codigo-barras img { width: 28mm; height: 8mm; object-fit: contain; }
    .codigo-txt { font-size: 5px; font-weight: 700; margin-top: 0.3mm; letter-spacing: 0.2px; max-width: 28mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${cuerpo}
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 500));
    window.addEventListener('afterprint', () => window.close());
  </script>
</body>
</html>`;
}

/** HTML para una etiqueta Brother 62×29 mm (mismo formato que teléfonos). */
export function generarHTMLEtiquetaRepuesto(
  nombreNegocio: string,
  producto: string,
  config: EtiquetaRepuestoConfig = {}
): string {
  // Sync API legacy: sin código embebido
  const cuerpo = bloqueEtiqueta(
    nombreNegocio,
    producto,
    "",
    "",
    "ninguno",
    config,
    true
  );
  return wrapHtml(cuerpo);
}

/** Varias etiquetas en secuencia (una por hoja / corte). */
export function generarHTMLVariasEtiquetasRepuesto(
  nombreNegocio: string,
  productos: string[],
  config: EtiquetaRepuestoConfig = {}
): string {
  const lista = productos.map((p) => String(p || "Sin nombre").trim()).filter(Boolean);
  if (lista.length === 0) lista.push("Sin nombre");
  const cuerpo = lista
    .map((titulo, i) =>
      bloqueEtiqueta(nombreNegocio, titulo, "", "", "ninguno", config, i === lista.length - 1)
    )
    .join("");
  return wrapHtml(cuerpo);
}

export async function obtenerNombreNegocioImpresion(negocioID: string): Promise<string> {
  if (!negocioID) return "";
  const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
  if (!snap.exists()) return "";
  return String(snap.data().nombreNegocio ?? "").trim();
}

export function abrirVentanaImpresionEtiqueta(html: string): boolean {
  const ventana = window.open("", "_blank", "width=800,height=600");
  if (!ventana) return false;
  escribirHtmlEnVentana(ventana, html);
  return true;
}

export function escribirHtmlEnVentana(ventana: Window, html: string): void {
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
}

export async function imprimirEtiquetaRepuesto(
  negocioID: string,
  producto: string
): Promise<void> {
  const nombreNegocio = await obtenerNombreNegocioImpresion(negocioID);
  const html = generarHTMLEtiquetaRepuesto(nombreNegocio, producto);
  const ok = abrirVentanaImpresionEtiqueta(html);
  if (!ok) {
    throw new Error("El navegador bloqueó la ventana emergente. Permití pop-ups para imprimir.");
  }
}

export async function imprimirEtiquetasRepuestos(
  negocioID: string,
  items: Array<{ producto?: string }>
): Promise<void> {
  const productos = items.map((i) => String(i.producto ?? "").trim()).filter(Boolean);
  if (productos.length === 0) {
    throw new Error("No hay productos para imprimir.");
  }
  const nombreNegocio = await obtenerNombreNegocioImpresion(negocioID);
  const html = generarHTMLVariasEtiquetasRepuesto(nombreNegocio, productos);
  const ok = abrirVentanaImpresionEtiqueta(html);
  if (!ok) {
    throw new Error("El navegador bloqueó la ventana emergente. Permití pop-ups para imprimir.");
  }
}

/** Imprime etiqueta(s) con QR o código de barras escaneable.
 * Pasá `ventana` abierta en el mismo clic del usuario para evitar bloqueo de pop-ups.
 */
export async function imprimirEtiquetaStockConCodigo(
  negocioID: string,
  items: ItemEtiquetaStock[],
  tipoCodigo: TipoCodigoEtiqueta = "qr",
  ventana?: Window | null
): Promise<void> {
  if (!items.length) throw new Error("No hay productos para imprimir.");
  const nombreNegocio = await obtenerNombreNegocioImpresion(negocioID);
  const cuerpo = await armarCuerpoEtiquetas(nombreNegocio, items, {
    tipoCodigo,
  });
  const html = wrapHtml(cuerpo);

  if (ventana && !ventana.closed) {
    escribirHtmlEnVentana(ventana, html);
    return;
  }

  const ok = abrirVentanaImpresionEtiqueta(html);
  if (!ok) {
    throw new Error("El navegador bloqueó la ventana emergente. Permití pop-ups para imprimir.");
  }
}

export function itemEtiquetaDesdeProducto(
  p: Pick<
    ProductoCodigoBarras,
    "id" | "tipo" | "producto" | "codigo" | "codigoBarras"
  >
): ItemEtiquetaStock {
  return {
    id: p.id,
    tipo: p.tipo,
    producto: p.producto,
    codigo: p.codigo,
    codigoBarras: p.codigoBarras,
  };
}
