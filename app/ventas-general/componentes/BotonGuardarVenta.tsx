"use client";

import { useState, useEffect, useRef } from "react";
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
import { auth } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useRol } from "@/lib/useRol";
import {
  STORAGE_PEDIDO_TIENDA,
  STORAGE_PEDIDO_TIENDA_ACTIVO,
  marcarPedidoTiendaProcesado,
} from "@/lib/usePedidosTiendaPendientesVenta";
import {
  esProductoAccesorio,
  esProductoLibre,
  esProductoRepuestoOGeneral,
} from "@/lib/ventasStockProducto";
import { actualizarStockVentaViaApi } from "@/lib/actualizarStockVentaApi";
import { obtenerYSumarNumeroVenta } from "@/lib/ventas/contadorVentas";
import { query, where, limit } from "firebase/firestore";
import {
  calcularSaldosVenta,
  calcularUsdDesdeARS,
  cotizacionEfectiva,
  creditoUSDVentaSoloUSD,
  esVentaSoloUSD,
  notaConversionARSaUSD,
  ventaEstaPagada,
} from "@/lib/ventas/pagoDualHelpers";
import {
  normalizarVentaTelefonoPendiente,
  totalesTelefonosVenta,
} from "@/lib/ventas/telefonoVentaHelpers";
export default function BotonGuardarVenta({
  cliente,
  productos,
  fecha,
  observaciones,
  pago,
  moneda,
  cotizacion,
  onGuardar,
  desdePedidoTienda = false,
}: {
  cliente: string;
  productos: any[];
  fecha: string;
  observaciones: string;
  pago: any;
  moneda: "ARS" | "USD";
  cotizacion: number;
  onGuardar?: () => void;
  desdePedidoTienda?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const desdeTelefono = searchParams.get("desdeTelefono") === "1";

  const { rol } = useRol();
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);

  const leerMetaPedidoTienda = () => {
    const raw = localStorage.getItem(STORAGE_PEDIDO_TIENDA_ACTIVO);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (!data?.negocioId || !data?.pedidoId) return null;
      return data as { negocioId: string; pedidoId: string; pedidoNumero?: string };
    } catch {
      return null;
    }
  };

  const vincularPedidoTienda = async (ventaGeneralId: string) => {
    const meta = leerMetaPedidoTienda();
    if (!meta) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch("/api/tienda/pedidos/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          negocioId: meta.negocioId,
          pedidoId: meta.pedidoId,
          ventaGeneralId,
        }),
      });
      marcarPedidoTiendaProcesado(meta.pedidoId);
      localStorage.removeItem(STORAGE_PEDIDO_TIENDA_ACTIVO);
      localStorage.removeItem(STORAGE_PEDIDO_TIENDA);
    } catch (error) {
      console.error("Error vinculando pedido tienda:", error);
    }
  };

  // ⭐ NUEVO: Función para actualizar saldo del cliente
