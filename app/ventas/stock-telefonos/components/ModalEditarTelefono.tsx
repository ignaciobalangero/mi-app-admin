"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Telefono {
  id: string;
  fechaIngreso: any;
  proveedor: string;
  modelo: string;
  marca: string;
  estado: "nuevo" | "usado";
  bateria: string;
  gb: string;
  color: string;
  imei: string;
  serial: string;
  precioCompra: number;
  precioVenta: number;
  precioMayorista: number;
  moneda: "USD" | "ARS";
  observaciones: string;
}

interface Props {
  telefono: Telefono | null;
  negocioID: string;
  onClose: () => void;
  onTelefonoActualizado?: (telefono: Telefono) => void;
}

export default function ModalEditarTelefono({ 
  telefono, 
  negocioID, 
  onClose, 
  onTelefonoActualizado 
}: Props) {
  const [formulario, setFormulario] = useState<any>({});
  const [guardando, setGuardando] = useState(false);

  // Cargar datos del teléfono cuando se abre el modal
  useEffect(() => {
    if (!telefono) return;

    // Formatear fecha para el input
    let fechaFormateada = "";
    if (telefono.fechaIngreso?.seconds && typeof telefono.fechaIngreso.toDate === "function") {
      const d = telefono.fechaIngreso.toDate();
      if (!isNaN(d.getTime())) {
        fechaFormateada = d.toISOString().split("T")[0];
      }
    } else if (typeof telefono.fechaIngreso === "string") {
      const partes = telefono.fechaIngreso.split("/");
      if (partes.length === 3) {
        const [dd, mm, yyyy] = partes;
        fechaFormateada = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
    }

    setFormulario({
      ...telefono,
      fechaIngreso: fechaFormateada,
      precioCompra: telefono.precioCompra || 0,
      precioVenta: telefono.precioVenta || 0,
      precioMayorista: telefono.precioMayorista || 0,
      bateria: telefono.bateria || "",
      gb: telefono.gb || "",
      observaciones: telefono.observaciones || "",
    });
  }, [telefono]);

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormulario((prev: any) => ({
      ...prev,
      [name]: name === 'precioCompra' || name === 'precioVenta' || name === 'precioMayorista'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const guardarCambios = async () => {
    if (!telefono?.id) return;
    
    setGuardando(true);
    try {
      // Formatear fecha para Firestore
      let fechaFormateada: Date;
      if (typeof formulario.fechaIngreso === "string") {
        if (formulario.fechaIngreso.includes("/")) {
          const [dd, mm, yyyy] = formulario.fechaIngreso.split("/");
          fechaFormateada = new Date(`${yyyy}-${mm}-${dd}`);
        } else {
          fechaFormateada = new Date(formulario.fechaIngreso);
        }
      } else {
        fechaFormateada = new Date();
      }

      const telefonoActualizado = {
        ...formulario,
        fechaIngreso: Timestamp.fromDate(fechaFormateada),
        estado: formulario.estado.toLowerCase(),
        ultimaActualizacion: new Date()
      };

      // Actualizar en Firestore
      await updateDoc(doc(db, `negocios/${negocioID}/stockTelefonos/${telefono.id}`), telefonoActualizado);
      
      // Notificar al componente padre
      if (onTelefonoActualizado) {
        onTelefonoActualizado({ ...telefonoActualizado, id: telefono.id });
      }
      
      console.log("✅ Teléfono actualizado correctamente");
      onClose();
      
    } catch (error) {
      console.error("❌ Error al actualizar teléfono:", error);
      alert("Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  };

  if (!telefono) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border-2 border-[#ecf0f1] transform transition-all duration-300 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
        
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white rounded-t-2xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Editar Teléfono</h2>
                <p className="text-purple-100 text-sm mt-1 truncate max-w-[300px]">
                  {formulario.marca} {formulario.modelo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-purple-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6 bg-[#f8f9fa]">
          
          {/* Info del teléfono */}
          <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="font-bold">Información del Dispositivo</h3>
                <p className="text-sm opacity-90">Actualice los datos del teléfono en stock</p>
              </div>
            </div>
          </div>

          {/* Formulario de edición */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Fecha de Ingreso */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                📅 Fecha de Ingreso
              </label>
              <input
                type="date"
                name="fechaIngreso"
                value={formulario.fechaIngreso || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Proveedor */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🏪 Proveedor
              </label>
              <input
                type="text"
                name="proveedor"
                value={formulario.proveedor || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                📱 Modelo
              </label>
              <input
                type="text"
                name="modelo"
                value={formulario.modelo || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🏷️ Marca
              </label>
              <input
                type="text"
                name="marca"
                value={formulario.marca || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                ⚡ Estado
              </label>
              <select
                name="estado"
                value={formulario.estado || "nuevo"}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm appearance-none cursor-pointer"
              >
                <option value="nuevo">🆕 Nuevo</option>
                <option value="usado">♻️ Usado</option>
              </select>
            </div>

            {/* Batería (solo si es usado) */}
            {formulario.estado === "usado" && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#f39c12]">
                  🔋 Batería (%)
                </label>
                <input
                  type="number"
                  name="bateria"
                  value={formulario.bateria || ""}
                  onChange={manejarCambio}
                  min="0"
                  max="100"
                  className="w-full p-3 border-2 border-[#f39c12] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#fef9e7] shadow-sm"
                />
              </div>
            )}

            {/* Almacenamiento */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                💾 Almacenamiento (GB)
              </label>
              <input
                type="number"
                name="gb"
                value={formulario.gb || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🎨 Color
              </label>
              <input
                type="text"
                name="color"
                value={formulario.color || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm"
              />
            </div>

            {/* IMEI */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🔢 IMEI
              </label>
              <input
                type="text"
                name="imei"
                value={formulario.imei || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm font-mono"
              />
            </div>

            {/* Serial */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                🏷️ Serial
              </label>
              <input
                type="text"
                name="serial"
                value={formulario.serial || ""}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm font-mono"
              />
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                💱 Moneda
              </label>
              <select
                name="moneda"
                value={formulario.moneda || "USD"}
                onChange={manejarCambio}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm appearance-none cursor-pointer"
              >
                <option value="USD">🇺🇸 USD - Dólar</option>
                <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
              </select>
            </div>

            {/* SECCIÓN DE PRECIOS */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="bg-gradient-to-r from-[#27ae60] to-[#229954] text-white rounded-xl p-4 mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span>💰</span> Precios del Teléfono
                </h3>
                <p className="text-sm opacity-90">Configure los precios en {formulario.moneda}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Precio Costo */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#e74c3c]">
                    💸 Precio Costo ({formulario.moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#e74c3c] font-bold">$</span>
                    <input
                      type="number"
                      name="precioCompra"
                      value={formulario.precioCompra || 0}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 border-2 border-[#e74c3c] rounded-xl focus:ring-4 focus:ring-[#e74c3c]/20 focus:border-[#e74c3c] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#fdf2f2] shadow-sm"
                    />
                  </div>
                </div>

                {/* Precio Venta */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#27ae60]">
                    💰 Precio Venta ({formulario.moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#27ae60] font-bold">$</span>
                    <input
                      type="number"
                      name="precioVenta"
                      value={formulario.precioVenta || 0}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 border-2 border-[#27ae60] rounded-xl focus:ring-4 focus:ring-[#27ae60]/20 focus:border-[#27ae60] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#f0f9f4] shadow-sm"
                    />
                  </div>
                </div>

                {/* Precio Mayorista */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#3498db]">
                    🏪 Precio Mayorista ({formulario.moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3498db] font-bold">$</span>
                    <input
                      type="number"
                      name="precioMayorista"
                      value={formulario.precioMayorista || 0}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 border-2 border-[#3498db] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#f0f8ff] shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                📝 Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formulario.observaciones || ""}
                onChange={manejarCambio}
                placeholder="Observaciones adicionales sobre el teléfono..."
                rows={3}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 resize-none text-[#2c3e50] bg-white shadow-sm"
              />
            </div>
          </div>
          
          {/* Preview de precios */}
          {(formulario.precioCompra > 0 || formulario.precioVenta > 0 || formulario.precioMayorista > 0) && (
            <div className="bg-white border-2 border-[#3498db] rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-[#2c3e50] flex items-center gap-2">
                <span>📊</span> Resumen de Precios ({formulario.moneda})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-[#fdf2f2] p-3 rounded-lg border border-[#e74c3c]">
                  <span className="text-[#e74c3c] font-medium">Costo:</span>
                  <div className="font-bold text-[#e74c3c] text-lg">
                    ${Number(formulario.precioCompra || 0).toLocaleString("es-AR")}
                  </div>
                </div>
                <div className="bg-[#f0f9f4] p-3 rounded-lg border border-[#27ae60]">
                  <span className="text-[#27ae60] font-medium">Venta:</span>
                  <div className="font-bold text-[#27ae60] text-lg">
                    ${Number(formulario.precioVenta || 0).toLocaleString("es-AR")}
                  </div>
                  {formulario.precioCompra > 0 && formulario.precioVenta > 0 && (
                    <div className="text-xs text-[#27ae60] mt-1">
                      Ganancia: ${(formulario.precioVenta - formulario.precioCompra).toLocaleString("es-AR")}
                    </div>
                  )}
                </div>
                <div className="bg-[#f0f8ff] p-3 rounded-lg border border-[#3498db]">
                  <span className="text-[#3498db] font-medium">Mayorista:</span>
                  <div className="font-bold text-[#3498db] text-lg">
                    ${Number(formulario.precioMayorista || 0).toLocaleString("es-AR")}
                  </div>
                  {formulario.precioCompra > 0 && formulario.precioMayorista > 0 && (
                    <div className="text-xs text-[#3498db] mt-1">
                      Ganancia: ${(formulario.precioMayorista - formulario.precioCompra).toLocaleString("es-AR")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[#ecf0f1]">
            <button
              onClick={onClose}
              disabled={guardando}
              className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={guardarCambios}
              disabled={guardando || !formulario.modelo || !formulario.marca}
              className="px-6 py-3 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  💾 Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}