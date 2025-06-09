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
  cotizacion: number;
  setCotizacion: (val: number) => void;
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
  cotizacion,
  setCotizacion,
  cantidad,
  setCantidad,
  stockIdeal,
  setStockIdeal,
  guardarProducto,
  editandoId,
  stockBajo = 3,
  setStockBajo = () => {},
}: Props) {
  useEffect(() => {
    if (moneda === "USD") {
      fetch("https://dolarapi.com/v1/dolares/blue")
        .then(res => res.json())
        .then(data => {
          if (!editandoId) setCotizacion(data.venta);
        })
        .catch(() => {});
    }
  }, [moneda, editandoId, setCotizacion]);

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
        
        {moneda === "USD" && (
          <div>
            <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
              💵 Cotización
            </label>
            <input 
              type="number" 
              value={cotizacion} 
              onChange={(e) => setCotizacion(Number(e.target.value))} 
              className="p-2 border-2 border-[#bdc3c7] rounded-lg w-full bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]" 
            />
          </div>
        )}

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

      {moneda === "USD" && cotizacion > 0 && precio1 > 0 && (
        <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-[#27ae60] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">💰</span>
            </div>
            <span className="text-[#27ae60] font-bold text-sm">Precios en pesos:</span>
          </div>
          <div className="space-y-1">
            {precio1 > 0 && <p className="text-xs text-[#27ae60]">Precio 1: ${(precio1 * cotizacion).toLocaleString("es-AR")}</p>}
            {precio2 > 0 && <p className="text-xs text-[#27ae60]">Precio 2: ${(precio2 * cotizacion).toLocaleString("es-AR")}</p>}
            {precio3 > 0 && <p className="text-xs text-[#27ae60]">Precio 3: ${(precio3 * cotizacion).toLocaleString("es-AR")}</p>}
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