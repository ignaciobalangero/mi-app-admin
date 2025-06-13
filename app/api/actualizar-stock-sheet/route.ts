// /app/api/actualizar-precios-sheet/route.ts
import { NextResponse } from "next/server";
import { actualizarPreciosEnSheet, obtenerDatosDesdeSheet } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, filas } = await req.json();

    if (!sheetID || !hoja || !Array.isArray(filas)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    console.log("🔄 Iniciando actualización de precios...");
    console.log("📊 SheetID:", sheetID);
    console.log("📋 Hoja:", hoja);
    console.log("📦 Modelos a actualizar:", filas.length);

    // ✅ Traer los datos actuales del Sheet para conservar lo que no venga desde Firebase
    const datosSheet = await obtenerDatosDesdeSheet(sheetID, `${hoja}!A2:F1000`);

    const valores = filas.map((fila: any) => {
      const filaExistente = datosSheet.find((f) => f[0] === fila.codigo);

      return {
        codigo: fila.codigo,
        categoria: fila.categoria || filaExistente?.[1] || "",
        modelo: fila.modelo || filaExistente?.[2] || "",
        cantidad: fila.cantidad || filaExistente?.[3] || "",
        precioARS: fila.precioARS,
        precioUSD: fila.precioUSD ?? (filaExistente?.[5] || 0),
      };
    });

    // ✅ CORRECCIÓN: Pasar los 3 parámetros separados
    const resultado = await actualizarPreciosEnSheet(sheetID, hoja, valores);

    console.log("✅ Actualización completada:", resultado);

    return NextResponse.json({ 
      ok: true, 
      mensaje: resultado.mensaje,
      actualizados: resultado.actualizados
    });

  } catch (err: any) {
    console.error("❌ Error en actualizar-precios-sheet:", err);
    return NextResponse.json({ 
      error: "Error al actualizar precios",
      detalles: err.message 
    }, { status: 500 });
  }
}