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
  onGuardar,
}: {
  cliente: string;
  productos: any[];
  fecha: string;
  observaciones: string;
  pago: any;
  moneda: "ARS" | "USD";
  onGuardar?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const desdeTelefono = searchParams.get("desdeTelefono") === "1";

  const { rol } = useRol();
  const [guardando, setGuardando] = useState(false);

  // 🔧 CORRECCIÓN 1: Función para calcular total correcto
  const calcularTotalCorrect = (productos: any[]) => {
    const hayTelefono = productos.some(p => p.categoria === "Teléfono");
    
    return productos.reduce((acc, p) => {
      if (hayTelefono) {
        // 📱 CON TELÉFONO: Usar precio USD
        const precioUSD = p.categoria === "Teléfono" 
          ? p.precioUnitario 
          : (p.precioUSD || p.precioUnitario);
        return acc + (precioUSD * p.cantidad);
      } else {
        // 🛍️ SIN TELÉFONO: Usar precio ARS
        return acc + (p.precioUnitario * p.cantidad);
      }
    }, 0);
  };

  const guardarVentaTelefono = async (datosVentaTelefono: any, pagoTelefono: any) => {
    if (!rol?.negocioID) return;

    // 🔥 AGREGAR: Obtener y sumar número de venta
    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    // 1. Crear venta en ventaTelefonos con ID específico
    const ventaTelefonosRef = await addDoc(collection(db, `negocios/${rol.negocioID}/ventaTelefonos`), {
      // TODOS los campos de la venta de teléfono
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
      precioCosto: datosVentaTelefono.precioCosto || 0,
      precioVenta: datosVentaTelefono.precioVenta,
      ganancia: datosVentaTelefono.ganancia,
      moneda: datosVentaTelefono.moneda || "ARS",
      stockID: datosVentaTelefono.stockID || "",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      // Datos del teléfono recibido (si existe)
      telefonoRecibido: datosVentaTelefono.telefonoRecibido || null,
      // 🔥 AGREGAR: Número de venta
      nroVenta: nroVenta,
      // Metadatos
      creadoEn: Timestamp.now(),
      id: "", // Se actualiza abajo
    });

    // 2. Actualizar con el ID generado
    await updateDoc(ventaTelefonosRef, { id: ventaTelefonosRef.id });

    // 3. Crear la MISMA venta en ventasGeneral con el MISMO ID
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
          precioUnitario: datosVentaTelefono.precioVenta,
          moneda: datosVentaTelefono.moneda,
          gb: datosVentaTelefono.gb || "",
          codigo: datosVentaTelefono.stockID || datosVentaTelefono.modelo,
          tipo: "telefono",
        },
      ],
      total: datosVentaTelefono.precioVenta,
      tipo: "telefono",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      timestamp: serverTimestamp(),
      estado: "pendiente",
      moneda: datosVentaTelefono.moneda,
      // 🔥 AGREGAR: Número de venta también en ventasGeneral
      nroVenta: nroVenta,
    });

    // 4. Eliminar del stock si tiene stockID
    if (datosVentaTelefono.stockID) {
      await deleteDoc(doc(db, `negocios/${rol.negocioID}/stockTelefonos/${datosVentaTelefono.stockID}`));
    }

    // 5. Registrar el pago si existe
    // 🔧 AGREGAR ESTOS CONSOLE.LOG EN BotonGuardarVenta.tsx
    // En la función guardarVentaTelefono(), antes de calcular montoPagado:

    console.log('🐛 DEBUG VENTA TELEFONO:');
    console.log('📱 datosVentaTelefono:', datosVentaTelefono);
    console.log('💰 pagoTelefono completo:', pagoTelefono);
    console.log('💵 pagoTelefono.monto:', pagoTelefono.monto);
    console.log('💲 pagoTelefono.montoUSD:', pagoTelefono.montoUSD);
    console.log('🪙 pagoTelefono.moneda:', pagoTelefono.moneda);

    // ANTES de esta línea:
    const montoPagado = pagoTelefono.moneda === "USD" 
      ? Number(pagoTelefono.montoUSD || 0)
      : Number(pagoTelefono.monto || 0);

    console.log('💎 montoPagado calculado:', montoPagado);
    console.log('📱 valorTelefonoEntregado:', Number(datosVentaTelefono.telefonoRecibido?.precioCompra || 0));
    console.log('💯 totalPagado final:', montoPagado + Number(datosVentaTelefono.telefonoRecibido?.precioCompra || 0));
    
    const valorTelefonoEntregado = Number(datosVentaTelefono.telefonoRecibido?.precioCompra || 0);
    const totalPagado = montoPagado + valorTelefonoEntregado;

    if (totalPagado > 0) {
      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        fecha: fecha,
        cliente: cliente,
        monto: datosVentaTelefono.moneda === "USD" ? null : totalPagado,
        montoUSD: datosVentaTelefono.moneda === "USD" ? totalPagado : null,
        forma: valorTelefonoEntregado > 0 ? "Efectivo + Entrega equipo" : pagoTelefono.formaPago || "Efectivo",
        destino: "ventaTelefonos",
        moneda: datosVentaTelefono.moneda,
        cotizacion: 1000,
        observaciones: pagoTelefono.observaciones || "",
        timestamp: serverTimestamp(),
        // 🔥 AGREGAR: Número de venta en el pago también
        nroVenta: nroVenta,
      });
    }

    return ventaTelefonosRef.id;
  };

  // 🔧 REEMPLAZAR COMPLETAMENTE la función guardarVentaNormal en tu BotonGuardarVenta:
  const guardarVentaNormal = async () => {
    if (!rol?.negocioID) return;

    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);

    const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
    const snap = await getDoc(configRef);
    const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];

    const productosConCodigo = productos.map((p) => ({
      ...p,
      codigo: p.codigo || p.id || "",
    }));

    // Descontar del stock para accesorios y repuestos
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

    // ✅ PREPARAR PAGO CON ESTRUCTURA CORRECTA
    const pagoLimpio = {
      monto: pago?.moneda === "USD" ? null : (pago?.monto || pago?.montoUSD || 0),
      montoUSD: pago?.moneda === "USD" ? (pago?.montoUSD || pago?.monto || 0) : null,
      moneda: pago?.moneda || "ARS",
      forma: pago?.formaPago || "",
      destino: pago?.destino || "",
      observaciones: pago?.observaciones || "",
    };

    // 🔧 CORRECCIÓN 2: Usar calcularTotalCorrect en lugar del reduce simple
    const total = calcularTotalCorrect(productosConCodigo);

    // ✅ CREAR LA VENTA
    const ventaRef = await addDoc(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), {
      productos: productosConCodigo,
      cliente,
      fecha,
      observaciones,
      pago: pagoLimpio,
      moneda,
      estado: "pendiente",
      nroVenta,
      total,
      timestamp: serverTimestamp(),
    });

    // ✅ GUARDAR EL PAGO SI EXISTE
    const montoAGuardar = pago?.moneda === "USD" 
      ? Number(pago?.montoUSD || 0) 
      : Number(pago?.monto || 0);

    console.log('🔍 Debug pago:', {
      moneda: pago?.moneda,
      monto: pago?.monto,
      montoUSD: pago?.montoUSD,
      montoFinal: montoAGuardar
    });

    if (montoAGuardar > 0) {
      console.log('💾 Guardando pago en Firebase...', {
        monto: pago?.moneda === "USD" ? null : montoAGuardar,
        montoUSD: pago?.moneda === "USD" ? montoAGuardar : null,
        moneda: pago?.moneda || "ARS"
      });

      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        cliente,
        fecha,
        monto: pago?.moneda === "USD" ? null : montoAGuardar,
        montoUSD: pago?.moneda === "USD" ? montoAGuardar : null,
        moneda: pago?.moneda || "ARS",
        forma: pago?.formaPago || "Efectivo",
        destino: pago?.destino || "",
        observaciones: pago?.observaciones || "",
        cotizacion: 1000,
        timestamp: serverTimestamp(),
        nroVenta: nroVenta,
      });

      console.log('✅ Pago guardado exitosamente');
    } else {
      console.log('❌ No se guarda pago. Monto calculado:', montoAGuardar);
    }

    return ventaRef.id;
  };

  const guardarVenta = async () => {
    if (!rol?.negocioID || productos.length === 0 || !cliente) return;
    setGuardando(true);

    try {
      // Verificar si es una venta de teléfono pendiente
      const ventaTelefonoPendiente = localStorage.getItem("ventaTelefonoPendiente");
      const pagoTelefonoPendiente = localStorage.getItem("pagoTelefonoPendiente");
      
      if (ventaTelefonoPendiente && desdeTelefono) {
        // Es una venta de teléfono, pero también puede tener otros productos
        const datosVentaTelefono = JSON.parse(ventaTelefonoPendiente);
        const pagoTelefono = pago || {};         
        // Separar el teléfono de otros productos
        const telefono = productos.find(p => p.categoria === "Teléfono");
        const otrosProductos = productos.filter(p => p.categoria !== "Teléfono");
        
        // Guardar la venta de teléfono (ahora con nroVenta)
        const telefonoID = await guardarVentaTelefono(datosVentaTelefono, pagoTelefono);
        
        // Si hay otros productos (accesorios/repuestos), agregarlos a la venta
        if (otrosProductos.length > 0) {
          // Descontar del stock para accesorios y repuestos
          const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
          const snap = await getDoc(configRef);
          const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];
          
          for (const producto of otrosProductos) {
            const codigo = producto.codigo;
            if (!codigo) continue;

            if (producto.tipo === "accesorio") {
              await descontarAccesorioDelStock(rol.negocioID, codigo, producto.cantidad);
            }

            if (producto.tipo === "repuesto" || producto.tipo === "general") {
              await descontarRepuestoDelStock(rol.negocioID, codigo, producto.cantidad);

              // Lógica de Google Sheets para repuestos
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
              ...otrosProductos.map(p => ({
                categoria: p.categoria,
                descripcion: p.producto,
                marca: p.marca || "—",
                modelo: p.modelo || "—",
                color: p.color || "—",
                cantidad: p.cantidad,
                precioUnitario: p.precioUnitario,
                moneda: p.moneda,
                codigo: p.codigo,
                tipo: p.tipo,
                hoja: p.hoja || "",
              }))
            ];
            
            // 🔧 CORRECCIÓN 3: Usar calcularTotalCorrect para ventas mixtas
            const nuevoTotal = calcularTotalCorrect(productosCompletos);
            
            await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${telefonoID}`), {
              productos: productosCompletos,
              total: nuevoTotal,
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
        {/* Botón Guardar Venta - Estilo GestiOne */}
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