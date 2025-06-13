// /app/api/leer-stock/route.ts - VERSIÓN CORREGIDA SIN TEMP
import { NextResponse } from "next/server";
import { obtenerDatosDesdeSheet, obtenerMetadataSheet, testConectividad } from "@/app/api/lib/googleSheets";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const startTime = Date.now();
    const { sheetID, hoja, negocioID } = await req.json();

    // ✅ Validación inicial robusta
    if (!sheetID || !hoja || !negocioID) {
      return NextResponse.json({ 
        error: "Faltan datos necesarios",
        detalles: {
          sheetID: !!sheetID,
          hoja: !!hoja,
          negocioID: !!negocioID
        }
      }, { status: 400 });
    }

    console.log("🚀 INICIO - Importación robusta de Google Sheets", {
      sheetID: sheetID.substring(0, 20) + "...", // Solo parte del ID por seguridad
      hoja,
      negocioID,
      timestamp: new Date().toISOString()
    });

    // 🧪 PASO 1: Test de conectividad básica
    console.log("🧪 PASO 1: Verificando conectividad...");
    const testResult = await testConectividad(sheetID, hoja);
    
    if (!testResult.exito) {
      console.error("❌ Test de conectividad falló:", testResult.error);
      return NextResponse.json({
        error: "Error de conectividad con Google Sheets",
        detalles: testResult.error,
        solucion: getSolucionError(testResult.error)
      }, { status: 500 });
    }
    
    console.log("✅ PASO 1: Conectividad exitosa");

    // 🔍 PASO 2: Obtener metadata del documento
    console.log("🔍 PASO 2: Obteniendo metadata del documento...");
    const metadata = await obtenerMetadataSheet(sheetID);
    
    // Verificar que la hoja existe
    const hojaExiste = metadata.hojas?.some(h => h.nombre === hoja);
    if (!hojaExiste) {
      return NextResponse.json({
        error: `La hoja "${hoja}" no existe en el documento`,
        hojasDisponibles: metadata.hojas?.map(h => h.nombre) || [],
        solucion: "Verifica el nombre exacto de la pestaña (sensible a mayúsculas/minúsculas)"
      }, { status: 400 });
    }
    
    console.log("✅ PASO 2: Metadata obtenida, hoja existe");

    // 💰 PASO 3: Obtener cotización desde Firebase
    console.log("💰 PASO 3: Obteniendo cotización USD...");
    let cotizacionUSD = 1000;
    try {
      const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/moneda`));
      if (snap.exists()) {
        const data = snap.data();
        cotizacionUSD = Number(data.dolarManual) || 1000;
      }
      console.log(`✅ PASO 3: Cotización obtenida: $${cotizacionUSD}`);
    } catch (err) {
      console.warn("⚠️ PASO 3: Error obteniendo cotización, usando default 1000:", err);
    }

    // 📊 PASO 4: Leer datos del Sheet - INCLUYENDO CÓDIGOS
    console.log("📊 PASO 4: Leyendo datos del Sheet...");
    
    // 🆕 CAMBIO: Leer siempre desde A (códigos) hasta F
    const rango = `${hoja}!A2:F1000`;
    
    let datos: any[] = [];
    
    try {
      console.log(`🔄 Leyendo rango: ${rango}`);
      datos = await obtenerDatosDesdeSheet(sheetID, rango);
      console.log(`✅ Datos leídos: ${datos.length} filas`);
    } catch (error: any) {
      console.error(`❌ Error leyendo ${rango}:`, error.message);
      return NextResponse.json({
        error: "No se pudieron leer datos del Sheet",
        detalles: error.message,
        solucion: "Verifica que la hoja tenga datos y no esté protegida"
      }, { status: 500 });
    }
    
    if (datos.length === 0) {
      return NextResponse.json({
        error: "No hay datos en el Sheet",
        rango: rango,
        solucion: "Verifica que la hoja tenga datos desde la fila 2"
      }, { status: 400 });
    }

    // 🔄 PASO 5: Procesar datos SIN generar códigos temporales
    console.log("🔄 PASO 5: Procesando datos...");
    
    const procesados = datos
      .filter((fila: any) => {
        if (!fila || !Array.isArray(fila)) return false;
        
        // Debe tener al menos código o modelo
        const codigo = fila[0]?.toString().trim();
        const modelo = fila[2]?.toString().trim(); // Columna C
        
        return !!(codigo || modelo);
      })
      .map((fila: any[], index: number) => {
        try {
          // Estructura: A=Código, B=Categoría, C=Modelo, D=Cantidad, E=PrecioARS, F=PrecioUSD
          const codigo = (fila[0] || "").toString().trim();
          const categoria = (fila[1] || "").toString().trim();
          const modelo = (fila[2] || "").toString().trim();
          const cantidadRaw = fila[3];
          const precioARSRaw = fila[4];
          const precioUSDRaw = fila[5];
          
          // 🚫 SKIP modelos sin código válido
          if (!codigo || codigo === "") {
            console.warn(`⚠️ Fila ${index + 2}: Sin código, omitiendo`);
            return null;
          }

          // 🚫 SKIP códigos que empiecen con TEMP (por si quedaron)
          if (codigo.startsWith('TEMP_')) {
            console.warn(`⚠️ Fila ${index + 2}: Código temporal detectado, omitiendo: ${codigo}`);
            return null;
          }
          
          // Procesar cantidad
          let cantidad = 0;
          if (cantidadRaw !== undefined && cantidadRaw !== null) {
            const cantidadLimpia = cantidadRaw.toString().replace(/[^\d.-]/g, '');
            cantidad = parseInt(cantidadLimpia) || 0;
          }
          
          // Procesar precios
          let precioUSD = 10; // Default
          let precioARS = 0;
          
          if (precioUSDRaw !== undefined && precioUSDRaw !== null) {
            precioUSD = parseFloat(precioUSDRaw.toString().replace(/[^\d.-]/g, '')) || 10;
          }
          
          if (precioARSRaw !== undefined && precioARSRaw !== null) {
            precioARS = parseFloat(precioARSRaw.toString().replace(/[^\d.-]/g, '')) || 0;
          }
          
          // Si no hay precio ARS, calcularlo
          if (precioARS === 0) {
            precioARS = Math.round(precioUSD * cotizacionUSD);
          }
          
          return {
            codigo: codigo, // 🆕 USAR CÓDIGO REAL DEL SHEET
            categoria: categoria || "Sin categoría",
            modelo: modelo || "Sin nombre",
            producto: modelo || "Sin nombre", // 🔄 MANTENER COMPATIBILIDAD HACIA ATRÁS
            cantidad: Math.max(0, cantidad),
            precio: precioARS,
            precioUSD,
            filaOriginal: index + 2
          };
          
        } catch (error: any) {
          console.warn(`⚠️ Error procesando fila ${index}:`, error.message, fila);
          return null;
        }
      })
      .filter(Boolean); // Remover elementos null

    const tiempoTotal = Date.now() - startTime;
    
    console.log(`✅ PROCESO COMPLETADO en ${tiempoTotal}ms`, {
      totalProcesados: procesados.length,
      cotizacionUsada: cotizacionUSD,
      rangoUsado: rango
    });

    return NextResponse.json({ 
      datos: procesados,
      meta: {
        total: procesados.length,
        cotizacionUsada: cotizacionUSD,
        rango: rango,
        tiempoMs: tiempoTotal,
        metadata: metadata,
        modo: "SIN_TEMPORALES_V3"
      },
      mensaje: `✅ ${procesados.length} modelos importados exitosamente (sin códigos temporales)`
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO en /api/leer-stock:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: "Error crítico al leer Google Sheet",
      detalles: error.message,
      tipo: error.name,
      solucion: getSolucionError(error.message),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 🔧 Función auxiliar para sugerir soluciones
function getSolucionError(mensaje: string): string {
  if (mensaje.includes("not found")) {
    return "Verifica que el SheetID sea correcto y que el documento exista.";
  } else if (mensaje.includes("permission") || mensaje.includes("access")) {
    return "Agrega la cuenta de servicio al Google Sheet con permisos de Editor.";
  } else if (mensaje.includes("not supported")) {
    return "El documento puede ser un Excel importado. Crea un Google Sheets nativo y copia el contenido.";
  } else if (mensaje.includes("rate limit") || mensaje.includes("quota")) {
    return "Límite de API alcanzado. Espera unos minutos antes de intentar nuevamente.";
  } else if (mensaje.includes("network") || mensaje.includes("timeout")) {
    return "Error de conexión. Verifica tu conexión a internet e intenta nuevamente.";
  }
  
  return "Error no identificado. Revisa los logs para más detalles.";
}