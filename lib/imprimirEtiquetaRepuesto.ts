import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type EtiquetaRepuestoConfig = {
  mostrarBorde?: boolean;
};

function tamanoTextoProducto(texto: string): string {
  const len = texto.length;
  if (len <= 28) return "10px";
  if (len <= 45) return "9px";
  if (len <= 65) return "8px";
  if (len <= 90) return "7px";
  return "6px";
}

function bloqueEtiqueta(
  nombreNegocio: string,
  producto: string,
  config: EtiquetaRepuestoConfig,
  esUltima: boolean
): string {
  const nombre = String(nombreNegocio || "MI NEGOCIO").trim().toUpperCase();
  const titulo = String(producto || "Sin nombre").trim();
  const mostrarBorde = config.mostrarBorde !== false;
  const fontProducto = tamanoTextoProducto(titulo);

  return `
    <section class="label${esUltima ? " label-last" : ""}" style="${mostrarBorde ? "" : "border:none!important;"}">
      <div class="header">${nombre}</div>
      <div class="producto" style="font-size:${fontProducto}">${titulo}</div>
    </section>`;
}

/** HTML para una etiqueta Brother 62×29 mm (mismo formato que teléfonos). */
export function generarHTMLEtiquetaRepuesto(
  nombreNegocio: string,
  producto: string,
  config: EtiquetaRepuestoConfig = {}
): string {
  return generarHTMLVariasEtiquetasRepuesto(nombreNegocio, [producto], config);
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
    .map((titulo, i) => bloqueEtiqueta(nombreNegocio, titulo, config, i === lista.length - 1))
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta repuesto</title>
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
      padding: 1.5mm 2mm 1mm;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.8px;
      border-bottom: 2px solid #000;
      flex-shrink: 0;
      line-height: 1.1;
    }
    .producto {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 1.5mm 2.5mm 2mm;
      font-weight: 900;
      line-height: 1.15;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
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

export async function obtenerNombreNegocioImpresion(negocioID: string): Promise<string> {
  if (!negocioID) return "";
  const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
  if (!snap.exists()) return "";
  return String(snap.data().nombreNegocio ?? "").trim();
}

export function abrirVentanaImpresionEtiqueta(html: string): boolean {
  const ventana = window.open("", "_blank", "width=800,height=600");
  if (!ventana) return false;
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  return true;
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
