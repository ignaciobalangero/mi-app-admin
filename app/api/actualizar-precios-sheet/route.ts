// /app/api/actualizar-precios-sheet/route.ts - CON DEBUG
import { NextResponse } from "next/server";
import { actualizarPreciosEnSheet, obtenerDatosDesdeSheet } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🔍 DEBUG COMPLETO
    console.log("🔍 DEBUG actualizar-precios-sheet recibido:");
    console.log("  - Body keys:", Object.keys(body));
    console.log("  - sheetID:", body.sheetID);
    console.log("  - hoja:", body.hoja);
    console.log("  - filas:", body.filas);
    console.log("  - filas es array:", Array.isArray(body.filas));
    console.log("  - filas length:", body.filas?.length);
    
    const { sheetID, hoja, filas } = body;

    if (!sheetID || !hoja || !Array.isArray(filas)) {
      console.error("❌ Validación falló:");
      console.error("  - sheetID existe:", !!sheetID);
      console.error("  - hoja existe:", !!hoja);
      console.error("  - filas es array:", Array.isArray(filas));
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    console.log("🔄 Iniciando actualización de precios...");
    console.log("📊 SheetID:", sheetID);
    console.log("📋 Hoja:", hoja);
    console.log("📦 Filas a actualizar:", filas.length);

    // ✅ Traer los datos actuales del Sheet para conservar lo que no venga desde Firebase
    const datosSheet = await obtenerDatosDesdeSheet(sheetID, `${hoja}!A2:F1000`);

    const valores = filas.map((fila: any) => {
      const filaExistente = datosSheet.find((f) => f[0] === fila.codigo);

      // 🎯 CORRECCIÓN PRINCIPAL: Manejar cantidad 0 correctamente
      let cantidad;
      if (fila.cantidad !== undefined && fila.cantidad !== null) {
        cantidad = fila.cantidad; // ✅ Esto permite 0
      } else {
        cantidad = filaExistente?.[3] || ""; // Solo usar el anterior si no viene cantidad
      }

      console.log(`🔍 Procesando ${fila.codigo}: cantidad Firebase=${fila.cantidad}, cantidad final=${cantidad}`);

      return {
        codigo: fila.codigo,
        categoria: fila.categoria || filaExistente?.[1] || "",
        modelo: fila.modelo || filaExistente?.[2] || "",
        cantidad: cantidad, // 🎯 USAR LA VARIABLE CORREGIDA
        precioARS: fila.precioARS,
        precioUSD: fila.precioUSD ?? (filaExistente?.[5] || 0),
      };
    });

    console.log("📊 Valores procesados:", valores.slice(0, 3)); // Log de los primeros 3 para debugging

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