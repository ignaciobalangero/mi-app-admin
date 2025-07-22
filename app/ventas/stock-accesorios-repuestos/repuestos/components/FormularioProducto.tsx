"use client";

import React, { useEffect } from "react";

interface Props {
  codigo: string;
  setCodigo: (val: string) => void;
  proveedor: string;
  setProveedor: (val: string) => void;
  producto: string;
  setProducto: (val: string) => void;
  categoria: string;
  setCategoria: (val: string) => void;
  marca: string;
  setMarca: (val: string) => void;
  color: string;
  setColor: (val: string) => void;
  precioCosto: number;
  setPrecioCosto: (val: number) => void;
  moneda: "ARS" | "USD";
  setMoneda: (val: "ARS" | "USD") => void;
  cotizacion: number;
  setCotizacion: (val: number) => void;
  precioCostoPesos: number;
  // 🆕 CAMPOS NUEVOS DE PRECIOS DE VENTA
  precio1: number;
  setPrecio1: (val: number) => void;
  precio2: number;
  setPrecio2: (val: number) => void;
  precio3: number;
  setPrecio3: (val: number) => void;
  precio1Pesos: number;
  setPrecio1Pesos: (val: number) => void;
  precio2Pesos: number;
  setPrecio2Pesos: (val: number) => void;
  precio3Pesos: number;
  setPrecio3Pesos: (val: number) => void;
  cantidad: number;
  setCantidad: (val: number) => void;
  stockIdeal: number;
  setStockIdeal: (val: number) => void;
  guardarProducto: () => void;
  editandoId: string | null;
  stockBajo?: number;
  setStockBajo?: (val: number) => void;
}

