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
import { actualizarSaldoClienteNegocioDetalle, limpiarNombreClienteExacto } from "@/lib/actualizarSaldoCliente";
import { obtenerYSumarNumeroVenta } from "@/lib/ventas/contadorVentas";
import {
  calcularSaldosVenta,
  calcularUsdDesdeARS,
  cotizacionEfectiva,
  creditoUSDVentaSoloUSD,
  esVentaSoloUSD,
  formaPagoDocumento,
  notaConversionARSaUSD,
  resolverLineasPago,
  ventaEstaPagada,
} from "@/lib/ventas/pagoDualHelpers";
import {
  normalizarVentaTelefonoPendiente,
  totalesTelefonosVenta,
} from "@/lib/ventas/telefonoVentaHelpers";
export default function BotonGuardarVenta({
  cliente,
  clienteId = "",
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
  clienteId?: string;
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
  const clienteDeBase = Boolean(String(clienteId || "").trim());
  /** Nombre e ID canónicos resueltos al guardar (ficha Clientes). */
  const clienteCanonRef = useRef<{ nombre: string; id: string }>({
    nombre: "",
    id: "",
  });

  const clienteParaGuardar = () => {
    const canon = clienteCanonRef.current;
    const nombre = limpiarNombreClienteExacto(canon.nombre || cliente);
    const id = String(canon.id || clienteId || "").trim();
    return { nombre, id };
  };

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

  // Actualizar saldo del cliente (siempre por ID canónico + nombre de ficha)
  const actualizarSaldoCliente = async (
    nombreCliente: string,
    sumarARS: number,
    sumarUSD: number
  ) => {
    if (!rol?.negocioID) return;
    if (sumarARS === 0 && sumarUSD === 0) return;

    const { nombre, id } = clienteParaGuardar();
    const nombreUsar = nombre || limpiarNombreClienteExacto(nombreCliente);

    const r = await actualizarSaldoClienteNegocioDetalle(
      rol.negocioID,
      nombreUsar,
      sumarARS,
      sumarUSD,
      id || undefined
    );
    if (r.ok) return;

    const detalle =
      r.motivo === "no_encontrado"
        ? `No se encontró "${nombreUsar}" en Clientes. El saldo NO se actualizó. Elegí el cliente de la lista (no lo escribas a mano) o revisá el nombre en Clientes.`
        : `No se pudo actualizar el saldo de "${nombreUsar}": ${r.detalle || "error"}.`;
    console.warn("[venta → saldo]", detalle, r);
    alert(`⚠️ ${detalle}`);
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
        const precioCosto = Math.max(
          0,
          Number(producto.precioCosto ?? producto.precioCostoPesos ?? 0)
        );
        const precioCostoPesos =
          producto.moneda === "ARS"
            ? precioCosto
            : Number(producto.precioCostoPesos ?? 0);
        return {
          ...producto,
          tipo: "libre",
          sinStock: true,
          origenStock: "manual",
          codigo: "",
          precioUnitario: precioVentaReal,
          precioVenta: precioVentaReal * cantidad,
          precioCosto,
          precioCostoPesos,
          ganancia: (precioVentaReal - precioCosto) * cantidad,
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

  const guardarVentaTelefono = async (
    datosVentaTelefono: any,
    pagoTelefono: any,
    /** Totales de accesorios/repuestos que se suman a la misma venta (después del teléfono).
     *  Deben incluirse al decidir ARS→USD y al aplicar el pago; si no, un teléfono USD puro
     *  convierte pesos a crédito USD y luego el accesorio deja deuda ARS. */
    totalesExtrasParaPago?: { totalARS: number; totalUSD: number }
  ) => {
    if (!rol?.negocioID) return;

    const { nombre: clienteNombre, id: clienteIdOk } = clienteParaGuardar();
    if (!clienteNombre || !clienteIdOk) {
      throw new Error("Cliente no vinculado a la lista de Clientes.");
    }

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
    // Totales con los que el modal cobró (teléfono + extras de la misma operación).
    const totalARSParaPago =
      totalARS + Math.max(0, Number(totalesExtrasParaPago?.totalARS || 0));
    const totalUSDParaPago =
      totalUSD + Math.max(0, Number(totalesExtrasParaPago?.totalUSD || 0));

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
    // Doc inicial: solo teléfonos (los extras actualizan totales después).
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
    // Misma regla que el modal: si hay accesorio ARS en la misma venta, NO convertir ARS→USD.
    const ventaTelSoloUSD = esVentaSoloUSD(totalARSParaPago, totalUSDParaPago);

    const saldosTel = calcularSaldosVenta({
      totalARS: totalARSParaPago,
      totalUSD: totalUSDParaPago,
      pagoARS: pagoARS_TelPreview,
      pagoUSD: pagoUSD_TelPreview,
      cotizacion: cotTelPreview,
      telefonosPago: telefonosPagoInput,
    });
    const saldoAPagar = Math.max(0, saldosTel.saldoAproximado);
    const estadoTel = ventaEstaPagada(saldosTel.saldoARS, saldosTel.saldoUSD)
      ? "pagado"
      : "pendiente";

    // Moneda del doc: con extras se corrige al mergear; acá solo teléfonos.
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
        cliente: clienteNombre,
        clienteId: clienteIdOk,
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

    const creditoUSDTelDoc = ventaTelSoloUSD
      ? creditoUSDVentaSoloUSD(pagoARS_TelPreview, pagoUSD_TelPreview, cotTelPreview)
      : Math.max(0, pagoUSD_TelPreview);

    const pagoTelFirestore =
      pagoARS_TelPreview > 0 || pagoUSD_TelPreview > 0
        ? {
            monto: pagoARS_TelPreview > 0 ? pagoARS_TelPreview : null,
            montoUSD: pagoUSD_TelPreview > 0 ? pagoUSD_TelPreview : null,
            montoUSDTotalAplicado: creditoUSDTelDoc > 0 ? creditoUSDTelDoc : null,
            moneda:
              pagoARS_TelPreview > 0 && pagoUSD_TelPreview > 0
                ? ("DUAL" as const)
                : pagoUSD_TelPreview > 0
                  ? ("USD" as const)
                  : ("ARS" as const),
            forma: pagoTelefono.formaPago || "Efectivo",
            destino: "ventaTelefonos",
            observaciones: pagoTelefono.observaciones || observaciones || "",
            cotizacion: cotTelPreview,
            cotizacionPago: cotTelPreview,
            pagoARSAplicadoAUSD: ventaTelSoloUSD && pagoARS_TelPreview > 0,
            lineas: resolverLineasPago(pagoTelefono),
          }
        : null;

    await setDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${ventaTelefonosRef.id}`), {
      fecha,
      cliente: clienteNombre,
      clienteId: clienteIdOk,
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
      ...(pagoTelFirestore ? { pago: pagoTelFirestore } : {}),
      cotizacionUsada: cotTelPreview,
    });

    await actualizarSaldoCliente(clienteNombre, totalARS, totalUSD);

    for (let i = 0; i < telefonosRecibidosFinal.length; i++) {
      const tr = telefonosRecibidosFinal[i];
      const valorPago = Number(tr.precioCompra ?? tr.precioEstimado ?? tr.valorPago ?? 0);
      if (valorPago <= 0) continue;
      const monedaTel = String(tr.moneda ?? "ARS").toUpperCase() === "USD" ? "USD" : "ARS";

      const stockParteDePago = {
        fechaIngreso: Timestamp.now(),
        creadoEn: Timestamp.now(),
        proveedor: `Parte de pago - ${clienteNombre}`,
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
        cliente: clienteNombre,
        clienteId: clienteIdOk,
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
        clienteNombre,
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
    const lineasPagoTel = resolverLineasPago(pagoTelefono);
    const esPagoProveedorTel =
      pagoTelefono?.tipoDestino === "proveedor" &&
      Boolean(pagoTelefono?.proveedorDestino);

    const basePagoTel = {
      fecha,
      cliente: clienteNombre,
      clienteId: clienteIdOk,
      destino: "ventaTelefonos",
      cotizacion: cotTel,
      observaciones: pagoTelefono.observaciones || "",
      timestamp: serverTimestamp(),
      nroVenta,
      ...(esPagoProveedorTel
        ? {
            tipoDestino: "proveedor" as const,
            proveedorDestino: pagoTelefono.proveedorDestino,
          }
        : {}),
    };

    if (ventaTelSoloUSD) {
      for (const linea of lineasPagoTel) {
        if (linea.moneda === "USD" && linea.monto > 0) {
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoTel,
            monto: null,
            montoUSD: linea.monto,
            moneda: "USD",
            forma: formaPagoDocumento(linea.formaPago, "USD"),
            detallesPago: { tipo: "USD" },
          });
        }
        if (linea.moneda === "ARS" && linea.monto > 0) {
          const usdEquiv = calcularUsdDesdeARS(linea.monto, cotTel);
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoTel,
            monto: linea.monto,
            montoUSD: null,
            moneda: "ARS",
            forma: formaPagoDocumento(linea.formaPago, "ARS"),
            observaciones: [
              pagoTelefono.observaciones || "",
              notaConversionARSaUSD(linea.monto, usdEquiv, cotTel),
            ]
              .filter(Boolean)
              .join(" • "),
            detallesPago: {
              tipo: "ARS_a_USD",
              montoUSDEquivalente: usdEquiv,
              montoARSOriginal: linea.monto,
              cotizacionPago: cotTel,
            },
          });
        }
      }
      if (creditoUSDTel > 0) {
        await actualizarSaldoCliente(clienteNombre, 0, -creditoUSDTel);
      }
    } else {
      for (const linea of lineasPagoTel) {
        if (linea.moneda === "ARS" && linea.monto > 0) {
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoTel,
            monto: linea.monto,
            montoUSD: null,
            moneda: "ARS",
            forma: formaPagoDocumento(linea.formaPago, "ARS"),
          });
          await actualizarSaldoCliente(clienteNombre, -linea.monto, 0);
        }
        if (linea.moneda === "USD" && linea.monto > 0) {
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoTel,
            monto: null,
            montoUSD: linea.monto,
            moneda: "USD",
            forma: formaPagoDocumento(linea.formaPago, "USD"),
          });
          await actualizarSaldoCliente(clienteNombre, 0, -linea.monto);
        }
      }
    }

    return ventaTelefonosRef.id;
  };

  const guardarVentaNormal = async () => {
    if (!rol?.negocioID) return;

    const { nombre: clienteNombre, id: clienteIdOk } = clienteParaGuardar();
    if (!clienteNombre || !clienteIdOk) {
      throw new Error("Cliente no vinculado a la lista de Clientes.");
    }

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

    try {
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
    const obsExistente = String(pago?.observaciones || "");
    const notaConv = ventaSoloUSD && pagoARS > 0
      ? notaConversionARSaUSD(
          pagoARS,
          calcularUsdDesdeARS(pagoARS, cotParaConversion),
          cotParaConversion
        )
      : "";
    // Evitar duplicar la nota si el modal de pago ya la escribió con la misma cotización
    if (notaConv && !obsExistente.includes("cotización $1 USD")) {
      notasPago.push(notaConv);
    }
    if (obsExistente) notasPago.push(obsExistente);

    const lineasPagoEmbed = resolverLineasPago(pago);

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
          forma: pago?.formaPago || "Efectivo",
          destino: pago?.destino || "",
          observaciones: notasPago.filter(Boolean).join(" • "),
          cotizacion: cotParaConversion,
          cotizacionPago: cotParaConversion,
          pagoARSAplicadoAUSD: pagoARS > 0,
          lineas: lineasPagoEmbed,
        }
      : {
          monto: pagoARS || null,
          montoUSD: pagoUSD || null,
          moneda:
            pagoUSD > 0 && pagoARS > 0 ? "DUAL" : pagoUSD > 0 ? "USD" : "ARS",
          forma: pago?.formaPago || "Efectivo",
          destino: pago?.destino || "",
          observaciones: pago?.observaciones || "",
          cotizacion: cotParaConversion,
          cotizacionPago: cotParaConversion,
          pagoARSAplicadoAUSD: false,
          lineas: lineasPagoEmbed,
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
        stockDocId: p.stockDocId || p.id || "",
        tipo: p.tipo,
        origenStock:
          p.origenStock ||
          (p.tipo === "repuesto"
            ? "stockRepuestos"
            : p.tipo === "accesorio"
              ? "stockAccesorios"
              : p.tipo === "general" || p.hoja
                ? "stockExtra"
                : "stockAccesorios"),
        hoja: p.hoja || "",
        // ✅ AGREGAR CAMPOS SEPARADOS PARA CLARIDAD
        precioUnitarioUSD: p.moneda === "USD" ? p.precioUnitario : null,
        precioUnitarioARS: p.moneda === "ARS" ? p.precioUnitario : null,
        precioVentaUSD: p.moneda === "USD" ? p.precioVenta : null,
        precioVentaARS: p.moneda === "ARS" ? p.precioVenta : null,
        cotizacionUsada: p.cotizacionUsada ?? null,
      })),
      cliente: clienteNombre,
      clienteId: clienteIdOk,
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
await actualizarSaldoCliente(clienteNombre, totalARS, totalUSD);
console.log('💳 Saldo actualizado por venta normal');
    // ✅ Pagos en colección `pagos`: un doc por ítem (moneda + medio) para caja correcta
    const lineasPago = resolverLineasPago(pago);
    const esPagoProveedor =
      pago?.tipoDestino === "proveedor" && Boolean(pago?.proveedorDestino);
    const basePagoDoc = {
      cliente: clienteNombre,
      clienteId: clienteIdOk,
      fecha,
      destino: pago?.destino || "",
      timestamp: serverTimestamp(),
      nroVenta,
      ...(esPagoProveedor
        ? {
            tipoDestino: "proveedor" as const,
            proveedorDestino: pago.proveedorDestino,
          }
        : {}),
    };

    if (ventaSoloUSD) {
      for (const linea of lineasPago) {
        if (linea.moneda === "USD" && linea.monto > 0) {
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoDoc,
            monto: null,
            montoUSD: linea.monto,
            moneda: "USD",
            forma: formaPagoDocumento(linea.formaPago, "USD"),
            cotizacion: cotParaConversion,
            observaciones: pago?.observaciones || "",
            detallesPago: { tipo: "USD" },
          });
        }
        if (linea.moneda === "ARS" && linea.monto > 0) {
          const usdEquiv = calcularUsdDesdeARS(linea.monto, cotParaConversion);
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoDoc,
            monto: linea.monto,
            montoUSD: null,
            moneda: "ARS",
            forma: formaPagoDocumento(linea.formaPago, "ARS"),
            cotizacion: cotParaConversion,
            observaciones: [
              pago?.observaciones || "",
              notaConversionARSaUSD(linea.monto, usdEquiv, cotParaConversion),
            ]
              .filter(Boolean)
              .join(" • "),
            detallesPago: {
              tipo: "ARS_a_USD",
              montoUSDEquivalente: usdEquiv,
              montoARSOriginal: linea.monto,
              cotizacionPago: cotParaConversion,
            },
          });
        }
      }
      if (creditoUSD > 0) {
        await actualizarSaldoCliente(clienteNombre, 0, -creditoUSD);
      }
      console.log("✅ Pagos venta solo USD:", { pagoARS, pagoUSD, creditoUSD, cotParaConversion, lineasPago });
    } else {
      for (const linea of lineasPago) {
        if (linea.moneda === "ARS" && linea.monto > 0) {
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoDoc,
            monto: linea.monto,
            montoUSD: null,
            moneda: "ARS",
            forma: formaPagoDocumento(linea.formaPago, "ARS"),
            observaciones: pago?.observaciones || "",
            cotizacion: cotizacion,
          });
          console.log("✅ Pago ARS guardado:", linea.monto, linea.formaPago);
          await actualizarSaldoCliente(clienteNombre, -linea.monto, 0);
        }
        if (linea.moneda === "USD" && linea.monto > 0) {
          await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
            ...basePagoDoc,
            monto: null,
            montoUSD: linea.monto,
            moneda: "USD",
            forma: formaPagoDocumento(linea.formaPago, "USD"),
            observaciones: pago?.observaciones || "",
            cotizacion: cotizacion,
          });
          console.log("✅ Pago USD guardado:", linea.monto, linea.formaPago);
          await actualizarSaldoCliente(clienteNombre, 0, -linea.monto);
        }
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
      notas: `Cliente: ${clienteNombre}${pago?.observaciones ? ` - ${pago.observaciones}` : ''}`,
      fechaCreacion: new Date().toISOString(),
    };
    
    await addDoc(collection(db, `negocios/${rol.negocioID}/pagosProveedores`), pagoProveedor);
    console.log("✅ Pago también guardado en pagosProveedores para:", proveedor.data().nombre);
  }
}
    return ventaRef.id;
    } catch (errTrasStock) {
      // Compensar: el stock ya se descontó; si falla el guardado, reponer
      try {
        await actualizarStockVentaViaApi(negocioStock, productosConCodigo, "reponer");
        console.warn("♻️ Stock repuesto tras fallo al guardar venta");
      } catch (reponerErr) {
        console.error("❌ No se pudo reponer stock tras fallo al guardar:", reponerErr);
      }
      throw errTrasStock;
    }
  };

  const guardarVenta = async () => {
    if (!rol?.negocioID || productos.length === 0 || !cliente) return;
    const idSel = String(clienteId || "").trim();
    if (!idSel) {
      alert(
        "Seleccioná el cliente de la lista antes de guardar. Así la venta queda vinculada a su ficha."
      );
      return;
    }
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);

    try {
      // Nombre canónico desde la ficha (evita espacios/typo del input)
      const clienteSnap = await getDoc(
        doc(db, `negocios/${rol.negocioID}/clientes/${idSel}`)
      );
      if (!clienteSnap.exists()) {
        throw new Error(
          "El cliente seleccionado ya no existe en Clientes. Volvé a elegirlo de la lista."
        );
      }
      const nombreCanon = limpiarNombreClienteExacto(
        String(clienteSnap.data()?.nombre ?? "")
      );
      if (!nombreCanon) {
        throw new Error("El cliente no tiene un nombre válido en su ficha.");
      }
      clienteCanonRef.current = { nombre: nombreCanon, id: idSel };

      const ventaTelefonoPendiente = localStorage.getItem("ventaTelefonoPendiente");

      if (ventaTelefonoPendiente && desdeTelefono) {
        const datosVentaTelefono = JSON.parse(ventaTelefonoPendiente);
        const pagoTelefono = pago || {};
        const otrosProductos = productos.filter(p => p.categoria !== "Teléfono");

        // Resolver extras ANTES del teléfono para que el pago no trate la venta como "solo USD"
        // (si no, los pesos se convierten a crédito USD y el accesorio ARS queda como deuda).
        let otrosProductosConDatos: any[] = [];
        let totalesExtrasParaPago: { totalARS: number; totalUSD: number } | undefined;
        if (otrosProductos.length > 0) {
          otrosProductosConDatos = await obtenerDatosRespetandoMonedas(otrosProductos);
          totalesExtrasParaPago = calcularTotalesSeparados(otrosProductosConDatos);
        }

        const telefonoID = await guardarVentaTelefono(
          datosVentaTelefono,
          pagoTelefono,
          totalesExtrasParaPago
        );

        // Evitar reintento duplicado: limpiar pendiente TANTO BIEN la parte teléfono
        localStorage.removeItem("ventaTelefonoPendiente");
        localStorage.removeItem("pagoTelefonoPendiente");
        localStorage.removeItem("telefonosComoPago");
        localStorage.removeItem("telefonoComoPago");
        localStorage.removeItem("clienteDesdeTelefono");
        
        // Si hay otros productos, agregarlos (si falla, la venta teléfono ya quedó; no re-crear)
        if (otrosProductos.length > 0) {
          const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
          const snap = await getDoc(configRef);
          const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];
          
          await actualizarStockVentaViaApi(rol.negocioID, otrosProductosConDatos, "descontar");

          try {
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
                stockDocId: p.stockDocId || p.id || "",
                tipo: p.tipo,
                origenStock:
                  p.origenStock ||
                  (p.tipo === "repuesto"
                    ? "stockRepuestos"
                    : p.tipo === "accesorio"
                      ? "stockAccesorios"
                      : p.tipo === "general" || p.hoja
                        ? "stockExtra"
                        : "stockAccesorios"),
                hoja: p.hoja || "",
              }))
            ];
            
            const { totalARS: nuevoTotalARS, totalUSD: nuevoTotalUSD } = calcularTotalesSeparados(productosCompletos);
            const nuevaGananciaTotal = productosCompletos.reduce((acc, p) => acc + p.ganancia, 0);
            const nuevoTotalAproximado = nuevoTotalARS + (nuevoTotalUSD * cotizacion);

            const cotMerge = cotizacionEfectiva(
              Number(pagoTelefono?.cotizacionPago) || 0,
              cotizacion
            );
            const telefonosPagoMerge = Array.isArray(datosExistentes.telefonosComoPago)
              ? datosExistentes.telefonosComoPago
              : datosExistentes.telefonoComoPago
                ? [datosExistentes.telefonoComoPago]
                : [];
            const saldosMerge = calcularSaldosVenta({
              totalARS: nuevoTotalARS,
              totalUSD: nuevoTotalUSD,
              pagoARS: Number(pagoTelefono?.monto || 0),
              pagoUSD: Number(pagoTelefono?.montoUSD || 0),
              cotizacion: cotMerge,
              telefonosPago: telefonosPagoMerge,
            });
            
            await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${telefonoID}`), {
              productos: productosCompletos,
              totalARS: nuevoTotalARS,
              totalUSD: nuevoTotalUSD,
              total: nuevoTotalAproximado,
              gananciaTotal: nuevaGananciaTotal,
              moneda: nuevoTotalUSD > 0 && nuevoTotalARS > 0 ? "DUAL" : nuevoTotalUSD > 0 ? "USD" : "ARS",
              saldoPendiente: Math.max(0, saldosMerge.saldoAproximado),
              saldoPendienteARS: Math.max(0, saldosMerge.saldoARS),
              saldoPendienteUSD: Math.max(0, saldosMerge.saldoUSD),
              estado: ventaEstaPagada(saldosMerge.saldoARS, saldosMerge.saldoUSD)
                ? "pagado"
                : "pendiente",
              cliente: clienteCanonRef.current.nombre,
              clienteId: clienteCanonRef.current.id,
            });

            const deltaARS = nuevoTotalARS - Number(datosExistentes.totalARS ?? 0);
            const deltaUSD = nuevoTotalUSD - Number(datosExistentes.totalUSD ?? 0);
            if (deltaARS !== 0 || deltaUSD !== 0) {
              await actualizarSaldoCliente(
                clienteCanonRef.current.nombre,
                deltaARS,
                deltaUSD
              );
            }
          }
          } catch (extrasErr) {
            try {
              await actualizarStockVentaViaApi(rol.negocioID, otrosProductosConDatos, "reponer");
            } catch (reponerExtras) {
              console.error("No se pudo reponer extras tras fallo:", reponerExtras);
            }
            throw new Error(
              `La venta del teléfono se guardó, pero falló al agregar accesorios/repuestos: ${
                extrasErr instanceof Error ? extrasErr.message : "error desconocido"
              }. No reintentes la venta del teléfono; agregá los ítems en otra venta o editá esta.`
            );
          }
        }
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
      guardandoRef.current = false;
      setGuardando(false);
    }
    // Si guardó OK: el botón queda bloqueado hasta que router.replace desmonte el modal.
  };

  return (
    <div className="mt-6">
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={guardarVenta}
          disabled={guardando || !clienteDeBase}
          className={`rounded-lg font-medium flex items-center gap-2 transition-all duration-200 transform text-white ${
            guardando || !clienteDeBase
              ? "bg-[#bdc3c7] cursor-not-allowed" 
              : "bg-[#3498db] hover:bg-[#2980b9] hover:scale-105"
          }`}
          title={
            !clienteDeBase
              ? "Seleccioná el cliente de la lista"
              : undefined
          }
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