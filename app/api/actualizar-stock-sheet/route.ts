import { NextResponse } from "next/server";
import { agregarProductoASheet } from "@/app/api/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const { sheetID, hoja, producto, esActualizacion, permitirStockCero } = await req.json();

    if (!sheetID || !hoja || !producto) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 📦 Preparar valores
    const precioUSD = Number(producto.precioUSD) || 0;
    const cotizacion = Number(producto.cotizacion) || 1000;

    const precioARS =
      producto.moneda === "USD" && precioUSD > 0
        ? precioUSD * cotizacion
        : Number(producto.precio) || 0;

    // 🎯 CORRECCIÓN PRINCIPAL: Manejar cantidad 0 correctamente
    let cantidad;
    if (producto.cantidad !== undefined && producto.cantidad !== null) {
      cantidad = Number(producto.cantidad); // Esto incluye 0
    } else {
      cantidad = 0; // Default solo si no se envió
    }

    // ✅ Solo insertamos columnas necesarias en el sheet
    const fila = [
      producto.codigo || "",
      producto.categoria || "",
      producto.modelo || "",
      cantidad, // 🎯 USAR LA VARIABLE CORREGIDA
      precioARS,
      precioUSD,
    ];

    console.log("🧾 Fila a insertar:", fila);
    console.log(`🎯 Cantidad específica: ${cantidad} (tipo: ${typeof cantidad})`);
    console.log(`🔧 Es actualización: ${esActualizacion}, Permitir stock cero: ${permitirStockCero}`);

    try {
      // 🎯 LLAMAR CON SOLO 3 PARÁMETROS COMO ESPERA LA FUNCIÓN
      await agregarProductoASheet(sheetID, hoja, fila);
      
      console.log("✅ Producto insertado/actualizado exitosamente en Google Sheets");
      console.log(`📊 Datos enviados - Código: ${producto.codigo}, Cantidad: ${cantidad}`);
      
    } catch (err) {
      console.error("❌ Error al insertar en Google Sheets:", err);
      console.error("📊 Datos que causaron el error:", { fila, cantidad, esActualizacion });
      return NextResponse.json({ 
        error: "Error al insertar en Google Sheets", 
        detalles: err.message,
        datosEnviados: { cantidad, esActualizacion }
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      mensaje: `Producto ${esActualizacion ? 'actualizado' : 'agregado'} exitosamente`,
      cantidadFinal: cantidad
    });
    
  } catch (error: any) {
    console.error("❌ Error general:", error);
    return NextResponse.json({ error: "Error interno en el servidor" }, { status: 500 });
  }
}