const actualizarSaldoCliente = async (nombreCliente: string, sumarARS: number, sumarUSD: number) => {
  if (!rol?.negocioID) return;

  try {
    const clientesSnap = await getDocs(
      query(
        collection(db, `negocios/${rol.negocioID}/clientes`),
        where("nombre", "==", nombreCliente),
        limit(1)
      )
    );

    if (clientesSnap.empty) {
      console.log(`⚠️ Cliente no encontrado: ${nombreCliente}`);
      return;
    }

    const clienteDoc = clientesSnap.docs[0];
    const datosCliente = clienteDoc.data();

    const nuevoSaldoARS = Number(datosCliente.saldoARS ?? 0) + Number(sumarARS);
    const nuevoSaldoUSD = Number(datosCliente.saldoUSD ?? 0) + Number(sumarUSD);

    await updateDoc(clienteDoc.ref, {
      saldoARS: Number(Math.round(nuevoSaldoARS * 100) / 100),
      saldoUSD: Number(Math.round(nuevoSaldoUSD * 100) / 100),
      ultimaActualizacion: serverTimestamp()
    });

    console.log(`✅ Saldo actualizado: ${nombreCliente} | ARS ${sumarARS > 0 ? '+' : ''}${sumarARS} | USD ${sumarUSD > 0 ? '+' : ''}${sumarUSD}`);
  } catch (error) {
    console.error(`❌ Error actualizando saldo de ${nombreCliente}:`, error);
  }
};

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
    // Venta en USD -> necesitamos costo en USD (aunque el stock tenga solo costo en ARS)
    const stockMoneda = String(stockData.moneda || "USD").toUpperCase();
    if (stockMoneda === "USD") {
      const costoUSD =
        Number(stockData.precioCosto || 0) ||
        (Number(stockData.precioCostoPesos || 0) > 0 && cotizacionActual > 0
          ? Number(stockData.precioCostoPesos || 0) / cotizacionActual
          : 0);
      costoCalculado = costoUSD;
    } else {
      // Stock en ARS vendido en USD -> convertir costo ARS a USD
      const costoARS = Number(stockData.precioCostoPesos || stockData.precioCosto || 0);
      costoCalculado = cotizacionActual > 0 ? costoARS / cotizacionActual : 0;
    }
  } else {
    // Venta en ARS (Pesos)
    const stockMoneda = String(stockData.moneda || "USD").toUpperCase();
    if (stockMoneda === "ARS") {
      // Producto nativo ARS -> costo ARS directo
      costoCalculado = Number(stockData.precioCostoPesos || stockData.precioCosto || 0);
    } else {
      // Stock en USD vendido en ARS -> costo USD * cotización (o usar costo en ARS si ya existe)
      const costoARSDirecto = Number(stockData.precioCostoPesos || 0);
      if (costoARSDirecto > 0) {
        costoCalculado = costoARSDirecto;
      } else {
        const costoUSD = Number(stockData.precioCosto || 0);
        costoCalculado = costoUSD * cotizacionActual;
      }
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
    
    const mapaStockPorId: Record<string, any> = {};
    const mapaStockPorCodigo: Record<string, any> = {};

    const indexarSnap = (snap: typeof stockAccesoriosSnap, tipo: string) => {
      snap.forEach((doc) => {
        const data = doc.data();
        const entry = {
          precioCosto: Number(data.precioCosto || 0),
          precioCostoPesos: Number(data.precioCostoPesos || 0),
          moneda: data.moneda || "USD",
          precio1: Number(data.precio1 || 0),
          precio2: Number(data.precio2 || 0),
          precio3: Number(data.precio3 || 0),
          precio1Pesos: Number(data.precio1Pesos || 0),
          precio2Pesos: Number(data.precio2Pesos || 0),
          precio3Pesos: Number(data.precio3Pesos || 0),
          tipo,
        };
        mapaStockPorId[doc.id] = entry;
        const cod = String(data.codigo ?? "").trim();
        if (cod && !mapaStockPorCodigo[cod]) {
          mapaStockPorCodigo[cod] = entry;
        }
      });
    };

    indexarSnap(stockAccesoriosSnap, "accesorio");
    indexarSnap(stockRepuestosSnap, "repuesto");
    indexarSnap(stockExtraSnap, "stockExtra");

    console.log("🔍 Mapa de stock creado:", Object.keys(mapaStockPorId).length, "por id");

    return productos.map(producto => {
      const cantidad = producto.cantidad || 1;
      const precioUnitario = producto.precioUnitario || 0;

      if (esProductoLibre(producto)) {
        const precioVentaReal = Number(
          producto.moneda === "USD"
            ? producto.precioUSD ?? producto.precioUnitario ?? 0
            : producto.precioARS ?? producto.precioUnitario ?? 0
        );
        return {
          ...producto,
          tipo: "libre",
          sinStock: true,
          origenStock: "manual",
          codigo: "",
          precioUnitario: precioVentaReal,
          precioVenta: precioVentaReal * cantidad,
          precioCosto: 0,
          precioCostoPesos: 0,
          ganancia: precioVentaReal * cantidad,
          cotizacionUsada: cotizacionActual,
        };
      }

      const docId = String(producto.stockDocId ?? producto.id ?? "").trim();
      const stockData =
        (docId && mapaStockPorId[docId]) ||
        (producto.codigo && mapaStockPorCodigo[producto.codigo]) ||
        null;

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
          const stockMoneda = String(stockData.moneda || "USD").toUpperCase();
          // Guardar costo "crudo" (USD o ARS) si existe; si falta, derivarlo desde el otro campo.
          if (stockMoneda === "USD") {
            precioCosto =
              Number(stockData.precioCosto || 0) ||
              (Number(stockData.precioCostoPesos || 0) > 0 && cotizacionActual > 0
                ? Number(stockData.precioCostoPesos || 0) / cotizacionActual
                : 0);
          } else {
            precioCosto = Number(stockData.precioCosto || stockData.precioCostoPesos || 0);
          }
          
          // Guardamos el costo en pesos actualizado para el historial de la venta
          if (stockMoneda === "USD") {
            // Si ya tenemos costo en ARS directo (precioCostoPesos), priorizarlo; si no, derivar.
            precioCostoPesos =
              Number(stockData.precioCostoPesos || 0) > 0
                ? Number(stockData.precioCostoPesos || 0)
                : precioCosto * cotizacionActual;
          } else {
            precioCostoPesos = Number(stockData.precioCostoPesos || precioCosto); // Nativo ARS
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

  const guardarVentaTelefono = async (datosVentaTelefono: any, pagoTelefono: any) => {
    if (!rol?.negocioID) return;

    const { telefonos, telefonosRecibidos } = normalizarVentaTelefonoPendiente(datosVentaTelefono);
    if (telefonos.length === 0) return;

    const telefonosPagoDesdeModal = Array.isArray(pagoTelefono?.telefonosComoPago)
      ? pagoTelefono.telefonosComoPago
      : pagoTelefono?.telefonoComoPago
        ? [pagoTelefono.telefonoComoPago]
        : [];

    const telefonosRecibidosFinal =
      telefonosRecibidos.length > 0
        ? telefonosRecibidos
        : telefonosPagoDesdeModal.map((t: any) => ({
            marca: t.marca,
            modelo: t.modelo,
            precioCompra: t.valorPago,
            moneda: t.moneda,
            color: t.color,
            estado: t.estado,
            imei: t.imei,
          }));

    const nroVenta = await obtenerYSumarNumeroVenta(rol.negocioID);
    const { totalARS, totalUSD } = totalesTelefonosVenta(telefonos);

    const productosTel = telefonos.map((tel) => {
      const precioCosto = Number(tel.precioCosto || 0);
      const precioUnitario = Number(tel.precioVenta || 0);
      return {
        categoria: "Teléfono",
        descripcion: tel.estado,
        marca: tel.marca || "—",
        modelo: tel.modelo,
        color: tel.color || "—",
        cantidad: 1,
        precioUnitario,
        precioCosto,
        precioCostoPesos: precioCosto,
        precioVenta: precioUnitario,
        ganancia: precioUnitario - precioCosto,
        moneda: tel.moneda || "USD",
        gb: tel.gb || "",
        codigo: tel.stockID || tel.modelo,
        tipo: "telefono",
        origenStock: "stockTelefonos",
      };
    });

    const gananciaTotal = productosTel.reduce((acc, p) => acc + p.ganancia, 0);
    const totalAproximado = totalARS + totalUSD * cotizacion;

    const telefonosPagoInput = telefonosRecibidosFinal
      .map((tr) => ({
        valorPago: Number(tr.precioCompra ?? tr.precioEstimado ?? tr.valorPago ?? 0),
        moneda: String(tr.moneda ?? "ARS"),
      }))
      .filter((t) => t.valorPago > 0);

    const valorTelefonoEntregado = telefonosPagoInput.reduce((acc, t) => {
      return acc + (String(t.moneda).toUpperCase() === "USD" ? t.valorPago * cotizacion : t.valorPago);
    }, 0);

    const pagoARS_TelPreview = Number(pagoTelefono.monto || 0);
    const pagoUSD_TelPreview = Number(pagoTelefono.montoUSD || 0);
    const cotTelPreview = cotizacionEfectiva(
      Number(pagoTelefono.cotizacionPago) || 0,
      cotizacion
    );
    const ventaTelSoloUSD = esVentaSoloUSD(totalARS, totalUSD);

    const saldosTel = calcularSaldosVenta({
      totalARS,
      totalUSD,
      pagoARS: pagoARS_TelPreview,
      pagoUSD: pagoUSD_TelPreview,
      cotizacion: cotTelPreview,
      telefonosPago: telefonosPagoInput,
    });
    const saldoAPagar = Math.max(0, saldosTel.saldoAproximado);
    const estadoTel = ventaEstaPagada(saldosTel.saldoARS, saldosTel.saldoUSD)
      ? "pagado"
      : "pendiente";

    const monedaVenta =
      totalUSD > 0 && totalARS > 0 ? "DUAL" : totalUSD > 0 ? "USD" : "ARS";

    let ventaTelefonosRef: Awaited<ReturnType<typeof addDoc>> | null = null;

    for (let i = 0; i < telefonos.length; i++) {
      const tel = telefonos[i];
      const precioCosto = Number(tel.precioCosto || 0);
      const precioVenta = Number(tel.precioVenta || 0);
      const ganancia = precioVenta - precioCosto;

      const ref = await addDoc(collection(db, `negocios/${rol.negocioID}/ventaTelefonos`), {
        fecha: tel.fecha,
        fechaIngreso: tel.fechaIngreso || tel.fecha,
        proveedor: tel.proveedor || "",
        cliente,
        modelo: tel.modelo,
        marca: tel.marca || "",
        color: tel.color || "",
        estado: tel.estado || "nuevo",
        bateria: tel.bateria || "",
        gb: tel.gb || "",
        imei: tel.imei || "",
        serie: tel.serie || "",
        precioCosto,
        precioVenta,
        ganancia,
        moneda: tel.moneda || "USD",
        stockID: tel.stockID || "",
        observaciones: pagoTelefono.observaciones || observaciones || "",
        telefonosRecibidos: telefonosRecibidosFinal.length > 0 ? telefonosRecibidosFinal : null,
        telefonoRecibido: telefonosRecibidosFinal[0] || null,
        valorTelefonoEntregado: i === 0 ? valorTelefonoEntregado : 0,
        saldoPendiente: i === 0 ? saldoAPagar : 0,
        nroVenta,
        indiceEnVenta: i,
        totalTelefonosVenta: telefonos.length,
        creadoEn: Timestamp.now(),
        id: "",
      });
      await updateDoc(ref, { id: ref.id });
      if (!ventaTelefonosRef) ventaTelefonosRef = ref;

      if (tel.stockID) {
        await deleteDoc(doc(db, `negocios/${rol.negocioID}/stockTelefonos/${tel.stockID}`));
      }
    }

    if (!ventaTelefonosRef) return;

    await setDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${ventaTelefonosRef.id}`), {
      fecha,
      cliente,
      productos: productosTel,
      total: totalAproximado,
      totalARS,
      totalUSD,
      gananciaTotal,
      tipo: "telefono",
      observaciones: pagoTelefono.observaciones || observaciones || "",
      timestamp: serverTimestamp(),
      estado: estadoTel,
      moneda: monedaVenta,
      nroVenta,
      telefonosComoPago: telefonosPagoInput,
      telefonoComoPago: telefonosPagoInput[0] ?? null,
      valorTelefonoEntregado,
      saldoPendiente: saldoAPagar,
      saldoPendienteARS: Math.max(0, saldosTel.saldoARS),
      saldoPendienteUSD: Math.max(0, saldosTel.saldoUSD),
    });

    await actualizarSaldoCliente(cliente, totalARS, totalUSD);

    for (let i = 0; i < telefonosRecibidosFinal.length; i++) {
      const tr = telefonosRecibidosFinal[i];
      const valorPago = Number(tr.precioCompra ?? tr.precioEstimado ?? tr.valorPago ?? 0);
      if (valorPago <= 0) continue;
      const monedaTel = String(tr.moneda ?? "ARS").toUpperCase() === "USD" ? "USD" : "ARS";

      const stockParteDePago = {
        fechaIngreso: Timestamp.now(),
        creadoEn: Timestamp.now(),
        proveedor: `Parte de pago - ${cliente}`,
        modelo: String(tr.modelo ?? "").trim(),
        marca: String(tr.marca ?? "").trim(),
        estado: String(tr.estado ?? "usado").toLowerCase() === "nuevo" ? "nuevo" : "usado",
        bateria: String(tr.bateria ?? "").trim(),
        gb: String(tr.gb ?? "").trim(),
        color: String(tr.color ?? "").trim(),
        imei: String(tr.imei ?? "").trim(),
        serial: String(tr.serie ?? tr.serial ?? "").trim(),
        precioCompra: valorPago,
        precioVenta: valorPago,
        precioMayorista: "",
        moneda: monedaTel,
        observaciones:
          String(tr.observaciones ?? "").trim() ||
          `Teléfono recibido como parte de pago - Venta #${nroVenta}`,
        tipo: "telefono",
        origen: "parte_de_pago",
        ventaId: ventaTelefonosRef.id,
      };
      const idFijo = `parte_pago_${ventaTelefonosRef.id}_${i}`;
      await setDoc(doc(db, `negocios/${rol.negocioID}/stockTelefonos`, idFijo), stockParteDePago);

      await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
        fecha,
        cliente,
        monto: monedaTel === "ARS" ? valorPago : null,
        montoUSD: monedaTel === "USD" ? valorPago : null,
        forma: "Entrega equipo",
        destino: "ventaTelefonos",
        moneda: monedaTel,
        cotizacion,
        observaciones: `Teléfono entregado: ${tr.modelo || ""}`,
        timestamp: serverTimestamp(),
        nroVenta,
        excluirDeCaja: true,
        tipoPago: "entrega_equipo",
        detallesPago: {
          tipoEquipo: "telefono",
          modeloEntregado: tr.modelo || "",
          marcaEntregada: tr.marca || "",
          valorOriginal: valorPago,
          monedaOriginal: monedaTel,
        },
      });

      await actualizarSaldoCliente(
        cliente,
        monedaTel === "ARS" ? -valorPago : 0,
        monedaTel === "USD" ? -valorPago : 0
      );
    }

    const pagoARS_Tel = Number(pagoTelefono.monto || 0);
    const pagoUSD_Tel = Number(pagoTelefono.montoUSD || 0);
    const cotTel = cotTelPreview;
    const creditoUSDTel = ventaTelSoloUSD
      ? creditoUSDVentaSoloUSD(pagoARS_Tel, pagoUSD_Tel, cotTel)
      : Math.max(0, pagoUSD_Tel);

    const basePagoTel = {
      fecha,
      cliente,
      destino: "ventaTelefonos",
      cotizacion: cotTel,
      observaciones: pagoTelefono.observaciones || "",
      timestamp: serverTimestamp(),
      nroVenta,
    };

    if (ventaTelSoloUSD) {
      if (pagoUSD_Tel > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoTel,
          monto: null,
          montoUSD: pagoUSD_Tel,
          moneda: "USD",
          forma: pagoTelefono.formaPago
            ? `${pagoTelefono.formaPago} USD`.replace(/\s+USD USD/i, " USD")
            : "Efectivo USD",
          detallesPago: { tipo: "USD" },
        });
      }
      if (pagoARS_Tel > 0) {
        const usdEquiv = calcularUsdDesdeARS(pagoARS_Tel, cotTel);
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoTel,
          monto: pagoARS_Tel,
          montoUSD: null,
          moneda: "ARS",
          forma: pagoTelefono.formaPago || "Efectivo",
          observaciones: [
            pagoTelefono.observaciones || "",
            notaConversionARSaUSD(pagoARS_Tel, usdEquiv, cotTel),
          ]
            .filter(Boolean)
            .join(" • "),
          detallesPago: {
            tipo: "ARS_a_USD",
            montoUSDEquivalente: usdEquiv,
            montoARSOriginal: pagoARS_Tel,
            cotizacionPago: cotTel,
          },
        });
      }
      if (creditoUSDTel > 0) {
        await actualizarSaldoCliente(cliente, 0, -creditoUSDTel);
      }
    } else {
      if (pagoARS_Tel > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoTel,
          monto: pagoARS_Tel,
          montoUSD: null,
          moneda: "ARS",
          forma: pagoTelefono.formaPago || "Efectivo",
        });
        await actualizarSaldoCliente(cliente, -pagoARS_Tel, 0);
      }
      if (pagoUSD_Tel > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoTel,
          monto: null,
          montoUSD: pagoUSD_Tel,
          moneda: "USD",
          forma: pagoTelefono.formaPago
            ? `${pagoTelefono.formaPago} USD`.replace(/\s+USD USD/i, " USD")
            : "Efectivo USD",
        });
        await actualizarSaldoCliente(cliente, 0, -pagoUSD_Tel);
      }
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

    const pedidoMetaStock = desdePedidoTienda ? leerMetaPedidoTienda() : null;
    const negocioStock = pedidoMetaStock?.negocioId || rol.negocioID;

    await actualizarStockVentaViaApi(negocioStock, productosConCodigo, "descontar");

    for (const producto of productosConCodigo) {
      const codigo = String(producto.codigo ?? producto.id ?? "").trim();
      if (!codigo || !esProductoRepuestoOGeneral(producto)) continue;

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

    // ✅ PREPARAR PAGOS — registra efectivo físico por moneda; venta solo USD suma ARS+USD convertido
    const pagoARS = Number(pago?.monto || 0);
    const pagoUSD = Number(pago?.montoUSD || 0);
    const cotParaConversion = cotizacionEfectiva(
      Number(pago?.cotizacionPago) || 0,
      cotizacion
    );
    const ventaSoloUSD = esVentaSoloUSD(totalARS, totalUSD);
    const creditoUSD = ventaSoloUSD
      ? creditoUSDVentaSoloUSD(pagoARS, pagoUSD, cotParaConversion)
      : Math.max(0, pagoUSD);

    const saldosVenta = calcularSaldosVenta({
      totalARS,
      totalUSD,
      pagoARS,
      pagoUSD,
      cotizacion: cotParaConversion,
    });
    const estadoVenta = ventaEstaPagada(saldosVenta.saldoARS, saldosVenta.saldoUSD)
      ? "pagado"
      : "pendiente";

    const notasPago: string[] = [];
    if (ventaSoloUSD && pagoARS > 0) {
      notasPago.push(
        notaConversionARSaUSD(
          pagoARS,
          calcularUsdDesdeARS(pagoARS, cotParaConversion),
          cotParaConversion
        )
      );
    }
    if (pago?.observaciones) notasPago.push(String(pago.observaciones));

    const pagoVentaFirestore = ventaSoloUSD
      ? {
          monto: pagoARS > 0 ? pagoARS : null,
          montoUSD: pagoUSD > 0 ? pagoUSD : null,
          montoUSDTotalAplicado: creditoUSD > 0 ? creditoUSD : null,
          moneda:
            pagoARS > 0 && pagoUSD > 0
              ? ("DUAL" as const)
              : pagoUSD > 0
                ? ("USD" as const)
                : pagoARS > 0
                  ? ("ARS" as const)
                  : ("USD" as const),
          forma:
            pagoUSD > 0 && pagoARS > 0
              ? "Efectivo ARS + USD"
              : pago?.formaPago || "Efectivo",
          destino: pago?.destino || "",
          observaciones: notasPago.filter(Boolean).join(" • "),
          cotizacion,
          cotizacionPago: cotParaConversion,
          pagoARSAplicadoAUSD: pagoARS > 0,
        }
      : {
          monto: pagoARS || null,
          montoUSD: pagoUSD || null,
          moneda:
            pagoUSD > 0 && pagoARS > 0 ? "DUAL" : pagoUSD > 0 ? "USD" : "ARS",
          forma:
            pagoUSD > 0 && pagoARS > 0
              ? "Efectivo ARS + USD"
              : pagoUSD > 0
                ? "Efectivo USD"
                : pago?.formaPago || "Efectivo",
          destino: pago?.destino || "",
          observaciones: pago?.observaciones || "",
          cotizacion,
          cotizacionPago: cotParaConversion,
          pagoARSAplicadoAUSD: false,
        };

    // Crear la venta
    const pedidoMeta = leerMetaPedidoTienda();
    const ventaRef = await addDoc(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), {
      negocioStockId: negocioStock,
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
        stockDocId: p.id || "",
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
        cotizacionUsada: p.cotizacionUsada ?? null,
      })),
      cliente,
      fecha,
      observaciones,
      pago: pagoVentaFirestore,
      totalARS,                    // ✅ Total en pesos
      totalUSD,                    // ✅ Total en dólares  
      total: totalAproximado,      // ✅ Para compatibilidad
      gananciaTotal,
      moneda: totalUSD > 0 && totalARS > 0 ? "DUAL" : totalUSD > 0 ? "USD" : "ARS", // ✅ Detectar tipo
      estado: estadoVenta,
      saldoPendienteARS: Math.max(0, saldosVenta.saldoARS),
      saldoPendienteUSD: Math.max(0, saldosVenta.saldoUSD),
      saldoPendiente: Math.max(0, saldosVenta.saldoAproximado),
      nroVenta,
      timestamp: serverTimestamp(),
      ...(pedidoMeta
        ? {
            origenVenta: "tienda_web",
            pedidoTiendaId: pedidoMeta.pedidoId,
            pedidoTiendaNumero: pedidoMeta.pedidoNumero ?? "",
          }
        : {}),
    });
