// app/api/insertar-producto/route.ts

import { NextResponse } from "next/server";
import { insertarProductoOrdenado } from "@/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, producto } = await req.json();

    if (!sheetID || !producto) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    await insertarProductoOrdenado({ sheetID, hoja, producto });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Error en insertar-producto:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
