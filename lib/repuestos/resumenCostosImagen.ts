import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ItemResumenCosto = {
  marca: string;
  modelo: string;
  cantidad: number;
  moneda: "ARS" | "USD";
  costo: number;
};

export type FilaResumenCosto = {
  modelo: string;
  cantidad: number;
  moneda: "ARS" | "USD";
  costo: number;
  total: number;
};

export type GrupoResumenCosto = {
  marca: string;
  filas: FilaResumenCosto[];
  totalARS: number;
  totalUSD: number;
};

export type ResumenCostoArmado = {
  grupos: GrupoResumenCosto[];
  totalARS: number;
  totalUSD: number;
  unidades: number;
  modelos: number;
};

export function dineroCosto(moneda: "ARS" | "USD", valor: number): string {
  const n = valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === "USD" ? `USD ${n}` : `$ ${n}`;
}

/** Agrupa lo que hay en stock (cantidad > 0) por marca, con costo × cantidad. */
export function armarResumenCosto(items: ItemResumenCosto[]): ResumenCostoArmado {
  const gruposMap = new Map<string, FilaResumenCosto[]>();
  for (const item of items) {
    if (!(item.cantidad > 0)) continue;
    const marca = item.marca.trim() || "Sin marca";
    const total = Math.round(item.costo * item.cantidad * 100) / 100;
    const fila: FilaResumenCosto = {
      modelo: item.modelo.trim() || "Sin nombre",
      cantidad: item.cantidad,
      moneda: item.moneda === "USD" ? "USD" : "ARS",
      costo: item.costo,
      total,
    };
    const lista = gruposMap.get(marca) || [];
    lista.push(fila);
    gruposMap.set(marca, lista);
  }

  const grupos: GrupoResumenCosto[] = Array.from(gruposMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([marca, filas]) => {
      filas.sort((a, b) => a.modelo.localeCompare(b.modelo, "es"));
      let totalARS = 0;
      let totalUSD = 0;
      for (const fila of filas) {
        if (fila.moneda === "USD") totalUSD += fila.total;
        else totalARS += fila.total;
      }
      return { marca, filas, totalARS, totalUSD };
    });

  let totalARS = 0;
  let totalUSD = 0;
  let unidades = 0;
  let modelos = 0;
  for (const grupo of grupos) {
    totalARS += grupo.totalARS;
    totalUSD += grupo.totalUSD;
    modelos += grupo.filas.length;
    for (const fila of grupo.filas) unidades += fila.cantidad;
  }

  return {
    grupos,
    totalARS: Math.round(totalARS * 100) / 100,
    totalUSD: Math.round(totalUSD * 100) / 100,
    unidades,
    modelos,
  };
}

type Celda = string | { content: string; colSpan?: number; styles?: Record<string, unknown> };

function textoTotales(ars: number, usd: number): string {
  const partes: string[] = [];
  if (ars > 0 || usd === 0) partes.push(dineroCosto("ARS", ars));
  if (usd > 0) partes.push(dineroCosto("USD", usd));
  return partes.join(" · ");
}

/** PDF en páginas A4. El texto sigue nítido aunque haya muchos modelos. */
export function archivoResumenCostoPdf(resumen: ResumenCostoArmado, fecha: string): File {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text("Stock de repuestos", 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    `${fecha} · ${resumen.modelos} modelos · ${resumen.unidades} unidades`,
    14,
    22
  );
  doc.setTextColor(0);

  const body: Celda[][] = [];
  for (const grupo of resumen.grupos) {
    body.push([
      {
        content: grupo.marca,
        colSpan: 4,
        styles: {
          fillColor: [14, 102, 85],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
      },
    ]);
    for (const fila of grupo.filas) {
      body.push([
        fila.modelo,
        String(fila.cantidad),
        dineroCosto(fila.moneda, fila.costo),
        dineroCosto(fila.moneda, fila.total),
      ]);
    }
    body.push([
      {
        content: `Subtotal ${grupo.marca}`,
        colSpan: 3,
        styles: { fontStyle: "bold", fillColor: [232, 248, 245] },
      },
      {
        content: textoTotales(grupo.totalARS, grupo.totalUSD),
        styles: { fontStyle: "bold", halign: "right", fillColor: [232, 248, 245] },
      },
    ]);
  }
  body.push([
    {
      content: "Total costo",
      colSpan: 3,
      styles: {
        fontStyle: "bold",
        fillColor: [14, 102, 85],
        textColor: [255, 255, 255],
      },
    },
    {
      content: textoTotales(resumen.totalARS, resumen.totalUSD),
      styles: {
        fontStyle: "bold",
        halign: "right",
        fillColor: [14, 102, 85],
        textColor: [255, 255, 255],
      },
    },
  ]);

  autoTable(doc, {
    startY: 28,
    head: [["Modelo", "Cant.", "Costo", "Total"]],
    body,
    theme: "grid",
    margin: { left: 12, right: 12 },
    styles: { fontSize: 8, cellPadding: 1.6, textColor: [30, 30, 30], overflow: "linebreak" },
    headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: "right", cellWidth: 18 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 36 },
    },
    showHead: "everyPage",
  });

  const blob = doc.output("blob");
  return new File([blob], "stock-repuestos-costos.pdf", { type: "application/pdf" });
}
