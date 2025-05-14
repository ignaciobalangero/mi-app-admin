import { NextResponse } from "next/server";
import { obtenerDatosDesdeSheet } from "@/app/api/lib/googleSheets";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, negocioID } = await req.json();

    if (!sheetID || !hoja || !negocioID) {
      return NextResponse.json({ error: "Faltan datos necesarios" }, { status: 400 });
    }

    const rango = `${hoja}!A2:F100`;
    const datos = await obtenerDatosDesdeSheet(sheetID, rango);

    // ✅ Leer cotización manual desde Firebase
    let cotizacionUSD = 1000;
    try {
      const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/moneda`));
      if (snap.exists()) {
        const data = snap.data();
        cotizacionUSD = Number(data.dolarManual) || 1000;
      }
    } catch (err) {
      console.warn("⚠️ No se pudo obtener cotización desde Firebase, se usa default 1000");
    }

    const procesados = await Promise.all(
      datos.map(async (fila: string[]) => {
        const [codigo, categoria, producto, cantidad, precioARSRaw, precioUSDRaw] = fila;

        const precioUSD = parseFloat(precioUSDRaw) || 0;
        let precioARS = parseFloat(precioARSRaw);

        if (!precioARS && precioUSD > 0 && cotizacionUSD) {
          precioARS = Math.round((precioUSD * cotizacionUSD) / 50) * 50;
        }

        return {
          codigo,
          categoria,
          producto,
          cantidad,
          precio: precioARS,
          precioUSD,
        };
      })
    );

    return NextResponse.json({ datos: procesados });
  } catch (error: any) {
    console.error("❌ Error en /api/leer-stock:", error.message, error);
    return NextResponse.json({ error: "Error al leer Google Sheet" }, { status: 500 });
  }
}
