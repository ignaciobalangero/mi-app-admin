// ModalEditarVenta.tsx - CORREGIDO
"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Producto {
  categoria: string;
  producto?: string;
  descripcion?: string;
  marca?: string;
  modelo?: string;
  color?: string;
  precioUnitario: number;
  cantidad: number;
  total?: number;
  moneda?: string;
  costo?: number;
  ganancia?: number;
  codigo?: string;
  // ✅ AGREGAR CAMPOS FALTANTES QUE USA FIREBASE
  precioCosto?: number;
  precioCostoPesos?: number;
  precioVenta?: number;
  tipo?: string;
  hoja?: string;
}

interface Props {
  mostrar: boolean;
  venta: any;
  onClose: () => void;
  onVentaActualizada: () => void;
  negocioID: string;
  cotizacion: number;
}

export default function ModalEditarVenta({
  mostrar,
  venta,
  onClose,
  onVentaActualizada,
  negocioID,
  cotizacion
}: Props) {
  const [cliente, setCliente] = useState<string>("");
  const [fecha, setFecha] = useState<string>("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [guardando, setGuardando] = useState<boolean>(false);

  useEffect(() => {
    if (venta && mostrar) {
      setCliente(venta.cliente || "");
      setFecha(venta.fecha || "");
      
      // ✅ CARGAR PRODUCTOS CON ESTRUCTURA EXACTA DEL FORMULARIO
      const productosConCosto = venta.productos ? venta.productos.map((p: any) => ({
        ...p,
        // ✅ MAPEAR CAMPOS CORRECTAMENTE
        producto: p.descripcion || p.producto, // descripcion → producto para edición
        costo: p.precioCosto || 0,             // precioCosto → costo para edición
        ganancia: p.ganancia || 0,
        // ✅ MANTENER CAMPOS ORIGINALES
        precioCosto: p.precioCosto || 0,
        precioCostoPesos: p.precioCostoPesos || 0,
        precioVenta: p.precioVenta || (p.precioUnitario * p.cantidad),
      })) : [];
      
      setProductos(productosConCosto);
    }
  }, [venta, mostrar]);

  // ✅ NUEVA FUNCIÓN PARA CALCULAR GANANCIA
  const calcularGanancia = (precioVenta: number, precioCosto: number, cantidad: number = 1): number => {
    return (precioVenta - precioCosto) * cantidad;
  };

  const actualizarProducto = (index: number, campo: string, valor: any): void => {
    const nuevosProductos = [...productos];
    const productoActual = { ...nuevosProductos[index] };
    
    // ✅ ACTUALIZAR EL CAMPO DE FORMA SEGURA
    if (campo === 'producto') {
      productoActual.producto = valor;
    } else if (campo === 'marca') {
      productoActual.marca = valor;
    } else if (campo === 'modelo') {
      productoActual.modelo = valor;
    } else if (campo === 'precioUnitario') {
      productoActual.precioUnitario = Number(valor);
    } else if (campo === 'cantidad') {
      productoActual.cantidad = Number(valor);
    } else if (campo === 'costo') {
      productoActual.costo = Number(valor);
    }

    // ✅ RECALCULAR TOTAL Y GANANCIA CUANDO CAMBIA PRECIO, CANTIDAD O COSTO
    if (campo === 'precioUnitario' || campo === 'cantidad' || campo === 'costo') {
      const precio = campo === 'precioUnitario' ? Number(valor) : productoActual.precioUnitario || 0;
      const cantidad = campo === 'cantidad' ? Number(valor) : productoActual.cantidad || 1;
      const costo = campo === 'costo' ? Number(valor) : productoActual.costo || 0;
      
      // ✅ CALCULAR IGUAL QUE EL FORMULARIO ORIGINAL
      productoActual.precioVenta = precio * cantidad;        // precioVenta = total
      productoActual.precioUnitario = precio;                // mantener precio unitario
      productoActual.precioCosto = costo;                    // actualizar precioCosto
      productoActual.precioCostoPesos = costo;               // actualizar precioCostoPesos  
      productoActual.ganancia = (precio - costo) * cantidad; // ganancia total del producto
      
      // ✅ MANTENER TOTAL PARA COMPATIBILIDAD
      productoActual.total = precio * cantidad;
    }

    nuevosProductos[index] = productoActual;
    setProductos(nuevosProductos);
  };

  const guardarCambios = async (): Promise<void> => {
    if (!venta || !negocioID) return;

    setGuardando(true);

    try {
      // ✅ PREPARAR PRODUCTOS CON ESTRUCTURA EXACTA DEL FORMULARIO ORIGINAL
      const productosParaGuardar = productos.map(p => ({
        categoria: p.categoria,
        descripcion: p.producto || p.descripcion || "", // ✅ producto → descripcion
        marca: p.marca || "—",
        modelo: p.modelo || "—", 
        color: p.color || "—",
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario,
        precioCosto: p.costo || p.precioCosto || 0,      // ✅ costo → precioCosto
        precioCostoPesos: p.costo || p.precioCostoPesos || p.precioCosto || 0,
        precioVenta: p.precioVenta || (p.precioUnitario * p.cantidad), // ✅ total del producto
        ganancia: p.ganancia || 0,
        moneda: p.moneda,
        codigo: p.codigo,
        tipo: p.tipo,
        hoja: p.hoja || "",
        // ✅ MANTENER TOTAL PARA COMPATIBILIDAD
        total: p.precioVenta || (p.precioUnitario * p.cantidad)
      }));

      // ✅ CALCULAR TOTALES IGUAL QUE EL FORMULARIO ORIGINAL
      const totalVenta = productosParaGuardar.reduce((sum, p) => sum + (p.precioVenta || 0), 0);
      const gananciaTotal = productosParaGuardar.reduce((sum, p) => sum + (p.ganancia || 0), 0);

      console.log('💰 Guardando venta editada:', {
        totalVenta,
        gananciaTotal,
        productos: productosParaGuardar.length
      });

      // 1. Actualizar ventasGeneral con estructura exacta
      await updateDoc(doc(db, `negocios/${negocioID}/ventasGeneral/${venta.id}`), {
        cliente,
        fecha,
        productos: productosParaGuardar,
        total: totalVenta,
        gananciaTotal: gananciaTotal
      });

      // 2. Si hay teléfono, actualizar también ventaTelefonos
      const telefono = productosParaGuardar.find(p => p.categoria === "Teléfono");
      if (telefono) {
        const telefonoRef = doc(db, `negocios/${negocioID}/ventaTelefonos/${venta.id}`);
        const telefonoSnap = await getDoc(telefonoRef);
        
        if (telefonoSnap.exists()) {
          await updateDoc(telefonoRef, {
            precioVenta: telefono.precioVenta,        // ✅ usar precioVenta (total)
            precioCosto: telefono.precioCosto,        // ✅ usar precioCosto
            ganancia: telefono.ganancia,              // ✅ usar ganancia
            cliente: cliente,
            fecha: fecha
          });
        }
      }

      console.log('✅ Venta editada y guardada correctamente');
      onVentaActualizada();
      onClose();
      
    } catch (error) {
      console.error("❌ Error al guardar cambios:", error);
      alert("Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  };

  if (!mostrar || !venta) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border-2 border-[#ecf0f1]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">✏️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Editar Venta</h2>
              <p className="text-orange-100 text-sm">
                Venta #{venta.nroVenta || venta.id.slice(-6)}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                👤 Cliente
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all"
                placeholder="Nombre del cliente"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                📅 Fecha
              </label>
              <input
                type="text"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>

          {/* Lista de productos */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#2c3e50] flex items-center gap-2">
              <span className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center text-white">
                📦
              </span>
              Productos ({productos.length})
            </h3>

            {productos.map((producto, index) => (
              <div key={index} className="bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]">
                
                {/* Header del producto */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      producto.categoria === "Teléfono" 
                        ? 'bg-[#27ae60] text-white'
                        : producto.categoria === "Accesorio"
                        ? 'bg-[#3498db] text-white'
                        : 'bg-[#f39c12] text-white'
                    }`}>
                      {producto.categoria === "Teléfono" ? "📱" : producto.categoria === "Accesorio" ? "🔌" : "🔧"}
                      {producto.categoria}
                    </span>
                    
                    {producto.moneda && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#7f8c8d] text-white">
                        💰 {producto.moneda}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-[#7f8c8d]">
                    Producto {index + 1}
                  </div>
                </div>

                {/* Información del producto */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      Producto/Descripción
                    </label>
                    <input
                      type="text"
                      value={producto.producto || producto.descripcion || ""}
                      onChange={(e) => actualizarProducto(index, 'producto', e.target.value)}
                      className="w-full p-2 border border-[#bdc3c7] rounded focus:ring-1 focus:ring-[#f39c12] text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={producto.marca || ""}
                      onChange={(e) => actualizarProducto(index, 'marca', e.target.value)}
                      className="w-full p-2 border border-[#bdc3c7] rounded focus:ring-1 focus:ring-[#f39c12] text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={producto.modelo || ""}
                      onChange={(e) => actualizarProducto(index, 'modelo', e.target.value)}
                      className="w-full p-2 border border-[#bdc3c7] rounded focus:ring-1 focus:ring-[#f39c12] text-sm"
                    />
                  </div>
                </div>

                {/* ✅ SECCIÓN DE PRECIOS MEJORADA - PARA TODOS LOS PRODUCTOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  
                  {/* Precio de Costo */}
                  <div>
                    <label className="block text-sm font-medium text-[#e74c3c] mb-1">
                      💸 Precio de Costo
                    </label>
                    <input
                      type="number"
                      value={producto.costo || 0}
                      onChange={(e) => actualizarProducto(index, 'costo', Number(e.target.value))}
                      className="w-full p-2 border-2 border-[#e74c3c] rounded focus:ring-1 focus:ring-[#e74c3c] text-sm font-medium bg-gradient-to-r from-white to-[#fdf2f2]"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  
                  {/* Precio de Venta */}
                  <div>
                    <label className="block text-sm font-medium text-[#27ae60] mb-1">
                      💰 Precio de Venta
                    </label>
                    <input
                      type="number"
                      value={producto.precioUnitario || 0}
                      onChange={(e) => actualizarProducto(index, 'precioUnitario', Number(e.target.value))}
                      className="w-full p-2 border-2 border-[#27ae60] rounded focus:ring-1 focus:ring-[#27ae60] text-sm font-medium bg-gradient-to-r from-white to-[#f0f9f4]"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  
                  {/* Cantidad */}
                  <div>
                    <label className="block text-sm font-medium text-[#3498db] mb-1">
                      📦 Cantidad
                    </label>
                    <input
                      type="number"
                      value={producto.cantidad || 1}
                      onChange={(e) => actualizarProducto(index, 'cantidad', Number(e.target.value))}
                      className="w-full p-2 border-2 border-[#3498db] rounded focus:ring-1 focus:ring-[#3498db] text-sm font-medium bg-gradient-to-r from-white to-[#f0f8ff]"
                      min="1"
                    />
                  </div>
                  
                  {/* Total */}
                  <div>
                    <label className="block text-sm font-medium text-[#9b59b6] mb-1">
                      💵 Total
                    </label>
                    <div className="w-full p-2 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white rounded text-sm font-bold text-center">
                      {producto.moneda === "USD" ? "USD" : "$"} {((producto.precioUnitario || 0) * (producto.cantidad || 1)).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>

                {/* ✅ NUEVA SECCIÓN DE GANANCIA - PARA TODOS LOS PRODUCTOS */}
                <div className={`p-3 rounded-lg border-2 ${
                  (producto.ganancia || 0) > 0 
                    ? 'bg-[#d5f4e6] border-[#27ae60]' 
                    : (producto.ganancia || 0) < 0 
                    ? 'bg-[#fadbd8] border-[#e74c3c]' 
                    : 'bg-[#f8f9fa] border-[#7f8c8d]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        (producto.ganancia || 0) > 0 
                          ? 'text-[#27ae60]' 
                          : (producto.ganancia || 0) < 0 
                          ? 'text-[#e74c3c]' 
                          : 'text-[#7f8c8d]'
                      }`}>
                        {(producto.ganancia || 0) > 0 ? '📈' : (producto.ganancia || 0) < 0 ? '📉' : '📊'} 
                        Ganancia por producto:
                      </span>
                    </div>
                    <div className={`font-bold text-lg ${
                      (producto.ganancia || 0) > 0 
                        ? 'text-[#27ae60]' 
                        : (producto.ganancia || 0) < 0 
                        ? 'text-[#e74c3c]' 
                        : 'text-[#7f8c8d]'
                    }`}>
                      {producto.moneda === "USD" ? "USD" : "$"} {(producto.ganancia || 0).toLocaleString("es-AR")}
                    </div>
                  </div>
                  
                  {/* Desglose de la ganancia */}
                  <div className="mt-2 text-xs text-[#7f8c8d] grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      Precio Venta: <strong>${(producto.precioUnitario || 0).toLocaleString("es-AR")}</strong>
                    </div>
                    <div>
                      Precio Costo: <strong>${(producto.costo || 0).toLocaleString("es-AR")}</strong>
                    </div>
                    <div>
                      Margen: <strong>
                        {producto.precioUnitario && producto.precioUnitario > 0 
                          ? (((producto.precioUnitario - (producto.costo || 0)) / producto.precioUnitario) * 100).toFixed(1)
                          : 0
                        }%
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Información adicional solo para teléfonos */}
                {producto.categoria === "Teléfono" && (
                  <div className="mt-4 p-3 bg-[#fff3cd] border border-[#f39c12] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#856404] font-medium text-sm">
                        📱 Los cambios se aplicarán también en Venta de Teléfonos
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

            {/* ✅ RESUMEN TOTAL MEJORADO CON GANANCIA */}
          <div className="mt-6 space-y-4">
            
            {/* Total de Venta */}
            <div className="p-4 bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-lg text-white">
              <div className="flex justify-between items-center">
                <span className="font-medium">TOTAL DE LA VENTA:</span>
                <span className="font-bold text-xl">
                  $ {productos.reduce((sum, p) => sum + (p.precioVenta || (p.precioUnitario * p.cantidad)), 0).toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            {/* Ganancia Total */}
            <div className={`p-4 rounded-lg text-white ${
              productos.reduce((sum, p) => sum + (p.ganancia || 0), 0) > 0
                ? 'bg-gradient-to-r from-[#27ae60] to-[#2ecc71]'
                : productos.reduce((sum, p) => sum + (p.ganancia || 0), 0) < 0
                ? 'bg-gradient-to-r from-[#e74c3c] to-[#c0392b]'
                : 'bg-gradient-to-r from-[#7f8c8d] to-[#6c7b7f]'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {productos.reduce((sum, p) => sum + (p.ganancia || 0), 0) > 0 
                    ? '📈 GANANCIA TOTAL:' 
                    : productos.reduce((sum, p) => sum + (p.ganancia || 0), 0) < 0 
                    ? '📉 PÉRDIDA TOTAL:' 
                    : '📊 SIN GANANCIA:'
                  }
                </span>
                <span className="font-bold text-xl">
                  $ {productos.reduce((sum, p) => sum + (p.ganancia || 0), 0).toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="bg-[#f8f9fa] px-6 py-4 border-t border-[#ecf0f1] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-6 py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] disabled:bg-[#bdc3c7] text-white rounded-lg font-medium transition-all duration-200"
          >
            Cancelar
          </button>
          
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="px-8 py-3 bg-[#f39c12] hover:bg-[#e67e22] disabled:bg-[#bdc3c7] text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <span>💾</span>
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}