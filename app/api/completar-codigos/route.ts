// app/api/completar-codigos/route.ts
import { NextResponse } from "next/server";
import { completarCodigosFaltantes } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    console.log("🔧 Iniciando completar códigos API...");
    
    const { sheetID, hoja } = await req.json();

    if (!sheetID || !hoja) {
      console.error("❌ Faltan parámetros requeridos");
      return NextResponse.json({ 
        error: "Faltan datos requeridos: sheetID y hoja" 
      }, { status: 400 });
    }

    console.log(`🔄 Completando códigos para Sheet: ${sheetID}, Hoja: ${hoja}`);

    // 🔧 Usar la función mejorada que ahora devuelve resultado
    const resultado = await completarCodigosFaltantes(sheetID, hoja);

    console.log("✅ Códigos completados exitosamente:", resultado);

    return NextResponse.json({ 
      ok: true,
      success: resultado.success,
      completados: resultado.completados || 0,
      mensaje: resultado.mensaje || "Códigos completados correctamente"
    });

  } catch (error: any) {
    console.error("❌ Error detallado al completar códigos:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Mensajes de error más específicos
    let mensajeError = "Error interno del servidor";
    
    if (error.message.includes("not supported for this document")) {
      mensajeError = "El documento no es compatible. Prueba hacer una copia del Sheet en Google Sheets.";
    } else if (error.message.includes("permission")) {
      mensajeError = "Sin permisos. Verifica que la cuenta de servicio tenga acceso de Editor.";
    } else if (error.message.includes("not found")) {
      mensajeError = "Sheet no encontrado. Verifica el ID del documento.";
    } else if (error.message.includes("rate limit")) {
      mensajeError = "Límite de solicitudes excedido. Intenta de nuevo en unos minutos.";
    }

    return NextResponse.json({ 
      error: mensajeError,
      detalles: error.message,
      success: false
    }, { status: 500 });
  }
}