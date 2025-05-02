// app/api/agregar-stock/route.ts

import { NextResponse } from "next/server";
import { agregarProductoASheet } from "@/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, fila } = await req.json();

    if (!sheetID || !hoja || !fila) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    await agregarProductoASheet(sheetID, hoja, fila);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("❌ Error al guardar en Sheet:", error);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
