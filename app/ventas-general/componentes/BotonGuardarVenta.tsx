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

  const calcularTotalCorrect = (productos: any[]) => {
    const hayTelefono = productos.some(p => p.categoria === "Teléfono");
    
    return productos.reduce((acc, p) => {
      if (moneda === "USD" && hayTelefono) {
        const precioUSD = p.categoria === "Teléfono" 
          ? p.precioUnitario 
          : (p.precioUSD || p.precioUnitario);
        return acc + (precioUSD * p.cantidad);
      } else {
        return acc + (p.precioUnitario * p.cantidad);
      }
    }, 0);
  };

  // 🔥 FUNCIÓN MEJORADA: Calcular ganancia correcta según contexto
  const calcularGananciaOptimizada = (producto: any, hayTelefono: boolean, stockData: any, cotizacionActual: number) => {
    const precioVenta = producto.precioUnitario || 0;
    const cantidad = producto.cantidad || 1;

    console.log('🔍 Calculando ganancia optimizada:', {
      producto: producto.producto || producto.codigo,
      categoria: producto.categoria,
      hayTelefono,
      precioVenta,
      cantidad,
      monedaVenta: moneda
    });

    // 📱 CASO 1: TELÉFONO
    if (producto.categoria === "Teléfono") {
      const precioCosto = producto.precioCosto || 0;
      const ganancia = (precioVenta - precioCosto) * cantidad;
      console.log('📱 Ganancia teléfono:', ganancia);
      return ganancia;
    }

    // 🔌 CASO 2: ACCESORIO/REPUESTO con datos de stock
    if (stockData) {
      const costoOriginal = stockData.precioCosto || 0;
      const costoARS = stockData.precioCostoPesos || (costoOriginal * cotizacionActual);

      if (hayTelefono) {
        // 🔥 VENTA MIXTA (con teléfono): Respetar monedas originales
        if (producto.moneda?.toUpperCase() === "USD" || stockData.moneda === "USD") {
          // Producto en USD: usar costo USD
          const ganancia = (precioVenta - costoOriginal) * cantidad;
          console.log('💵 Ganancia accesorio USD en venta mixta:', ganancia);
          return ganancia;
        } else {
          // Producto en ARS: usar costo ARS
          const ganancia = (precioVenta - costoARS) * cantidad;
          console.log('💰 Ganancia accesorio ARS en venta mixta:', ganancia);
          return ganancia;
        }
      } else {
        // 🛍️ VENTA SOLO ACCESORIOS: Todo se convierte a ARS según moneda principal
        if (moneda === "USD") {
          // Venta en USD: mantener todo en USD
          const ganancia = (precioVenta - costoOriginal) * cantidad;
          console.log('💵 Ganancia venta USD pura:', ganancia);
          return ganancia;
        } else {
          // Venta en ARS: convertir costos USD a ARS
          if (stockData.moneda === "USD") {
            const ganancia = (precioVenta - costoARS) * cantidad;
            console.log('💱 Ganancia producto USD convertido a ARS:', ganancia);
            return ganancia;
          } else {
            const ganancia = (precioVenta - costoOriginal) * cantidad;
            console.log('💰 Ganancia producto ARS nativo:', ganancia);
            return ganancia;
          }
        }
      }
    }

    // 🔥 FALLBACK: Sin datos de stock
    console.log('❌ Sin datos de stock, ganancia = 0');
    return 0;
  };

  // 🔥 FUNCIÓN COMPLETAMENTE CORREGIDA: Obtener datos con costos y ganancias
  const obtenerDatosConCostos = async (productos: any[]) => {
    if (!rol?.negocioID) return productos;

    const cotizacionActual = cotizacion || 1000;
    const hayTelefono = productos.some(p => p.categoria === "Teléfono");

    console.log('🔍 Procesando venta:', {
      cotizacion: cotizacionActual,
      monedaPrincipal: moneda,
      hayTelefono,
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

      // 🔥 CALCULAR COSTOS Y GANANCIA
      let precioCosto = 0;
      let precioCostoPesos = 0;
      let ganancia = 0;

      if (producto.categoria === "Teléfono") {
        // 📱 TELÉFONO: Usar datos existentes
        precioCosto = producto.precioCosto || 0;
        precioCostoPesos = precioCosto;
        ganancia = (precioUnitario - precioCosto) * cantidad;
      } else {
        // 🔌 ACCESORIO/REPUESTO: Usar datos de stock
        if (stockData) {
          precioCosto = stockData.precioCosto;
          
          if (stockData.moneda === "USD") {
            precioCostoPesos = stockData.precioCostoPesos || (precioCosto * cotizacionActual);
          } else {
            precioCostoPesos = precioCosto;
          }

          // 🔥 CALCULAR GANANCIA OPTIMIZADA
          ganancia = calcularGananciaOptimizada(producto, hayTelefono, stockData, cotizacionActual);
        } else {
          console.log('❌ No se encontró stock para:', producto.codigo);
          precioCosto = 0;
          precioCostoPesos = 0;
          ganancia = 0;
        }
      }

      const precioVenta = precioUnitario * cantidad; // Precio total

      console.log('✅ Producto procesado:', {
        codigo: producto.codigo,
        categoria: producto.categoria,
        precioUnitario,
        precioVenta,
        precioCosto,
        precioCostoPesos,
        ganancia,
        cantidad
      });

      return {
        ...producto,
        precioVenta,           // Precio total (unitario * cantidad)
        precioCosto,           // Costo unitario original
        precioCostoPesos,      // Costo unitario en ARS
        ganancia,              // Ganancia calculada correcta
        moneda: hayTelefono ? (producto.moneda || moneda) : moneda, // Moneda contextual
        cotizacionUsada: cotizacionActual,
      };
    });
  };

  const guardarVentaTelefono = async (datosVentaTelefono: any, pagoTelefono: any) => {
    if (!rol?.negocioID) return;

    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    const precioCostoTelefono = Number(datosVentaTelefono.precioCosto || 0);
    const precioUnitarioTelefono = Number(datosVentaTelefono.precioVenta || 0);
    const cantidad = 1;
    const precioVentaTelefono = precioUnitarioTelefono * cantidad;
    const gananciaTelefono = (precioUnitarioTelefono - precioCostoTelefono) * cantidad;

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
      moneda: moneda,
      stockID: datosVentaTelefono.stockID || "",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      telefonoRecibido: datosVentaTelefono.telefonoRecibido || null,
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
          moneda: moneda,
          gb: datosVentaTelefono.gb || "",
          codigo: datosVentaTelefono.stockID || datosVentaTelefono.modelo,
          tipo: "telefono",
        },
      ],
      total: precioVentaTelefono,
      gananciaTotal: gananciaTelefono,
      tipo: "telefono",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      timestamp: serverTimestamp(),
      estado: "pendiente",
      moneda: moneda,
      nroVenta: nroVenta,
    });

    // 3. Eliminar del stock
    if (datosVentaTelefono.stockID) {
      await deleteDoc(doc(db, `negocios/${rol.negocioID}/stockTelefonos/${datosVentaTelefono.stockID}`));
    }

    // 4. Registrar pago
    const montoPagado = pagoTelefono.moneda === "USD" 
      ? Number(pagoTelefono.montoUSD || 0)
      : Number(pagoTelefono.monto || 0);
    
    const valorTelefonoEntregado = Number(datosVentaTelefono.telefonoRecibido?.precioCompra || 0);
    const totalPagado = montoPagado + valorTelefonoEntregado;

    if (totalPagado > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        fecha: fecha,
        cliente: cliente,
        monto: moneda === "USD" ? null : totalPagado,
        montoUSD: moneda === "USD" ? totalPagado : null,
        forma: valorTelefonoEntregado > 0 ? "Efectivo + Entrega equipo" : pagoTelefono.formaPago || "Efectivo",
        destino: "ventaTelefonos",
        moneda: moneda,
        cotizacion: cotizacion,
        observaciones: pagoTelefono.observaciones || "",
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
      });
    }

    return ventaTelefonosRef.id;
  };

  const guardarVentaNormal = async () => {
    if (!rol?.negocioID) return;

    console.log('🔍 Guardando venta normal:', {
      productos: productos.length,
      moneda,
      cotizacion,
      hayTelefono: productos.some(p => p.categoria === "Teléfono")
    });
  
    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
    const snap = await getDoc(configRef);
    const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];

    // 🔥 OBTENER PRODUCTOS CON COSTOS Y GANANCIAS OPTIMIZADAS
    const productosConCodigo = await obtenerDatosConCostos(productos.map((p) => ({
      ...p,
      codigo: p.codigo || p.id || "",
    })));

    console.log('✅ Productos procesados:', productosConCodigo);

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

    // Preparar pago
    const pagoLimpio = {
      monto: pago?.moneda === "USD" ? null : (pago?.monto || pago?.montoUSD || 0),
      montoUSD: pago?.moneda === "USD" ? (pago?.montoUSD || pago?.monto || 0) : null,
      moneda: pago?.moneda || "ARS",
      forma: pago?.formaPago || "",
      destino: pago?.destino || "",
      observaciones: pago?.observaciones || "",
      cotizacion: pago?.cotizacion || cotizacion,
    };

    // 🔥 CALCULAR TOTALES CORRECTOS
    const total = productosConCodigo.reduce((acc, p) => acc + p.precioVenta, 0);
    const gananciaTotal = productosConCodigo.reduce((acc, p) => acc + p.ganancia, 0);

    console.log('💰 Totales calculados:', {
      total,
      gananciaTotal,
      productos: productosConCodigo.length
    });

    // Crear la venta
    const ventaRef = await addDoc(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), {
      productos: productosConCodigo.map(p => ({
        categoria: p.categoria,
        descripcion: p.producto || p.descripcion,
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
        codigo: p.codigo || p.id || "",
        tipo: p.tipo,
        hoja: p.hoja || "",
      })),
      cliente,
      fecha,
      observaciones,
      pago: pagoLimpio,
      moneda: moneda,
      estado: "pendiente",
      nroVenta,
      total,
      gananciaTotal,
      timestamp: serverTimestamp(),
    });

    // Guardar pago si existe
    const montoAGuardar = pago?.moneda === "USD" 
      ? Number(pago?.montoUSD || 0) 
      : Number(pago?.monto || 0);

    if (montoAGuardar > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        cliente,
        fecha,
        monto: pago?.moneda === "USD" ? null : montoAGuardar,
        montoUSD: pago?.moneda === "USD" ? montoAGuardar : null,
        moneda: pago?.moneda || "ARS",
        forma: pago?.formaPago || "Efectivo",
        destino: pago?.destino || "",
        observaciones: pago?.observaciones || "",
        cotizacion: pago?.cotizacion || cotizacion,
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
      });
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
          const otrosProductosConDatos = await obtenerDatosConCostos(otrosProductos);
          
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
                hoja: p.hoja || "",
              }))
            ];
            
            const nuevoTotal = productosCompletos.reduce((acc, p) => acc + p.precioVenta, 0);
            const nuevaGananciaTotal = productosCompletos.reduce((acc, p) => acc + p.ganancia, 0);
            
            await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${telefonoID}`), {
              productos: productosCompletos,
              total: nuevoTotal,
              gananciaTotal: nuevaGananciaTotal,
              moneda: moneda,
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
          {guardando ? "Guardando..." : "Guardar Venta"}
        </button>
      </div>
    </div>
  );
}