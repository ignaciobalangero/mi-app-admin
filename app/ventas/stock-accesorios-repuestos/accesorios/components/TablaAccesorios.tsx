"use client";

import { useState } from "react";
import ModalVerPrecios from "./ModalVerPrecios";
import ModalEditarAccesorio from "./ModalEditarAccesorios";

// 📦 Tabla de productos – Sección ACCESORIOS (COMPONENTE PRINCIPAL)

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
  productos: Producto[];
  editarProducto?: (producto: Producto) => void;
  eliminarProducto: (id: string) => void;
  cotizacion: number;
  onCotizacionChange?: (nuevaCotizacion: number) => void;
  actualizarProducto?: (producto: Producto) => Promise<void>;
  onProductoActualizado?: (producto: Producto) => void;
  negocioID?: string;
}

export default function TablaAccesorios({ 
  productos, 
  editarProducto, 
  eliminarProducto,
  cotizacion,
  onCotizacionChange,
  actualizarProducto,
  onProductoActualizado,
  negocioID 
}: Props) {
  
  // 🆕 ESTADOS PARA LOS MODALES
  const [modalVerPrecios, setModalVerPrecios] = useState<Producto | null>(null);
  const [modalEditar, setModalEditar] = useState<Producto | null>(null);
  const [modalEliminar, setModalEliminar] = useState<string | null>(null);
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  // 🔍 FILTROS
  const proveedoresUnicos = productos
    .map(p => p.proveedor)
    .filter((proveedor, index, array) => 
      proveedor && array.indexOf(proveedor) === index
    );
    
  const categoriasUnicas = productos
    .map(p => p.categoria)
    .filter((categoria, index, array) => 
      categoria && array.indexOf(categoria) === index
    );

  const productosFiltrados = productos.filter(p => {
    const matchProveedor = !filtroProveedor || p.proveedor === filtroProveedor;
    const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;
    return matchProveedor && matchCategoria;
  });

  // 💰 FUNCIÓN PARA CALCULAR PRECIO DINÁMICO
  const calcularPrecioDinamico = (producto: Producto, tipoPrecio: 'precio1' | 'precio2' | 'precio3' | 'precioCosto') => {
    if (producto.moneda === "USD") {
      return producto[tipoPrecio] * cotizacion;
    }
    return producto[tipoPrecio];
  };

  // 🗑️ FUNCIÓN PARA CONFIRMAR ELIMINACIÓN
  const confirmarEliminacion = (id: string) => {
    eliminarProducto(id);
    setModalEliminar(null);
  };

  // 📊 ESTADÍSTICAS
  const totalProductos = productosFiltrados.length;
  const valorTotal = productosFiltrados.reduce((acc, p) => {
    return acc + calcularPrecioDinamico(p, 'precioCosto') * p.cantidad;
  }, 0);

  return (
    <div className="space-y-6">
      {/* 🆕 HEADER CON FILTROS Y COTIZACIÓN */}
      <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          
          {/* Filtros */}
          <div className="flex flex-col gap-4 w-full lg:min-w-[400px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Filtro Proveedor */}
              <div>
                <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🏪</span>
                  Proveedor:
                </label>
                <select
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                  className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-sm"
                >
                  <option value="">Todos los proveedores</option>
                  {proveedoresUnicos.map(proveedor => (
                    <option key={proveedor} value={proveedor}>{proveedor}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Categoría */}
              <div>
                <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">📂</span>
                  Categoría:
                </label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                >
                  <option value="">Todas las categorías</option>
                  {categoriasUnicas.map(categoria => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 🆕 COTIZACIÓN USD (SOLO LECTURA) */}
          <div className="w-full lg:w-52">
            <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
              Cotización USD:
            </label>
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] px-2 sm:px-3 py-2 sm:py-3 rounded-lg border-2 border-[#95a5a6]">
              <span className="text-sm font-medium text-[#2c3e50]">$</span>
              <div className="flex-1 text-center font-bold text-sm text-[#2c3e50]">
                {cotizacion.toLocaleString("es-AR")}
              </div>
              <div className="text-xs text-[#f39c12] whitespace-nowrap">
                <div className="font-medium">ARS</div>
              </div>
            </div>
            <div className="text-xs text-[#7f8c8d] mt-1 text-center">
              📌 Solo lectura - Se modifica desde Venta General
            </div>
          </div>
        </div>
      </div>

      {/* 🆕 TABLA MEJORADA CON ESTÉTICA GESTIONE */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">🎧</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Stock de Accesorios</h3>
              <p className="text-blue-100 text-xs sm:text-sm">
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'} encontrados
              </p>
            </div>
          </div>
        </div>

        {/* Tabla responsive */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-[#ecf0f1]">
              <tr>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-20">
                  🏷️ Código
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-24">
                  📂 Categoría
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📦 Producto
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-20">
                  🏢 Marca
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-20">
                  📱 Modelo
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-20">
                  🎨 Color
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-28">
                  💰 Costo Orig.
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-16">
                  📊 Cant.
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-28">
                  🏪 Proveedor
                </th>
                <th className="p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-40">
                  ⚙️ Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 sm:p-12 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl">🎧</span>
                      </div>
                      <div>
                        <p className="text-sm sm:text-lg font-medium text-[#7f8c8d]">
                          {productos.length === 0 ? "No hay productos registrados" : "No se encontraron resultados"}
                        </p>
                        <p className="text-xs sm:text-sm text-[#bdc3c7]">
                          {productos.length === 0 
                            ? "Los productos aparecerán aquí una vez que agregues algunos"
                            : "Intenta ajustar los filtros de búsqueda"
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                      p.cantidad === 0
                        ? "bg-red-50"
                        : p.cantidad <= (p.stockBajo ?? 3)
                        ? "bg-yellow-50"
                        : "bg-green-50"
                    }`}
                  >
                    {/* Código */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3498db] text-white">
                        {p.codigo}
                      </span>
                    </td>
                    
                    {/* Categoría */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#27ae60] text-white">
                        {p.categoria}
                      </span>
                    </td>
                    
                    {/* Producto */}
                    <td className="p-2 lg:p-3 text-left border border-[#bdc3c7]">
                      <div className="text-sm font-medium text-[#2c3e50] truncate">
                        {p.producto?.length > 30 ? p.producto.substring(0, 30) + "..." : p.producto}
                      </div>
                    </td>
                    
                    {/* Marca */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className="text-sm text-[#7f8c8d]">{p.marca}</span>
                    </td>
                    
                    {/* Modelo */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className="text-sm text-[#7f8c8d]">{p.modelo}</span>
                    </td>
                    
                    {/* Color */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50]">
                        {p.color}
                      </span>
                    </td>
                    
                    {/* Costo Original */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className={`text-sm font-medium ${
                        p.moneda === "USD" ? "text-[#3498db]" : "text-[#27ae60]"
                      }`}>
                        {p.moneda} ${p.precioCosto?.toLocaleString("es-AR") || 0}
                      </span>
                    </td>
                    
                    {/* Cantidad */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white ${
                        p.cantidad === 0
                          ? "bg-[#e74c3c]"
                          : p.cantidad <= (p.stockBajo ?? 3)
                          ? "bg-[#f39c12]"
                          : "bg-[#27ae60]"
                      }`}>
                        {p.cantidad}
                      </span>
                    </td>
                    
                    {/* Proveedor */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <span className="text-sm text-[#7f8c8d]">{p.proveedor}</span>
                    </td>
                    
                    {/* Acciones */}
                    <td className="p-2 lg:p-3 text-center border border-[#bdc3c7]">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => setModalVerPrecios(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-[#9b59b6] text-white hover:bg-[#8e44ad] transition-all duration-200 transform hover:scale-105 shadow-md"
                          title="Ver precios"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => setModalEditar(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-[#3498db] text-white hover:bg-[#2980b9] transition-all duration-200 transform hover:scale-105 shadow-md"
                          title="Editar producto"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setModalEliminar(p.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-[#e74c3c] text-white hover:bg-[#c0392b] transition-all duration-200 transform hover:scale-105 shadow-md"
                          title="Eliminar producto"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 🆕 FOOTER CON ESTADÍSTICAS */}
        {productosFiltrados.length > 0 && (
          <div className="bg-[#f8f9fa] px-3 sm:px-6 py-3 sm:py-4 border-t border-[#bdc3c7]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
              <span>
                Mostrando {productosFiltrados.length} de {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
              </span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                <span>
                  Stock Total: <strong className="text-[#3498db]">
                    {productosFiltrados.reduce((sum, p) => sum + p.cantidad, 0)} unidades
                  </strong>
                </span>
                <span>
                  Valor Total: <strong className="text-[#27ae60]">
                    ${valorTotal.toLocaleString("es-AR")}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 👁️ MODAL VER PRECIOS */}
      {modalVerPrecios && (
        <ModalVerPrecios
          producto={modalVerPrecios}
          cotizacion={cotizacion}
          calcularPrecioDinamico={calcularPrecioDinamico}
          onClose={() => setModalVerPrecios(null)}
        />
      )}

      {/* ✏️ MODAL EDITAR ACCESORIO */}
      {modalEditar && (
        <ModalEditarAccesorio
          producto={modalEditar}
          cotizacion={cotizacion}
          actualizarProducto={actualizarProducto}
          onProductoActualizado={onProductoActualizado}
          onClose={() => setModalEditar(null)}
        />
      )}

      {/* 🗑️ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm mt-1">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6 bg-[#f8f9fa]">
              <div className="bg-white border-2 border-[#e74c3c] rounded-xl p-4 shadow-sm">
                <p className="text-[#2c3e50] font-semibold mb-3">
                  ¿Estás seguro que querés eliminar este producto?
                </p>
                <div className="text-sm text-[#7f8c8d] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#3498db] rounded-full"></span>
                    <strong className="text-[#2c3e50]">Producto:</strong> {productos.find(p => p.id === modalEliminar)?.producto}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#27ae60] rounded-full"></span>
                    <strong className="text-[#2c3e50]">Stock:</strong> {productos.find(p => p.id === modalEliminar)?.cantidad} unidades
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#f39c12] rounded-full"></span>
                    <strong className="text-[#2c3e50]">Valor:</strong> ${modalEliminar ? calcularPrecioDinamico(productos.find(p => p.id === modalEliminar)!, 'precio1').toLocaleString("es-AR") : '0'}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setModalEliminar(null)}
                  className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmarEliminacion(modalEliminar)}
                  className="px-6 py-3 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}