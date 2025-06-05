"use client";

import { useState, useEffect } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";
import StockProductosPage from "../../stock-accesorios-repuestos/accesorios/page";
import { useRol } from "@/lib/useRol";

interface Props {
  negocioID: string;
  filtroProveedor?: boolean;
  telefonos: any[];
  setTelefonos: React.Dispatch<React.SetStateAction<any[]>>;
  onEditar?: (telefono: any) => void;
}

export default function TablaStockTelefonos({ negocioID, filtroProveedor = false, telefonos, setTelefonos, onEditar }: Props) {
  const [filtro, setFiltro] = useState("");
  const [filtroProveedorTexto, setFiltroProveedorTexto] = useState("");
  const [telefonoAEliminar, setTelefonoAEliminar] = useState<any | null>(null);
  const [mensaje, setMensaje] = useState("");
  const { rol } = useRol();

  useEffect(() => {
    const keys = telefonos.map(t => t.id);
    const duplicados = keys.filter((id, i, arr) => arr.indexOf(id) !== i);
    if (duplicados.length) console.warn("🚨 IDs duplicados en stock:", duplicados);

    const vacios = telefonos.filter(t => !t.id);
    if (vacios.length) console.warn("🚨 Elementos sin ID:", vacios);
  }, [telefonos]);

  const confirmarEliminacion = async () => {
    if (!telefonoAEliminar) return;
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/stockTelefonos/${telefonoAEliminar.id}`));
      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const nuevosDatos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sinDuplicados = nuevosDatos.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      setTelefonos(sinDuplicados);
      setMensaje("✅ Teléfono eliminado correctamente");
    } catch (error) {
      console.error("❌ Error al borrar el teléfono:", error);
      alert("Ocurrió un error al intentar borrar el teléfono. Revisá la consola.");
    } finally {
      setTelefonoAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  const exportarExcel = () => {
    const hoja = telefonos.map((t) => ({
      Fecha:
      typeof t.fechaIngreso === "string"
       ? t.fechaIngreso
      : t.fechaIngreso?.toDate?.().toLocaleDateString("es-AR") || "-",
      Proveedor: t.proveedor,
      Modelo: t.modelo,
      Marca: t.marca,
      Estado: t.estado,
      Bateria: t.estado === "Usado" ? `${t.bateria}%` : "-",
      Almacenamiento: t.gb,
      Color: t.color,
      IMEI: t.imei,
      Serial: t.serial,
      Compra: t.precioCompra,
      Venta: t.precioVenta,
      PrecioMayorista: t.precioMayorista,
      Moneda: t.moneda,
      Observaciones: t.observaciones,
    }));
    const ws = XLSX.utils.json_to_sheet(hoja);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockTelefonos");
    XLSX.writeFile(wb, "stock_telefonos.xlsx");
  };

  // ✅ FILTRO MEJORADO - Busca múltiples palabras en todos los campos
  const filtrados = telefonos.filter((t) => {
    const textoFiltro = filtro.toLowerCase().trim();
    
    // Si no hay filtro general, mostrar todos
    if (!textoFiltro) {
      const coincideProveedor = !filtroProveedor || 
        !filtroProveedorTexto || 
        t.proveedor?.toLowerCase().includes(filtroProveedorTexto.toLowerCase());
      return coincideProveedor;
    }
    
    // Dividir la búsqueda en palabras individuales
    const palabras = textoFiltro.split(' ').filter(p => p.length > 0);
    
    // Crear un texto combinado de todos los campos buscables
    const textoCombinado = [
      t.modelo || '',
      t.marca || '',
      t.color || '',
      t.imei || '',
      t.serial || '',
      t.estado || '',
      t.gb ? `${t.gb}gb` : '',
      t.observaciones || ''
    ].join(' ').toLowerCase();
    
    // Verificar que TODAS las palabras estén en algún lugar del texto combinado
    const todasLasPalabrasCoinciden = palabras.every(palabra => 
      textoCombinado.includes(palabra)
    );
    
    // Filtro de proveedor (si está activo)
    const coincideProveedor = !filtroProveedor || 
      !filtroProveedorTexto || 
      t.proveedor?.toLowerCase().includes(filtroProveedorTexto.toLowerCase());
    
    return todasLasPalabrasCoinciden && coincideProveedor;
  });

  const formatearPrecio = (precio: number) => {
    return precio ? `$${Number(precio).toLocaleString("es-AR")}` : "-";
  };

  const obtenerEstadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'nuevo':
        return 'bg-green-100 text-green-700';
      case 'usado':
        return 'bg-blue-100 text-blue-700';
      case 'reparacion':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de confirmación */}
      {mensaje && (
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-green-800 font-semibold">{mensaje}</span>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {telefonoAEliminar && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 transform transition-all duration-300">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  ¿Estás seguro que querés eliminar este teléfono del stock?
                </p>
                <div className="mt-2 text-sm text-red-600">
                  <strong>Modelo:</strong> {telefonoAEliminar.modelo}<br/>
                  <strong>IMEI:</strong> {telefonoAEliminar.imei}
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTelefonoAEliminar(null)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminacion}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles y filtros */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="🔍 Buscar: modelo, marca, color, estado, GB... (ej: 'iphone 11 rojo')"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pl-4"
              />
            </div>

            {filtroProveedor && (
              <div className="relative flex-1">
                <input
                  type="text"
                  value={filtroProveedorTexto}
                  onChange={(e) => setFiltroProveedorTexto(e.target.value)}
                  placeholder="🏪 Filtrar por proveedor"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pl-4"
                />
              </div>
            )}
          </div>

          <button
            onClick={exportarExcel}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            📊 Descargar Excel
          </button>
        </div>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            📱 Stock de Teléfonos
          </h3>
          <p className="text-purple-100 mt-1">
            {filtrados.length} de {telefonos.length} {telefonos.length === 1 ? 'teléfono' : 'teléfonos'} en stock
          </p>
        </div>

        {/* Contenedor con scroll horizontal */}
        <div className="overflow-x-auto border border-gray-300">
          <table className="w-full min-w-[1400px] border-collapse">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📅 Fecha
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏪 Proveedor
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📱 Modelo
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏷️ Marca
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  ⚡ Estado
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🔋 Batería
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  💾 Almacenamiento
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🎨 Color
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🔢 IMEI
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏷️ Serial
                </th>
                {rol?.tipo === "admin" && (
                  <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                    💸 Compra
                  </th>
                )}
                <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  💰 Venta
                </th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏪 Mayorista
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  💱 Moneda
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📝 Observaciones
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  ⚙️ Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td 
                    colSpan={rol?.tipo === "admin" ? 16 : 15}
                    className="p-12 text-center text-gray-500 border border-gray-300"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">📱</span>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-600">
                          {telefonos.length === 0 ? "No hay teléfonos en stock" : "No se encontraron resultados"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {telefonos.length === 0 
                            ? "Los teléfonos aparecerán aquí una vez que agregues algunos al stock"
                            : "Intenta ajustar los filtros de búsqueda"
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((t, index) => {
                  const isEven = index % 2 === 0;
                  
                  return (
                    <tr 
                      key={`stock-${t.id || ""}-${t.imei || Math.random()}`} 
                      className={`transition-colors duration-200 hover:bg-purple-50 ${
                        isEven ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm font-medium text-gray-800">
                          {typeof t.fechaIngreso === "string"
                            ? t.fechaIngreso
                            : t.fechaIngreso?.toDate?.().toLocaleDateString?.("es-AR") || "-"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm text-gray-700">{t.proveedor || "-"}</span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <div className="font-medium text-gray-800 text-sm">{t.modelo}</div>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm text-gray-700">{t.marca || "-"}</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${obtenerEstadoColor(t.estado)}`}>
                          {t.estado || "-"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        {t.estado?.toLowerCase() === "usado" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            🔋 {t.bateria}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        {t.gb ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            💾 {t.gb} GB
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {t.color || "-"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-xs font-mono text-gray-600 break-all">{t.imei || "-"}</span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-xs font-mono text-gray-600 break-all">{t.serial || "-"}</span>
                      </td>
                      {rol?.tipo === "admin" && (
                        <td className="p-3 border border-gray-300 text-right">
                          <span className="text-sm font-medium text-gray-700">
                            {formatearPrecio(t.precioCompra)}
                          </span>
                        </td>
                      )}
                      <td className="p-3 border border-gray-300 text-right">
                        <span className="text-sm font-semibold text-green-700">
                          {formatearPrecio(t.precioVenta)}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300 text-right">
                        <span className="text-sm font-semibold text-blue-700">
                          {formatearPrecio(t.precioMayorista)}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          t.moneda === 'USD' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {t.moneda === "USD" ? "🇺🇸 USD" : "🇦🇷 ARS"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm text-gray-700 truncate max-w-[200px] block">
                          {t.observaciones || "-"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setTelefonoAEliminar(t)}
                            className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-200"
                          >
                            🗑️ Eliminar
                          </button>
                          {onEditar && (
                            <button
                              onClick={() => onEditar(t)}
                              className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors duration-200"
                            >
                              ✏️ Editar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de la tabla */}
        {filtrados.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                Mostrando {filtrados.length} de {telefonos.length} {telefonos.length === 1 ? 'teléfono' : 'teléfonos'}
              </span>
              {rol?.tipo === "admin" && (
                <div className="flex gap-6">
                  <span>
                    Valor total (compra): <strong className="text-orange-700">
                      {formatearPrecio(filtrados.reduce((sum, t) => sum + (t.precioCompra || 0), 0))}
                    </strong>
                  </span>
                  <span>
                    Valor total (venta): <strong className="text-green-700">
                      {formatearPrecio(filtrados.reduce((sum, t) => sum + (t.precioVenta || 0), 0))}
                    </strong>
                  </span>
                  <span>
                    Valor total (mayorista): <strong className="text-blue-700">
                      {formatearPrecio(filtrados.reduce((sum, t) => sum + (t.precioMayorista || 0), 0))}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}