// SeccionDatosVenta.tsx
"use client";

import SelectorCliente from "./SelectorCliente";
import SelectorProducto from "./SelectorProducto";

interface Props {
  fecha: string;
  cliente: string;
  setCliente: (valor: string) => void;
  producto: string;
  setProducto: (valor: string) => void;
  cantidad: number;
  setCantidad: (valor: number) => void;
  precio: number;
  setPrecio: (valor: number) => void;
  moneda: "ARS" | "USD";
  setMoneda: (valor: "ARS" | "USD") => void;
  cotizacion: number;
  setCotizacion: (valor: number) => void;
  codigo: string;
  setCodigo: (valor: string) => void;
  marca: string;
  setMarca: (valor: string) => void;
  categoria: string;
  setCategoria: (valor: string) => void;
  color: string;
  setColor: (valor: string) => void;
  total: number;
}

export default function SeccionDatosVenta(props: Props) {
  return (
    <>
      <div className="flex flex-col w-32">
        <label className="text-xs text-gray-600 mb-1">Fecha</label>
        <input
          type="text"
          value={props.fecha}
          readOnly
          className="p-2 border border-gray-400 rounded bg-gray-200"
        />
      </div>

      <div className="flex flex-col w-60">
        <label className="text-xs text-gray-600 mb-1">Cliente</label>
        <SelectorCliente cliente={props.cliente} setCliente={props.setCliente} />
      </div>

      <div className="flex flex-col w-80">
        <label className="text-xs text-gray-600 mb-1">Producto</label>
        <SelectorProducto
          producto={props.producto}
          setProducto={props.setProducto}
          setPrecio={props.setPrecio}
          setMarca={props.setMarca}
          setCategoria={props.setCategoria}
          setColor={props.setColor}
          setCodigo={props.setCodigo}
          setMoneda={props.setMoneda}
        />
      </div>

      <div className="flex flex-col w-40">
        <label className="text-xs text-gray-600 mb-1">Código</label>
        <input
          type="text"
          value={props.codigo}
          onChange={(e) => props.setCodigo(e.target.value)}
          className="p-2 border border-gray-400 rounded"
        />
      </div>

      <div className="flex flex-col w-40">
        <label className="text-xs text-gray-600 mb-1">Marca</label>
        <input
          type="text"
          value={props.marca}
          onChange={(e) => props.setMarca(e.target.value)}
          className="p-2 border border-gray-400 rounded"
        />
      </div>

      <div className="flex flex-col w-40">
        <label className="text-xs text-gray-600 mb-1">Categoría</label>
        <input
          type="text"
          value={props.categoria}
          onChange={(e) => props.setCategoria(e.target.value)}
          className="p-2 border border-gray-400 rounded"
        />
      </div>

      <div className="flex flex-col w-40">
        <label className="text-xs text-gray-600 mb-1">Color</label>
        <input
          type="text"
          value={props.color}
          onChange={(e) => props.setColor(e.target.value)}
          className="p-2 border border-gray-400 rounded"
        />
      </div>

      <div className="flex flex-col w-24">
        <label className="text-xs text-gray-600 mb-1">Cantidad</label>
        <input
          type="number"
          value={props.cantidad}
          onChange={(e) => props.setCantidad(Number(e.target.value))}
          className="p-2 border border-gray-400 rounded"
        />
      </div>

      <div className="flex flex-col w-24">
        <label className="text-xs text-gray-600 mb-1">Precio</label>
        <input
          type="number"
          value={props.precio}
          onChange={(e) => props.setPrecio(Number(e.target.value))}
          className="p-2 border border-gray-400 rounded"
        />
      </div>

      <div className="flex flex-col w-28">
        <label className="text-xs text-gray-600 mb-1">Moneda</label>
        <select
          value={props.moneda}
          onChange={(e) => props.setMoneda(e.target.value as "ARS" | "USD")}
          className="p-2 border border-gray-400 rounded"
        >
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </select>
      </div>

      {props.moneda === "USD" && (
        <div className="flex flex-col w-28 mt-[30px]">
          <label className="text-[15px] text-gray-500 mb-1 text-center">Cotización</label>
          <input
            type="number"
            value={props.cotizacion}
            onChange={(e) => props.setCotizacion(Number(e.target.value))}
            className="p-2 border border-gray-400 rounded"
          />
        </div>
      )}

      <div className="flex flex-col w-34 mt-[1px]">
        <label className="text-[10px] text-gray-500 mb-1 text-center">Total</label>
        <div className="border border-gray-400 rounded bg-gray-50 flex items-center justify-center h-[40px] text-sm text-black font-semibold">
          ${Number.isFinite(props.total) ? props.total.toLocaleString("es-AR") : "0"}
        </div>
      </div>
    </>
  );
}