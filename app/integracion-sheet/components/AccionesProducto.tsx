// Componente con botones Editar y Eliminar modelo - CORREGIDO
"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { useRol } from "@/lib/useRol";
import ModalAdvertencia from "./ModalAdvertencia";

export default function AccionesProducto({ producto, sheetID, hoja, cotizacion = 1200, onRecargar }: {
  producto: any;
  sheetID: string;
  hoja: string;
  cotizacion?: number;
  onRecargar: () => void;
}) {
  const { rol } = useRol();
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({
    modelo: producto.modelo || "",
    cantidad: producto.cantidad || 0,
    proveedor: producto.proveedor || "",
    precioCosto: producto.precioCosto || 0,
    stockMinimo: producto.stockMinimo || 0,
    stockIdeal: producto.stockIdeal || 0,
    precio1: producto.precio1 || 0,
    precio2: producto.precio2 || 0,
    precio3: producto.precio3 || 0,
  });  
  const [mensaje, setMensaje] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState("");
  const [cargando, setCargando] = useState(false);

  // ✅ FUNCIÓN CORREGIDA - guardarCambios
  const guardarCambios = async () => {
    setCargando(true);
    try {
      console.log(`🔧 Editando modelo ${producto.codigo}:`, formData);
      console.log(`💰 Usando cotización: ${cotizacion}`);
      console.log(`🏪 NegocioID: ${rol.negocioID}, Hoja: ${hoja}`);
      
      const ref = doc(db, `negocios/${rol.negocioID}/stockExtra/${producto.codigo}`);
      const { precio1, precio2, precio3, precioCosto } = formData;
      
      const precio1Pesos = Math.round(precio1 * cotizacion);
      const precio2Pesos = Math.round(precio2 * cotizacion);
      const precio3Pesos = Math.round(precio3 * cotizacion);
      const precioCostoPesos = Math.round(precioCosto * cotizacion);
      const ganancia = precio1 - precioCosto;
      
      // ✅ DATOS CORREGIDOS - Agregar negocioID y hoja
      const datosActualizados = {
        ...formData,
        // ✅ CAMPOS ESENCIALES QUE FALTABAN:
        negocioID: rol.negocioID, // 🎯 ESTE FALTABA
        hoja: hoja, // 🎯 ESTE FALTABA
        categoria: producto.categoria || "Baterias", // 🎯 ESTE TAMBIÉN
        // Precios
        precioUSD: precio1,
        precio1,
        precio2,
        precio3,
        precio1Pesos,
        precio2Pesos,
        precio3Pesos,
        precioCostoPesos,
        cotizacion,
        ganancia,
        // Metadatos
        fechaActualizacion: new Date(),
        codigo: producto.codigo,
        activo: true, // 🎯 AGREGAR ESTE CAMPO
        origenSincronizacion: 'Manual' // 🎯 IDENTIFICAR ORIGEN
      };

      console.log('📦 Datos que se van a guardar:', datosActualizados);

      // ✅ CAMBIO PRINCIPAL: setDoc con merge
      await setDoc(ref, datosActualizados, { merge: true });

      console.log(`✅ Modelo ${producto.codigo} actualizado en Firebase`);

      // Actualizar precios en Sheet
      try {
        await fetch("/api/actualizar-precios-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheetID, hoja }),
        });
        console.log("✅ Precios actualizados en Google Sheets");
      } catch (sheetError) {
        console.warn("⚠️ Error actualizando Sheet (modelo guardado en Firebase):", sheetError);
      }

      setMensaje("✅ Guardado exitosamente");
      setTimeout(() => {
        setMensaje("");
        setEditando(false);
        onRecargar();
      }, 1000);
      
    } catch (err: any) {
      console.error("❌ Error al guardar cambios:", err);
      setMensaje("❌ Error al guardar: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  // ✅ FUNCIÓN ELIMINAR CORREGIDA
  const eliminarProducto = async () => {
    setCargando(true);
    try {
      console.log("🗑️ Iniciando eliminación de:", producto.codigo);
      console.log(`🏪 NegocioID: ${rol.negocioID}, Hoja: ${hoja}`);

      // PASO 1: Eliminar de Firebase
      const ref = doc(db, `negocios/${rol.negocioID}/stockExtra/${producto.codigo}`);
      
      try {
        await deleteDoc(ref);
        console.log("✅ Eliminado de Firebase exitosamente");
      } catch (fbError: any) {
        console.warn("⚠️ Error eliminando de Firebase (puede que no exista):", fbError.message);
      }

      // PASO 2: Eliminar del Sheet
      try {
        console.log("🔄 Intentando eliminar del Sheet...");
        const res = await fetch("/api/eliminar-del-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sheetID, 
            hoja, 
            codigo: producto.codigo 
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.warn("⚠️ Error en API del Sheet:", data);
          
          if (
            data.error?.includes("no encontrado") ||
            data.error?.includes("No se encontró el código") ||
            res.status === 404
          ) {
            console.log("ℹ️ Modelo no estaba en el Sheet, pero se eliminó de Firebase");
          } else {
            setMensajeAdvertencia(`Modelo eliminado de Firebase, pero hubo un problema con el Sheet: ${data.error}`);
            setMostrarAdvertencia(true);
          }
        } else {
          console.log("✅ Eliminado del Sheet exitosamente");
        }

      } catch (sheetError: any) {
        console.warn("⚠️ Error de conexión con API del Sheet:", sheetError.message);
      }

      setMensaje("✅ Modelo eliminado");
      setTimeout(() => {
        setMensaje("");
        onRecargar();
      }, 1000);

    } catch (err: any) {
      console.error("❌ Error general en eliminación:", err);
      setMensaje("❌ Error al eliminar");
    } finally {
      setCargando(false);
      setConfirmarEliminar(false);
    }
  };
  
  return (
    <>
      {/* Botones de acciones */}
      <div className="flex flex-col gap-1 w-full">
        <button
          onClick={() => setEditando(true)}
          className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] hover:from-[#e67e22] hover:to-[#d35400] text-white px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 flex items-center justify-center gap-1"
        >
          <span>✏️</span>
          <span className="hidden sm:inline">Editar</span>
        </button>
        <button
          onClick={() => setConfirmarEliminar(true)}
          className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 flex items-center justify-center gap-1"
        >
          <span>🗑️</span>
          <span className="hidden sm:inline">Eliminar</span>
        </button>
      </div>
  
      {/* Modal de edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white rounded-t-2xl p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl lg:text-2xl">✏️</span>
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">Editar Modelo</h2>
                  <p className="text-orange-100 text-sm">Código: {producto.codigo} • Hoja: {hoja}</p>
                </div>
              </div>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-4 lg:p-6 space-y-6">
              
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="text-sm lg:text-base font-semibold text-[#2c3e50] flex items-center gap-2 border-b border-[#ecf0f1] pb-2">
                  <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">📦</span>
                  Información del Modelo
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                      Nombre del Modelo
                    </label>
                    <input
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-sm"
                      placeholder="Nombre del modelo"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                      Proveedor
                    </label>
                    <input
                      value={formData.proveedor}
                      onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                      className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                      placeholder="Proveedor"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                      Stock Disponible
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                      className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockMinimo}
                      onChange={(e) => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
                      className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                      Stock Ideal
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockIdeal}
                      onChange={(e) => setFormData({ ...formData, stockIdeal: Number(e.target.value) })}
                      className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Precios */}
              <div className="space-y-4">
                <h3 className="text-sm lg:text-base font-semibold text-[#2c3e50] flex items-center gap-2 border-b border-[#ecf0f1] pb-2">
                  <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
                  Precios y Costos
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#e74c3c] block mb-2">
                      💸 Precio de Costo
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#e74c3c] font-medium text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.precioCosto}
                        onChange={(e) => setFormData({ ...formData, precioCosto: Number(e.target.value) })}
                        className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#e74c3c] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-[#2c3e50] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#3498db] block mb-2">
                      💵 Precio 1 (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3498db] font-medium text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.precio1}
                        onChange={(e) => setFormData({ ...formData, precio1: Number(e.target.value) })}
                        className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#3498db] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#9b59b6] block mb-2">
                      💎 Precio 2 (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9b59b6] font-medium text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.precio2}
                        onChange={(e) => setFormData({ ...formData, precio2: Number(e.target.value) })}
                        className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#9b59b6] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-[#2c3e50] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#e67e22] block mb-2">
                      🏆 Precio 3 (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#e67e22] font-medium text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.precio3}
                        onChange={(e) => setFormData({ ...formData, precio3: Number(e.target.value) })}
                        className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#e67e22] rounded-lg bg-white focus:ring-2 focus:ring-[#e67e22] focus:border-[#e67e22] transition-all text-[#2c3e50] text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensaje de estado */}
              {mensaje && (
                <div className={`p-3 rounded-lg border-2 text-center font-medium text-sm ${
                  mensaje.includes("✅") 
                    ? "bg-green-50 border-[#27ae60] text-[#27ae60]"
                    : "bg-red-50 border-[#e74c3c] text-[#e74c3c]"
                }`}>
                  {mensaje}
                </div>
              )}
              
              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-[#ecf0f1]">
                <button
                  onClick={() => setEditando(false)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCambios}
                  disabled={cargando}
                  className={`px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg text-sm flex items-center justify-center gap-2 order-1 sm:order-2 ${
                    cargando ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {cargando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Guardar cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  
      {/* Modal de confirmación de eliminación */}
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-t-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-red-50 border-2 border-[#e74c3c] rounded-lg p-3 sm:p-4">
                <p className="text-[#e74c3c] font-medium text-sm sm:text-base">
                  ¿Estás seguro que querés eliminar este modelo?
                </p>
                <div className="mt-2 text-xs sm:text-sm text-[#7f8c8d]">
                  <strong>Código:</strong> {producto.codigo}<br/>
                  <strong>Modelo:</strong> {producto.modelo}
                </div>
              </div>
              
              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => setConfirmarEliminar(false)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarProducto}
                  disabled={cargando}
                  className={`px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg text-sm flex items-center justify-center gap-2 order-1 sm:order-2 ${
                    cargando ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {cargando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <span>🗑️</span>
                      <span>Sí, eliminar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  
      {/* Modal de advertencia */}
      {mostrarAdvertencia && (
        <ModalAdvertencia
          mensaje={mensajeAdvertencia}
          onClose={() => setMostrarAdvertencia(false)}
        />
      )}
    </>
  );
}