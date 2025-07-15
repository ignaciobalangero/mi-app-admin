// ModalEditarVenta.tsx
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
  codigo?: string;
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
      setProductos(venta.productos ? [...venta.productos] : []);
    }
  }, [venta, mostrar]);

  const actualizarProducto = (index: number, campo: string, valor: any): void => {
    const nuevosProductos = [...productos];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      [campo]: valor
    };

    // Recalcular total del producto
    if (campo === 'precioUnitario' || campo === 'cantidad') {
      const precio = campo === 'precioUnitario' ? valor : nuevosProductos[index].precioUnitario;
      const cantidad = campo === 'cantidad' ? valor : nuevosProductos[index].cantidad;
      nuevosProductos[index].total = precio * cantidad;
    }

    setProductos(nuevosProductos);
  };

  const guardarCambios = async (): Promise<void> => {
    if (!venta || !negocioID) return;

    setGuardando(true);

    try {
      // Calcular nuevo total de la venta
      const totalVenta = productos.reduce((sum, p) => sum + (p.total || 0), 0);

      // 1. Actualizar ventasGeneral
      await updateDoc(doc(db, `negocios/${negocioID}/ventasGeneral/${venta.id}`), {
        cliente,
        fecha,
        productos,
        total: totalVenta
      });

      // 2. Si hay teléfono, actualizar también ventaTelefonos
      const telefono = productos.find(p => p.categoria === "Teléfono");
      if (telefono) {
        const telefonoRef = doc(db, `negocios/${negocioID}/ventaTelefonos/${venta.id}`);
        const telefonoSnap = await getDoc(telefonoRef);
        
        if (telefonoSnap.exists()) {
          // Calcular precio de costo y ganancia
          const precioVenta = telefono.precioUnitario;
          const precioCosto = telefono.costo || telefonoSnap.data().precioCosto || 0;
          
          await updateDoc(telefonoRef, {
            precioVenta: precioVenta,
            precioCosto: precioCosto,
            cliente: cliente,
            fecha: fecha
          });
        }
      }

      onVentaActualizada();
      onClose();
      
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      alert("Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  };

  if (!mostrar || !venta) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-[#ecf0f1]">
        
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

                {/* Precios y cantidad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      💰 Precio Unitario
                    </label>
                    <input
                      type="number"
                      value={producto.precioUnitario || 0}
                      onChange={(e) => actualizarProducto(index, 'precioUnitario', Number(e.target.value))}
                      className="w-full p-2 border border-[#bdc3c7] rounded focus:ring-1 focus:ring-[#f39c12] text-sm font-medium"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      📦 Cantidad
                    </label>
                    <input
                      type="number"
                      value={producto.cantidad || 1}
                      onChange={(e) => actualizarProducto(index, 'cantidad', Number(e.target.value))}
                      className="w-full p-2 border border-[#bdc3c7] rounded focus:ring-1 focus:ring-[#f39c12] text-sm font-medium"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      💵 Total
                    </label>
                    <div className="w-full p-2 bg-[#ecf0f1] border border-[#bdc3c7] rounded text-sm font-bold text-[#27ae60]">
                      {producto.moneda === "USD" ? "USD" : "$"} {((producto.precioUnitario || 0) * (producto.cantidad || 1)).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>

                {/* Información adicional solo para teléfonos */}
                {producto.categoria === "Teléfono" && (
                  <div className="mt-4 p-3 bg-[#fff3cd] border border-[#f39c12] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#856404] font-medium text-sm">
                        📱 Información del Teléfono
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#856404] mb-1">
                          Precio de Costo
                        </label>
                        <input
                          type="number"
                          value={producto.costo || 0}
                          onChange={(e) => actualizarProducto(index, 'costo', Number(e.target.value))}
                          className="w-full p-2 border border-[#f39c12] rounded focus:ring-1 focus:ring-[#f39c12] text-sm"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-[#856404] mb-1">
                          Ganancia Estimada
                        </label>
                        <div className="w-full p-2 bg-white border border-[#f39c12] rounded text-sm font-bold text-[#27ae60]">
                          {producto.moneda === "USD" ? "USD" : "$"} {((producto.precioUnitario || 0) - (producto.costo || 0)).toLocaleString("es-AR")}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-[#856404]">
                      💡 Los cambios se aplicarán también en la tabla de Venta de Teléfonos
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resumen total */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-lg text-white">
            <div className="flex justify-between items-center">
              <span className="font-medium">TOTAL DE LA VENTA:</span>
              <span className="font-bold text-xl">
                $ {productos.reduce((sum, p) => sum + ((p.precioUnitario || 0) * (p.cantidad || 1)), 0).toLocaleString("es-AR")}
              </span>
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