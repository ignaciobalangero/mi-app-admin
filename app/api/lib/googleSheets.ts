// /app/api/lib/googleSheets.ts - VERSIÓN COMPLETA CON TODAS LAS FUNCIONES
import { google } from "googleapis";
import { JWT } from "google-auth-library";

// 🔧 Configuración robusta
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// ⏱️ Función para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 🧹 Función para sanitizar valores antes de escribir al Sheet
function sanitizarValorParaSheet(valor: any): string {
  if (!valor) return "";
  
  return valor.toString()
    .replace(/\//g, '-')          // / → -
    .replace(/"/g, '')            // Remover comillas dobles
    .replace(/'/g, '')            // Remover comillas simples  
    .replace(/&/g, 'y')           // & → y
    .replace(/\\/g, '-')          // \ → -
    .replace(/\|/g, '-')          // | → -
    .replace(/\*/g, '')           // Remover asteriscos
    .replace(/\?/g, '')           // Remover signos de pregunta
    .replace(/</g, '')            // Remover menor que
    .replace(/>/g, '')            // Remover mayor que
    .replace(/:/g, '-')           // : → -
    .replace(/;/g, '-')           // ; → -
    .replace(/\[/g, '(')          // [ → (
    .replace(/\]/g, ')')          // ] → )
    .replace(/\{/g, '(')          // { → (
    .replace(/\}/g, ')')          // } → )
    .replace(/\s+/g, ' ')         // Múltiples espacios → uno solo
    .trim();
}

// 🔐 Función para crear cliente autenticado
function createSheetsClient() {
  try {
    const email = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !privateKey) {
      throw new Error("Faltan variables de entorno: GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY");
    }

    console.log("🔐 Creando cliente con email:", email);

    const auth = new JWT({
      email: email,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: SCOPES,
    });

    return google.sheets({ version: "v4", auth });
  } catch (error: any) {
    console.error("❌ Error creando cliente Google Sheets:", error.message);
    throw new Error(`Error de autenticación: ${error.message}`);
  }
}

// 🔍 Función para obtener metadatos del documento
export async function obtenerMetadataSheet(sheetID: string) {
  const sheets = createSheetsClient();
  
  try {
    console.log("🔍 Obteniendo metadata para SheetID:", sheetID);
    
    const response = await sheets.spreadsheets.get({ 
      spreadsheetId: sheetID 
    });
    
    const metadata = {
      titulo: response.data.properties?.title,
      hojas: response.data.sheets?.map(sheet => ({
        nombre: sheet.properties?.title,
        id: sheet.properties?.sheetId,
        filas: sheet.properties?.gridProperties?.rowCount,
        columnas: sheet.properties?.gridProperties?.columnCount
      }))
    };
    
    console.log("✅ Metadata obtenida:", metadata);
    return metadata;
    
  } catch (error: any) {
    console.error("❌ Error obteniendo metadata:", error.message);
    
    if (error.message.includes("not found")) {
      throw new Error("SheetID no encontrado. Verifica el ID del documento.");
    } else if (error.message.includes("permission")) {
      throw new Error("Sin permisos. Agrega la cuenta de servicio al Sheet.");
    } else if (error.message.includes("not supported")) {
      throw new Error("Operación no soportada. El documento puede estar corrupto o ser de tipo incorrecto.");
    }
    
    throw error;
  }
}

// 📊 Función principal para obtener datos con reintentos
export async function obtenerDatosDesdeSheet(sheetID: string, rango: string, retry = 0): Promise<any[]> {
  const sheets = createSheetsClient();
  
  try {
    console.log(`📊 Intento ${retry + 1}/${MAX_RETRIES + 1} - Leyendo rango: ${rango}`);
    
    // Validar parámetros
    if (!sheetID || !rango) {
      throw new Error("SheetID y rango son requeridos");
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: rango,
      valueRenderOption: 'UNFORMATTED_VALUE', // Obtener valores sin formato
      dateTimeRenderOption: 'FORMATTED_STRING'
    });
    
    const valores = response.data.values || [];
    
    console.log(`✅ Datos obtenidos exitosamente:`, {
      filas: valores.length,
      columnasPromedio: valores.length > 0 ? valores[0]?.length || 0 : 0,
      muestraData: valores.slice(0, 2)
    });
    
    return valores;
    
  } catch (error: any) {
    console.error(`❌ Error en intento ${retry + 1}:`, error.message);
    
    // Análisis específico del error
    if (error.message.includes("not supported for this document")) {
      // Intentar con diferentes opciones de renderizado
      if (retry === 0) {
        console.log("🔄 Reintentando con opciones diferentes...");
        await delay(RETRY_DELAY);
        return obtenerDatosSimplificado(sheetID, rango);
      }
    }
    
    // Manejo de rate limiting
    if (error.message.includes("rate limit") || error.message.includes("quota")) {
      if (retry < MAX_RETRIES) {
        const delayTime = RETRY_DELAY * Math.pow(2, retry); // Backoff exponencial
        console.log(`⏱️ Rate limit detectado. Esperando ${delayTime}ms antes del reintento...`);
        await delay(delayTime);
        return obtenerDatosDesdeSheet(sheetID, rango, retry + 1);
      }
    }
    
    // Reintentos para errores temporales
    if (retry < MAX_RETRIES && (
      error.message.includes("timeout") ||
      error.message.includes("network") ||
      error.message.includes("internal error")
    )) {
      await delay(RETRY_DELAY * (retry + 1));
      return obtenerDatosDesdeSheet(sheetID, rango, retry + 1);
    }
    
    // Errores definitivos sin reintento
    if (error.message.includes("not found")) {
      throw new Error("SheetID no encontrado. Verifica el ID del documento.");
    } else if (error.message.includes("permission")) {
      throw new Error("Sin permisos. Agrega la cuenta de servicio al Sheet con permisos de Editor.");
    } else if (error.message.includes("not supported")) {
      throw new Error("El documento no es compatible. Puede ser un Excel importado o tener formato no soportado.");
    }
    
    throw new Error(`Error después de ${retry + 1} intentos: ${error.message}`);
  }
}

// 📊 Función simplificada como fallback
async function obtenerDatosSimplificado(sheetID: string, rango: string): Promise<any[]> {
  const sheets = createSheetsClient();
  
  try {
    console.log("🔄 Usando método simplificado...");
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: rango
      // Sin opciones adicionales de renderizado
    });
    
    return response.data.values || [];
    
  } catch (error: any) {
    console.error("❌ Error en método simplificado:", error.message);
    throw error;
  }
}

