"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";

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

interface Compra {
  id: string;
  fecha: string;
  numeroRemito: string;
  numeroPedido: string;
  productos: string;
  montoTotal: number;
  moneda: string;
  estado: string; // pendiente, pagado, parcial
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
  const [productos, setProductos] = useState("");
  const [montoTotal, setMontoTotal] = useState(0);
  const [monedaCompra, setMonedaCompra] = useState("ARS");
  const [estadoCompra, setEstadoCompra] = useState("pendiente");
  const [notasCompra, setNotasCompra] = useState("");

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

  useEffect(() => {
    cargarCompras();
    cargarPagos();
  }, []);

  const cargarCompras = async () => {
    try {
      const q = query(
        collection(db, `negocios/${negocioID}/compras`),
        where("proveedorId", "==", proveedor.id),
        orderBy("fechaCreacion", "desc")
      );
      const snap = await getDocs(q);
      const comprasData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Compra[];
      setCompras(comprasData);
    } catch (error) {
      console.error("Error cargando compras:", error);
      // Si la colección no existe, crear una compra vacía para inicializar
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

  const guardarCompra = async () => {
    if (!productos.trim() || montoTotal <= 0) {
      setMensaje("❌ Completa los campos obligatorios");
      setTimeout(() => setMensaje(""), 2000);
      return;
    }

    const nuevaCompra = {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      fecha: new Date().toLocaleDateString("es-AR"),
      numeroRemito: numeroRemito.trim(),
      numeroPedido: numeroPedido.trim(),
      productos: productos.trim(),
      montoTotal,
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
    setProductos("");
    setMontoTotal(0);
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
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Compras ARS</p>
                <p className="text-2xl font-bold text-blue-600">${totales.totalComprasARS.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Compras USD</p>
                <p className="text-2xl font-bold text-blue-600">U$D {totales.totalComprasUSD.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">💵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pagado ARS</p>
                <p className="text-2xl font-bold text-green-600">${totales.totalPagosARS.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Saldo ARS</p>
                <p className={`text-2xl font-bold ${totales.saldoARS > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${Math.abs(totales.saldoARS).toLocaleString()}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${totales.saldoARS > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <span className={`text-xl ${totales.saldoARS > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totales.saldoARS > 0 ? '⚠️' : '✅'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación de pestañas */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex gap-4 mb-6">
            {[
              { id: "resumen", nombre: "📊 Resumen", icono: "📊" },
              { id: "compras", nombre: "📦 Compras", icono: "📦" },
              { id: "pagos", nombre: "💰 Pagos", icono: "💰" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVistaActual(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  vistaActual === tab.id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                <h4 className="font-semibold text-gray-700 mb-3">Últimas Compras</h4>
                {compras.slice(0, 3).map((compra) => (
                  <div key={compra.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
                    <div>
                      <p className="font-medium">{compra.productos}</p>
                      <p className="text-sm text-gray-600">{compra.fecha} • Remito: {compra.numeroRemito}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{compra.moneda === "USD" ? `U$D ${compra.montoTotal}` : `$${compra.montoTotal.toLocaleString()}`}</p>
                      <span className={`text-xs px-2 py-1 rounded-full text-white ${
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
                <h4 className="font-semibold text-gray-700 mb-3">Últimos Pagos</h4>
                {pagos.slice(0, 3).map((pago) => (
                  <div key={pago.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
                    <div>
                      <p className="font-medium">{pago.forma}</p>
                      <p className="text-sm text-gray-600">{pago.fecha} • {pago.referencia}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {pago.montoUSD ? `U$D ${pago.montoUSD}` : `$${pago.monto.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vistaActual === "compras" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Historial de Compras</h3>
                <button
                  onClick={() => setMostrarFormCompra(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  📦 Nueva Compra
                </button>
              </div>

              {compras.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📦</div>
                  <p>No hay compras registradas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-700">Fecha</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Remito/Pedido</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Productos</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Monto</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.map((compra) => (
                        <tr key={compra.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{compra.fecha}</td>
                          <td className="p-3">
                            <div>
                              {compra.numeroRemito && <p>📄 {compra.numeroRemito}</p>}
                              {compra.numeroPedido && <p className="text-sm text-gray-600">🛒 {compra.numeroPedido}</p>}
                            </div>
                          </td>
                          <td className="p-3">{compra.productos}</td>
                          <td className="p-3 font-bold">
                            {compra.moneda === "USD" ? `U$D ${compra.montoTotal}` : `$${compra.montoTotal.toLocaleString()}`}
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${
                              estadosCompra.find(e => e.valor === compra.estado)?.color || "bg-gray-500"
                            }`}>
                              {estadosCompra.find(e => e.valor === compra.estado)?.texto || compra.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {vistaActual === "pagos" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Historial de Pagos</h3>
                <button
                  onClick={() => setMostrarFormPago(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  💰 Registrar Pago
                </button>
              </div>

              {pagos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">💰</div>
                  <p>No hay pagos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-700">Fecha</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Forma</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Referencia</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Monto</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagos.map((pago) => (
                        <tr key={pago.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{pago.fecha}</td>
                          <td className="p-3">{pago.forma}</td>
                          <td className="p-3">{pago.referencia || "-"}</td>
                          <td className="p-3 font-bold text-green-600">
                            {pago.montoUSD ? `U$D ${pago.montoUSD}` : `$${pago.monto.toLocaleString()}`}
                          </td>
                          <td className="p-3 text-sm text-gray-600">{pago.notas || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal formulario compra */}
        {mostrarFormCompra && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <h3 className="text-lg font-bold mb-4 text-gray-900">📦 Nueva Compra</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📦 Productos *</label>
                  <textarea
                    value={productos}
                    onChange={(e) => setProductos(e.target.value)}
                    placeholder="Describe los productos comprados"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">💰 Monto Total *</label>
                  <input
                    type="number"
                    value={montoTotal || ""}
                    onChange={(e) => setMontoTotal(Number(e.target.value))}
                    placeholder="0.00"
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Notas</label>
                  <textarea
                    value={notasCompra}
                    onChange={(e) => setNotasCompra(e.target.value)}
                    placeholder="Notas adicionales"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setMostrarFormCompra(false);
                    limpiarFormCompra();
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCompra}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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