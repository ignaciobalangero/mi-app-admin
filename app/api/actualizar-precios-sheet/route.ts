// Archivo: /app/api/actualizar-precios-sheet/route.ts

import { NextResponse } from "next/server";
import { actualizarPreciosEnSheet, obtenerDatosDesdeSheet } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, filas } = await req.json();

    if (!sheetID || !hoja || !Array.isArray(filas)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // ✅ Traer los datos actuales del Sheet para conservar lo que no venga desde Firebase
    const datosSheet = await obtenerDatosDesdeSheet(sheetID, `${hoja}!A2:F`);

    const valores = filas.map((fila: any) => {
      const filaExistente = datosSheet.find((f) => f[0] === fila.codigo);

      return {
        codigo: fila.codigo,
        categoria: fila.categoria || filaExistente?.[1] || "",
        producto: fila.producto || filaExistente?.[2] || "",
        cantidad: fila.cantidad || filaExistente?.[3] || "",
        precioARS: fila.precioARS,
        precioUSD: fila.precioUSD ?? (filaExistente?.[5] || 0),
      };
    });

    await actualizarPreciosEnSheet({ sheetID, hoja, filas: valores });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en actualizar-precios-sheet:", err);
    return NextResponse.json({ error: "Error al actualizar precios" }, { status: 500 });
  }
}