// 🧪 Función de test de conectividad
export async function testConectividad(sheetID: string, nombreHoja: string) {
  try {
    console.log("🧪 Iniciando test de conectividad...");
    
    // Test 1: Metadata
    const metadata = await obtenerMetadataSheet(sheetID);
    
    // Test 2: Una celda
    const unaCelda = await obtenerDatosDesdeSheet(sheetID, `${nombreHoja}!A1`);
    
    // Test 3: Rango pequeño
    const rangoSmall = await obtenerDatosDesdeSheet(sheetID, `${nombreHoja}!A1:C3`);
    
    return {
      exito: true,
      metadata,
      testUnaCelda: unaCelda,
      testRangoSmall: rangoSmall,
      mensaje: "Conectividad exitosa"
    };
    
  } catch (error: any) {
    return {
      exito: false,
      error: error.message,
      mensaje: "Falla in conectividad"
    };
  }
}

// 📝 Función para agregar modelo simple (existente)
export async function agregarProductoASheet(
  sheetID: string,
  hoja: string,
  fila: string[]
) {
  const sheets = createSheetsClient();
  const rango = `${hoja}!A1`;
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetID,
    range: rango,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [fila],
    },
  });
}

// 🆕 FUNCIÓN AGREGADA: actualizarFilaEnSheet
export async function actualizarFilaEnSheet({
  sheetID,
  hoja,
  filaIndex,
  valores,
}: {
  sheetID: string;
  hoja: string;
  filaIndex: number;
  valores: string[];
}) {
  const sheets = createSheetsClient();
  
  try {
    console.log(`🔄 Actualizando fila ${filaIndex} en hoja ${hoja}`);
    
    // El rango será desde la columna A hasta la F (o las que necesites)
    const rango = `${hoja}!A${filaIndex}:F${filaIndex}`;

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetID,
      range: rango,
      valueInputOption: 'RAW',
      requestBody: {
        values: [valores], // Array de valores para la fila
      },
    });

    console.log(`✅ Fila ${filaIndex} actualizada exitosamente en ${hoja}`);
    return response.data;
    
  } catch (error: any) {
    console.error(`❌ Error al actualizar fila ${filaIndex} en Sheet:`, error.message);
    throw new Error(`Error actualizando fila: ${error.message}`);
  }
}