export default function FormularioProducto({
  codigo,
  setCodigo,
  proveedor,
  setProveedor,
  producto,
  setProducto,
  categoria,
  setCategoria,
  marca,
  setMarca,
  color,
  setColor,
  precioCosto,
  setPrecioCosto,
  moneda,
  setMoneda,
  cotizacion,
  setCotizacion,
  precioCostoPesos,
  // 🆕 NUEVOS PARÁMETROS
  precio1,
  setPrecio1,
  precio2,
  setPrecio2,
  precio3,
  setPrecio3,
  precio1Pesos,
  setPrecio1Pesos,
  precio2Pesos,
  setPrecio2Pesos,
  precio3Pesos,
  setPrecio3Pesos,
  cantidad,
  setCantidad,
  stockIdeal,
  setStockIdeal,
  guardarProducto,
  editandoId,
  stockBajo = 3,
  setStockBajo = () => {},
}: Props) {

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
      
      {/* Header del formulario */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">📋</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#2c3e50]">
            {editandoId ? "Editar Producto" : "Agregar Producto"}
          </h3>
          <p className="text-[#7f8c8d] text-xs">
            {editandoId ? "Modifica los datos del producto" : "Completa la información del producto"}
          </p>
        </div>
      </div>

      {/* ✅ PANEL INFORMATIVO DE COTIZACIÓN CENTRALIZADA */}
      {moneda === "USD" && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-[#3498db] rounded-xl p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💵</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[#2c3e50]">Cotización Centralizada del Sistema</h4>
              <p className="text-xs text-[#7f8c8d]">
                Sincronizada con Ventas General - Se actualiza automáticamente
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-[#3498db]">${cotizacion > 0 ? cotizacion.toFixed(0) : 'N/A'}</span>
              <span className="text-xs text-[#7f8c8d] block">ARS por USD</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid del formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            🏷️ Código
          </label>
          <input 
            value={codigo} 
            onChange={(e) => setCodigo(e.target.value)} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            🏪 Proveedor
          </label>
          <input 
            value={proveedor} 
            onChange={(e) => setProveedor(e.target.value)} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            📦 Producto
          </label>
          <input 
            value={producto} 
            onChange={(e) => setProducto(e.target.value)} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            📂 Categoría
          </label>
          <input 
            value={categoria} 
            onChange={(e) => setCategoria(e.target.value)} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            🏢 Marca
          </label>
          <input 
            value={marca} 
            onChange={(e) => setMarca(e.target.value)} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            🎨 Color
          </label>
          <input 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            💸 Precio de costo
          </label>
          <input 
            type="number" 
            value={precioCosto} 
            onChange={(e) => setPrecioCosto(Number(e.target.value))} 
            className={`p-2 border-2 rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d] ${
              precioCosto <= 0 ? "border-[#e74c3c] focus:border-[#e74c3c]" : "border-[#bdc3c7] focus:border-[#3498db]"
            }`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            💱 Moneda
          </label>
          <select 
            value={moneda} 
            onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs"
          >
            <option value="ARS">🇦🇷 Pesos</option>
            <option value="USD">🇺🇸 Dólares</option>
          </select>
        </div>

        {/* 🆕 NUEVOS CAMPOS DE PRECIOS DE VENTA */}
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            💰 Precio 1 (opcional)
          </label>
          <input
            type="number"
            value={precio1}
            onChange={(e) => setPrecio1(Number(e.target.value))}
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]"
            placeholder="0 = sin precio"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            💰 Precio 2 (opcional)
          </label>
          <input
            type="number"
            value={precio2}
            onChange={(e) => setPrecio2(Number(e.target.value))}
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]"
            placeholder="0 = sin precio"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            💰 Precio 3 (opcional)
          </label>
          <input
            type="number"
            value={precio3}
            onChange={(e) => setPrecio3(Number(e.target.value))}
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]"
            placeholder="0 = sin precio"
          />
        </div>
        
        {/* ✅ COTIZACIÓN SOLO LECTURA - NO EDITABLE */}
        {moneda === "USD" && (
          <div>
            <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
              💵 Cotización (Solo lectura)
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={`${cotizacion > 0 ? cotizacion.toFixed(0) : 'N/A'}`}
                readOnly
                className="p-2 border-2 border-[#95a5a6] rounded-lg w-full bg-gray-100 text-[#2c3e50] text-xs font-semibold cursor-not-allowed" 
                title="Cotización del sistema - Solo se puede modificar desde Ventas General"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <span className="text-xs text-[#95a5a6] font-bold">🔒</span>
              </div>
            </div>
            <p className="text-xs text-[#95a5a6] mt-1">
              🔒 Solo se modifica desde Ventas General
            </p>
          </div>
        )}
        
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            📊 Cantidad
          </label>
          <input 
            type="number" 
            value={cantidad} 
            onChange={(e) => setCantidad(Number(e.target.value))} 
            className={`p-2 border-2 rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d] ${
              cantidad <= 0 ? "border-[#e74c3c] focus:border-[#e74c3c]" : "border-[#bdc3c7] focus:border-[#3498db]"
            }`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            📈 Pedir para stock
          </label>
          <input 
            type="number" 
            value={stockIdeal} 
            onChange={(e) => setStockIdeal(Number(e.target.value))} 
            className={`p-2 border-2 rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d] ${
              stockIdeal <= 0 ? "border-[#e74c3c] focus:border-[#e74c3c]" : "border-[#bdc3c7] focus:border-[#3498db]"
            }`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            ⚠️ Stock bajo (amarillo)
          </label>
          <input 
            type="number" 
            value={stockBajo} 
            onChange={(e) => setStockBajo?.(Number(e.target.value))} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
          />
        </div>
      </div>

      {/* ✅ INFORMACIÓN DE PRECIO EN PESOS MEJORADA - SOLO LECTURA */}
      {moneda === "USD" && cotizacion > 0 && (
        <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] rounded-xl p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💰</span>
            </div>
            <div className="flex-1">
              <span className="text-[#27ae60] font-bold text-sm">
                Costo en pesos: ${(precioCostoPesos || 0).toLocaleString("es-AR")}
              </span>
              <p className="text-xs text-[#27ae60] mt-1">
                {precioCosto > 0 && cotizacion > 0 && (
                  <>
                    ${precioCosto} USD × ${cotizacion.toFixed(0)} = ${(precioCosto * cotizacion).toLocaleString("es-AR")} ARS
                  </>
                )}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-[#27ae60] text-white px-2 py-1 rounded-full">
                🔒 Cotización de Sistema
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 PREVIEW DE PRECIOS DE VENTA CONVERTIDOS */}
      {moneda === "USD" && cotizacion > 0 && (precio1 > 0 || precio2 > 0 || precio3 > 0) && (
        <div className="bg-gradient-to-r from-[#e8f5e8] to-[#d4f1d4] border-2 border-[#27ae60] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-[#27ae60] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">💰</span>
            </div>
            <span className="text-[#27ae60] font-bold text-sm">Precios de venta convertidos a ARS:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {precio1 > 0 && (
              <div className="bg-white/70 p-2 rounded-lg">
                <div className="text-xs text-[#27ae60] font-medium">Precio 1:</div>
                <div className="text-sm font-bold text-[#27ae60]">
                  ${(precio1 * cotizacion).toLocaleString("es-AR")}
                </div>
              </div>
            )}
            {precio2 > 0 && (
              <div className="bg-white/70 p-2 rounded-lg">
                <div className="text-xs text-[#3498db] font-medium">Precio 2:</div>
                <div className="text-sm font-bold text-[#3498db]">
                  ${(precio2 * cotizacion).toLocaleString("es-AR")}
                </div>
              </div>
            )}
            {precio3 > 0 && (
              <div className="bg-white/70 p-2 rounded-lg">
                <div className="text-xs text-[#9b59b6] font-medium">Precio 3:</div>
                <div className="text-sm font-bold text-[#9b59b6]">
                  ${(precio3 * cotizacion).toLocaleString("es-AR")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ ADVERTENCIA SI NO HAY COTIZACIÓN - INDICA DÓNDE CONFIGURARLA */}
      {moneda === "USD" && cotizacion <= 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-[#e67e22] rounded-xl p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#e67e22] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">⚠️</span>
            </div>
            <div>
              <span className="text-[#e67e22] font-bold text-sm">
                No hay cotización configurada
              </span>
              <p className="text-xs text-[#e67e22] mt-1">
                <strong>Ve a Ventas General</strong> para configurar la cotización del dólar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón guardar */}
      <div className="flex justify-center">
        <button
          onClick={guardarProducto}
          disabled={!producto || precioCosto <= 0 || cantidad <= 0 || stockIdeal <= 0 || (moneda === "USD" && cotizacion <= 0)}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
            !producto || precioCosto <= 0 || cantidad <= 0 || stockIdeal <= 0 || (moneda === "USD" && cotizacion <= 0)
              ? "bg-[#bdc3c7] text-[#7f8c8d] cursor-not-allowed"
              : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white"
          }`}
          title={
            moneda === "USD" && cotizacion <= 0 
              ? "Configure la cotización del dólar en Ventas General" 
              : undefined
          }
        >
          {editandoId ? "✏️ Actualizar producto" : "💾 Guardar producto"}
        </button>
      </div>

      {/* ✅ INFORMACIÓN ADICIONAL SOBRE DÓNDE MODIFICAR LA COTIZACIÓN */}
      <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 border border-[#bdc3c7] rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg">ℹ️</span>
          <div className="text-xs text-[#2c3e50]">
            <strong>Cotización del sistema:</strong> La cotización se sincroniza automáticamente desde 
            <strong> Ventas General</strong>. Para modificarla, ve a la tabla de ventas y cambia el valor 
            en el campo "Cotización USD".
          </div>
        </div>
      </div>
    </div>
  );
}