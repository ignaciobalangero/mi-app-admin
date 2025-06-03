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
            gb: data.gb ?? data.productos?.[0]?.gb ?? "",
            imei: data.imei,
            serial: data.serie,
            precioCompra: data.precioCosto,
            precioVenta: data.precioVenta,
            moneda: data.moneda,
            observaciones: data.observaciones || "",
            fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],
          });
        }
  
        await deleteDoc(ref);
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
    if (ganancia > 0) return "text-[#27ae60] font-semibold";
    if (ganancia < 0) return "text-[#e74c3c] font-semibold";
    return "text-[#7f8c8d]";
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de confirmación - Estilo GestiOne */}
      {mensaje && (
        <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] rounded-xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-[#27ae60] rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-[#27ae60] font-semibold text-lg">{mensaje}</span>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación - Estilo GestiOne */}
      {ventaAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300 scale-100 hover:scale-[1.02]">
            
            {/* Header del modal - Estilo GestiOne */}
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
                  ¿Estás seguro que querés eliminar esta venta?
                </p>
                <div className="space-y-2 text-sm text-[#7f8c8d]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#3498db] rounded-full"></span>
                    <strong className="text-[#2c3e50]">Cliente:</strong> {ventaAEliminar.cliente}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#3498db] rounded-full"></span>
                    <strong className="text-[#2c3e50]">Modelo:</strong> {ventaAEliminar.modelo}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setVentaAEliminar(null)}
                  className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminacion}
                  className="px-6 py-3 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor principal de la tabla - Estilo GestiOne */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla - Estilo GestiOne */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Historial de Ventas</h3>
              <p className="text-blue-100 mt-1">
                {ventas.length} {ventas.length === 1 ? 'venta registrada' : 'ventas registradas'}
              </p>
            </div>
          </div>
        </div>

        {/* Contenedor con scroll horizontal */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1600px] border-collapse border-2 border-black">
            <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
              <tr>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    Fecha
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏪</span>
                    Proveedor
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    Cliente
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    Modelo
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎨</span>
                    Color
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔋</span>
                    Batería
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💾</span>
                    GB
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔢</span>
                    IMEI
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏷️</span>
                    Serie
                  </div>
                </th>
                {rol?.tipo === "admin" && (
                  <th className="p-4 text-right text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-base">💸</span>
                      Costo
                    </div>
                  </th>
                )}
                <th className="p-4 text-right text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-base">💰</span>
                    Venta
                  </div>
                </th>

                <th className="p-4 text-center text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base">$</span>
                    Moneda
                  </div>
                </th>
                {rol?.tipo === "admin" && (
                  <th className="p-4 text-right text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-base">📈</span>
                      Ganancia
                    </div>
                  </th>
                )}
                <th className="p-4 text-center text-xs font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base">⚙️</span>
                    Acciones
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td 
                    colSpan={rol?.tipo === "admin" ? 13 : 11}
                    className="p-16 text-center border border-black"
                  >
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-20 h-20 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
                        <span className="text-4xl">📱</span>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-[#2c3e50] mb-2">No hay ventas registradas</p>
                        <p className="text-sm text-[#7f8c8d]">Las ventas aparecerán aquí una vez que comiences a registrarlas</p>
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
                      className={`transition-all duration-200 hover:bg-[#ebf3fd] border-b border-[#ecf0f1] ${
                        isEven ? 'bg-white' : 'bg-[#f8f9fa]'
                      }`}
                    >
                      <td className="p-4">
                        <span className="text-xs font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                          {v.fecha}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-normal">{v.proveedor || "-"}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold text-normal px-3 py-1 rounded-lg">
                          {v.cliente}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[#2c3e50] text-sm">{v.modelo}</div>
                        {v.marca && <div className="text-xs text-[#7f8c8d] mt-1">{v.marca}</div>}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium bg-[#f39c12] text-white shadow-sm">
                          {v.color || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-[#2c3e50] bg-[#d5f4e6] px-2 py-1 rounded-lg">
                          {v.bateria || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-[#3498db] text-white shadow-sm">
                          {v.gb || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono text-normal px-2 py-1 rounded break-all">
                          {v.imei || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded break-all">
                          {v.serie || "-"}
                        </span>
                      </td>
                      {rol?.tipo === "admin" && (
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold text-[#e74c3c] bg-red-50 px-3 py-1 rounded-lg">
                            {formatearPrecio(v.precioCosto)}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg">
                          {formatearPrecio(v.precioVenta)}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${
                          (v.productos?.[0]?.moneda || v.moneda) === 'USD' 
                            ? 'bg-[#27ae60] text-white' 
                            : 'bg-[#3498db] text-white'
                        }`}>
                          {v.productos?.[0]?.moneda || v.moneda || "ARS"}
                        </span>
                      </td>
                      {rol?.tipo === "admin" && (
                        <td className="p-4 text-right">
                          <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                            ganancia > 0 ? 'bg-green-50 text-[#27ae60]' : 
                            ganancia < 0 ? 'bg-red-50 text-[#e74c3c]' : 
                            'bg-gray-50 text-[#7f8c8d]'
                          }`}>
                            {formatearPrecio(ganancia)}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setVentaAEliminar(v)} 
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#e74c3c] text-white hover:bg-[#c0392b] transition-all duration-200 transform hover:scale-105 shadow-md"
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

        {/* Footer de la tabla - Estilo GestiOne */}
        {ventas.length > 0 && (
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-6 py-4 border-t-2 border-[#bdc3c7]">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📊</span>
                </div>
                <span className="text-sm font-semibold text-[#2c3e50]">
                  Mostrando {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
                </span>
              </div>
              
              {rol?.tipo === "admin" && (
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#27ae60] rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">💰</span>
                    </div>
                    <span className="text-sm text-[#2c3e50]">
                      Total vendido: <strong className="text-[#27ae60] font-bold">
                        {formatearPrecio(ventas.reduce((sum, v) => sum + (v.precioVenta || 0), 0))}
                      </strong>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#f39c12] rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">📈</span>
                    </div>
                    <span className="text-sm text-[#2c3e50]">
                      Ganancia total: <strong className="text-[#f39c12] font-bold">
                        {formatearPrecio(ventas.reduce((sum, v) => sum + ((v.precioVenta || 0) - (v.precioCosto || 0)), 0))}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}