// 🆕 FUNCIÓN FALTANTE: insertarProductoOrdenado
export async function insertarProductoOrdenado(
  sheetID: string,
  hoja: string,
  producto: {
    codigo: string;
    categoria?: string;
    modelo?: string;
    nombre?: string;
    cantidad?: string | number;
    precioARS?: string | number;
    precioUSD?: string | number;
  }
) {
  const sheets = createSheetsClient();
  
  try {
    console.log("🔢 Insertando modelo ordenado:", producto.codigo);

    // Leer todas las filas para encontrar dónde insertar
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: `${hoja}!A2:A1000`, // Solo códigos para ordenar
    });

    const filasExistentes = res.data.values || [];
    const codigos = filasExistentes.map(fila => fila[0] || "").filter(codigo => codigo.trim() !== "");

    // Encontrar posición para insertar (ordenado alfabéticamente)
    let posicionInsertar = codigos.length + 2; // Por defecto al final (+2 por header)
    
    for (let i = 0; i < codigos.length; i++) {
      if (producto.codigo.localeCompare(codigos[i]) < 0) {
        posicionInsertar = i + 2; // +2 por el header
        break;
      }
    }

    console.log(`📍 Insertando en posición: ${posicionInsertar}`);

    // Obtener metadata del sheet para el ID
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetID });
    const sheetInfo = meta.data.sheets?.find(s => s.properties?.title === hoja);
    const sheetId = sheetInfo?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("No se encontró el ID de la hoja");
    }

    // Insertar fila vacía
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: posicionInsertar - 1,
                endIndex: posicionInsertar,
              },
            },
          },
        ],
      },
    });

    // Agregar datos a la fila insertada
    const filaCompleta = [
      producto.codigo,
      producto.categoria || "",
      producto.modelo || producto.nombre || "",
      producto.cantidad || "",
      producto.precioARS || "",
      producto.precioUSD || "",
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetID,
      range: `${hoja}!A${posicionInsertar}:F${posicionInsertar}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [filaCompleta],
      },
    });

    console.log(`✅ Modelo insertado ordenadamente en fila ${posicionInsertar}`);
    return { success: true, fila: posicionInsertar };

  } catch (error: any) {
    console.error("❌ Error insertando modelo ordenado:", error);
    throw new Error(`Error al insertar modelo: ${error.message}`);
  }
}

// 🆕 FUNCIÓN FALTANTE: actualizarPreciosEnSheet
export async function actualizarPreciosEnSheet(
  sheetID: string,
  hoja: string,
  filas: Array<{
    codigo: string;
    categoria?: string;
    modelo?: string;
    cantidad?: string | number;
    precioARS?: string | number;
    precioUSD?: string | number;
  }>
) {
  const sheets = createSheetsClient();
  
  try {
    console.log("🔄 Actualizando precios en Sheet:", sheetID, "hoja:", hoja);

    // Obtener datos actuales del sheet
    const rango = `${hoja}!A2:F1000`; // Asumiendo columnas A-F
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: rango,
    });

    const filasExistentes = res.data.values || [];
    const actualizaciones: any[] = [];

    // Para cada fila que queremos actualizar
    filas.forEach((filaNew) => {
      // Buscar la fila existente por código
      const indiceExistente = filasExistentes.findIndex(
        (filaExistente) => filaExistente[0]?.trim() === filaNew.codigo?.trim()
      );

      if (indiceExistente !== -1) {
        // Fila encontrada - prepararla para actualización
        const numeroFila = indiceExistente + 2; // +2 porque empezamos en A2
        
        // Crear fila actualizada manteniendo valores existentes si no se proveen nuevos
        const filaExistente = filasExistentes[indiceExistente];
        const filaActualizada = [
          filaNew.codigo || filaExistente[0] || "",           // A: Código
          filaNew.categoria || filaExistente[1] || "",        // B: Categoría  
          filaNew.modelo || filaExistente[2] || "",           // C: Modelo
          filaNew.cantidad || filaExistente[3] || "",         // D: Cantidad
          filaNew.precioARS || filaExistente[4] || "",        // E: Precio ARS
          filaNew.precioUSD || filaExistente[5] || "",        // F: Precio USD
        ];

        actualizaciones.push({
          range: `${hoja}!A${numeroFila}:F${numeroFila}`,
          values: [filaActualizada],
        });
      } else {
        console.warn(`⚠️ Código ${filaNew.codigo} no encontrado en el Sheet`);
      }
    });

    if (actualizaciones.length === 0) {
      console.warn("⚠️ No hay actualizaciones para realizar");
      return { success: true, actualizados: 0, mensaje: "No hay cambios para aplicar" };
    }

    // Ejecutar actualizaciones en batch
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: actualizaciones,
      },
    });

    console.log(`✅ ${actualizaciones.length} filas actualizadas en el Sheet`);
    
    return {
      success: true,
      actualizados: actualizaciones.length,
      mensaje: `${actualizaciones.length} modelos actualizados correctamente`
    };

  } catch (error: any) {
    console.error("❌ Error actualizando precios en Sheet:", error);
    throw new Error(`Error al actualizar precios: ${error.message}`);
  }
}

// 🔧 Función para completar códigos faltantes MEJORADA CON SANITIZACIÓN
export async function completarCodigosFaltantes(sheetID: string, hoja: string) {
  const sheets = createSheetsClient();
  
  try {
    console.log("🔧 Completando códigos faltantes con sanitización...");
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: `${hoja}!A2:Z`,
    });
    
    const filas = res.data.values || [];
    const letra = hoja.trim().charAt(0).toUpperCase();
    let contador = 1001;
    const updates: { range: string; values: string[][] }[] = [];
    
    filas.forEach((fila, i) => {
      const codigoActual = fila[0];
      if (!codigoActual || codigoActual.trim() === "") {
        const nuevoCodigo = `${letra}-${contador}`;
        
        // 🧹 SANITIZAR TODA LA FILA antes de actualizar
        const filaSanitizada = fila.map(valor => sanitizarValorParaSheet(valor));
        filaSanitizada[0] = nuevoCodigo; // Asignar el nuevo código
        
        updates.push({ 
          range: `${hoja}!A${i + 2}:${String.fromCharCode(65 + filaSanitizada.length - 1)}${i + 2}`, 
          values: [filaSanitizada] 
        });
        contador++;
      }
    });
    
    if (updates.length === 0) {
      console.log("✅ No hay códigos para completar");
      return { success: true, mensaje: "No hay códigos para completar" };
    }
    
    console.log(`🔄 Actualizando ${updates.length} filas con códigos sanitizados...`);
    
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetID,
      requestBody: { 
        data: updates, 
        valueInputOption: "USER_ENTERED" 
      },
    });
    
    console.log(`✅ ${updates.length} códigos completados y sanitizados`);
    return { 
      success: true, 
      completados: updates.length,
      mensaje: `${updates.length} códigos completados exitosamente` 
    };
    
  } catch (error: any) {
    console.error("❌ Error completando códigos:", error);
    throw new Error(`Error al completar códigos: ${error.message}`);
  }
}