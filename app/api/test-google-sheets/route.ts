// /app/api/test-google-sheets/route.ts - API PARA DEBUGGING
import { NextResponse } from "next/server";
import { testConectividad, obtenerMetadataSheet } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja } = await req.json();

    console.log("🧪 INICIANDO TEST COMPLETO DE GOOGLE SHEETS");
    console.log("Parámetros:", { sheetID: sheetID?.substring(0, 20) + "...", hoja });

    // ✅ Test 1: Variables de entorno
    const email = process.env.GOOGLE_CLIENT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    
    const envTest = {
      emailExiste: !!email,
      keyExiste: !!key,
      email: email ? email.substring(0, 30) + "..." : "NO DEFINIDO",
      keyLength: key ? key.length : 0
    };

    console.log("🔧 Variables de entorno:", envTest);

    if (!email || !key) {
      return NextResponse.json({
        exito: false,
        error: "Variables de entorno faltantes",
        tests: { envTest },
        solucion: "Configura GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY en .env.local"
      }, { status: 500 });
    }

    // ✅ Test 2: Conectividad básica
    console.log("🧪 Test de conectividad básica...");
    const conectividadResult = await testConectividad(sheetID, hoja);
    
    // ✅ Test 3: Metadata detallada
    console.log("🔍 Test de metadata...");
    let metadataResult = null;
    try {
      metadataResult = await obtenerMetadataSheet(sheetID);
    } catch (error: any) {
      metadataResult = { error: error.message };
    }

    // ✅ Test 4: Permisos específicos
    console.log("🔐 Test de permisos...");
    let permisosTest = null;
    try {
      // Intentar escribir una celda temporal para verificar permisos de escritura
      const { google } = await import("googleapis");
      const { JWT } = await import("google-auth-library");
      
      const auth = new JWT({
        email: email,
        key: key.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheets = google.sheets({ version: "v4", auth });
      
      // Solo intentar leer, no escribir (más seguro)
      const testRead = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetID,
        range: `${hoja}!A1:A1`,
      });
      
      permisosTest = {
        lecturaOK: true,
        valorLeido: testRead.data.values?.[0]?.[0] || "CELDA_VACIA"
      };
      
    } catch (error: any) {
      permisosTest = {
        lecturaOK: false,
        error: error.message
      };
    }

    // 📊 Resultado consolidado
    const resultado = {
      exito: conectividadResult.exito,
      timestamp: new Date().toISOString(),
      tests: {
        envTest,
        conectividadResult,
        metadataResult,
        permisosTest
      },
      diagnostico: {
        configuracionOK: envTest.emailExiste && envTest.keyExiste,
        autenticacionOK: conectividadResult.exito,
        documentoExiste: !!metadataResult && !metadataResult.error,
        hojaExiste: metadataResult?.hojas?.some((h: any) => h.nombre === hoja),
        permisosLecturaOK: permisosTest?.lecturaOK === true
      }
    };

    // 💡 Generar recomendaciones
    const recomendaciones: string[] = [];
    
    if (!resultado.diagnostico.configuracionOK) {
      recomendaciones.push("❌ Configura las variables de entorno GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY");
    }
    
    if (!resultado.diagnostico.autenticacionOK) {
      recomendaciones.push("❌ Error de autenticación. Verifica que las credenciales sean correctas");
    }
    
    if (!resultado.diagnostico.documentoExiste) {
      recomendaciones.push("❌ No se puede acceder al documento. Verifica el SheetID");
    }
    
    if (!resultado.diagnostico.hojaExiste) {
      recomendaciones.push(`❌ La hoja "${hoja}" no existe. Hojas disponibles: ${metadataResult?.hojas?.map((h: any) => h.nombre).join(', ')}`);
    }
    
    if (!resultado.diagnostico.permisosLecturaOK) {
      recomendaciones.push(`❌ Sin permisos de lectura. Agrega ${email} al Google Sheet con rol de Editor`);
    }
    
    if (recomendaciones.length === 0) {
      recomendaciones.push("✅ Todos los tests pasaron. El sistema debería funcionar correctamente");
    }

    console.log("🏁 Test completado:", resultado.diagnostico);

    return NextResponse.json({
      ...resultado,
      recomendaciones,
      cuentaDeServicio: email
    });

  } catch (error: any) {
    console.error("❌ Error en test completo:", error);
    
    return NextResponse.json({
      exito: false,
      error: "Error ejecutando tests",
      detalles: error.message,
      stack: error.stack,
      recomendaciones: [
        "❌ Error crítico en el sistema de testing",
        "Revisa los logs del servidor para más detalles",
        "Verifica que todas las dependencias estén instaladas"
      ]
    }, { status: 500 });
  }
}