import { NextResponse } from "next/server";
import { obtenerDatosDesdeSheet } from "@/lib/googleSheets";

export async function POST(req: Request) {
  const body = await req.json();
  const sheetID = body.sheetID;
  const hoja = body.hoja;

  if (!sheetID || !hoja) {
    return NextResponse.json({ error: "Faltan datos necesarios" }, { status: 400 });
  }

  const rango = `${hoja}!A2:I100`; // lee desde la hoja seleccionada

  const cotizacionUSD = 1000; // 🔁 esto se puede automatizar después

  try {
    const datos = await obtenerDatosDesdeSheet(sheetID, rango);

    const procesados = datos.map((fila: string[]) => {
      const [
        codigo,
        categoria,
        producto,
        cantidad,
        precioARS,
        moneda,
        costo,
        ganancia,
        mostrarPrecio,
      ] = fila;

      let precioFinal = 0;

      if (mostrarPrecio?.toLowerCase() === "si") {
        const costoNum = parseFloat(costo) || 0;
        const gananciaNum = parseFloat(ganancia) || 0;
        const monedaTipo = moneda?.toUpperCase() || "ARS";

        const costoFinal = monedaTipo === "USD"
          ? costoNum * cotizacionUSD
          : costoNum;

        const bruto = costoFinal + gananciaNum;
        precioFinal = Math.round(bruto / 50) * 50;
      }

      return {
        codigo,
        categoria,
        producto,
        cantidad,
        precioARS: precioFinal,
      };
    });

    return NextResponse.json({ datos: procesados });
  } catch (error: any) {
    console.error("❌ Error al leer Sheet:", error.message);
    return NextResponse.json({ error: "Error al leer Google Sheet" }, { status: 500 });
  }
}
