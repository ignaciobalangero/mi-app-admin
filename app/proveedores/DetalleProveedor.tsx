"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import TablaProveedores from "./TablaProveedores";

interface Proveedor {
  id: string;
  nombre: string;
  categoria: string;
  contacto: string;
  email: string;
  cbu: string;
  alias: string;
  notas: string;
}

interface ProductoCompra {
  id: string;
  producto: string;
  cantidad: number;
  precio: number;
  total: number;
}

interface Compra {
  id: string;
  fecha: string;
  numeroRemito: string;
  numeroPedido: string;
  productos: ProductoCompra[];
  montoTotal: number;
  moneda: string;
  estado: string;
  notas: string;
  fechaCreacion: string;
}

interface Pago {
  id: string;
  fecha: string;
  monto: number;
  montoUSD?: number;
  forma: string;
  referencia: string;
  notas: string;
  fechaCreacion: string;
}

interface Props {
  proveedor: Proveedor;
  negocioID: string;
  onVolver: () => void;
}

export default function DetalleProveedor({ proveedor, negocioID, onVolver }: Props) {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [vistaActual, setVistaActual] = useState<"resumen" | "compras" | "pagos">("resumen");
  const [mostrarFormCompra, setMostrarFormCompra] = useState(false);
  const [mostrarFormPago, setMostrarFormPago] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Estados formulario compra
  const [numeroRemito, setNumeroRemito] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");
  const [productosCompra, setProductosCompra] = useState<ProductoCompra[]>([]);
  const [monedaCompra, setMonedaCompra] = useState("ARS");
  const [estadoCompra, setEstadoCompra] = useState("pendiente");
  const [notasCompra, setNotasCompra] = useState("");

  // Estados para modal de detalle de compra
  const [mostrarDetalleCompra, setMostrarDetalleCompra] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState<Compra | null>(null);

  // Estados formulario pago
  const [montoPago, setMontoPago] = useState(0);
  const [montoUSDPago, setMontoUSDPago] = useState(0);
  const [monedaPago, setMonedaPago] = useState("ARS");
  const [formaPago, setFormaPago] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [notasPago, setNotasPago] = useState("");

  const formasPago = ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "USD", "Crypto"];
  const estadosCompra = [
    { valor: "pendiente", texto: "Pendiente", color: "bg-yellow-500" },
    { valor: "pagado", texto: "Pagado", color: "bg-green-500" },
    { valor: "parcial", texto: "Pago Parcial", color: "bg-blue-500" },
    { valor: "cancelado", texto: "Cancelado", color: "bg-red-500" },
  ];

  // Función para abrir modal de detalle
  const abrirDetalleCompra = (compra: Compra) => {
    setCompraSeleccionada(compra);
    setMostrarDetalleCompra(true);
  };

  // Funciones para manejar productos
  const agregarProducto = () => {
    const nuevoProducto: ProductoCompra = {
      id: Date.now().toString(),
      producto: "",
      cantidad: 1,
      precio: 0,
      total: 0
    };
    setProductosCompra([...productosCompra, nuevoProducto]);
  };

  const eliminarProducto = (id: string) => {
    setProductosCompra(productosCompra.filter(p => p.id !== id));
  };

  const actualizarProducto = (id: string, campo: keyof ProductoCompra, valor: any) => {
    setProductosCompra(productosCompra.map(p => {
      if (p.id === id) {
        const productoActualizado = { ...p, [campo]: valor };
        if (campo === 'cantidad' || campo === 'precio') {
          productoActualizado.total = productoActualizado.cantidad * productoActualizado.precio;
        }
        return productoActualizado;
      }
      return p;
    }));
  };

  const calcularTotalCompra = () => {
    return productosCompra.reduce((sum, p) => sum + p.total, 0);
  };

  useEffect(() => {
    cargarCompras();
    cargarPagos();
  }, []);

  useEffect(() => {
    if (mostrarFormCompra && productosCompra.length === 0) {
      agregarProducto();
    }
  }, [mostrarFormCompra]);

  const cargarCompras = async () => {
    try {
      const q = query(
        collection(db, `negocios/${negocioID}/compras`),
        where("proveedorId", "==", proveedor.id),
        orderBy("fechaCreacion", "desc")
      );
      const snap = await getDocs(q);
      const comprasData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          productos: Array.isArray(data.productos) ? data.productos : 
            [{ id: "1", producto: data.productos || "", cantidad: 1, precio: data.montoTotal || 0, total: data.montoTotal || 0 }]
        };
      }) as Compra[];
      setCompras(comprasData);
    } catch (error) {
      console.error("Error cargando compras:", error);
      setCompras([]);
    }
  };

  const cargarPagos = async () => {
    try {
      const q = query(
        collection(db, `negocios/${negocioID}/pagosProveedores`),
        where("proveedorId", "==", proveedor.id),
        orderBy("fechaCreacion", "desc")
      );
      const snap = await getDocs(q);
      const pagosData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Pago[];
      setPagos(pagosData);
    } catch (error) {
      console.error("Error cargando pagos:", error);
      setPagos([]);
    }
  };

  const recargarDatos = () => {
    cargarCompras();
    cargarPagos();
  };

  const mostrarMensaje = (msg: string) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(""), 2000);
  };

  const guardarCompra = async () => {
    if (productosCompra.length === 0 || productosCompra.every(p => !p.producto.trim())) {
      setMensaje("❌ Agrega al menos un producto");
      setTimeout(() => setMensaje(""), 2000);
      return;
    }

    const productosValidos = productosCompra.filter(p => p.producto.trim() && p.cantidad > 0);
    if (productosValidos.length === 0) {
      setMensaje("❌ Completa la información de los productos");
      setTimeout(() => setMensaje(""), 2000);
      return;
    }

    const totalCalculado = calcularTotalCompra();

    const nuevaCompra = {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      fecha: new Date().toLocaleDateString("es-AR"),
      numeroRemito: numeroRemito.trim(),
      numeroPedido: numeroPedido.trim(),
      productos: productosValidos,
      montoTotal: totalCalculado,
      moneda: monedaCompra,
      estado: estadoCompra,
      notas: notasCompra.trim(),
      fechaCreacion: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, `negocios/${negocioID}/compras`), nuevaCompra);
      setMensaje("✅ Compra registrada");
      limpiarFormCompra();
      setMostrarFormCompra(false);
      cargarCompras();
    } catch (error) {
      console.error("Error:", error);
      setMensaje("❌ Error al guardar compra");
    }
    setTimeout(() => setMensaje(""), 2000);
  };

  const guardarPago = async () => {
    if ((monedaPago === "ARS" && montoPago <= 0) || (monedaPago === "USD" && montoUSDPago <= 0) || !formaPago) {
      setMensaje("❌ Completa los campos obligatorios");
      setTimeout(() => setMensaje(""), 2000);
      return;
    }

    const nuevoPago = {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      fecha: new Date().toLocaleDateString("es-AR"),
      monto: monedaPago === "ARS" ? montoPago : 0,
      montoUSD: monedaPago === "USD" ? montoUSDPago : 0,
      forma: formaPago,
      referencia: referenciaPago.trim(),
      notas: notasPago.trim(),
      fechaCreacion: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, `negocios/${negocioID}/pagosProveedores`), nuevoPago);
      setMensaje("✅ Pago registrado");
      limpiarFormPago();
      setMostrarFormPago(false);
      cargarPagos();
    } catch (error) {
      console.error("Error:", error);
      setMensaje("❌ Error al guardar pago");
    }
    setTimeout(() => setMensaje(""), 2000);
  };

  const limpiarFormCompra = () => {
    setNumeroRemito("");
    setNumeroPedido("");
    setProductosCompra([]);
    setMonedaCompra("ARS");
    setEstadoCompra("pendiente");
    setNotasCompra("");
  };

  const limpiarFormPago = () => {
    setMontoPago(0);
    setMontoUSDPago(0);
    setMonedaPago("ARS");
    setFormaPago("");
    setReferenciaPago("");
    setNotasPago("");
  };

  const calcularTotales = () => {
    const totalComprasARS = compras.filter(c => c.moneda === "ARS").reduce((sum, c) => sum + c.montoTotal, 0);
    const totalComprasUSD = compras.filter(c => c.moneda === "USD").reduce((sum, c) => sum + c.montoTotal, 0);
    const totalPagosARS = pagos.reduce((sum, p) => sum + p.monto, 0);
    const totalPagosUSD = pagos.reduce((sum, p) => sum + (p.montoUSD || 0), 0);
    const saldoARS = totalComprasARS - totalPagosARS;
    const saldoUSD = totalComprasUSD - totalPagosUSD;

    return { totalComprasARS, totalComprasUSD, totalPagosARS, totalPagosUSD, saldoARS, saldoUSD };
  };

  const totales = calcularTotales();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header con info del proveedor */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onVolver}
                className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
              >
                ←
              </button>
              <div className="w-12 h-12 bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🏢</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{proveedor.nombre}</h1>
                <p className="text-gray-600">{proveedor.categoria} • {proveedor.contacto}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarFormCompra(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                📦 Nueva Compra
              </button>
              <button
                onClick={() => setMostrarFormPago(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                💰 Registrar Pago
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`rounded-xl p-4 text-center font-semibold ${
            mensaje.includes("✅") 
              ? "bg-green-100 border-2 border-green-500 text-green-700"
              : "bg-red-100 border-2 border-red-500 text-red-700"
          }`}>
            {mensaje}
          </div>
        )}

        {/* Resumen de cuenta */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-xl border-2 border-blue-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-900 text-sm font-bold">Compras ARS</p>
                <p className="text-2xl font-black text-blue-800">${totales.totalComprasARS.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-xl border-2 border-green-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-900 text-sm font-bold">Compras USD</p>
                <p className="text-2xl font-black text-green-800">U$D {totales.totalComprasUSD.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-xl">💵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-xl border-2 border-emerald-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-900 text-sm font-bold">Pagado ARS</p>
                <p className="text-2xl font-black text-emerald-800">${totales.totalPagosARS.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-xl border-2 border-emerald-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-900 text-sm font-bold">Pagado USD</p>
                <p className="text-2xl font-black text-emerald-800">U$D {totales.totalPagosUSD.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-xl">💵</span>
              </div>
            </div>
          </div>
        </div>

        {/* Saldos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-white rounded-xl p-6 shadow-xl border-2 ${
            totales.saldoARS > 0 ? 'border-red-300' : totales.saldoARS < 0 ? 'border-green-300' : 'border-gray-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-bold ${
                  totales.saldoARS > 0 ? 'text-red-900' : totales.saldoARS < 0 ? 'text-green-900' : 'text-gray-900'
                }`}>
                  {totales.saldoARS > 0 ? 'Deuda ARS' : totales.saldoARS < 0 ? 'Saldo a Favor ARS' : 'Sin Deuda ARS'}
                </p>
                <p className={`text-2xl font-black ${
                  totales.saldoARS > 0 ? 'text-red-700' : totales.saldoARS < 0 ? 'text-green-700' : 'text-gray-700'
                }`}>
                  ${Math.abs(totales.saldoARS).toLocaleString()}
                </p>
                {totales.saldoARS < 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-1">Has pagado de más</p>
                )}
                {totales.saldoARS > 0 && (
                  <p className="text-xs text-red-600 font-semibold mt-1">Debes pagar</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                totales.saldoARS > 0 ? 'bg-red-500' : totales.saldoARS < 0 ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                <span className="text-white text-xl">
                  {totales.saldoARS > 0 ? '⚠️' : totales.saldoARS < 0 ? '💚' : '✅'}
                </span>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl p-6 shadow-xl border-2 ${
            totales.saldoUSD > 0 ? 'border-red-300' : totales.saldoUSD < 0 ? 'border-green-300' : 'border-gray-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-bold ${
                  totales.saldoUSD > 0 ? 'text-red-900' : totales.saldoUSD < 0 ? 'text-green-900' : 'text-gray-900'
                }`}>
                  {totales.saldoUSD > 0 ? 'Deuda USD' : totales.saldoUSD < 0 ? 'Saldo a Favor USD' : 'Sin Deuda USD'}
                </p>
                <p className={`text-2xl font-black ${
                  totales.saldoUSD > 0 ? 'text-red-700' : totales.saldoUSD < 0 ? 'text-green-700' : 'text-gray-700'
                }`}>
                  U$D {Math.abs(totales.saldoUSD).toLocaleString()}
                </p>
                {totales.saldoUSD < 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-1">Has pagado de más</p>
                )}
                {totales.saldoUSD > 0 && (
                  <p className="text-xs text-red-600 font-semibold mt-1">Debes pagar</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                totales.saldoUSD > 0 ? 'bg-red-500' : totales.saldoUSD < 0 ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                <span className="text-white text-xl">
                  {totales.saldoUSD > 0 ? '⚠️' : totales.saldoUSD < 0 ? '💚' : '✅'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación de pestañas */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-gray-300">
          <div className="flex gap-4 mb-6">
            {[
              { id: "resumen", nombre: "📊 Resumen", icono: "📊" },
              { id: "compras", nombre: "📦 Compras", icono: "📦" },
              { id: "pagos", nombre: "💰 Pagos", icono: "💰" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVistaActual(tab.id as any)}
                className={`px-6 py-3 rounded-xl font-bold transition-all shadow-md ${
                  vistaActual === tab.id
                    ? "bg-purple-600 text-white border-2 border-purple-700"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300 border-2 border-gray-400"
                }`}
              >
                {tab.nombre} ({tab.id === "compras" ? compras.length : tab.id === "pagos" ? pagos.length : ""})
              </button>
            ))}
          </div>

          {/* Contenido según pestaña activa */}
          {vistaActual === "resumen" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800">Resumen de Cuenta</h3>
              
              {/* Últimas compras */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Últimas Compras</h4>
                {compras.slice(0, 3).map((compra) => (
                  <div key={compra.id} className="flex justify-between items-center p-4 bg-gray-100 rounded-lg mb-3 border-2 border-gray-300 shadow-md">
                    <div>
                      <p className="font-bold text-gray-900">
                        {Array.isArray(compra.productos) 
                          ? compra.productos.map(p => p.producto).join(", ")
                          : compra.productos
                        }
                      </p>
                      <p className="text-sm text-gray-700 font-medium">{compra.fecha} • Remito: {compra.numeroRemito}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg">{compra.moneda === "USD" ? `U$D ${compra.montoTotal}` : `${compra.montoTotal.toLocaleString()}`}</p>
                      <span className={`text-xs px-3 py-1.5 rounded-full text-white font-bold ${
                        estadosCompra.find(e => e.valor === compra.estado)?.color || "bg-gray-500"
                      }`}>
                        {estadosCompra.find(e => e.valor === compra.estado)?.texto || compra.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Últimos pagos */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Últimos Pagos</h4>
                {pagos.slice(0, 3).map((pago) => (
                  <div key={pago.id} className="flex justify-between items-center p-4 bg-gray-100 rounded-lg mb-3 border-2 border-gray-300 shadow-md">
                    <div>
                      <p className="font-bold text-gray-900">{pago.forma}</p>
                      <p className="text-sm text-gray-700 font-medium">{pago.fecha} • {pago.referencia}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-green-700 text-lg">
                        {pago.montoUSD ? `U$D ${pago.montoUSD}` : `${pago.monto.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uso del componente TablaProveedores */}
          {(vistaActual === "compras" || vistaActual === "pagos") && (
            <TablaProveedores
              vistaActual={vistaActual}
              compras={compras}
              pagos={pagos}
              proveedor={proveedor}
              negocioID={negocioID}
              onRecargar={recargarDatos}
              onMensaje={mostrarMensaje}
              onMostrarFormCompra={() => setMostrarFormCompra(true)}
              onMostrarFormPago={() => setMostrarFormPago(true)}
              onAbrirDetalleCompra={abrirDetalleCompra}
            />
          )}
        </div>

        {/* Modal detalle de compra */}
        {mostrarDetalleCompra && compraSeleccionada && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">📄 Detalle de Compra</h3>
                    <p className="text-blue-100">Remito: {compraSeleccionada.numeroRemito || "Sin remito"}</p>
                  </div>
                  <button
                    onClick={() => setMostrarDetalleCompra(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold bg-white/20 rounded-lg w-10 h-10 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Información de la compra */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl p-4 border-2 border-gray-400 shadow-md">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">📋 Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-bold text-gray-900">Fecha:</span> <span className="font-semibold text-gray-800">{compraSeleccionada.fecha}</span></div>
                    <div><span className="font-bold text-gray-900">Proveedor:</span> <span className="font-semibold text-gray-800">{proveedor.nombre}</span></div>
                    <div><span className="font-bold text-gray-900">Remito:</span> <span className="font-semibold text-gray-800">{compraSeleccionada.numeroRemito || "Sin remito"}</span></div>
                    <div><span className="font-bold text-gray-900">Pedido:</span> <span className="font-semibold text-gray-800">{compraSeleccionada.numeroPedido || "Sin pedido"}</span></div>
                    <div><span className="font-bold text-gray-900">Estado:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-white text-xs ${
                        estadosCompra.find(e => e.valor === compraSeleccionada.estado)?.color || "bg-gray-500"
                      }`}>
                        {estadosCompra.find(e => e.valor === compraSeleccionada.estado)?.texto || compraSeleccionada.estado}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border-2 border-green-400 shadow-md">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">💰 Total de la Compra</h4>
                  <div className="text-center">
                    <div className="text-3xl font-black text-green-700">
                      {compraSeleccionada.moneda === "USD" ? "U$D" : "$"} {compraSeleccionada.montoTotal.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600 font-bold mt-1">
                      Moneda: {compraSeleccionada.moneda === "USD" ? "Dólares" : "Pesos Argentinos"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de productos */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3 text-lg">📦 Productos</h4>
                <div className="border-2 border-gray-400 rounded-xl overflow-hidden shadow-md">
                  <table className="w-full">
                    <thead className="bg-gray-300">
                      <tr>
                        <th className="text-left p-3 font-bold text-gray-900 border-b-2 border-gray-400">Producto</th>
                        <th className="text-center p-3 font-bold text-gray-900 border-b-2 border-gray-400">Cantidad</th>
                        <th className="text-center p-3 font-bold text-gray-900 border-b-2 border-gray-400">Precio Unit.</th>
                        <th className="text-center p-3 font-bold text-gray-900 border-b-2 border-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {Array.isArray(compraSeleccionada.productos) ? (
                        compraSeleccionada.productos.map((producto, idx) => (
                          <tr key={idx} className="border-b border-gray-300 hover:bg-gray-100">
                            <td className="p-3 font-bold text-gray-900 bg-white border-r border-gray-300">{producto.producto}</td>
                            <td className="p-3 text-center font-bold text-gray-900 bg-white border-r border-gray-300">{producto.cantidad}</td>
                            <td className="p-3 text-center font-bold text-gray-900 bg-white border-r border-gray-300">
                              {compraSeleccionada.moneda === "USD" ? "U$D" : "$"} {producto.precio.toLocaleString()}
                            </td>
                            <td className="p-3 text-center font-bold text-blue-700 bg-white">
                              {compraSeleccionada.moneda === "USD" ? "U$D" : "$"} {producto.total.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="bg-white">
                          <td colSpan={4} className="p-4 text-center font-bold text-gray-900 bg-white">
                            {compraSeleccionada.productos}
                          </td>
                        </tr>
                      )}
                      
                      {/* Fila de total */}
                      <tr className="bg-blue-200 border-t-2 border-blue-400">
                        <td colSpan={3} className="p-3 text-right font-bold text-gray-900 text-lg">
                          TOTAL GENERAL:
                        </td>
                        <td className="p-3 text-center">
                          <div className="text-xl font-black text-blue-800">
                            {compraSeleccionada.moneda === "USD" ? "U$D" : "$"} {compraSeleccionada.montoTotal.toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notas */}
              {compraSeleccionada.notas && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">📝 Notas</h4>
                  <div className="bg-white border-2 border-yellow-400 rounded-xl p-4 shadow-md">
                    <p className="text-gray-900 font-bold">{compraSeleccionada.notas}</p>
                  </div>
                </div>
              )}

              {/* Botón cerrar */}
              <div className="flex justify-end">
                <button
                  onClick={() => setMostrarDetalleCompra(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-bold transition-colors text-lg"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal formulario compra */}
        {mostrarFormCompra && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <h3 className="text-lg font-bold mb-4 text-gray-900">📦 Nueva Compra</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📄 Número de Remito</label>
                  <input
                    type="text"
                    value={numeroRemito}
                    onChange={(e) => setNumeroRemito(e.target.value)}
                    placeholder="Ej: R-001234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🛒 Número de Pedido</label>
                  <input
                    type="text"
                    value={numeroPedido}
                    onChange={(e) => setNumeroPedido(e.target.value)}
                    placeholder="Ej: P-001234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">💱 Moneda</label>
                  <select
                    value={monedaCompra}
                    onChange={(e) => setMonedaCompra(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 bg-white text-gray-900"
                  >
                    <option value="ARS">🇦🇷 Pesos</option>
                    <option value="USD">🇺🇸 Dólares</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Estado</label>
                  <select
                    value={estadoCompra}
                    onChange={(e) => setEstadoCompra(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 bg-white text-gray-900"
                  >
                    {estadosCompra.map((estado) => (
                      <option key={estado.valor} value={estado.valor}>{estado.texto}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabla de productos dinámica */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-base font-bold text-gray-900">📦 Productos</h4>
                  <button
                    onClick={agregarProducto}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                  >
                    ➕ Agregar Producto
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-700 border-b">Producto</th>
                        <th className="text-center p-3 font-semibold text-gray-700 border-b w-24">Cantidad</th>
                        <th className="text-center p-3 font-semibold text-gray-700 border-b w-32">Precio ({monedaCompra})</th>
                        <th className="text-center p-3 font-semibold text-gray-700 border-b w-32">Total</th>
                        <th className="text-center p-3 font-semibold text-gray-700 border-b w-16">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosCompra.map((producto, index) => (
                        <tr key={producto.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <input
                              type="text"
                              value={producto.producto}
                              onChange={(e) => actualizarProducto(producto.id, "producto", e.target.value)}
                              placeholder="Nombre del producto"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 text-sm bg-white text-gray-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={producto.cantidad || ""}
                              onChange={(e) => actualizarProducto(producto.id, "cantidad", Number(e.target.value) || 1)}
                              min="1"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 text-sm text-center bg-white text-gray-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={producto.precio || ""}
                              onChange={(e) => actualizarProducto(producto.id, "precio", Number(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 text-sm text-center bg-white text-gray-900"
                            />
                          </td>
                          <td className="p-2">
                            <div className="text-center font-semibold text-blue-600 py-1.5">
                              {monedaCompra === "USD" ? "U$D" : "$"} {producto.total.toLocaleString()}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {productosCompra.length > 1 && (
                              <button
                                onClick={() => eliminarProducto(producto.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Eliminar producto"
                              >
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      
                      {/* Fila de total */}
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td colSpan={3} className="p-3 text-right font-bold text-gray-800">
                          TOTAL GENERAL:
                        </td>
                        <td className="p-3 text-center">
                          <div className="text-lg font-bold text-blue-700">
                            {monedaCompra === "USD" ? "U$D" : "$"} {calcularTotalCompra().toLocaleString()}
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notas */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Notas</label>
                <textarea
                  value={notasCompra}
                  onChange={(e) => setNotasCompra(e.target.value)}
                  placeholder="Notas adicionales sobre la compra"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setMostrarFormCompra(false);
                    limpiarFormCompra();
                  }}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCompra}
                  disabled={productosCompra.length === 0 || productosCompra.every(p => !p.producto.trim())}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    productosCompra.length === 0 || productosCompra.every(p => !p.producto.trim())
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  Guardar Compra
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal formulario pago */}
        {mostrarFormPago && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-xl w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold mb-4 text-gray-900">💰 Registrar Pago</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">💱 Moneda</label>
                  <select
                    value={monedaPago}
                    onChange={(e) => setMonedaPago(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 bg-white text-gray-900"
                  >
                    <option value="ARS">🇦🇷 Pesos</option>
                    <option value="USD">🇺🇸 Dólares</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💰 Monto {monedaPago === "USD" ? "USD" : "ARS"} *
                  </label>
                  <input
                    type="number"
                    value={monedaPago === "USD" ? (montoUSDPago || "") : (montoPago || "")}
                    onChange={(e) => {
                      if (monedaPago === "USD") {
                        setMontoUSDPago(Number(e.target.value));
                      } else {
                        setMontoPago(Number(e.target.value));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">💳 Forma de Pago *</label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 bg-white text-gray-900"
                  >
                    <option value="">Seleccionar forma</option>
                    {formasPago.map((forma) => (
                      <option key={forma} value={forma}>{forma}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🔢 Referencia</label>
                  <input
                    type="text"
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    placeholder="Número de transferencia, cheque, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 bg-white text-gray-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Notas</label>
                  <textarea
                    value={notasPago}
                    onChange={(e) => setNotasPago(e.target.value)}
                    placeholder="Notas adicionales sobre el pago"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setMostrarFormPago(false);
                    limpiarFormPago();
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarPago}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Registrar Pago
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}