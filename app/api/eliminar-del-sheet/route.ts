import { NextResponse } from "next/server";
import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });

function normalizar(str: string): string {
    return str
      .normalize("NFKD") // separa caracteres acentuados
      .replace(/[\u0300-\u036f]/g, "") // elimina los acentos
      .replace(/\s+/g, "") // elimina todos los espacios, tabs, saltos de línea
      .toLowerCase(); // pasa todo a minúsculas
  }
   
export async function POST(req: Request) {
  try {
    const { sheetID, hoja, codigo } = await req.json();

    if (!sheetID || !hoja || !codigo) {
      console.warn("🚫 Faltan datos en el body:", { sheetID, hoja, codigo });
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    console.log("📌 Eliminando código:", codigo);

    const rango = `${hoja}!A2:A1000`; // Asume que los códigos están en la columna A
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: rango,
    });

    const filas = res.data.values || [];

    console.log("📋 Códigos en el Sheet:");
    filas.forEach((fila, i) => {
      console.log(`Fila ${i + 2}: "${fila[0]}"`);
    });

    const filaIndex = filas.findIndex((fila) => fila[0]?.trim() === codigo.trim());

    if (filaIndex === -1) {
      console.warn(`⚠️ Código "${codigo}" no encontrado en el Sheet`);
      return NextResponse.json({ error: "No se encontró el código en el Sheet" }, { status: 404 });
    }

    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetID });
    console.log("🟡 hoja recibida desde el frontend:", JSON.stringify(hoja));
console.log("📄 Títulos reales de hojas en el Sheet:");
meta.data.sheets?.forEach((s) =>
    console.log("-", JSON.stringify(s.properties?.title?.trim()))
  );
   // Función para normalizar nombres de hojas (elimina acentos, espacios invisibles, etc.)
  
  // Normalizamos el nombre recibido
  const hojaNormalizada = normalizar(hoja);
  // DEBUG: mostramos comparación real entre hoja recibida y cada hoja del Sheet
meta.data.sheets?.forEach((s) => {
    const real = s.properties?.title || "";
    const normalizadoReal = normalizar(real);
    console.log(`🧪 Comparando hoja: original=${JSON.stringify(real)} normalizada=${normalizadoReal}`);
  });
  
  console.log(`🧪 hoja desde frontend normalizada=${hojaNormalizada}`);
  meta.data.sheets?.forEach((s) => {
    console.log("🧾 Sheet:", {
      title: s.properties?.title,
      sheetId: s.properties?.sheetId,
    });
  });
  
  // Buscamos en el Sheet usando la comparación blindada
  const sheetInfo = meta.data.sheets?.find(
    (s) => normalizar(s.properties?.title || "") === hojaNormalizada
  );
  
  const sheetId = sheetInfo?.properties?.sheetId;
  

  if (sheetId === undefined) {
      console.warn("❌ No se encontró el ID de la hoja");
      return NextResponse.json({ error: "Sheet no encontrada" }, { status: 404 });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: filaIndex + 1, // +1 porque empieza desde A2
                endIndex: filaIndex + 2,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ Código "${codigo}" eliminado en fila ${filaIndex + 2}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error eliminando fila del Sheet:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
