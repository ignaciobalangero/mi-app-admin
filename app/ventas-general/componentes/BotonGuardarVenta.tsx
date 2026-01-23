"use client";

import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useRol } from "@/lib/useRol";
import { descontarAccesorioDelStock } from "@/app/ventas-general/componentes/descontarAccesorioDelStock";
import { descontarRepuestoDelStock } from "@/app/ventas-general/componentes/descontarRepuestoDelStock";
import { obtenerYSumarNumeroVenta } from "@/lib/ventas/contadorVentas";

export default function BotonGuardarVenta({
  cliente,
  productos,
  fecha,
  observaciones,
  pago,
  moneda,
  cotizacion,
  onGuardar,
}: {
  cliente: string;
  productos: any[];
  fecha: string;
  observaciones: string;
  pago: any;
  moneda: "ARS" | "USD";
  cotizacion: number;
  onGuardar?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const desdeTelefono = searchParams.get("desdeTelefono") === "1";

  const { rol } = useRol();
  const [guardando, setGuardando] = useState(false);

  // ✅ FUNCIÓN CORREGIDA: Calcular totales SEPARADOS por moneda (para guardado)
  const calcularTotalesSeparados = (productos: any[]) => {
    let totalARS = 0;
    let totalUSD = 0;
    
    console.log('💰 Calculando totales SEPARADOS por moneda:', productos.map(p => ({
      producto: p.producto || p.descripcion,
      moneda: p.moneda,
      precioVenta: p.precioVenta || (p.precioUnitario * (p.cantidad || 1))
    })));
    
    productos.forEach((p) => {
      const cantidad = Number(p.cantidad || 1);
      const precioVenta = p.precioVenta || (p.precioUnitario * cantidad);
      
      // ✅ RESPETAR MONEDA ORIGINAL SELECCIONADA
      if (p.moneda === "USD") {
        totalUSD += precioVenta;
        console.log(`💵 Producto USD: ${p.producto} = ${precioVenta} USD`);
      } else {
        totalARS += precioVenta;
        console.log(`💰 Producto ARS: ${p.producto} = ${precioVenta} ARS`);
      }
    });
    
    console.log('✅ Totales SEPARADOS:', { totalARS, totalUSD });
    return { totalARS, totalUSD };
  };

// ✅ FUNCIÓN CORREGIDA: Ganancia real calculada al momento de la venta
const calcularGananciaRespetandoMoneda = (producto: any, stockData: any, cotizacionActual: number) => {
  const precioVenta = producto.precioUnitario || 0;
  const cantidad = producto.cantidad || 1;

  // 📱 CASO 1: TELÉFONO (Se mantiene costo directo)
  if (producto.categoria === "Teléfono") {
    const precioCosto = producto.precioCosto || 0;
    return (precioVenta - precioCosto) * cantidad;
  }

  if (!stockData) return 0;

  let costoCalculado = 0;
  
  // 🚀 LÓGICA DE GANANCIA REAL BASADA EN COTIZACIÓN ACTUAL
  if (producto.moneda === "USD") {
    // Venta en USD -> Costo en USD
    costoCalculado = Number(stockData.precioCosto || 0);
  } else {
    // Venta en ARS (Pesos)
    if (stockData.moneda === "ARS") {
      // Producto nativo ARS -> Costo en ARS directo
      costoCalculado = Number(stockData.precioCosto || 0);
    } else {
      // Stock en USD vendido en ARS -> Convertimos costo USD a Pesos de HOY
      const costoUSD = Number(stockData.precioCosto || 0);
      costoCalculado = costoUSD * cotizacionActual;
    }
  }

  return (precioVenta - costoCalculado) * cantidad;
};

  // ✅ FUNCIÓN CORREGIDA: Obtener datos respetando monedas originales
  const obtenerDatosRespetandoMonedas = async (productos: any[]) => {
    if (!rol?.negocioID) return productos;

    const cotizacionActual = cotizacion || 1000;
    
    console.log("🔍 Procesando venta respetando monedas originales:", {
      cotizacion: cotizacionActual,
      totalProductos: productos.length
    });

    // Obtener todos los stocks
    const [stockAccesoriosSnap, stockRepuestosSnap, stockExtraSnap] = await Promise.all([
      getDocs(collection(db, `negocios/${rol.negocioID}/stockAccesorios`)),
      getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`)),
      getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`))
    ]);
    
    // Crear mapa unificado de stocks
    const mapaStock: Record<string, any> = {};
    
    [stockAccesoriosSnap, stockRepuestosSnap, stockExtraSnap].forEach((snap, index) => {
      const tipos = ["accesorio", "repuesto", "stockExtra"];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.codigo) {
          mapaStock[data.codigo] = {
            precioCosto: Number(data.precioCosto || 0),
            precioCostoPesos: Number(data.precioCostoPesos || 0),
            moneda: data.moneda || "USD",
            precio1: Number(data.precio1 || 0),
            precio2: Number(data.precio2 || 0),
            precio3: Number(data.precio3 || 0),
            precio1Pesos: Number(data.precio1Pesos || 0),
            precio2Pesos: Number(data.precio2Pesos || 0),
            precio3Pesos: Number(data.precio3Pesos || 0),
            tipo: tipos[index]
          };
        }
      });
    });

    console.log('🔍 Mapa de stock creado:', Object.keys(mapaStock).length, 'productos');

    return productos.map(producto => {
      const cantidad = producto.cantidad || 1;
      const precioUnitario = producto.precioUnitario || 0;
      const stockData = mapaStock[producto.codigo];

      // ✅ CALCULAR COSTOS Y GANANCIA RESPETANDO MONEDAS ORIGINALES
      let precioCosto = 0;
      let precioCostoPesos = 0;
      let ganancia = 0;
      let precioVentaReal = precioUnitario;

      if (producto.categoria === "Teléfono") {
        // 📱 TELÉFONO: Respetamos sus valores originales en la moneda que esté (usualmente USD)
        precioCosto = producto.precioCosto || 0;
        precioCostoPesos = producto.moneda === "ARS" ? precioCosto : (precioCosto * cotizacionActual);
        ganancia = (precioVentaReal - precioCosto) * cantidad;
      } else {
        // 🔌 ACCESORIO/REPUESTO
        if (stockData) {
          precioCosto = stockData.precioCosto || 0;
          
          // Guardamos el costo en pesos actualizado para el historial de la venta
          if (stockData.moneda === "USD") {
            precioCostoPesos = precioCosto * cotizacionActual; 
          } else {
            precioCostoPesos = precioCosto; // Nativo ARS
          }
          
          // Calculamos ganancia (si es venta USD, será resta directa; si es ARS, usará cotización)
          ganancia = calcularGananciaRespetandoMoneda(producto, stockData, cotizacionActual);
        }else {
          console.log('❌ No se encontró stock para:', producto.codigo);
          precioCosto = 0;
          precioCostoPesos = 0;
          ganancia = 0;
        }
      }

      // ✅ PRECIO VENTA RESPETANDO MONEDA ORIGINAL (SIN CONVERSIONES)
      const precioVentaTotal = precioVentaReal * cantidad;

      console.log('✅ Producto procesado respetando moneda (SIN conversiones):', {
        codigo: producto.codigo,
        categoria: producto.categoria,
        monedaOriginal: producto.moneda,
        precioUnitario: precioVentaReal,
        precioVentaTotal,        // ✅ En moneda original, SIN convertir
        precioCosto,
        precioCostoPesos,
        ganancia,
        cantidad
      });

      return {
        ...producto,
        precioUnitario: precioVentaReal,
        precioVenta: precioVentaTotal,      // ✅ En moneda original
        precioCosto,
        precioCostoPesos,
        ganancia,                          // ✅ En moneda original
        cotizacionUsada: cotizacionActual,
      };
    });
  };

  // ✅ FUNCIÓN SIMPLIFICADA: Guardar venta de teléfono
  const guardarVentaTelefono = async (datosVentaTelefono: any, pagoTelefono: any) => {
    if (!rol?.negocioID) return;

    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    const precioCostoTelefono = Number(datosVentaTelefono.precioCosto || 0);
    const precioUnitarioTelefono = Number(datosVentaTelefono.precioVenta || 0);
    const cantidad = 1;
    const precioVentaTelefono = precioUnitarioTelefono * cantidad;
    const gananciaTelefono = (precioUnitarioTelefono - precioCostoTelefono) * cantidad;

    // ✅ CALCULAR VALOR DEL TELÉFONO ENTREGADO COMO PARTE DE PAGO (RESPETANDO MONEDA)
    const valorTelefonoEntregado = Number(datosVentaTelefono.telefonoRecibido?.precioCompra || 0);
    const monedaTelefonoEntregado = datosVentaTelefono.telefonoRecibido?.moneda || "ARS";
    
    console.log('📱 Teléfono entregado como parte de pago:', {
      valor: valorTelefonoEntregado,
      moneda: monedaTelefonoEntregado,
      modelo: datosVentaTelefono.telefonoRecibido?.modelo
    });
    
    // ✅ CALCULAR SALDO A PAGAR (considerando moneda del teléfono entregado)
    let saldoAPagar = 0;
    if (monedaTelefonoEntregado === "USD" && moneda === "USD") {
      // Ambos en USD: resta directa
      saldoAPagar = precioVentaTelefono - valorTelefonoEntregado;
    } else if (monedaTelefonoEntregado === "ARS" && moneda === "ARS") {
      // Ambos en ARS: resta directa
      saldoAPagar = precioVentaTelefono - valorTelefonoEntregado;
    } else if (monedaTelefonoEntregado === "USD" && moneda === "ARS") {
      // Teléfono entregado USD, venta ARS: convertir teléfono a ARS
      const valorTelefonoEnARS = valorTelefonoEntregado * cotizacion;
      saldoAPagar = precioVentaTelefono - valorTelefonoEnARS;
    } else if (monedaTelefonoEntregado === "ARS" && moneda === "USD") {
      // Teléfono entregado ARS, venta USD: convertir teléfono a USD
      const valorTelefonoEnUSD = valorTelefonoEntregado / cotizacion;
      saldoAPagar = precioVentaTelefono - valorTelefonoEnUSD;
    } else {
      // Fallback: resta directa
      saldoAPagar = precioVentaTelefono - valorTelefonoEntregado;
    }
    
    // 1. Crear venta en ventaTelefonos
    const ventaTelefonosRef = await addDoc(collection(db, `negocios/${rol.negocioID}/ventaTelefonos`), {
      fecha: datosVentaTelefono.fecha,
      fechaIngreso: datosVentaTelefono.fechaIngreso,
      proveedor: datosVentaTelefono.proveedor || "",
      cliente: cliente,
      modelo: datosVentaTelefono.modelo,
      marca: datosVentaTelefono.marca || "",
      color: datosVentaTelefono.color || "",
      estado: datosVentaTelefono.estado || "nuevo",
      bateria: datosVentaTelefono.bateria || "",
      gb: datosVentaTelefono.gb || "",
      imei: datosVentaTelefono.imei || "",
      serie: datosVentaTelefono.serie || "",
      precioCosto: precioCostoTelefono,
      precioVenta: precioVentaTelefono,
      ganancia: gananciaTelefono,
      moneda: datosVentaTelefono.moneda || "USD", // ✅ Respetar moneda seleccionada
      stockID: datosVentaTelefono.stockID || "",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      telefonoRecibido: datosVentaTelefono.telefonoRecibido || null,
      valorTelefonoEntregado: valorTelefonoEntregado,
      saldoPendiente: saldoAPagar,
      nroVenta: nroVenta,
      creadoEn: Timestamp.now(),
      id: "",
    });

    await updateDoc(ventaTelefonosRef, { id: ventaTelefonosRef.id });

    // 2. Crear en ventasGeneral con el mismo ID
    await setDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${ventaTelefonosRef.id}`), {
      fecha: fecha,
      cliente: cliente,
      productos: [
        {
          categoria: "Teléfono",
          descripcion: datosVentaTelefono.estado,
          marca: datosVentaTelefono.marca || "—",
          modelo: datosVentaTelefono.modelo,
          color: datosVentaTelefono.color || "—",
          cantidad: 1,
          precioUnitario: precioUnitarioTelefono,
          precioCosto: precioCostoTelefono,
          precioCostoPesos: precioCostoTelefono,
          precioVenta: precioVentaTelefono,
          ganancia: gananciaTelefono,
          moneda: datosVentaTelefono.moneda || "USD", // ✅ Respetar moneda seleccionada
          gb: datosVentaTelefono.gb || "",
          codigo: datosVentaTelefono.stockID || datosVentaTelefono.modelo,
          tipo: "telefono",
          origenStock: "stockTelefonos", // ✅ ESTA LÍNEA
        },
      ],
      total: precioVentaTelefono,
      totalARS: datosVentaTelefono.moneda === "ARS" ? precioVentaTelefono : 0,
      totalUSD: datosVentaTelefono.moneda === "USD" ? precioVentaTelefono : 0,
      gananciaTotal: gananciaTelefono,
      tipo: "telefono",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      timestamp: serverTimestamp(),
      estado: saldoAPagar > 0 ? "pendiente" : "pagado",
      moneda: datosVentaTelefono.moneda || "USD", // ✅ Respetar moneda seleccionada
      nroVenta: nroVenta,
      valorTelefonoEntregado: valorTelefonoEntregado,
      saldoPendiente: saldoAPagar,
    });

    // 3. Eliminar del stock
    if (datosVentaTelefono.stockID) {
      await deleteDoc(doc(db, `negocios/${rol.negocioID}/stockTelefonos/${datosVentaTelefono.stockID}`));
    }

    // ✅ 4. REGISTRAR PAGOS SEPARADOS POR MONEDA (RESPETANDO MONEDA TELÉFONO)
    const pagoARS_Tel = Number(pagoTelefono.monto || 0);
    const pagoUSD_Tel = Number(pagoTelefono.montoUSD || 0);

    console.log('💰 Registrando pagos del teléfono (respetando monedas):', {
      pagoARS: pagoARS_Tel,
      pagoUSD: pagoUSD_Tel,
      valorTelefonoEntregado,
      monedaTelefonoEntregado,
      cliente,
      nroVenta
    });

    // ✅ GUARDAR PAGO ARS si existe
    if (pagoARS_Tel > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        fecha: fecha,
        cliente: cliente,
        monto: pagoARS_Tel,
        montoUSD: null,
        forma: pagoTelefono.formaPago || "Efectivo",
        destino: "ventaTelefonos",
        moneda: "ARS",
        cotizacion: cotizacion,
        observaciones: pagoTelefono.observaciones || "",
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
      });
      console.log('✅ Pago ARS guardado:', pagoARS_Tel);
    }

    // ✅ GUARDAR PAGO USD si existe
    if (pagoUSD_Tel > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        fecha: fecha,
        cliente: cliente,
        monto: null,
        montoUSD: pagoUSD_Tel,
        forma: pagoTelefono.formaPago || "Efectivo",
        destino: "ventaTelefonos", 
        moneda: "USD",
        cotizacion: cotizacion,
        observaciones: pagoTelefono.observaciones || "",
        timestamp: serverTimestamp(),  
        nroVenta: nroVenta,
      });
      console.log('✅ Pago USD guardado:', pagoUSD_Tel);
    }

    // ✅ GUARDAR TELÉFONO COMO PARTE DE PAGO (RESPETANDO SU MONEDA)
    if (valorTelefonoEntregado > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        fecha: fecha,
        cliente: cliente,
        monto: monedaTelefonoEntregado === "ARS" ? valorTelefonoEntregado : null,
        montoUSD: monedaTelefonoEntregado === "USD" ? valorTelefonoEntregado : null,
        forma: "Entrega equipo",
        destino: "ventaTelefonos",
        moneda: monedaTelefonoEntregado, // ✅ RESPETA LA MONEDA ORIGINAL
        cotizacion: cotizacion,
        observaciones: `Teléfono entregado: ${datosVentaTelefono.telefonoRecibido?.modelo || ""}`,
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
        // Detalles del teléfono entregado
        detallesPago: {
          tipoEquipo: "telefono",
          modeloEntregado: datosVentaTelefono.telefonoRecibido?.modelo || "",
          marcaEntregada: datosVentaTelefono.telefonoRecibido?.marca || "",
          valorOriginal: valorTelefonoEntregado,
          monedaOriginal: monedaTelefonoEntregado
        }
      });
      console.log('✅ Teléfono como pago guardado:', {
        valor: valorTelefonoEntregado,
        moneda: monedaTelefonoEntregado
      });
    }
// ✅ 5. SI ES PAGO A PROVEEDOR, TAMBIÉN GUARDARLO EN pagosProveedores
if (pagoTelefono?.tipoDestino === "proveedor" && pagoTelefono?.proveedorDestino) {
  // Misma lógica que arriba pero para teléfonos
}
    return ventaTelefonosRef.id;
  };

  const guardarVentaNormal = async () => {
    if (!rol?.negocioID) return;

    console.log('🔍 Guardando venta normal con monedas separadas:', {
      productos: productos.length,
      cotizacion
    });
  
    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
    const snap = await getDoc(configRef);
    const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];

    // ✅ OBTENER PRODUCTOS RESPETANDO MONEDAS ORIGINALES
    const productosConCodigo = await obtenerDatosRespetandoMonedas(productos.map((p) => ({
      ...p,
      codigo: p.codigo || p.id || "",
    })));

    console.log('✅ Productos procesados respetando monedas:', productosConCodigo);

    // Descontar del stock
    for (const producto of productosConCodigo) {
      const codigo = producto.codigo;
      if (!codigo) continue;

      if (producto.tipo === "accesorio") {
        await descontarAccesorioDelStock(rol.negocioID, codigo, producto.cantidad);
      }

      if (producto.tipo === "repuesto" || producto.tipo === "general") {
        await descontarRepuestoDelStock(rol.negocioID, codigo, producto.cantidad);

        const hojaFirebase = producto.hoja;
        const sheetConfig = sheets.find((s) => s.hoja === hojaFirebase);

        if (sheetConfig?.id) {
          await fetch("/api/actualizar-stock-sheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sheetID: sheetConfig.id,
              hoja: hojaFirebase,
              codigo,
              cantidadVendida: producto.cantidad,
            }),
          });
        }
      }
    }

    // ✅ CALCULAR TOTALES SEPARADOS POR MONEDA
    const { totalARS, totalUSD } = calcularTotalesSeparados(productosConCodigo);
    const gananciaTotal = productosConCodigo.reduce((acc, p) => acc + p.ganancia, 0);
    
    // Total aproximado para compatibilidad (convertir USD a ARS)
    const totalAproximado = totalARS + (totalUSD * cotizacion);

    console.log('💰 Totales separados calculados:', {
      totalARS,
      totalUSD,
      totalAproximado,
      gananciaTotal,
      productos: productosConCodigo.length
    });

    // ✅ PREPARAR PAGOS SEPARADOS
    const pagoARS = Number(pago?.monto || 0);
    const pagoUSD = Number(pago?.montoUSD || 0);

    // Crear la venta
    const ventaRef = await addDoc(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), {
      productos: productosConCodigo.map(p => ({
        categoria: p.categoria,
        descripcion: p.producto || p.descripcion,
        marca: p.marca || "—",
        modelo: p.modelo || "—", 
        color: p.color || "—",
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario,     // ✅ En moneda original
        precioCosto: p.precioCosto,
        precioCostoPesos: p.precioCostoPesos,
        precioVenta: p.precioVenta,           // ✅ En moneda original 
        ganancia: p.ganancia,                 // ✅ En moneda original
        moneda: p.moneda,                     // ✅ USD o ARS según lo elegido
        codigo: p.codigo || p.id || "",
        tipo: p.tipo,
        origenStock:
        p.tipo === "repuesto"
          ? "stockRepuestos"
          : p.tipo === "accesorio"
          ? "stockAccesorios"
          : p.tipo === "general"
          ? "stockExtra"
          : "stockAccesorios",
      
        hoja: p.hoja || "",
        // ✅ AGREGAR CAMPOS SEPARADOS PARA CLARIDAD
        precioUnitarioUSD: p.moneda === "USD" ? p.precioUnitario : null,
        precioUnitarioARS: p.moneda === "ARS" ? p.precioUnitario : null,
        precioVentaUSD: p.moneda === "USD" ? p.precioVenta : null,
        precioVentaARS: p.moneda === "ARS" ? p.precioVenta : null,
      })),
      cliente,
      fecha,
      observaciones,
      pago: {
        monto: pagoARS || null,
        montoUSD: pagoUSD || null,
        moneda: pagoUSD > 0 && pagoARS > 0 ? "DUAL" : pagoUSD > 0 ? "USD" : "ARS",
        forma: pagoUSD > 0 && pagoARS > 0 ? "Efectivo ARS + USD" : 
               pagoUSD > 0 ? "Efectivo USD" : 
               pago?.formaPago || "Efectivo",
        destino: pago?.destino || "",
        observaciones: pago?.observaciones || "",
        cotizacion: cotizacion,
      },
      totalARS,                    // ✅ Total en pesos
      totalUSD,                    // ✅ Total en dólares  
      total: totalAproximado,      // ✅ Para compatibilidad
      gananciaTotal,
      moneda: totalUSD > 0 && totalARS > 0 ? "DUAL" : totalUSD > 0 ? "USD" : "ARS", // ✅ Detectar tipo
      estado: "pendiente",
      nroVenta,
      timestamp: serverTimestamp(),
    });

    // ✅ GUARDAR PAGOS SEPARADOS (ARS + USD independientes)
    
    // Guardar pago en ARS si existe
    if (pagoARS > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        cliente,
        fecha,
        monto: pagoARS,
        montoUSD: null,
        moneda: "ARS",
        forma: pago?.formaPago || "Efectivo",
        destino: pago?.destino || "",
        observaciones: pago?.observaciones || "",
        cotizacion: cotizacion,
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
      });
      console.log('✅ Pago ARS guardado:', pagoARS);
    }

    // Guardar pago en USD si existe
    if (pagoUSD > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        cliente,
        fecha,
        monto: null,
        montoUSD: pagoUSD,
        moneda: "USD",
        forma: pago?.formaPago || "Efectivo",
        destino: pago?.destino || "",
        observaciones: pago?.observaciones || "",
        cotizacion: cotizacion,
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
      });
      console.log('✅ Pago USD guardado:', pagoUSD);
    }

    // ✅ 4. SI ES PAGO A PROVEEDOR, TAMBIÉN GUARDARLO EN pagosProveedores
if (pago?.tipoDestino === "proveedor" && pago?.proveedorDestino) {
  // Buscar datos del proveedor
  const proveedoresSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/proveedores`));
  const proveedor = proveedoresSnap.docs.find(doc => doc.data().nombre === pago.proveedorDestino);
  
  if (proveedor) {
    const pagoProveedor = {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.data().nombre,
      fecha: fecha,
      monto: pagoARS || 0,
      montoUSD: pagoUSD || 0,
      forma: pago?.formaPago || "Efectivo",
      referencia: `Pago desde venta general #${nroVenta}`,
      notas: `Cliente: ${cliente}${pago?.observaciones ? ` - ${pago.observaciones}` : ''}`,
      fechaCreacion: new Date().toISOString(),
    };
    
    await addDoc(collection(db, `negocios/${rol.negocioID}/pagosProveedores`), pagoProveedor);
    console.log("✅ Pago también guardado en pagosProveedores para:", proveedor.data().nombre);
  }
}
    return ventaRef.id;
  };

  const guardarVenta = async () => {
    if (!rol?.negocioID || productos.length === 0 || !cliente) return;
    setGuardando(true);

    try {
      const ventaTelefonoPendiente = localStorage.getItem("ventaTelefonoPendiente");
      
      if (ventaTelefonoPendiente && desdeTelefono) {
        const datosVentaTelefono = JSON.parse(ventaTelefonoPendiente);
        const pagoTelefono = pago || {};
        const otrosProductos = productos.filter(p => p.categoria !== "Teléfono");
        
        // Guardar venta de teléfono
        const telefonoID = await guardarVentaTelefono(datosVentaTelefono, pagoTelefono);
        
        // Si hay otros productos, agregarlos
        if (otrosProductos.length > 0) {
          const otrosProductosConDatos = await obtenerDatosRespetandoMonedas(otrosProductos);
          
          // Descontar del stock
          const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
          const snap = await getDoc(configRef);
          const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];
          
          for (const producto of otrosProductosConDatos) {
            const codigo = producto.codigo;
            if (!codigo) continue;

            if (producto.tipo === "accesorio") {
              await descontarAccesorioDelStock(rol.negocioID, codigo, producto.cantidad);
            }

            if (producto.tipo === "repuesto" || producto.tipo === "general") {
              await descontarRepuestoDelStock(rol.negocioID, codigo, producto.cantidad);

              const hojaFirebase = producto.hoja;
              const sheetConfig = sheets.find((s) => s.hoja === hojaFirebase);

              if (sheetConfig?.id) {
                await fetch("/api/actualizar-stock-sheet", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sheetID: sheetConfig.id,
                    hoja: hojaFirebase,
                    codigo,
                    cantidadVendida: producto.cantidad,
                  }),
                });
              }
            }
          }
          
          // Actualizar venta existente
          const ventaExistente = await getDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${telefonoID}`));
          if (ventaExistente.exists()) {
            const datosExistentes = ventaExistente.data();
            const productosCompletos = [
              ...datosExistentes.productos,
              ...otrosProductosConDatos.map(p => ({
                categoria: p.categoria,
                descripcion: p.producto,
                marca: p.marca || "—",
                modelo: p.modelo || "—",
                color: p.color || "—",
                cantidad: p.cantidad,
                precioUnitario: p.precioUnitario,
                precioCosto: p.precioCosto,
                precioCostoPesos: p.precioCostoPesos,
                precioVenta: p.precioVenta,
                ganancia: p.ganancia,
                moneda: p.moneda,
                codigo: p.codigo,
                tipo: p.tipo,
                origenStock:
  p.tipo === "repuesto"
    ? "stockRepuestos"
    : p.tipo === "accesorio"
    ? "stockAccesorios"
    : p.tipo === "general"
    ? "stockExtra"
    : "stockAccesorios",

                hoja: p.hoja || "",
              }))
            ];
            
            // ✅ RECALCULAR TOTALES SEPARADOS
            const { totalARS: nuevoTotalARS, totalUSD: nuevoTotalUSD } = calcularTotalesSeparados(productosCompletos);
            const nuevaGananciaTotal = productosCompletos.reduce((acc, p) => acc + p.ganancia, 0);
            const nuevoTotalAproximado = nuevoTotalARS + (nuevoTotalUSD * cotizacion);
            
            // ✅ CALCULAR SALDO PENDIENTE CONSIDERANDO TELÉFONO ENTREGADO
            const valorTelefonoEntregado = datosExistentes.valorTelefonoEntregado || 0;
            const saldoPendiente = nuevoTotalAproximado - valorTelefonoEntregado;
            
            await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${telefonoID}`), {
              productos: productosCompletos,
              totalARS: nuevoTotalARS,
              totalUSD: nuevoTotalUSD,           // ✅ Totales separados
              total: nuevoTotalAproximado,      // ✅ Total aproximado
              gananciaTotal: nuevaGananciaTotal,
              moneda: nuevoTotalUSD > 0 && nuevoTotalARS > 0 ? "DUAL" : nuevoTotalUSD > 0 ? "USD" : "ARS", // ✅ Detectar tipo
              saldoPendiente: saldoPendiente,
              estado: saldoPendiente > 0 ? "pendiente" : "pagado",
            });
          }
        }
        
        // Limpiar localStorage
        localStorage.removeItem("ventaTelefonoPendiente");
        localStorage.removeItem("pagoTelefonoPendiente");
        localStorage.removeItem("clienteDesdeTelefono");
      } else {
        // Venta normal
        await guardarVentaNormal();
      }
      
      if (onGuardar) onGuardar();
      router.push("/ventas-general");
    } catch (error) {
      console.error("Error al guardar la venta:", error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-end gap-4">
        <button
          onClick={guardarVenta}
          disabled={guardando}
          className={`rounded-lg font-medium flex items-center gap-2 transition-all duration-200 transform text-white ${
            guardando 
              ? "bg-[#bdc3c7] cursor-not-allowed" 
              : "bg-[#3498db] hover:bg-[#2980b9] hover:scale-105"
          }`}
          style={{ 
            height: "40px", 
            padding: "0 24px",
            minHeight: "40px",
            maxHeight: "40px"
          }}
        >
          {guardando ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Guardando...
            </>
          ) : (
            <>
              💾 Guardar Venta
            </>
          )}
        </button>
      </div>
    </div>
  );
}