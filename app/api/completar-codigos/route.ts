// app/api/completar-codigos/route.ts

import { NextResponse } from "next/server";
import { completarCodigosFaltantes } from "@/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja } = await req.json();

    if (!sheetID || !hoja) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    await completarCodigosFaltantes(sheetID, hoja);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Error al completar códigos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
