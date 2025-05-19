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
  precioVenta: number;
  setPrecioVenta: (val: number) => void;
  moneda: "ARS" | "USD";
  setMoneda: (val: "ARS" | "USD") => void;
  cotizacion: number;
  setCotizacion: (val: number) => void;
  precioVentaPesos: number;
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
  precioVenta,
  setPrecioVenta,
  moneda,
  setMoneda,
  cotizacion,
  setCotizacion,
  precioVentaPesos,
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block font-semibold mb-1">Código</label>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Proveedor</label>
          <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Producto</label>
          <input value={producto} onChange={(e) => setProducto(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Categoría</label>
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Marca</label>
          <input value={marca} onChange={(e) => setMarca(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Modelo</label>
          <input value={modelo} onChange={(e) => setModelo(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Color</label>
          <input value={color} onChange={(e) => setColor(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Precio de costo</label>
          <input type="number" value={precioCosto} onChange={(e) => setPrecioCosto(Number(e.target.value))} className={`p-2 border rounded w-full ${precioCosto <= 0 ? "border-red-500" : "border-gray-400"}`} />
          {precioCosto <= 0 && <p className="text-red-600 text-sm mt-1"></p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">Precio de venta</label>
          <input type="number" value={precioVenta} onChange={(e) => setPrecioVenta(Number(e.target.value))} className={`p-2 border rounded w-full ${precioVenta <= 0 ? "border-red-500" : "border-gray-400"}`} />
          {precioVenta <= 0 && <p className="text-red-600 text-sm mt-1"></p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">Moneda</label>
          <select value={moneda} onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")} className="p-2 border rounded w-full">
            <option value="ARS">Pesos</option>
            <option value="USD">Dólares</option>
          </select>
        </div>
        {moneda === "USD" && (
          <div>
            <label className="block font-semibold mb-1">Cotización</label>
            <input type="number" value={cotizacion} onChange={(e) => setCotizacion(Number(e.target.value))} className="p-2 border rounded w-full" />
          </div>
        )}
        <div>
          <label className="block font-semibold mb-1">Precio venta en pesos</label>
          <input type="number" value={precioVentaPesos} readOnly className="p-2 border rounded w-full bg-gray-100" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Cantidad</label>
          <input type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className={`p-2 border rounded w-full ${cantidad <= 0 ? "border-red-500" : "border-gray-400"}`} />
          {cantidad <= 0 && <p className="text-red-600 text-sm mt-1">Debe ingresar una cantidad válida</p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">Pedir para stock</label>
          <input type="number" value={stockIdeal} onChange={(e) => setStockIdeal(Number(e.target.value))} className={`p-2 border rounded w-full ${stockIdeal <= 0 ? "border-red-500" : "border-gray-400"}`} />
          {stockIdeal <= 0 && <p className="text-red-600 text-sm mt-1">Debe ingresar un stock mayor a 0</p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">Stock bajo (amarillo)</label>
          <input type="number" value={stockBajo} onChange={(e) => setStockBajo?.(Number(e.target.value))} className="p-2 border rounded w-full" />
        </div>
      </div>
      <div className="flex justify-center mb-6">
        <button
          onClick={guardarProducto}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          disabled={!producto || precioVenta <= 0 || cantidad <= 0 || stockIdeal <= 0}
        >
          {editandoId ? "Actualizar producto" : "Guardar producto"}
        </button>
      </div>
    </>
  );
}
