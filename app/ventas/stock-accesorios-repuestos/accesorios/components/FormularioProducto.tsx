"use client";

import React from "react";

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
  modelo: string;
  setModelo: (val: string) => void;
  color: string;
  setColor: (val: string) => void;
  precioCosto: number;  
  setPrecioCosto: (val: number) => void;
  precio1: number;
  setPrecio1: (val: number) => void;
  precio2: number;
  setPrecio2: (val: number) => void;
  precio3: number;
  setPrecio3: (val: number) => void;
  moneda: "ARS" | "USD";
  setMoneda: (val: "ARS" | "USD") => void;
  // 🔄 CAMBIADO: Cotización viene de props, ya no se puede modificar
  cotizacion: number;
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
  modelo,
  setModelo,
  color,
  setColor,
  precioCosto,
  setPrecioCosto,
  precio1,
  setPrecio1,
  precio2,
  setPrecio2,
  precio3,
  setPrecio3,
  moneda,
  setMoneda,
  // 🔄 CAMBIADO: Solo recibe cotización, no la puede modificar
  cotizacion,
  cantidad,
  setCantidad,
  stockIdeal,
  setStockIdeal,
  guardarProducto,
  editandoId,
  stockBajo = 3,
  setStockBajo = () => {},
}: Props) {

  // ❌ ELIMINADO: useEffect que buscaba cotización de la API
  // ✅ AHORA: La cotización viene desde props y está sincronizada con la tabla

  // ✅ NUEVA VALIDACIÓN: Solo producto y cantidad son obligatorios
  const puedeGuardar = producto.trim() && cantidad > 0;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
      
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#9b59b6] rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">📋</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#2c3e50]">
            {editandoId ? "Editar Accesorio" : "Agregar Accesorio"}
          </h3>
          <p className="text-[#7f8c8d] text-xs">
            {editandoId ? "Modifica los datos del accesorio" : "Completa la información del accesorio"}
          </p>
        </div>
      </div>

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
            🎧 Producto *
          </label>
          <input 
            value={producto} 
            onChange={(e) => setProducto(e.target.value)} 
            className={`p-2 border-2 rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d] ${
              !producto.trim() ? "border-[#e74c3c] focus:border-[#e74c3c]" : "border-[#bdc3c7] focus:border-[#3498db]"
            }`}
            placeholder="Nombre del producto (obligatorio)"
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
            📱 Modelo
          </label>
          <input 
            value={modelo} 
            onChange={(e) => setModelo(e.target.value)} 
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
            💸 Precio de costo (opcional)
          </label>
          <input 
            type="number" 
            value={precioCosto} 
            onChange={(e) => setPrecioCosto(Number(e.target.value))} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]"
            placeholder="0 = sin precio"
          />
        </div>
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
        
        {/* 🆕 COTIZACIÓN USD (SIEMPRE VISIBLE PERO DESHABILITADA) */}
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            💰 Cotización USD
          </label>
          <input 
            type="text"
            value={`$ ${cotizacion.toLocaleString("es-AR")} ARS`}
            disabled
            readOnly
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-[#f8f9fa] text-[#7f8c8d] text-xs cursor-not-allowed opacity-60"
          />
          <div className="text-xs text-[#7f8c8d] mt-1">
            📌 Solo lectura - Se modifica desde Venta General
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            📊 Cantidad *
          </label>
          <input 
            type="number" 
            value={cantidad} 
            onChange={(e) => setCantidad(Number(e.target.value))} 
            className={`p-2 border-2 rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d] ${
              cantidad <= 0 ? "border-[#e74c3c] focus:border-[#e74c3c]" : "border-[#bdc3c7] focus:border-[#3498db]"
            }`}
            placeholder="Cantidad obligatoria"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
            📈 Pedir para stock (opcional)
          </label>
          <input 
            type="number" 
            value={stockIdeal} 
            onChange={(e) => setStockIdeal(Number(e.target.value))} 
            className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]"
            placeholder="0 = no sugerir pedidos"
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

      {/* 🆕 PREVIEW DE CONVERSIÓN MEJORADO */}
      {moneda === "USD" && cotizacion > 0 && (precio1 > 0 || precio2 > 0 || precio3 > 0 || precioCosto > 0) && (
        <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-[#27ae60] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">💰</span>
            </div>
            <span className="text-[#27ae60] font-bold text-sm">Precios convertidos a ARS:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {precioCosto > 0 && (
              <div className="bg-white/70 p-2 rounded-lg">
                <div className="text-xs text-[#e74c3c] font-medium">Costo:</div>
                <div className="text-sm font-bold text-[#e74c3c]">
                  ${(precioCosto * cotizacion).toLocaleString("es-AR")}
                </div>
              </div>
            )}
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
   

      {/* ✅ MENSAJE DE AYUDA */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">💡</span>
          <span className="text-blue-800 text-xs font-semibold">Campos obligatorios:</span>
        </div>
        <p className="text-blue-700 text-xs mt-1">
          Solo el <strong>Producto</strong> y la <strong>Cantidad</strong> son obligatorios. 
          Los precios pueden agregarse después.
        </p>
        {moneda === "USD" && (
          <p className="text-blue-700 text-xs mt-1">
            💰 La cotización está sincronizada con el sistema de ventas.
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={guardarProducto}
          disabled={!puedeGuardar}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
            !puedeGuardar
              ? "bg-[#bdc3c7] text-[#7f8c8d] cursor-not-allowed"
              : "bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white"
          }`}
        >
          {editandoId ? "✏️ Actualizar accesorio" : "💾 Guardar accesorio"}
        </button>
      </div>
    </div>
  );
}