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

const ANCHO = 780;
const PAD = 28;
const FILA = 34;
const MARCA = 36;
const CABECERA = 108;
const PIE = 118;
const MAX_ALTO = 7500;

function recortar(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let corte = texto;
  while (corte.length > 1 && ctx.measureText(`${corte}…`).width > ancho) {
    corte = corte.slice(0, -1);
  }
  return `${corte}…`;
}

function altoDe(resumen: ResumenCostoArmado): number {
  const filas = resumen.grupos.reduce((n, g) => n + g.filas.length, 0);
  return CABECERA + resumen.grupos.length * MARCA + filas * FILA + PIE;
}

function dibujar(
  resumen: ResumenCostoArmado,
  opts: { fecha: string; parte?: string; cierre?: ResumenCostoArmado }
): HTMLCanvasElement {
  const alto = Math.max(altoDe(resumen), CABECERA + PIE);
  const canvas = document.createElement("canvas");
  const escala = 2;
  canvas.width = ANCHO * escala;
  canvas.height = alto * escala;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la imagen");
  ctx.scale(escala, escala);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ANCHO, alto);

  ctx.fillStyle = "#0e6655";
  ctx.fillRect(0, 0, ANCHO, 78);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px Arial, Helvetica, sans-serif";
  ctx.fillText("Stock de repuestos", PAD, 34);
  ctx.font = "14px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#d5f5e3";
  const sub = opts.parte ? `${opts.fecha} · ${opts.parte}` : opts.fecha;
  ctx.fillText(sub, PAD, 58);

  let y = CABECERA;
  ctx.font = "700 12px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#7f8c8d";
  ctx.fillText("MODELO", PAD, y - 10);
  ctx.textAlign = "right";
  ctx.fillText("CANT", 470, y - 10);
  ctx.fillText("COSTO", 610, y - 10);
  ctx.fillText("TOTAL", ANCHO - PAD, y - 10);
  ctx.textAlign = "left";

  for (const grupo of resumen.grupos) {
    ctx.fillStyle = "#e8f8f5";
    ctx.fillRect(PAD, y, ANCHO - PAD * 2, MARCA - 6);
    ctx.fillStyle = "#0e6655";
    ctx.font = "700 15px Arial, Helvetica, sans-serif";
    ctx.fillText(grupo.marca, PAD + 10, y + 20);
    y += MARCA;

    grupo.filas.forEach((fila, i) => {
      if (i % 2 === 0) {
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(PAD, y - 4, ANCHO - PAD * 2, FILA);
      }
      ctx.fillStyle = "#2c3e50";
      ctx.font = "14px Arial, Helvetica, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(recortar(ctx, fila.modelo, 360), PAD + 10, y + 16);
      ctx.textAlign = "right";
      ctx.fillText(String(fila.cantidad), 470, y + 16);
      ctx.fillText(dineroCosto(fila.moneda, fila.costo), 610, y + 16);
      ctx.font = "700 14px Arial, Helvetica, sans-serif";
      ctx.fillText(dineroCosto(fila.moneda, fila.total), ANCHO - PAD, y + 16);
      ctx.textAlign = "left";
      y += FILA;
    });
  }

  const pieY = alto - PIE + 16;
  ctx.fillStyle = "#0e6655";
  ctx.fillRect(0, pieY, ANCHO, PIE - 16);
  const cierre = opts.cierre || resumen;
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 16px Arial, Helvetica, sans-serif";
  ctx.fillText(opts.parte && opts.cierre ? "Total general" : "Resumen", PAD, pieY + 32);
  ctx.font = "14px Arial, Helvetica, sans-serif";
  ctx.fillText(
    `${cierre.modelos} modelos · ${cierre.unidades} unidades`,
    PAD,
    pieY + 56
  );
  ctx.textAlign = "right";
  ctx.font = "700 18px Arial, Helvetica, sans-serif";
  const totales: string[] = [];
  if (cierre.totalARS > 0 || cierre.totalUSD === 0) totales.push(dineroCosto("ARS", cierre.totalARS));
  if (cierre.totalUSD > 0) totales.push(dineroCosto("USD", cierre.totalUSD));
  ctx.fillText(totales.join("   ·   "), ANCHO - PAD, pieY + 46);
  ctx.textAlign = "left";

  return canvas;
}

function partir(resumen: ResumenCostoArmado): ResumenCostoArmado[] {
  if (altoDe(resumen) <= MAX_ALTO) return [resumen];
  const partes: ResumenCostoArmado[] = [];
  let actual: GrupoResumenCosto[] = [];
  let alto = CABECERA + PIE;

  const cerrar = () => {
    if (actual.length === 0) return;
    const parcial = armarResumenCosto(
      actual.flatMap((g) =>
        g.filas.map((f) => ({
          marca: g.marca,
          modelo: f.modelo,
          cantidad: f.cantidad,
          moneda: f.moneda,
          costo: f.costo,
        }))
      )
    );
    partes.push(parcial);
    actual = [];
    alto = CABECERA + PIE;
  };

  for (const grupo of resumen.grupos) {
    const altoGrupo = MARCA + grupo.filas.length * FILA;
    if (actual.length > 0 && alto + altoGrupo > MAX_ALTO) cerrar();
    actual.push(grupo);
    alto += altoGrupo;
  }
  cerrar();
  return partes.length ? partes : [resumen];
}

export async function imagenesResumenCosto(
  resumen: ResumenCostoArmado,
  fecha: string
): Promise<File[]> {
  const partes = partir(resumen);
  const files: File[] = [];
  for (let i = 0; i < partes.length; i++) {
    const parte = partes.length > 1 ? `parte ${i + 1} de ${partes.length}` : undefined;
    const canvas = dibujar(partes[i], {
      fecha,
      parte,
      cierre: i === partes.length - 1 ? resumen : undefined,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))), "image/png");
    });
    const nombre =
      partes.length > 1 ? `stock-repuestos-costos-${i + 1}.png` : "stock-repuestos-costos.png";
    files.push(new File([blob], nombre, { type: "image/png" }));
  }
  return files;
}
