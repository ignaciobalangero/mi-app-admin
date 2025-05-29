import { actualizarFilaEnSheet, obtenerDatosDesdeSheet } from "@/app/api/lib/googleSheets";

export async function actualizarStockEnSheetDesdeVenta({
  sheetID,
  hoja,
  codigo,
  cantidadVendida,
}: {
  sheetID: string;
  hoja: string;
  codigo: string;
  cantidadVendida: number;
}) {
  try {
    const rango = `${hoja}!A2:F`; // suponemos que 'cantidad' está en columna D
    const datos = await obtenerDatosDesdeSheet(sheetID, rango);

    const filaIndex = datos.findIndex((fila) => fila[0] === codigo);
    if (filaIndex === -1) return console.warn("❌ Producto no encontrado en el Sheet");

    const fila = datos[filaIndex];
    const cantidadActual = Number(fila[3]) || 0;
    const nuevaCantidad = Math.max(0, cantidadActual - cantidadVendida);

    // Actualiza solo esa fila
    await actualizarFilaEnSheet({
      sheetID,
      hoja,
      filaIndex: filaIndex + 2, // +2 porque empieza en A2 y se omite encabezado
      valores: [
        fila[0], // código
        fila[1], // categoría
        fila[2], // producto
        nuevaCantidad.toString(), // nueva cantidad
        fila[4], // precioARS
        fila[5], // precioUSD
      ],
    });

    console.log(`✅ Stock actualizado en Sheet para ${codigo}: ${cantidadActual} → ${nuevaCantidad}`);
  } catch (error) {
    console.error("❌ Error al actualizar el stock en el Sheet:", error);
  }
}
