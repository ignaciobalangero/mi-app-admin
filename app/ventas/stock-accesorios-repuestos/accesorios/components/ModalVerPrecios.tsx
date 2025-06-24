"use client";

// 👁️ MODAL VER PRECIOS - Componente independiente para mostrar los 3 precios

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
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
  proveedor: string;
  stockIdeal?: number;
}

interface Props {
  producto: Producto;
  cotizacion: number;
  calcularPrecioDinamico: (producto: Producto, tipoPrecio: 'precio1' | 'precio2' | 'precio3' | 'precioCosto') => number;
  onClose: () => void;
}

export default function ModalVerPrecios({ 
  producto, 
  cotizacion, 
  calcularPrecioDinamico, 
  onClose 
}: Props) {
  
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300 animate-in fade-in-0 zoom-in-95">
        
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white rounded-t-2xl p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h2 className="text-lg font-bold">Precios de Venta</h2>
                <p className="text-purple-100 text-sm truncate max-w-[200px]">{producto.producto}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-purple-100 hover:text-white text-xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4 bg-[#f8f9fa]">
          
          {/* Info del producto */}
          <div className="bg-white border border-[#ecf0f1] rounded-xl p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[#7f8c8d]">Código:</span>
                <div className="font-medium text-[#2c3e50]">{producto.codigo}</div>
              </div>
              <div>
                <span className="text-[#7f8c8d]">Stock:</span>
                <div className="font-medium text-[#2c3e50]">{producto.cantidad} unidades</div>
              </div>
              <div>
                <span className="text-[#7f8c8d]">Marca:</span>
                <div className="font-medium text-[#2c3e50]">{producto.marca}</div>
              </div>
              <div>
                <span className="text-[#7f8c8d]">Modelo:</span>
                <div className="font-medium text-[#2c3e50]">{producto.modelo || "N/A"}</div>
              </div>
              <div className="col-span-2">
                <span className="text-[#7f8c8d]">Cotización actual:</span>
                <div className="font-bold text-[#f39c12]">1 USD = ${cotizacion.toLocaleString("es-AR")} ARS</div>
              </div>
            </div>
          </div>
          
          {/* Los 3 precios */}
          <div className="space-y-3">
            
            {/* Precio 1 */}
            <div className="bg-gradient-to-r from-[#d5f4e6] to-[#a8e6cf] rounded-xl p-4 border border-[#27ae60] transform transition-all duration-200 hover:scale-[1.02]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#27ae60] flex items-center gap-2">
                    <span>💵</span> Precio 1
                  </h3>
                  <div className="text-sm text-[#7f8c8d]">
                    Original: {producto.moneda} ${producto.precio1?.toLocaleString("es-AR") || 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#27ae60]">
                    ${calcularPrecioDinamico(producto, 'precio1').toLocaleString("es-AR")}
                  </div>
                  <div className="text-sm text-[#27ae60] font-medium">ARS</div>
                </div>
              </div>
            </div>
            
            {/* Precio 2 */}
            <div className="bg-gradient-to-r from-[#dbeafe] to-[#a7c9ff] rounded-xl p-4 border border-[#3498db] transform transition-all duration-200 hover:scale-[1.02]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#3498db] flex items-center gap-2">
                    <span>💵</span> Precio 2
                  </h3>
                  <div className="text-sm text-[#7f8c8d]">
                    Original: {producto.moneda} ${producto.precio2?.toLocaleString("es-AR") || 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#3498db]">
                    ${calcularPrecioDinamico(producto, 'precio2').toLocaleString("es-AR")}
                  </div>
                  <div className="text-sm text-[#3498db] font-medium">ARS</div>
                </div>
              </div>
            </div>
            
            {/* Precio 3 */}
            <div className="bg-gradient-to-r from-[#f3e8ff] to-[#e1c4ff] rounded-xl p-4 border border-[#9b59b6] transform transition-all duration-200 hover:scale-[1.02]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#9b59b6] flex items-center gap-2">
                    <span>💵</span> Precio 3
                  </h3>
                  <div className="text-sm text-[#7f8c8d]">
                    Original: {producto.moneda} ${producto.precio3?.toLocaleString("es-AR") || 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#9b59b6]">
                    ${calcularPrecioDinamico(producto, 'precio3').toLocaleString("es-AR")}
                  </div>
                  <div className="text-sm text-[#9b59b6] font-medium">ARS</div>
                </div>
              </div>
            </div>
            
          </div>
          
          {/* Ganancia estimada */}
          {producto.precioCosto > 0 && (
            <div className="bg-white border-2 border-[#f39c12] rounded-xl p-3">
              <h4 className="font-bold text-[#f39c12] text-sm mb-2 flex items-center gap-2">
                <span>📈</span> Ganancias Estimadas (sobre costo)
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center bg-[#d5f4e6] p-2 rounded-lg">
                  <div className="text-[#27ae60] font-bold text-lg">
                    {(((calcularPrecioDinamico(producto, 'precio1') / calcularPrecioDinamico(producto, 'precioCosto')) - 1) * 100).toFixed(0)}%
                  </div>
                  <div className="text-[#7f8c8d]">Precio 1</div>
                </div>
                <div className="text-center bg-[#dbeafe] p-2 rounded-lg">
                  <div className="text-[#3498db] font-bold text-lg">
                    {(((calcularPrecioDinamico(producto, 'precio2') / calcularPrecioDinamico(producto, 'precioCosto')) - 1) * 100).toFixed(0)}%
                  </div>
                  <div className="text-[#7f8c8d]">Precio 2</div>
                </div>
                <div className="text-center bg-[#f3e8ff] p-2 rounded-lg">
                  <div className="text-[#9b59b6] font-bold text-lg">
                    {(((calcularPrecioDinamico(producto, 'precio3') / calcularPrecioDinamico(producto, 'precioCosto')) - 1) * 100).toFixed(0)}%
                  </div>
                  <div className="text-[#7f8c8d]">Precio 3</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Información adicional */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-[#7f8c8d]">Costo:</span>
                <div className="font-bold text-[#e74c3c]">
                  ${calcularPrecioDinamico(producto, 'precioCosto').toLocaleString("es-AR")} ARS
                </div>
              </div>
              <div className="text-right">
                <span className="text-[#7f8c8d]">Proveedor:</span>
                <div className="font-medium text-[#2c3e50]">{producto.proveedor}</div>
              </div>
            </div>
          </div>
          
          {/* Botón cerrar */}
          <div className="flex justify-center pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-[#95a5a6] to-[#7f8c8d] hover:from-[#7f8c8d] hover:to-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}