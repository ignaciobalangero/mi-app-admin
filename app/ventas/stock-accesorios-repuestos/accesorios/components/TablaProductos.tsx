"use client";

import { useRol } from "@/lib/useRol"; 

interface Producto {
  id: string;
  codigo: string;
  producto: string;
  categoria: string;
  marca: string;
  modelo: string;
  color: string;
  precioCosto: number;
  precio1: number;
  precio2: number;
  precio3: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
}

interface Props {
  productos: Producto[];
  editarProducto: (producto: Producto) => void;
  eliminarProducto: (id: string) => void;
  verPreciosConvertidos: (producto: Producto) => void;
  cotizacion: number | null;
}

export default function TablaProductos({ productos, editarProducto, eliminarProducto, cotizacion, verPreciosConvertidos }: Props) {
  const { rol } = useRol();
  const verMas = (p: Producto) => {
    if (cotizacion === null) {
      alert("No se pudo obtener la cotización del dólar.");
      return;
    }
   
    const convertir = (precio: number) =>
      p.moneda === "USD" ? `$${(precio * cotizacion).toLocaleString("es-AR")} ARS` : `$${precio.toLocaleString("es-AR")} ARS`;

    alert(
      `Precios en pesos:\n\n` +
      `Precio 1: ${convertir(p.precio1)}\n` +
      `Precio 2: ${convertir(p.precio2)}\n` +
      `Precio 3: ${convertir(p.precio3)}`
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
      <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🎧 Lista de Accesorios
        </h3>
        <p className="text-blue-100 mt-1 text-xs">
          {productos.length} productos en stock
        </p>
      </div>

      <div className="overflow-x-auto border border-[#bdc3c7]">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
            <tr>
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-left w-[60px]">
                🏷️ Código
              </th>
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-left w-[180px]">
                🎧 Producto
              </th>
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-left w-[90px]">
                📂 Categoría
              </th>
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-left w-[90px]">
                🏢 Marca
              </th>
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-left w-[80px]">
                📱 Modelo
              </th>
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-left w-[80px]">
                🎨 Color
              </th>
              {rol?.tipo === "admin" && (
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-right w-[80px]">
                💸 Costo
              </th>
              )}
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-center w-[60px]">
                📊 Cant.
              </th>
            
              <th className="px-2 py-2 border border-[#bdc3c7] text-xs font-semibold text-[#2c3e50] text-center w-[140px]">
                ⚙️ Acciones
              </th>
              
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td 
                  colSpan={9}
                  className="p-8 text-center text-[#7f8c8d] border border-[#bdc3c7]"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                      <span className="text-2xl">🎧</span>
                    </div>
                    <div>
                      <p className="text-md font-medium text-[#7f8c8d]">
                        No hay accesorios en stock
                      </p>
                      <p className="text-xs text-[#bdc3c7]">
                        Los productos aparecerán aquí una vez que agregues algunos al inventario
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              productos.map((p, index) => {
                const isEven = index % 2 === 0;
                let bgColor = isEven ? "bg-white" : "bg-[#f8f9fa]";
                
                if (p.cantidad === 0) {
                  bgColor = "bg-gradient-to-r from-[#fadbd8] to-[#f1948a]";
                } else if (p.cantidad <= (p.stockBajo ?? 3)) {
                  bgColor = "bg-gradient-to-r from-[#fcf3cf] to-[#f7dc6f]";
                } else {
                  bgColor = isEven ? "bg-white" : "bg-[#f8f9fa]";
                }

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors duration-200 hover:bg-[#ebf3fd] ${bgColor}`}
                  >
                    <td className="p-1.5 border border-[#bdc3c7]">
                      <span className="text-xs font-mono text-[#2c3e50]">{p.codigo}</span>
                    </td>
                    <td className="p-1.5 border border-[#bdc3c7]">
                      <span className="text-xs font-normal text-[#2c3e50]">{p.producto}</span>
                    </td>
                    <td className="p-1.5 border border-[#bdc3c7]">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#d5dbdb] text-[#2c3e50]">
                        {p.categoria}
                      </span>
                    </td>
                    <td className="p-1.5 border border-[#bdc3c7]">
                      <span className="text-xs text-[#7f8c8d]">{p.marca}</span>
                    </td>
                    <td className="p-1.5 border border-[#bdc3c7]">
                      <span className="text-xs text-[#7f8c8d]">{p.modelo}</span>
                    </td>
                    <td className="p-1.5 border border-[#bdc3c7]">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50]">
                        {p.color}
                      </span>
                    </td>
                    {rol?.tipo === "admin" && (
                    <td className="p-1.5 border border-[#bdc3c7] text-right">
                      <span className={`text-xs font-semibold ${
                        p.moneda === 'USD' ? 'text-[#3498db]' : 'text-[#27ae60]'
                      }`}>
                        {p.moneda} ${p.precioCosto}
                      </span>
                    </td>
                    )}
                    <td className="p-1.5 border border-[#bdc3c7] text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                        p.cantidad === 0 
                          ? 'bg-[#e74c3c] text-white'
                          : p.cantidad <= (p.stockBajo ?? 3)
                          ? 'bg-[#f39c12] text-white'
                          : 'bg-[#27ae60] text-white'
                      }`}>
                        {p.cantidad}
                      </span>
                    </td>
                    {rol?.tipo === "admin" && (
                    <td className="p-1.5 border border-[#bdc3c7] text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <button
                          onClick={() => editarProducto(p)}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[#f39c12] text-white hover:bg-[#e67e22] transition-colors duration-200"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => verPreciosConvertidos(p)}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[#7f8c8d] text-white hover:bg-[#6c7b7b] transition-colors duration-200"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => eliminarProducto(p.id)}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[#e74c3c] text-white hover:bg-[#c0392b] transition-colors duration-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {productos.length > 0 && (
        <div className="bg-[#f8f9fa] px-4 py-3 border-t border-[#bdc3c7]">
          <div className="flex justify-between items-center text-xs text-[#7f8c8d]">
            <span>
              Mostrando {productos.length} productos
            </span>
            <div className="flex gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#e74c3c] rounded-full"></div>
                Sin stock
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#f39c12] rounded-full"></div>
                Stock bajo
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#27ae60] rounded-full"></div>
                Stock normal
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}