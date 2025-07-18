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

  // 🔧 CORRECCIÓN 1: Función para calcular total correcto usando prop moneda
  const calcularTotalCorrect = (productos: any[]) => {
    const hayTelefono = productos.some(p => p.categoria === "Teléfono");
    
    return productos.reduce((acc, p) => {
      if (moneda === "USD" && hayTelefono) {
        // 📱 CON MONEDA USD Y TELÉFONO: Usar precio USD
        const precioUSD = p.categoria === "Teléfono" 
          ? p.precioUnitario 
          : (p.precioUSD || p.precioUnitario);
        return acc + (precioUSD * p.cantidad);
      } else {
        // 🛍️ SIN TELÉFONO O MONEDA ARS: Usar precio ARS
        return acc + (p.precioUnitario * p.cantidad);
      }
    }, 0);
  };

  // 🔥 FUNCIÓN COMPLETAMENTE REESCRITA: Obtener TODOS los costos y calcular ganancias
  const obtenerDatosConCostos = async (productos: any[]) => {
    if (!rol?.negocioID) return productos;

    console.log('💰 Cotización recibida:', cotizacion);

    // 🔥 OBTENER TODOS LOS STOCKS PARA BUSCAR COSTOS
    const [stockAccesoriosSnap, stockExtraSnap, stockRepuestosSnap] = await Promise.all([
      getDocs(collection(db, `negocios/${rol.negocioID}/stockAccesorios`)),
      getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`)),
      getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`))
    ]);

    // 🔥 CREAR MAPA UNIFICADO DE COSTOS POR CÓDIGO
    const mapaStock: Record<string, any> = {};

    // ACCESORIOS
    stockAccesoriosSnap.forEach((doc) => {
      const data = doc.data();
      if (data.codigo) {
        mapaStock[data.codigo] = {
          costo: Number(data.precioCosto || 0),
          tipo: "accesorio"
        };
      }
    });

    // STOCK EXTRA
    stockExtraSnap.forEach((doc) => {
      const data = doc.data();
      if (data.codigo) {
        mapaStock[data.codigo] = {
          costo: Number(data.precioCosto || 0),
          tipo: "stockExtra"
        };
      }
    });

    // REPUESTOS
    stockRepuestosSnap.forEach((doc) => {
      const data = doc.data();
      if (data.codigo) {
        mapaStock[data.codigo] = {
          costo: Number(data.precioCosto || 0),
          tipo: "repuesto"
        };
      }
    });

    console.log('🔍 Mapa de costos creado:', Object.keys(mapaStock).length, 'productos');

    // 🔥 PROCESAR CADA PRODUCTO PARA OBTENER COSTO Y CALCULAR GANANCIA
    return productos.map(producto => {
      const cantidad = producto.cantidad || 1;
      const precioVenta = producto.precioUnitario || 0;
      let costo = 0;

      console.log('🔍 Procesando:', {
        codigo: producto.codigo,
        categoria: producto.categoria,
        tipo: producto.tipo,
        cantidad,
        precioVenta
      });

      // 🔥 OBTENER COSTO SEGÚN TIPO DE PRODUCTO
      if (producto.categoria === "Teléfono" || producto.tipo === "telefono") {
        // 📱 TELÉFONO: Usar precioCosto que ya viene en el producto
        costo = Number(producto.precioCosto || 0);
        
      } else if (producto.codigo && mapaStock[producto.codigo]) {
        // 🔌 ACCESORIO/REPUESTO/STOCKEXTRA: Buscar en mapa de stock
        costo = mapaStock[producto.codigo].costo;
        console.log(`✅ Costo encontrado para ${producto.codigo}:`, costo);
        
      } else {
        // ❌ NO SE ENCONTRÓ COSTO
        console.log(`❌ No se encontró costo para:`, producto.codigo || 'sin código');
        costo = 0;
      }

      // 🔥 CALCULAR GANANCIA: (precioVenta - costo) × cantidad
      const gananciaUnitaria = precioVenta - costo;
      const gananciaTotal = gananciaUnitaria * cantidad;

      console.log('🔍 Resultado:', {
        producto: producto.producto || producto.codigo,
        precioVenta,
        costo,
        gananciaUnitaria,
        cantidad,
        gananciaTotal
      });

      return {
        ...producto,
        costo,                    // 🔥 COSTO UNITARIO
        ganancia: gananciaTotal,  // 🔥 GANANCIA TOTAL (cantidad incluida)
        precioVenta,              // 🔥 PRECIO DE VENTA UNITARIO
      };
    });
  };

  const guardarVentaTelefono = async (datosVentaTelefono: any, pagoTelefono: any) => {
    if (!rol?.negocioID) return;

    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    // 🔥 CALCULAR GANANCIA DEL TELÉFONO
    const costoTelefono = Number(datosVentaTelefono.precioCosto || 0);
    const precioVentaTelefono = Number(datosVentaTelefono.precioVenta || 0);
    const gananciaTelefono = precioVentaTelefono - costoTelefono;

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
      precioCosto: costoTelefono,                    // 🔥 COSTO
      precioVenta: precioVentaTelefono,              // 🔥 PRECIO VENTA
      ganancia: gananciaTelefono,                    // 🔥 GANANCIA
      moneda: moneda,
      stockID: datosVentaTelefono.stockID || "",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      telefonoRecibido: datosVentaTelefono.telefonoRecibido || null,
      nroVenta: nroVenta,
      creadoEn: Timestamp.now(),
      id: "",
    });

    // 2. Actualizar con el ID generado
    await updateDoc(ventaTelefonosRef, { id: ventaTelefonosRef.id });

    // 3. Crear la MISMA venta en ventasGeneral
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
          precioUnitario: precioVentaTelefono,
          costo: costoTelefono,                      // 🔥 COSTO
          ganancia: gananciaTelefono,                // 🔥 GANANCIA
          moneda: moneda,
          gb: datosVentaTelefono.gb || "",
          codigo: datosVentaTelefono.stockID || datosVentaTelefono.modelo,
          tipo: "telefono",
        },
      ],
      total: precioVentaTelefono,
      gananciaTotal: gananciaTelefono,               // 🔥 GANANCIA TOTAL
      tipo: "telefono",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      timestamp: serverTimestamp(),
      estado: "pendiente",
      moneda: moneda,
      nroVenta: nroVenta,
    });

    // 4. Eliminar del stock si tiene stockID
    if (datosVentaTelefono.stockID) {
      await deleteDoc(doc(db, `negocios/${rol.negocioID}/stockTelefonos/${datosVentaTelefono.stockID}`));
    }

    // 5. Registrar el pago si existe
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
        cotizacion: cotizacion,                      // 🔥 USAR COTIZACIÓN DEL HOOK
        observaciones: pagoTelefono.observaciones || "",
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
      });
    }

    return ventaTelefonosRef.id;
  };

  // 🔧 FUNCIÓN guardarVentaNormal CORREGIDA
  const guardarVentaNormal = async () => {
    if (!rol?.negocioID) return;
    
    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
    const snap = await getDoc(configRef);
    const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];

    // 🔥 OBTENER PRODUCTOS CON COSTOS Y GANANCIAS CALCULADAS
    const productosConDatos = await obtenerDatosConCostos(productos.map((p) => ({
      ...p,
      codigo: p.codigo || p.id || "",
    })));

    console.log('🚀 PRODUCTOS CON COSTOS Y GANANCIAS:', productosConDatos);

    // Descontar del stock para accesorios y repuestos
    for (const producto of productosConDatos) {
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

    // ✅ PREPARAR PAGO
    const pagoLimpio = {
      monto: pago?.moneda === "USD" ? null : (pago?.monto || pago?.montoUSD || 0),
      montoUSD: pago?.moneda === "USD" ? (pago?.montoUSD || pago?.monto || 0) : null,
      moneda: pago?.moneda || "ARS",
      forma: pago?.formaPago || "",
      destino: pago?.destino || "",
      observaciones: pago?.observaciones || "",
      cotizacion: cotizacion,                        // 🔥 USAR COTIZACIÓN DEL HOOK
    };

    // 🔥 CALCULAR TOTALES
    const total = productosConDatos.reduce((acc, p) => {
      return acc + (p.precioUnitario * p.cantidad);
    }, 0);

    const gananciaTotal = productosConDatos.reduce((acc, p) => {
      return acc + p.ganancia;  // ganancia ya incluye cantidad
    }, 0);

    console.log('💰 Total calculado:', total);
    console.log('💰 Ganancia total calculada:', gananciaTotal);

    // ✅ CREAR LA VENTA CON TODOS LOS CAMPOS
    const ventaRef = await addDoc(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), {
      productos: productosConDatos.map(p => ({
        categoria: p.categoria,
        descripcion: p.producto || p.descripcion,
        marca: p.marca || "—",
        modelo: p.modelo || "—", 
        color: p.color || "—",
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario,
        costo: p.costo,                            // 🔥 COSTO UNITARIO
        ganancia: p.ganancia,                      // 🔥 GANANCIA TOTAL (con cantidad)
        moneda: p.moneda || moneda,
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
      total,                                       // 🔥 TOTAL CORRECTO
      gananciaTotal,                               // 🔥 GANANCIA TOTAL CORRECTA
      timestamp: serverTimestamp(),
    });

    // ✅ GUARDAR EL PAGO SI EXISTE
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
        cotizacion: cotizacion,                    // 🔥 USAR COTIZACIÓN DEL HOOK
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
      // Verificar si es una venta de teléfono pendiente
      const ventaTelefonoPendiente = localStorage.getItem("ventaTelefonoPendiente");
      
      if (ventaTelefonoPendiente && desdeTelefono) {
        // Es una venta de teléfono, pero también puede tener otros productos
        const datosVentaTelefono = JSON.parse(ventaTelefonoPendiente);
        const pagoTelefono = pago || {};
        
        const otrosProductos = productos.filter(p => p.categoria !== "Teléfono");
        
        // Guardar la venta de teléfono
        const telefonoID = await guardarVentaTelefono(datosVentaTelefono, pagoTelefono);
        
        // Si hay otros productos, agregarlos a la venta
        if (otrosProductos.length > 0) {
          // 🔥 OBTENER DATOS CON COSTOS PARA OTROS PRODUCTOS
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
          
          // Actualizar la venta en ventasGeneral agregando los otros productos
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
                costo: p.costo,                      // 🔥 COSTO
                ganancia: p.ganancia,                // 🔥 GANANCIA
                moneda: p.moneda || moneda,
                codigo: p.codigo,
                tipo: p.tipo,
                hoja: p.hoja || "",
              }))
            ];
            
            // 🔥 CALCULAR NUEVOS TOTALES
            const nuevoTotal = productosCompletos.reduce((acc, p) => {
              return acc + (p.precioUnitario * p.cantidad);
            }, 0);
            
            const nuevaGananciaTotal = productosCompletos.reduce((acc, p) => {
              return acc + p.ganancia;
            }, 0);
            
            await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${telefonoID}`), {
              productos: productosCompletos,
              total: nuevoTotal,
              gananciaTotal: nuevaGananciaTotal,     // 🔥 GANANCIA TOTAL
              moneda: moneda,
            });
          }
        }
        
        // Limpiar localStorage
        localStorage.removeItem("ventaTelefonoPendiente");
        localStorage.removeItem("pagoTelefonoPendiente");
        localStorage.removeItem("clienteDesdeTelefono");
      } else {
        // Venta general normal
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