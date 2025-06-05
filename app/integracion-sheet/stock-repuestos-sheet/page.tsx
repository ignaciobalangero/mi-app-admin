"use client";

import { useEffect, useState } from "react";

export default function StockRepuestosSheet() {
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtroProducto, setFiltroProducto] = useState("");
  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [mostrarSinStock, setMostrarSinStock] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await fetch("/api/leer-stock");
        const json = await res.json();
        if (res.ok) {
          setDatos(json.datos);
        } else {
          throw new Error(json.error || "Error desconocido");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  // Filtrar datos
  const datosFiltrados = datos.filter((item) => {
    const cumpleFiltroProducto = item.producto?.toLowerCase().includes(filtroProducto.toLowerCase());
    const cumpleFiltroCodigo = item.codigo?.toLowerCase().includes(filtroCodigo.toLowerCase());
    const cumpleFiltroStock = mostrarSinStock ? true : (item.cantidad > 0);
    
    return cumpleFiltroProducto && cumpleFiltroCodigo && cumpleFiltroStock;
  });

  // Estados de carga y error mejorados
  if (cargando) {
    return (
      <main className="pt-24 px-4 lg:px-6 bg-gradient-to-br from-[#f8f9fa] to-[#ecf0f1] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-8 lg:p-12">
            <div className="text-center">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#3498db] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-3xl lg:text-4xl text-white">🔄</span>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-[#2c3e50] mb-2">Cargando inventario...</h3>
              <p className="text-[#7f8c8d] text-sm lg:text-base">
                Obteniendo datos desde Google Sheets
              </p>
              <div className="mt-4 w-32 h-2 bg-[#ecf0f1] rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pt-24 px-4 lg:px-6 bg-gradient-to-br from-[#f8f9fa] to-[#ecf0f1] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-8 lg:p-12">
            <div className="text-center">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl lg:text-4xl">❌</span>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-[#e74c3c] mb-2">Error al cargar datos</h3>
              <p className="text-[#7f8c8d] text-sm lg:text-base mb-4">
                No se pudieron obtener los datos del inventario
              </p>
              <div className="bg-red-50 border-2 border-[#e74c3c] rounded-lg p-4 max-w-md mx-auto">
                <p className="text-[#e74c3c] font-medium text-sm">
                  {error}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#1f618d] text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                🔄 Reintentar
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 px-4 lg:px-6 bg-gradient-to-br from-[#f8f9fa] to-[#ecf0f1] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Principal */}
        <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl lg:text-3xl">📦</span>
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-[#2c3e50]">Stock Repuestos</h1>
                <p className="text-sm lg:text-base text-[#7f8c8d]">Inventario desde Google Sheets</p>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="flex flex-wrap gap-3 lg:gap-4">
              <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white px-3 lg:px-4 py-2 rounded-lg shadow-md">
                <div className="text-center">
                  <p className="text-xs lg:text-sm font-medium opacity-90">Total productos</p>
                  <p className="text-lg lg:text-xl font-bold">{datos.length}</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white px-3 lg:px-4 py-2 rounded-lg shadow-md">
                <div className="text-center">
                  <p className="text-xs lg:text-sm font-medium opacity-90">Con stock</p>
                  <p className="text-lg lg:text-xl font-bold">{datos.filter(item => item.cantidad > 0).length}</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white px-3 lg:px-4 py-2 rounded-lg shadow-md">
                <div className="text-center">
                  <p className="text-xs lg:text-sm font-medium opacity-90">Sin stock</p>
                  <p className="text-lg lg:text-xl font-bold">{datos.filter(item => item.cantidad <= 0).length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            
            {/* Filtro por producto */}
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
                Buscar producto:
              </label>
              <input
                type="text"
                placeholder="🔍 Filtrar por nombre de producto..."
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
              />
            </div>

            {/* Filtro por código */}
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">🏷️</span>
                Buscar código:
              </label>
              <input
                type="text"
                placeholder="🏷️ Filtrar por código..."
                value={filtroCodigo}
                onChange={(e) => setFiltroCodigo(e.target.value)}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
              />
            </div>

            {/* Toggle sin stock */}
            <div className="w-full lg:w-auto">
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">👁️</span>
                Mostrar:
              </label>
              <button
                onClick={() => setMostrarSinStock(!mostrarSinStock)}
                className={`w-full p-2 sm:p-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                  mostrarSinStock 
                    ? "bg-[#27ae60] text-white shadow-md" 
                    : "bg-[#e74c3c] text-white shadow-md"
                } hover:shadow-lg transform hover:scale-105`}
              >
                {mostrarSinStock ? "📦 Todos los productos" : "✅ Solo con stock"}
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
          
          {/* Header de la tabla */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] text-white p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-lg sm:text-2xl">📊</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">Inventario de Repuestos</h3>
                <p className="text-gray-200 text-xs sm:text-sm">
                  {datosFiltrados.length} {datosFiltrados.length === 1 ? 'producto' : 'productos'} encontrados
                </p>
              </div>
            </div>
          </div>

          {/* Tabla responsive */}
          <div className="overflow-x-auto border border-[#bdc3c7]">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="bg-[#ecf0f1]">
                <tr>
                  <th className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-20 sm:w-24">
                    <span className="hidden sm:inline">🏷️ </span>Código
                  </th>
                  <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    <span className="hidden sm:inline">📱 </span>Producto
                  </th>
                  <th className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-16 sm:w-20">
                    <span className="hidden sm:inline">📦 </span>Stock
                  </th>
                  <th className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-24 sm:w-32">
                    <span className="hidden sm:inline">💰 </span>Precio (ARS)
                  </th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 sm:p-12 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                          <span className="text-2xl sm:text-3xl">📊</span>
                        </div>
                        <div>
                          <p className="text-sm sm:text-lg font-medium text-[#7f8c8d]">
                            {datos.length === 0 ? "No hay productos registrados" : "No se encontraron resultados"}
                          </p>
                          <p className="text-xs sm:text-sm text-[#bdc3c7]">
                            {datos.length === 0 
                              ? "Los productos aparecerán aquí una vez que se sincronicen desde Google Sheets"
                              : "Intenta ajustar los filtros de búsqueda"
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  datosFiltrados.map((item, index) => {
                    const sinStock = item.cantidad <= 0;
                    const stockBajo = item.cantidad > 0 && item.cantidad <= 5;
                    
                    return (
                      <tr
                        key={index}
                        className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                          sinStock 
                            ? "bg-red-50" 
                            : stockBajo 
                            ? "bg-yellow-50" 
                            : "bg-white hover:bg-[#f8f9fa]"
                        }`}
                      >
                        {/* Código */}
                        <td className="p-2 sm:p-3 text-center border border-[#bdc3c7]">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white">
                            {item.codigo || "—"}
                          </span>
                        </td>
                        
                        {/* Producto */}
                        <td className="p-2 sm:p-3 border border-[#bdc3c7]">
                          <div className="text-xs sm:text-sm text-[#2c3e50]">
                            <div className="font-semibold">
                              {item.producto || "Sin nombre"}
                            </div>
                          </div>
                        </td>
                        
                        {/* Stock */}
                        <td className="p-2 sm:p-3 text-center border border-[#bdc3c7]">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                            sinStock 
                              ? "bg-[#e74c3c] text-white"
                              : stockBajo
                              ? "bg-[#f39c12] text-white" 
                              : "bg-[#27ae60] text-white"
                          }`}>
                            {item.cantidad || 0}
                          </span>
                        </td>
                        
                        {/* Precio */}
                        <td className="p-2 sm:p-3 text-center border border-[#bdc3c7]">
                          <span className="text-xs sm:text-sm font-bold text-[#27ae60]">
                            ${item.precioARS?.toLocaleString("es-AR") || "0"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer de la tabla */}
          {datosFiltrados.length > 0 && (
            <div className="bg-[#f8f9fa] px-3 sm:px-6 py-3 sm:py-4 border-t border-[#bdc3c7]">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
                <span>
                  Mostrando {datosFiltrados.length} de {datos.length} {datos.length === 1 ? 'producto' : 'productos'}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                  <span>
                    Con stock: <strong className="text-[#27ae60]">
                      {datosFiltrados.filter(item => item.cantidad > 0).length}
                    </strong>
                  </span>
                  <span>
                    Valor total: <strong className="text-[#3498db]">
                      ${datosFiltrados.reduce((sum, item) => sum + ((item.precioARS || 0) * (item.cantidad || 0)), 0).toLocaleString("es-AR")}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}