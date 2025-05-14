// Archivo: /app/api/actualizar-precios-sheet/route.ts

import { NextResponse } from "next/server";
import { actualizarPreciosEnSheet } from "@/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, filas } = await req.json();

    if (!sheetID || !hoja || !Array.isArray(filas)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Lógica para actualizar los precios en la columna E (precio ARS)
    const valores = filas.map((fila: any) => ({
        codigo: fila.codigo,
        categoria: fila.categoria,
        producto: fila.producto,
        cantidad: fila.cantidad,
        precioARS: fila.precioARS,
        precioUSD: fila.precioUSD,
      }));          

    await actualizarPreciosEnSheet({ sheetID, hoja, filas: valores });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en actualizar-precios-sheet:", err);
    return NextResponse.json({ error: "Error al actualizar precios" }, { status: 500 });
  }
}
