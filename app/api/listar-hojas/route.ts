// Archivo: /app/api/listar-hojas/route.ts

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { JWT } from "google-auth-library";

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sheetID = searchParams.get("sheetID");

  if (!sheetID) {
    return NextResponse.json({ error: "Falta sheetID" }, { status: 400 });
  }

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetID });
    const nombres = meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean);

    return NextResponse.json(nombres);
  } catch (err) {
    console.error("❌ Error al obtener nombres de hojas:", err);
    return NextResponse.json({ error: "Error al obtener hojas" }, { status: 500 });
  }
}
