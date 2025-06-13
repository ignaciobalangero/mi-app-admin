// /app/api/insertar-producto/route.ts
import { NextResponse } from "next/server";
import { insertarProductoOrdenado } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, producto } = await req.json();

    if (!sheetID || !producto) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    console.log("➕ Insertando modelo ordenado:", producto.codigo);

    // ✅ CORRECCIÓN: Pasar los 3 parámetros separados
    const resultado = await insertarProductoOrdenado(sheetID, hoja, producto);

    console.log("✅ Modelo insertado exitosamente:", resultado);

    return NextResponse.json({ 
      ok: true,
      mensaje: "Modelo insertado correctamente",
      fila: resultado.fila
    });

  } catch (error: any) {
    console.error("❌ Error en insertar-producto:", error);
    return NextResponse.json({ 
      error: "Error interno",
      detalles: error.message 
    }, { status: 500 });
  }
}