// ⭐ NUEVO: Actualizar saldo del cliente por la venta
await actualizarSaldoCliente(cliente, totalARS, totalUSD);
console.log('💳 Saldo actualizado por venta normal');
    // ✅ Pagos en colección `pagos`: efectivo físico por moneda; venta solo USD resta crédito total en USD
    const basePagoDoc = {
      cliente,
      fecha,
      forma: pago?.formaPago || "Efectivo",
      destino: pago?.destino || "",
      timestamp: serverTimestamp(),
      nroVenta,
    };

    if (ventaSoloUSD) {
      if (pagoUSD > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoDoc,
          monto: null,
          montoUSD: pagoUSD,
          moneda: "USD",
          cotizacion: cotParaConversion,
          observaciones: pago?.observaciones || "",
          detallesPago: { tipo: "USD" },
        });
      }
      if (pagoARS > 0) {
        const usdEquiv = calcularUsdDesdeARS(pagoARS, cotParaConversion);
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoDoc,
          monto: pagoARS,
          montoUSD: null,
          moneda: "ARS",
          cotizacion: cotParaConversion,
          observaciones: notasPago.filter(Boolean).join(" • "),
          detallesPago: {
            tipo: "ARS_a_USD",
            montoUSDEquivalente: usdEquiv,
            montoARSOriginal: pagoARS,
            cotizacionPago: cotParaConversion,
          },
        });
      }
      if (creditoUSD > 0) {
        await actualizarSaldoCliente(cliente, 0, -creditoUSD);
      }
      console.log("✅ Pagos venta solo USD:", { pagoARS, pagoUSD, creditoUSD, cotParaConversion });
    } else {
      if (pagoARS > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoDoc,
          monto: pagoARS,
          montoUSD: null,
          moneda: "ARS",
          observaciones: pago?.observaciones || "",
          cotizacion: cotizacion,
        });
        console.log("✅ Pago ARS guardado:", pagoARS);
        await actualizarSaldoCliente(cliente, -pagoARS, 0);
      }
      if (pagoUSD > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          ...basePagoDoc,
          monto: null,
          montoUSD: pagoUSD,
          moneda: "USD",
          forma: pago?.formaPago
            ? `${pago.formaPago} USD`.replace(/\s+USD USD/i, " USD")
            : "Efectivo USD",
          observaciones: pago?.observaciones || "",
          cotizacion: cotizacion,
        });
        console.log("✅ Pago USD guardado:", pagoUSD);
        await actualizarSaldoCliente(cliente, 0, -pagoUSD);
      }
    }
    // ✅ 4. SI ES PAGO A PROVEEDOR, TAMBIÉN GUARDARLO EN pagosProveedores
