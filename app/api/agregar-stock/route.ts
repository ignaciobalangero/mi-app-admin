import { NextResponse } from "next/server";
import { agregarProductoASheet } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, producto } = await req.json();

    if (!sheetID || !hoja || !producto) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 📦 Preparar valores
    const precioUSD = Number(producto.precioUSD) || 0;
    const cotizacion = Number(producto.cotizacion) || 1000;

    const precioARS =
      producto.moneda === "USD" && precioUSD > 0
        ? precioUSD * cotizacion
        : Number(producto.precio) || 0;

    // ✅ Solo insertamos columnas necesarias en el sheet
    const fila = [
      producto.codigo || "",
      producto.categoria || "",
      producto.modelo || "",
      producto.cantidad || 0,
      precioARS,
      precioUSD,
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