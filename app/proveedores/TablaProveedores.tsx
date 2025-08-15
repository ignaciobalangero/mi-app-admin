"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

// Interfaces
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
  vistaActual: "compras" | "pagos";
  compras: Compra[];
  pagos: Pago[];
  proveedor: { id: string; nombre: string };
  negocioID: string;
  onRecargar: () => void;
  onMensaje: (mensaje: string) => void;
  onMostrarFormCompra: () => void;
  onMostrarFormPago: () => void;
  onAbrirDetalleCompra: (compra: Compra) => void;
}

const estadosCompra = [
  { valor: "pendiente", texto: "Pendiente", color: "bg-yellow-500" },
  { valor: "pagado", texto: "Pagado", color: "bg-green-500" },
  { valor: "parcial", texto: "Pago Parcial", color: "bg-blue-500" },
  { valor: "cancelado", texto: "Cancelado", color: "bg-red-500" },
];

const formasPago = ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "USD", "Crypto"];

export default function TablaProveedores({ 
  vistaActual, 
  compras, 
  pagos, 
  proveedor, 
  negocioID, 
  onRecargar, 
  onMensaje,
  onMostrarFormCompra,
  onMostrarFormPago,
  onAbrirDetalleCompra
}: Props) {

  // Estados para modales de eliminación
  const [pagoAEliminar, setPagoAEliminar] = useState<string | null>(null);
  const [compraAEliminar, setCompraAEliminar] = useState<string | null>(null);
  
  // Estados para edición
  const [pagoEditando, setPagoEditando] = useState<Pago | null>(null);
  const [compraEditando, setCompraEditando] = useState<Compra | null>(null);
  const [mostrarEditarPago, setMostrarEditarPago] = useState(false);
  const [mostrarEditarCompra, setMostrarEditarCompra] = useState(false);

  // Estados para formularios de edición
  const [formEditPago, setFormEditPago] = useState({
    monto: 0,
    montoUSD: 0,
    moneda: "ARS",
    forma: "",
    referencia: "",
    notas: ""
  });

  const [formEditCompra, setFormEditCompra] = useState({
    numeroRemito: "",
    numeroPedido: "",
    moneda: "ARS",
    estado: "pendiente",
    notas: "",
    productos: [] as ProductoCompra[]
  });

  // Funciones de eliminación
  const eliminarPago = async (pagoId: string) => {
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/pagosProveedores`, pagoId));
      onMensaje("✅ Pago eliminado");
      onRecargar();
    } catch (error) {
      console.error("Error eliminando pago:", error);
      onMensaje("❌ Error al eliminar pago");
    } finally {
      setPagoAEliminar(null);
    }
  };

  const eliminarCompra = async (compraId: string) => {
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/compras`, compraId));
      onMensaje("✅ Compra eliminada");
      onRecargar();
    } catch (error) {
      console.error("Error eliminando compra:", error);
      onMensaje("❌ Error al eliminar compra");
    } finally {
      setCompraAEliminar(null);
    }
  };

  // Funciones de edición
  const editarPago = (pago: Pago) => {
    setPagoEditando(pago);
    setFormEditPago({
      monto: pago.monto || 0,
      montoUSD: pago.montoUSD || 0,
      moneda: (pago.montoUSD && pago.montoUSD > 0) ? "USD" : "ARS",
      forma: pago.forma,
      referencia: pago.referencia,
      notas: pago.notas
    });
    setMostrarEditarPago(true);
  };

  const editarCompra = (compra: Compra) => {
    setCompraEditando(compra);
    
    let productosParaEditar: ProductoCompra[] = [];
    if (Array.isArray(compra.productos)) {
      productosParaEditar = compra.productos;
    } else {
      productosParaEditar = [{
        id: "1",
        producto: compra.productos as any,
        cantidad: 1,
        precio: compra.montoTotal,
        total: compra.montoTotal
      }];
    }
    
    setFormEditCompra({
      numeroRemito: compra.numeroRemito,
      numeroPedido: compra.numeroPedido,
      moneda: compra.moneda,
      estado: compra.estado,
      notas: compra.notas,
      productos: productosParaEditar
    });
    setMostrarEditarCompra(true);
  };

  // Funciones de actualización
  const actualizarPago = async () => {
    if ((formEditPago.moneda === "ARS" && formEditPago.monto <= 0) || 
        (formEditPago.moneda === "USD" && formEditPago.montoUSD <= 0) || 
        !formEditPago.forma) {
      onMensaje("❌ Completa los campos obligatorios");
      return;
    }

    if (!pagoEditando) return;

    const pagoData = {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      fecha: pagoEditando.fecha,
      monto: formEditPago.moneda === "ARS" ? formEditPago.monto : 0,
      montoUSD: formEditPago.moneda === "USD" ? formEditPago.montoUSD : 0,
      forma: formEditPago.forma,
      referencia: formEditPago.referencia.trim(),
      notas: formEditPago.notas.trim(),
      fechaCreacion: pagoEditando.fechaCreacion,
    };

    try {
      await updateDoc(doc(db, `negocios/${negocioID}/pagosProveedores`, pagoEditando.id), pagoData);
      onMensaje("✅ Pago actualizado");
      setMostrarEditarPago(false);
      setPagoEditando(null);
      onRecargar();
    } catch (error) {
      console.error("Error:", error);
      onMensaje("❌ Error al actualizar pago");
    }
  };

  const actualizarProductoEdit = (id: string, campo: keyof ProductoCompra, valor: any) => {
    const nuevosProductos = formEditCompra.productos.map(p => {
      if (p.id === id) {
        const productoActualizado = { ...p, [campo]: valor };
        if (campo === 'cantidad' || campo === 'precio') {
          productoActualizado.total = productoActualizado.cantidad * productoActualizado.precio;
        }
        return productoActualizado;
      }
      return p;
    });
    
    setFormEditCompra(prev => ({ ...prev, productos: nuevosProductos }));
  };

  const agregarProductoEdit = () => {
    const nuevoProducto: ProductoCompra = {
      id: Date.now().toString(),
      producto: "",
      cantidad: 1,
      precio: 0,
      total: 0
    };
    setFormEditCompra(prev => ({ 
      ...prev, 
      productos: [...prev.productos, nuevoProducto] 
    }));
  };

  const eliminarProductoEdit = (id: string) => {
    setFormEditCompra(prev => ({ 
      ...prev, 
      productos: prev.productos.filter(p => p.id !== id) 
    }));
  };

  const calcularTotalCompraEdit = () => {
    return formEditCompra.productos.reduce((sum, p) => sum + p.total, 0);
  };

  const actualizarCompra = async () => {
    if (formEditCompra.productos.length === 0 || formEditCompra.productos.every(p => !p.producto.trim())) {
      onMensaje("❌ Agrega al menos un producto");
      return;
    }

    const productosValidos = formEditCompra.productos.filter(p => p.producto.trim() && p.cantidad > 0);
    if (productosValidos.length === 0) {
      onMensaje("❌ Completa la información de los productos");
      return;
    }

    if (!compraEditando) return;

    const totalCalculado = calcularTotalCompraEdit();

    const compraData = {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      fecha: compraEditando.fecha,
      numeroRemito: formEditCompra.numeroRemito.trim(),
      numeroPedido: formEditCompra.numeroPedido.trim(),
      productos: productosValidos,
      montoTotal: totalCalculado,
      moneda: formEditCompra.moneda,
      estado: formEditCompra.estado,
      notas: formEditCompra.notas.trim(),
      fechaCreacion: compraEditando.fechaCreacion,
    };

    try {
      await updateDoc(doc(db, `negocios/${negocioID}/compras`, compraEditando.id), compraData);
      onMensaje("✅ Compra actualizada");
      setMostrarEditarCompra(false);
      setCompraEditando(null);
      onRecargar();
    } catch (error) {
      console.error("Error:", error);
      onMensaje("❌ Error al actualizar compra");
    }
  };

  return (
    <>
      {/* TABLA DE COMPRAS */}
      {vistaActual === "compras" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Historial de Compras</h3>
            <button
              onClick={onMostrarFormCompra}
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
                    <th className="text-center p-3 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((compra) => (
                    <tr key={compra.id} className="border-b hover:bg-blue-50 transition-all duration-200">
                      <td className="p-3 font-semibold text-gray-900">{compra.fecha}</td>
                      <td className="p-3">
                        <div>
                          {compra.numeroRemito && <p className="font-semibold text-gray-900">📄 {compra.numeroRemito}</p>}
                          {compra.numeroPedido && <p className="text-sm text-gray-700 font-medium">🛒 {compra.numeroPedido}</p>}
                          {!compra.numeroRemito && !compra.numeroPedido && <span className="text-gray-500">Sin remito</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        {Array.isArray(compra.productos) ? (
                          <div className="space-y-1">
                            {compra.productos.slice(0, 2).map((p, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-semibold text-gray-900">{p.producto}</span>
                                <span className="text-gray-700 ml-2">({p.cantidad}x ${p.precio})</span>
                              </div>
                            ))}
                            {compra.productos.length > 2 && (
                              <div className="text-xs text-blue-600 font-medium">
                                +{compra.productos.length - 2} productos más...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900">{compra.productos}</span>
                        )}
                      </td>
                      <td className="p-3 font-black text-gray-900">
                        {compra.moneda === "USD" ? `U$D ${compra.montoTotal}` : `${compra.montoTotal.toLocaleString()}`}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${
                          estadosCompra.find(e => e.valor === compra.estado)?.color || "bg-gray-500"
                        }`}>
                          {estadosCompra.find(e => e.valor === compra.estado)?.texto || compra.estado}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => onAbrirDetalleCompra(compra)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium"
                            title="Ver detalle"
                          >
                            👁️ Ver
                          </button>
                          <button
                            onClick={() => editarCompra(compra)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium"
                            title="Editar compra"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => setCompraAEliminar(compra.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium"
                            title="Eliminar compra"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TABLA DE PAGOS */}
      {vistaActual === "pagos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Historial de Pagos</h3>
            <button
              onClick={onMostrarFormPago}
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
            <div className="overflow-x-auto border-2 border-gray-400 rounded-xl">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-900 border-b-2 border-gray-400">Fecha</th>
                    <th className="text-left p-3 font-bold text-gray-900 border-b-2 border-gray-400">Forma</th>
                    <th className="text-left p-3 font-bold text-gray-900 border-b-2 border-gray-400">Referencia</th>
                    <th className="text-left p-3 font-bold text-gray-900 border-b-2 border-gray-400">Monto</th>
                    <th className="text-left p-3 font-bold text-gray-900 border-b-2 border-gray-400">Notas</th>
                    <th className="text-center p-3 font-bold text-gray-900 border-b-2 border-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b-2 border-gray-300 hover:bg-green-50">
                      <td className="p-4 font-bold text-gray-900 bg-white border-r border-gray-300">{pago.fecha}</td>
                      <td className="p-4 font-bold text-gray-900 bg-white border-r border-gray-300">{pago.forma}</td>
                      <td className="p-4 font-semibold text-gray-800 bg-white border-r border-gray-300">{pago.referencia || "-"}</td>
                      <td className="p-4 font-black text-green-700 bg-white border-r border-gray-300 text-lg">
                        {pago.montoUSD ? `U$D ${pago.montoUSD}` : `${pago.monto.toLocaleString()}`}
                      </td>
                      <td className="p-4 font-semibold text-gray-800 bg-white border-r border-gray-300">{pago.notas || "-"}</td>
                      <td className="p-4 bg-white">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => editarPago(pago)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium"
                            title="Editar pago"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => setPagoAEliminar(pago.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium"
                            title="Eliminar pago"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL EDITAR PAGO */}
      {mostrarEditarPago && pagoEditando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full mx-4 shadow-2xl">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">✏️ Editar Pago</h3>
                  <p className="text-orange-100">Modificar información del pago</p>
                </div>
                <button
                  onClick={() => {
                    setMostrarEditarPago(false);
                    setPagoEditando(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold bg-white/20 rounded-lg w-10 h-10 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">💱 Moneda</label>
                <select
                  value={formEditPago.moneda}
                  onChange={(e) => setFormEditPago(prev => ({ ...prev, moneda: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                >
                  <option value="ARS">🇦🇷 Pesos</option>
                  <option value="USD">🇺🇸 Dólares</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💰 Monto {formEditPago.moneda === "USD" ? "USD" : "ARS"} *
                </label>
                <input
                  type="number"
                  value={formEditPago.moneda === "USD" ? (formEditPago.montoUSD || "") : (formEditPago.monto || "")}
                  onChange={(e) => {
                    if (formEditPago.moneda === "USD") {
                      setFormEditPago(prev => ({ ...prev, montoUSD: Number(e.target.value) }));
                    } else {
                      setFormEditPago(prev => ({ ...prev, monto: Number(e.target.value) }));
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">💳 Forma de Pago *</label>
                <select
                  value={formEditPago.forma}
                  onChange={(e) => setFormEditPago(prev => ({ ...prev, forma: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
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
                  value={formEditPago.referencia}
                  onChange={(e) => setFormEditPago(prev => ({ ...prev, referencia: e.target.value }))}
                  placeholder="Número de transferencia, cheque, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Notas</label>
                <textarea
                  value={formEditPago.notas}
                  onChange={(e) => setFormEditPago(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas adicionales sobre el pago"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setMostrarEditarPago(false);
                  setPagoEditando(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={actualizarPago}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Actualizar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COMPRA */}
      {mostrarEditarCompra && compraEditando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">✏️ Editar Compra</h3>
                  <p className="text-orange-100">Modificar información de la compra</p>
                </div>
                <button
                  onClick={() => {
                    setMostrarEditarCompra(false);
                    setCompraEditando(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold bg-white/20 rounded-lg w-10 h-10 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📄 Número de Remito</label>
                <input
                  type="text"
                  value={formEditCompra.numeroRemito}
                  onChange={(e) => setFormEditCompra(prev => ({ ...prev, numeroRemito: e.target.value }))}
                  placeholder="Ej: R-001234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🛒 Número de Pedido</label>
                <input
                  type="text"
                  value={formEditCompra.numeroPedido}
                  onChange={(e) => setFormEditCompra(prev => ({ ...prev, numeroPedido: e.target.value }))}
                  placeholder="Ej: P-001234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">💱 Moneda</label>
                <select
                  value={formEditCompra.moneda}
                  onChange={(e) => setFormEditCompra(prev => ({ ...prev, moneda: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                >
                  <option value="ARS">🇦🇷 Pesos</option>
                  <option value="USD">🇺🇸 Dólares</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Estado</label>
                <select
                  value={formEditCompra.estado}
                  onChange={(e) => setFormEditCompra(prev => ({ ...prev, estado: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
                >
                  {estadosCompra.map((estado) => (
                    <option key={estado.valor} value={estado.valor}>{estado.texto}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabla de productos para editar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-base font-bold text-gray-900">📦 Productos</h4>
                <button
                  onClick={agregarProductoEdit}
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
                      <th className="text-center p-3 font-semibold text-gray-700 border-b w-32">Precio ({formEditCompra.moneda})</th>
                      <th className="text-center p-3 font-semibold text-gray-700 border-b w-32">Total</th>
                      <th className="text-center p-3 font-semibold text-gray-700 border-b w-16">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formEditCompra.productos.map((producto, index) => (
                      <tr key={producto.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={producto.producto}
                            onChange={(e) => actualizarProductoEdit(producto.id, "producto", e.target.value)}
                            placeholder="Nombre del producto"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-orange-500 text-sm bg-white text-gray-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={producto.cantidad || ""}
                            onChange={(e) => actualizarProductoEdit(producto.id, "cantidad", Number(e.target.value) || 1)}
                            min="1"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-orange-500 text-sm text-center bg-white text-gray-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={producto.precio || ""}
                            onChange={(e) => actualizarProductoEdit(producto.id, "precio", Number(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-orange-500 text-sm text-center bg-white text-gray-900"
                          />
                        </td>
                        <td className="p-2">
                          <div className="text-center font-semibold text-blue-600 py-1.5">
                            {formEditCompra.moneda === "USD" ? "U$D" : "$"} {producto.total.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {formEditCompra.productos.length > 1 && (
                            <button
                              onClick={() => eliminarProductoEdit(producto.id)}
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
                    <tr className="bg-orange-50 border-t-2 border-orange-200">
                      <td colSpan={3} className="p-3 text-right font-bold text-gray-800">
                        TOTAL GENERAL:
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-lg font-bold text-orange-700">
                          {formEditCompra.moneda === "USD" ? "U$D" : "$"} {calcularTotalCompraEdit().toLocaleString()}
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
                value={formEditCompra.notas}
                onChange={(e) => setFormEditCompra(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales sobre la compra"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 bg-white text-gray-900"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarEditarCompra(false);
                  setCompraEditando(null);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={actualizarCompra}
                disabled={formEditCompra.productos.length === 0 || formEditCompra.productos.every(p => !p.producto.trim())}
                className={`px-6 py-2 rounded-lg font-medium ${
                  formEditCompra.productos.length === 0 || formEditCompra.productos.every(p => !p.producto.trim())
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
              >
                Actualizar Compra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINAR PAGO */}
      {pagoAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Eliminación</h3>
              <p className="text-gray-600 mb-6">¿Estás seguro que querés eliminar este pago?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setPagoAEliminar(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => eliminarPago(pagoAEliminar)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINAR COMPRA */}
      {compraAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Eliminación</h3>
              <p className="text-gray-600 mb-6">¿Estás seguro que querés eliminar esta compra?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setCompraAEliminar(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => eliminarCompra(compraAEliminar)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}