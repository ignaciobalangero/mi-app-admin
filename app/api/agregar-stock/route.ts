import { NextResponse } from "next/server";
import { agregarProductoASheet } from "@/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, producto } = await req.json();

    if (!sheetID || !hoja || !producto) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Log de verificación
    console.log("📥 Recibiendo producto:", producto);
    console.log("📄 Hoja:", hoja, "🆔 SheetID:", sheetID);

    const fila = [
      producto.codigo || "",
      producto.categoria || "",
      producto.producto || "",
      producto.cantidad || 0,
      producto.precio || 0,
      producto.moneda || "ARS",
      producto.precio || 0, // repetido como costo por ahora si no viene `costo`
      producto.ganancia || 0,
      producto.mostrar || "no",
    ];

    console.log("🧾 Fila a insertar:", fila);

    try {
      await agregarProductoASheet(sheetID, hoja, fila);
    } catch (err) {
      console.error("❌ Error al insertar en Google Sheets:", err);
      return NextResponse.json({ error: "Error al insertar en Google Sheets" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("❌ Error general:", error);
    return NextResponse.json({ error: "Error interno en el servidor" }, { status: 500 });
  }
}
