"use client";

import { useState } from "react";

// ✏️ MODAL EDITAR ACCESORIO - Componente independiente para editar productos

interface Producto {
  id: string;
  codigo: string;
  categoria: string;
  producto: string;
  marca: string;
  modelo?: string;
  color: string;
  precioCosto: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precio1Pesos?: number;
  precio2Pesos?: number;
  precio3Pesos?: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
  proveedor: string;
  stockIdeal?: number;
}

interface Props {
  producto: Producto;
  cotizacion: number;
  actualizarProducto?: (producto: Producto) => Promise<void>;
  onProductoActualizado?: (producto: Producto) => void;
  onClose: () => void;
}

export default function ModalEditarAccesorio({ 
  producto, 
  cotizacion, 
  actualizarProducto, 
  onProductoActualizado, 
  onClose 
}: Props) {
  
  // 🆕 ESTADO LOCAL DEL FORMULARIO
  const [formulario, setFormulario] = useState<Producto>({...producto});
  const [guardando, setGuardando] = useState(false);

  // 🔄 FUNCIÓN PARA MANEJAR CAMBIOS EN EL FORMULARIO
  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: name === 'precioCosto' || name === 'precio1' || name === 'precio2' || name === 'precio3' || 
              name === 'cantidad' || name === 'stockBajo' || name === 'stockIdeal'
        ? parseFloat(value) || 0
        : value
    }));
  };

  // 💾 FUNCIÓN PARA GUARDAR CAMBIOS
  const guardarCambios = async () => {
    if (!actualizarProducto) return;
    
    setGuardando(true);
    try {
      // Calcular precios en pesos automáticamente
      const productoConPrecios = {
        ...formulario,
        precio1Pesos: formulario.moneda === "USD" && cotizacion > 0 ? formulario.precio1 * cotizacion : formulario.precio1,
        precio2Pesos: formulario.moneda === "USD" && cotizacion > 0 ? formulario.precio2 * cotizacion : formulario.precio2,
        precio3Pesos: formulario.moneda === "USD" && cotizacion > 0 ? formulario.precio3 * cotizacion : formulario.precio3,
        cotizacion: cotizacion,
        ultimaActualizacion: new Date()
      };

      await actualizarProducto(productoConPrecios);
      if (onProductoActualizado) {
        onProductoActualizado(productoConPrecios);
      }
      onClose();
      console.log("✅ Producto actualizado correctamente");
      
    } catch (error) {
      console.error("❌ Error al actualizar producto:", error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border-2 border-[#ecf0f1] transform transition-all duration-300 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
        
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-t-2xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Editar Accesorio</h2>
                <p className="text-blue-100 text-sm mt-1 truncate max-w-[300px]">{formulario.producto}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6 bg-[#f8f9fa]">
          
          {/* 🆕 INFO DE COTIZACIÓN */}
          <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="font-bold">Cotización Actual</h3>
                <p className="text-sm opacity-90">1 USD = ${cotizacion.toLocaleString("es-AR")} ARS</p>
              </div>
            </div>
          </div>

          {/* Formulario de edición */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Código */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🏷️ Código
              </label>
              <input
                type="text"
                name="codigo"
                value={formulario.codigo}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                📂 Categoría
              </label>
              <input
                type="text"
                name="categoria"
                value={formulario.categoria}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Proveedor */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🏪 Proveedor
              </label>
              <input
                type="text"
                name="proveedor"
                value={formulario.proveedor}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Producto */}
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                📦 Producto
              </label>
              <input
                type="text"
                name="producto"
                value={formulario.producto}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🏢 Marca
              </label>
              <input
                type="text"
                name="marca"
                value={formulario.marca}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                📱 Modelo
              </label>
              <input
                type="text"
                name="modelo"
                value={formulario.modelo || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🎨 Color
              </label>
              <input
                type="text"
                name="color"
                value={formulario.color}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                💱 Moneda
              </label>
              <select
                name="moneda"
                value={formulario.moneda}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm appearance-none cursor-pointer"
              >
                <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
                <option value="USD">🇺🇸 USD - Dólar</option>
              </select>
            </div>

            {/* Stock Actual */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#9b59b6]">
                📊 Stock Actual
              </label>
              <input
                type="number"
                name="cantidad"
                value={formulario.cantidad}
                onChange={manejarCambio}
                min="0"
                className="w-full p-3 border-2 border-[#9b59b6] rounded-xl focus:ring-4 focus:ring-[#9b59b6]/20 focus:border-[#9b59b6] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Precio Costo */}
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-semibold text-[#e74c3c]">
                💰 Precio Costo ({formulario.moneda})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#e74c3c] font-bold">
                  $
                </span>
                <input
                  type="number"
                  name="precioCosto"
                  value={formulario.precioCosto}
                  onChange={manejarCambio}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-3 border-2 border-[#e74c3c] rounded-xl focus:ring-4 focus:ring-[#e74c3c]/20 focus:border-[#e74c3c] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#fdf2f2] shadow-sm"
                />
              </div>
              {formulario.moneda === "USD" && (
                <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
                  💵 Equivale a: <strong>${(formulario.precioCosto * cotizacion).toLocaleString("es-AR")} ARS</strong>
                </div>
              )}
            </div>

            {/* SECCIÓN DE PRECIOS DE VENTA */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="bg-gradient-to-r from-[#27ae60] to-[#229954] text-white rounded-xl p-4 mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span>💰</span> Precios de Venta
                </h3>
                <p className="text-sm opacity-90">Configura los 3 niveles de precios para este producto</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Precio 1 */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#27ae60]">
                    💵 Precio 1 ({formulario.moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#27ae60] font-bold">$</span>
                    <input
                      type="number"
                      name="precio1"
                      value={formulario.precio1}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 border-2 border-[#27ae60] rounded-xl focus:ring-4 focus:ring-[#27ae60]/20 focus:border-[#27ae60] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#f0f9f4] shadow-sm"
                    />
                  </div>
                  {formulario.moneda === "USD" && (
                    <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
                      💵 = <strong>${(formulario.precio1 * cotizacion).toLocaleString("es-AR")} ARS</strong>
                    </div>
                  )}
                </div>

                {/* Precio 2 */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#3498db]">
                    💵 Precio 2 ({formulario.moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3498db] font-bold">$</span>
                    <input
                      type="number"
                      name="precio2"
                      value={formulario.precio2}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 border-2 border-[#3498db] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#f0f8ff] shadow-sm"
                    />
                  </div>
                  {formulario.moneda === "USD" && (
                    <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
                      💵 = <strong>${(formulario.precio2 * cotizacion).toLocaleString("es-AR")} ARS</strong>
                    </div>
                  )}
                </div>

                {/* Precio 3 */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#9b59b6]">
                    💵 Precio 3 ({formulario.moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9b59b6] font-bold">$</span>
                    <input
                      type="number"
                      name="precio3"
                      value={formulario.precio3}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 border-2 border-[#9b59b6] rounded-xl focus:ring-4 focus:ring-[#9b59b6]/20 focus:border-[#9b59b6] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#faf5ff] shadow-sm"
                    />
                  </div>
                  {formulario.moneda === "USD" && (
                    <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
                      💵 = <strong>${(formulario.precio3 * cotizacion).toLocaleString("es-AR")} ARS</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stock Bajo */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#f39c12]">
                ⚠️ Alerta Stock Bajo
              </label>
              <input
                type="number"
                name="stockBajo"
                value={formulario.stockBajo || 3}
                onChange={manejarCambio}
                min="0"
                className="w-full p-3 border-2 border-[#f39c12] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#fef9e7] shadow-sm"
              />
            </div>

            {/* Stock Ideal */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🎯 Stock Ideal
              </label>
              <input
                type="number"
                name="stockIdeal"
                value={formulario.stockIdeal || 5}
                onChange={manejarCambio}
                min="0"
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

          </div>
          
          {/* 🆕 PREVIEW DE PRECIOS */}
          {(formulario.precio1 > 0 || formulario.precio2 > 0 || formulario.precio3 > 0) && (
            <div className="bg-white border-2 border-[#3498db] rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-[#2c3e50] flex items-center gap-2">
                <span>📊</span> Preview de Precios en ARS
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-[#d5f4e6] p-3 rounded-lg">
                  <span className="text-[#27ae60]">Precio 1:</span>
                  <div className="font-bold text-[#27ae60]">
                    ${(formulario.moneda === "USD" ? formulario.precio1 * cotizacion : formulario.precio1).toLocaleString("es-AR")}
                  </div>
                </div>
                <div className="bg-[#dbeafe] p-3 rounded-lg">
                  <span className="text-[#3498db]">Precio 2:</span>
                  <div className="font-bold text-[#3498db]">
                    ${(formulario.moneda === "USD" ? formulario.precio2 * cotizacion : formulario.precio2).toLocaleString("es-AR")}
                  </div>
                </div>
                <div className="bg-[#f3e8ff] p-3 rounded-lg">
                  <span className="text-[#9b59b6]">Precio 3:</span>
                  <div className="font-bold text-[#9b59b6]">
                    ${(formulario.moneda === "USD" ? formulario.precio3 * cotizacion : formulario.precio3).toLocaleString("es-AR")}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[#ecf0f1]">
            <button
              onClick={onClose}
              disabled={guardando}
              className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={guardarCambios}
              disabled={guardando || !formulario.producto || (formulario.precio1 <= 0 && formulario.precio2 <= 0 && formulario.precio3 <= 0)}
              className="px-6 py-3 bg-gradient-to-r from-[#27ae60] to-[#229954] hover:from-[#229954] hover:to-[#1e8449] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  💾 Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}