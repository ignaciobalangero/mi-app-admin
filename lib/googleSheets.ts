// lib/googleSheets.ts

import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });

// ✅ Leer datos desde una hoja específica
export async function obtenerDatosDesdeSheet(sheetID: string, rango: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: rango,
  });
  return res.data.values || [];
}

export async function agregarProductoASheet(
    sheetID: string,
    hoja: string,
    fila: string[]
  ) {
  

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

// ✅ Obtener sheetId automáticamente (por nombre o usa la primera)
export async function obtenerSheetId(sheetID: string, hojaPreferida = "Stock") {
  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetID });
  const hojas = res.data.sheets;

  if (!hojas || hojas.length === 0) {
    throw new Error("No se encontraron pestañas en la hoja.");
  }

  const hoja = hojas.find((h) => h.properties?.title === hojaPreferida);
  return hoja?.properties?.sheetId ?? hojas[0].properties?.sheetId;
}

// ✅ Insertar producto ordenado por modelo (por ejemplo: A54 entre A52 y A56)
export async function insertarProductoOrdenado({
  sheetID,
  producto,
}: {
  sheetID: string;
  producto: {
    codigo: string;
    producto: string;
    marca: string;
    modelo: string;
    cantidad: number;
    precio: number;
    moneda: string;
  };
}) {
  const rangoLectura = "Stock!A2:G";
  const sheetId = await obtenerSheetId(sheetID);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: rangoLectura,
  });

  const filas = res.data.values || [];

  const index = filas.findIndex((f) => f[3] && f[3] > producto.modelo); // columna D = modelo
  const insertIndex = index === -1 ? filas.length + 1 : index + 1;

  // Insertar fila vacía
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetID,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: insertIndex,
              endIndex: insertIndex + 1,
            },
            inheritFromBefore: true,
          },
        },
      ],
    },
  });

  // Escribir datos del producto
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetID,
    range: `Stock!A${insertIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          producto.codigo,
          producto.producto,
          producto.marca,
          producto.modelo,
          producto.cantidad,
          producto.precio,
          producto.moneda,
        ],
      ],
    },
  });
}

// ✅ Completar códigos faltantes en orden por fila (ej: M-1001, M-1002...)
export async function completarCodigosFaltantes(sheetID: string, hoja: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: `${hoja}!A2:Z`, // lee desde fila 2
  });

  const filas = res.data.values || [];
  const letra = hoja.trim().charAt(0).toUpperCase();
  let contador = 1001;

  const updates: { range: string; values: string[][] }[] = [];

  filas.forEach((fila, i) => {
    const codigoActual = fila[0]; // columna A
    if (!codigoActual || codigoActual.trim() === "") {
      const nuevoCodigo = `${letra}-${contador}`;
      updates.push({
        range: `${hoja}!A${i + 2}`,
        values: [[nuevoCodigo]],
      });
      contador++;
    }
  });

  if (updates.length === 0) {
    console.log("✅ No hay códigos faltantes.");
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetID,
    requestBody: {
      data: updates,
      valueInputOption: "USER_ENTERED",
    },
  });

  console.log(`✅ Se completaron ${updates.length} códigos faltantes`);
}
