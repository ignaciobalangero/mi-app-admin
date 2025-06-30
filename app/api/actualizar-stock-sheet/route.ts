import { NextResponse } from "next/server";
import { agregarProductoASheet, actualizarPreciosEnSheet } from "@/app/api/lib/googleSheets";

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

    console.log(`🔧 Es actualización: ${esActualizacion}, Permitir stock cero: ${permitirStockCero}`);
    console.log(`🎯 Cantidad específica: ${cantidad} (tipo: ${typeof cantidad})`);

    // 🎯 CAMBIO PRINCIPAL: Usar función correcta según el tipo de operación
    if (esActualizacion) {
      // ✅ ACTUALIZAR fila existente (no agregar nueva)
      console.log("🔄 Actualizando producto existente en Sheet...");
      
      const filaParaActualizar = {
        codigo: producto.codigo || "",
        categoria: producto.categoria || "",
        modelo: producto.modelo || "",
        cantidad: cantidad, // 🎯 USAR LA VARIABLE CORREGIDA
        precioARS,
        precioUSD,
      };

      console.log("🧾 Datos para actualizar:", filaParaActualizar);

      await actualizarPreciosEnSheet(sheetID, hoja, [filaParaActualizar]);
      
      console.log("✅ Producto ACTUALIZADO exitosamente en Google Sheets");
      console.log(`📊 Datos actualizados - Código: ${producto.codigo}, Cantidad: ${cantidad}`);
      
    } else {
      // ✅ AGREGAR nueva fila
      console.log("➕ Agregando nuevo producto al Sheet...");
      
      const fila = [
        producto.codigo || "",
        producto.categoria || "",
        producto.modelo || "",
        cantidad, // 🎯 USAR LA VARIABLE CORREGIDA
        precioARS,
        precioUSD,
      ];

      console.log("🧾 Fila a insertar:", fila);

      await agregarProductoASheet(sheetID, hoja, fila);
      
      console.log("✅ Producto AGREGADO exitosamente en Google Sheets");
      console.log(`📊 Datos insertados - Código: ${producto.codigo}, Cantidad: ${cantidad}`);
    }

    return NextResponse.json({ 
      ok: true, 
      mensaje: `Producto ${esActualizacion ? 'actualizado' : 'agregado'} exitosamente`,
      cantidadFinal: cantidad,
      operacion: esActualizacion ? 'actualizar' : 'agregar'
    });
    
  } catch (error: any) {
    console.error("❌ Error general:", error);
    
    // Log más detallado del error sin acceder a req.body directamente
    console.error("📊 Contexto del error:", {
      errorMessage: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({ 
      error: "Error interno en el servidor",
      detalles: error.message
    }, { status: 500 });
  }
}