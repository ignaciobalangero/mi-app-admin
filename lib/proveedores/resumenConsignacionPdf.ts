import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type LineaResumenConsignacion = {
  fecha: string;
  producto: string;
  cantidad: number;
  precio: number;
  total: number;
  moneda: "ARS" | "USD";
};

function dinero(moneda: "ARS" | "USD", valor: number): string {
  const n = valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === "USD" ? `USD ${n}` : `$ ${n}`;
}

function nombreArchivo(proveedor: string): string {
  const limpio = proveedor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `consignacion-${limpio || "proveedor"}.pdf`;
}

export function resumenConsignacionPdf(opts: {
  proveedor: string;
  lineas: LineaResumenConsignacion[];
  modo: "descargar" | "imprimir";
}) {
  const doc = new jsPDF();
  const hoy = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  doc.setFontSize(16);
  doc.text("Consignación vendida", 14, 18);
  doc.setFontSize(11);
  doc.text(opts.proveedor, 14, 26);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(hoy, 14, 32);
  doc.setTextColor(0);

  const body = opts.lineas.map((linea) => [
    linea.fecha || "",
    linea.producto,
    String(linea.cantidad),
    dinero(linea.moneda, linea.precio),
    dinero(linea.moneda, linea.total),
  ]);

  const totales = opts.lineas.reduce(
    (acc, linea) => {
      if (linea.moneda === "USD") acc.usd += linea.total;
      else acc.ars += linea.total;
      return acc;
    },
    { ars: 0, usd: 0 }
  );
  if (totales.ars > 0) body.push(["", "", "", "Total ARS", dinero("ARS", totales.ars)]);
  if (totales.usd > 0) body.push(["", "", "", "Total USD", dinero("USD", totales.usd)]);

  autoTable(doc, {
    startY: 38,
    head: [["Fecha", "Producto", "Cant.", "Precio", "Total"]],
    body,
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
    headStyles: { fillColor: [142, 68, 173], textColor: [255, 255, 255], fontStyle: "bold" },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 48;
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text("Precio de costo de la mercadería en consignación.", 14, finalY + 8);

  if (opts.modo === "imprimir") {
    doc.autoPrint();
    const url = doc.output("bloburl");
    const ventana = window.open(url);
    if (!ventana) doc.save(nombreArchivo(opts.proveedor));
    return;
  }
  doc.save(nombreArchivo(opts.proveedor));
}
