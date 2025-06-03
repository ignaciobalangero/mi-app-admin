"use client";

import { useEffect, useState } from "react";
import { deleteDoc, doc, getDocs, collection, getDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import { Timestamp } from "firebase/firestore";

interface Props {
  negocioID: string;
  onEditar: (venta: any) => void;
  ventas: any[];
  setVentas: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function TablaVentas({ negocioID, onEditar, ventas, setVentas }: Props) {
  const [ventaAEliminar, setVentaAEliminar] = useState<any | null>(null);
  const [mensaje, setMensaje] = useState("");
  const { rol } = useRol();

  const confirmarEliminacion = async () => {
    if (!ventaAEliminar) return;
  
    try {
      // 🔁 Buscamos ventaTelefonos primero
      const ref = doc(db, `negocios/${negocioID}/ventaTelefonos/${ventaAEliminar.id}`);
      const snap = await getDoc(ref);
  
      if (snap.exists()) {
        const data = snap.data();
  
        // 🔄 Verificamos si el stock ya lo tiene
        const stockSnap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
        const yaExiste = stockSnap.docs.some((docu) => {
          const d = docu.data();
          return d.modelo === data.modelo && d.imei === data.imei;
        });
  
        if (!yaExiste) {
          await addDoc(collection(db, `negocios/${negocioID}/stockTelefonos`), {
            proveedor: data.proveedor || "Sin proveedor",
            modelo: data.modelo,
            marca: data.marca || "",
            estado: data.estado,
            bateria: data.bateria,
            color: data.color,
            gb: data.gb ?? data.productos?.[0]?.gb ?? "", // ✅ CAMBIO CLAVE
            imei: data.imei,
            serial: data.serie,
            precioCompra: data.precioCosto,
            precioVenta: data.precioVenta,
            moneda: data.moneda,
            observaciones: data.observaciones || "",
            fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],

           });
          }
        
  
        await deleteDoc(ref); // ✅ Eliminamos de ventaTelefonos
      }
  
      // 🧨 Eliminamos de ventasGeneral también
      await deleteDoc(doc(db, `negocios/${negocioID}/ventasGeneral/${ventaAEliminar.id}`));
  
      // 🔁 Recargamos ventas actualizadas
      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/ventaTelefonos`));
      const nuevasVentas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVentas(nuevasVentas);
  
      setMensaje("✅ Venta eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar venta:", error);
    } finally {
      setVentaAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  const formatearPrecio = (precio: number) => {
    return precio ? `$${Number(precio).toLocaleString("es-AR")}` : "-";
  };

  const obtenerColorGanancia = (ganancia: number) => {
    if (ganancia > 0) return "text-green-700 font-semibold";
    if (ganancia < 0) return "text-red-700 font-semibold";
    return "text-gray-600";
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
      {ventaAEliminar && (
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
                  ¿Estás seguro que querés eliminar esta venta?
                </p>
                <div className="mt-2 text-sm text-red-600">
                  <strong>Cliente:</strong> {ventaAEliminar.cliente}<br/>
                  <strong>Modelo:</strong> {ventaAEliminar.modelo}
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setVentaAEliminar(null)}
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

      {/* Tabla principal */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            📱 Historial de Ventas de Teléfonos
          </h3>
          <p className="text-blue-100 mt-1">
            {ventas.length} {ventas.length === 1 ? 'venta registrada' : 'ventas registradas'}
          </p>
        </div>

        {/* Contenedor con scroll horizontal */}
        <div className="overflow-x-auto border border-gray-300">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📅 Fecha
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏪 Proveedor
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  👤 Cliente
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📱 Modelo
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🎨 Color
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🔋 Batería
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  💾 GB
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🔢 IMEI
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏷️ Serie
                </th>
                {rol?.tipo === "admin" && (
                  <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                    💸 Costo
                  </th>
                )}
                <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  💰 Venta
                </th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🤝 Entregado
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  💱 Moneda
                </th>
                {rol?.tipo === "admin" && (
                  <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                    📈 Ganancia
                  </th>
                )}
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  ⚙️ Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td 
                    colSpan={rol?.tipo === "admin" ? 15 : 12}
                    className="p-12 text-center text-gray-500 border border-gray-300"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">📱</span>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-600">No hay ventas registradas</p>
                        <p className="text-sm text-gray-400">Las ventas aparecerán aquí una vez que comiences a registrarlas</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                ventas.map((v, index) => {
                  const ganancia = (v.precioVenta || 0) - (v.precioCosto || 0);
                  const isEven = index % 2 === 0;
                  
                  return (
                    <tr 
                      key={v.id} 
                      className={`transition-colors duration-200 hover:bg-blue-50 ${
                        isEven ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm font-medium text-gray-800">{v.fecha}</span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm text-gray-700">{v.proveedor || "-"}</span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm font-medium text-blue-700">{v.cliente}</span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <div className="font-medium text-gray-800 text-sm">{v.modelo}</div>
                        {v.marca && <div className="text-xs text-gray-500">{v.marca}</div>}
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {v.color || "-"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-sm text-gray-700">{v.bateria || "-"}</span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {v.gb || "-"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-xs font-mono text-gray-600 break-all">{v.imei || "-"}</span>
                      </td>
                      <td className="p-3 border border-gray-300">
                        <span className="text-xs font-mono text-gray-600 break-all">{v.serie || "-"}</span>
                      </td>
                      {rol?.tipo === "admin" && (
                        <td className="p-3 border border-gray-300 text-right">
                          <span className="text-sm font-medium text-gray-700">
                            {formatearPrecio(v.precioCosto)}
                          </span>
                        </td>
                      )}
                      <td className="p-3 border border-gray-300 text-right">
                        <span className="text-sm font-semibold text-green-700">
                          {formatearPrecio(v.precioVenta)}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300 text-right">
                        <span className="text-sm text-gray-700">
                          {v.montoEntregado ? formatearPrecio(v.montoEntregado) : "-"}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          (v.productos?.[0]?.moneda || v.moneda) === 'USD' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {v.productos?.[0]?.moneda || v.moneda || "ARS"}
                        </span>
                      </td>
                      {rol?.tipo === "admin" && (
                        <td className="p-3 border border-gray-300 text-right">
                          <span className={`text-sm font-semibold ${obtenerColorGanancia(ganancia)}`}>
                            {formatearPrecio(ganancia)}
                          </span>
                        </td>
                      )}
                      <td className="p-3 border border-gray-300 text-center">
                        <button 
                          onClick={() => setVentaAEliminar(v)} 
                          className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-200"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de la tabla */}
        {ventas.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                Mostrando {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
              </span>
              {rol?.tipo === "admin" && (
                <div className="flex gap-6">
                  <span>
                    Total vendido: <strong className="text-green-700">
                      {formatearPrecio(ventas.reduce((sum, v) => sum + (v.precioVenta || 0), 0))}
                    </strong>
                  </span>
                  <span>
                    Ganancia total: <strong className="text-blue-700">
                      {formatearPrecio(ventas.reduce((sum, v) => sum + ((v.precioVenta || 0) - (v.precioCosto || 0)), 0))}
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