// lib/googleSheets.ts (actualizado)

import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });

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

export async function obtenerSheetId(sheetID: string, hojaPreferida = "Stock") {
  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetID });
  const hojas = res.data.sheets;
  if (!hojas || hojas.length === 0) throw new Error("No se encontraron pestañas en la hoja.");
  const hoja = hojas.find((h) => h.properties?.title === hojaPreferida);
  return hoja?.properties?.sheetId ?? hojas[0].properties?.sheetId;
}

export async function insertarProductoOrdenado({
  sheetID,
  hoja,
  producto,
}: {
  sheetID: string;
  hoja: string;
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
  const rangoLectura = `${hoja}!A2:G`;
  const sheetId = await obtenerSheetId(sheetID, hoja);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: rangoLectura,
  });
  const filas = res.data.values || [];
  const index = filas.findIndex((f) => f[3] && f[3] > producto.modelo);
  const insertIndex = index === -1 ? filas.length + 1 : index + 1;

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

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetID,
    range: `${hoja}!A${insertIndex + 1}`,
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

export async function completarCodigosFaltantes(sheetID: string, hoja: string) {
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
      updates.push({ range: `${hoja}!A${i + 2}`, values: [[nuevoCodigo]] });
      contador++;
    }
  });
  if (updates.length === 0) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetID,
    requestBody: { data: updates, valueInputOption: "USER_ENTERED" },
  });
}

export async function actualizarPreciosEnSheet({
  sheetID,
  hoja,
  filas,
}: {
  sheetID: string;
  hoja: string;
  filas: {
    codigo: string;
    categoria?: string;
    producto?: string;
    cantidad?: number;
    precioARS: number;
    precioUSD?: number;
  }[];
}) {
  const datos = await obtenerDatosDesdeSheet(sheetID, `${hoja}!A2:Z`);
  const updates = filas
    .map((fila) => {
      const index = datos.findIndex((f) => f[0] === fila.codigo);
      if (index === -1) return null;
      return {
        range: `${hoja}!A${index + 2}:F${index + 2}`,
        values: [
          [
            fila.codigo,
            fila.categoria || "",
            fila.producto || "",
            fila.cantidad?.toString() || "",
            fila.precioARS,
            fila.precioUSD ?? 0,
          ],
        ],
      };
    })
    .filter(Boolean);
  if (updates.length === 0) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetID,
    requestBody: { data: updates, valueInputOption: "USER_ENTERED" },
  });
  console.log("✅ Precios actualizados en el Sheet");
}

export async function eliminarProductoDeSheet(sheetID: string, hoja: string, codigo: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: `${hoja}!A2:F100`,
  });
  const filas = res.data.values || [];
  const filaIndex = filas.findIndex((fila) => fila[0] === codigo);
  if (filaIndex === -1) throw new Error("Producto no encontrado en Sheet");
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: sheetID });
  const hojaObj = sheetInfo.data.sheets?.find((s) => s.properties?.title === hoja);
  const sheetId = hojaObj?.properties?.sheetId;
  if (sheetId === undefined) throw new Error("Hoja no encontrada");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: filaIndex + 1,
              endIndex: filaIndex + 2,
            },
          },
        },
      ],
    },
  });
}
export async function actualizarFilaEnSheet({
  sheetID,
  hoja,
  filaIndex,
  valores,
}: {
  sheetID: string;
  hoja: string;
  filaIndex: number;
  valores: (string | number)[];
}) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetID,
    range: `${hoja}!A${filaIndex}:F${filaIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [valores],
    },
  });
}
