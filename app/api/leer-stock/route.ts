import { NextResponse } from "next/server";
import { obtenerDatosDesdeSheet } from "@/lib/googleSheets";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja } = await req.json();

    if (!sheetID || !hoja) {
      return NextResponse.json({ error: "Faltan datos necesarios" }, { status: 400 });
    }

    const rango = `${hoja}!A2:F100`;
    const datos = await obtenerDatosDesdeSheet(sheetID, rango);

    // Obtener cotización actual desde Bluelytics
    let cotizacionUSD = 1000;
    try {
      const res = await fetch("https://api.bluelytics.com.ar/v2/latest");
      const json = await res.json();
      cotizacionUSD = json?.blue?.value_sell || 1000;
    } catch (err) {
      console.warn("⚠️ No se pudo obtener cotización desde Bluelytics, se usa default");
    }

    const procesados = await Promise.all(
      datos.map(async (fila: string[]) => {
        const [codigo, categoria, producto, cantidad, precioARSRaw, precioUSDRaw] = fila;

        const precioUSD = parseFloat(precioUSDRaw) || 0;
        const precioARS = parseFloat(precioARSRaw) || Math.round(precioUSD * cotizacionUSD);

        // Buscar datos extras en Firebase (proveedor, precioCosto)
        let proveedor = "-";
        let precioCosto = null;
        try {
          const extraSnap = await getDocs(
            query(
              collection(db, "stockExtra"),
              where("codigo", "==", codigo)
            )
          );

          extraSnap.forEach((doc) => {
            const data = doc.data();
            proveedor = data.proveedor || "-";
            precioCosto = data.precioCosto || null;
          });
        } catch (error) {
          console.error("⚠️ No se pudo leer datos extra desde Firebase", error);
        }

        return {
          codigo,
          categoria,
          producto,
          cantidad,
          precioARS,
          precioUSD,
          proveedor,
          precioCosto,
        };
      })
    );

    return NextResponse.json({ datos: procesados });
  } catch (error: any) {
    console.error("❌ Error en /api/leer-stock:", error.message, error);
    return NextResponse.json({ error: "Error al leer Google Sheet" }, { status: 500 });
  }
}