if (pago?.tipoDestino === "proveedor" && pago?.proveedorDestino) {
  // Buscar datos del proveedor
  const proveedoresSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/proveedores`));
  const proveedor = proveedoresSnap.docs.find(doc => doc.data().nombre === pago.proveedorDestino);
  
  if (proveedor) {
    const montoProvARS = ventaSoloUSD ? 0 : pagoARS || 0;
    const montoProvUSD = ventaSoloUSD ? creditoUSD : pagoUSD || 0;
    const pagoProveedor = {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.data().nombre,
      fecha: fecha,
      monto: montoProvARS,
      montoUSD: montoProvUSD,
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
    if (guardandoRef.current) return;
    guardandoRef.current = true;
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
          
          await actualizarStockVentaViaApi(rol.negocioID, otrosProductosConDatos, "descontar");

          for (const producto of otrosProductosConDatos) {
            const codigo = String(producto.codigo ?? producto.id ?? "").trim();
            if (!codigo || !esProductoRepuestoOGeneral(producto)) continue;

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
                codigo: p.codigo || p.id || "",
                stockDocId: p.id || "",
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

            // Ajustar cuenta corriente por accesorios/repuestos/stock extra agregados a la venta de teléfono
            const deltaARS = nuevoTotalARS - Number(datosExistentes.totalARS ?? 0);
            const deltaUSD = nuevoTotalUSD - Number(datosExistentes.totalUSD ?? 0);
            if (deltaARS !== 0 || deltaUSD !== 0) {
              await actualizarSaldoCliente(cliente, deltaARS, deltaUSD);
              console.log("💳 Saldo actualizado por ítems adicionales en venta mixta:", {
                deltaARS,
                deltaUSD,
              });
            }
          }
        }
        
        // Limpiar localStorage
        localStorage.removeItem("ventaTelefonoPendiente");
        localStorage.removeItem("pagoTelefonoPendiente");
        localStorage.removeItem("telefonosComoPago");
        localStorage.removeItem("telefonoComoPago");
        localStorage.removeItem("clienteDesdeTelefono");
      } else {
        const ventaId = await guardarVentaNormal();
        await vincularPedidoTienda(ventaId);
      }
      
      if (onGuardar) onGuardar();
      const metaFinal = leerMetaPedidoTienda();
      if (metaFinal?.pedidoId) {
        marcarPedidoTiendaProcesado(metaFinal.pedidoId);
      }
      router.replace("/ventas-general");
    } catch (error) {
      console.error("Error al guardar la venta:", error);
      alert(error instanceof Error ? error.message : "Error al guardar la venta.");
    } finally {
      guardandoRef.current = false;
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