import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "../lib/googleAuth";

// Espera recibir: sheetID, hoja, codigo, cantidadVendida
export async function POST(req: Request) {
  try {
    const { sheetID, hoja, codigo, cantidadVendida } = await req.json();

    if (!sheetID || !hoja || !codigo || !cantidadVendida) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const authClient = await auth();
    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Traer los datos actuales desde la hoja
    const rango = `${hoja}!A2:F`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: rango,
    });

    const valores = res.data.values || [];

    // Buscar la fila del producto según su código
    const filaIndex = valores.findIndex((fila) => fila[0] === codigo);
    if (filaIndex === -1) {
      return NextResponse.json({ error: "Producto no encontrado en el Sheet" }, { status: 404 });
    }

    const fila = valores[filaIndex];
    const stockActual = parseInt(fila[3] || "0");
    const stockNuevo = Math.max(0, stockActual - cantidadVendida);

    // Actualizar el stock en la hoja
    const updateRange = `${hoja}!D${filaIndex + 2}`; // Columna D = stock
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetID,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[stockNuevo]],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error al actualizar stock en sheet:", err);
    return NextResponse.json({ error: "Error al actualizar stock" }, { status: 500 });
  }
}
