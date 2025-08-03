"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave?: string;
  observaciones?: string;
  estado: string;
  estadoCuentaCorriente?: string;
  precio?: number;
  costo?: number;
  repuestosUsados?: any[];
  fechaModificacion?: string;
}

interface Props {
  mostrar: boolean;
  trabajo: Trabajo | null;
  negocioID: string;
  onClose: () => void;
  onPagoGuardado: () => void; // Callback para recargar trabajos
}

export default function ModalPago({
  mostrar,
  trabajo,
  negocioID,
  onClose,
  onPagoGuardado,
}: Props) {
  const [pago, setPago] = useState({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: "",
  });

  const [guardando, setGuardando] = useState(false);
  const [guardadoConExito, setGuardadoConExito] = useState(false);

  // Pre-llenar el monto cuando se abre el modal
  useEffect(() => {
    if (trabajo && mostrar) {
      setPago(prev => ({
        ...prev,
        monto: trabajo.precio?.toString() || ""
      }));
    }
  }, [trabajo, mostrar]);

  if (!mostrar || !trabajo) return null;

  const handlePagoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPago(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGuardarPago = async () => {
    if (!pago.monto || !pago.formaPago || guardando) return;

    setGuardando(true);
    
    try {
      const montoNumerico = parseFloat(pago.monto);
      
      // 1. Crear el pago en la colección pagos
      const pagoData = {
        // Separar monto según moneda (igual que otros modales)
        monto: pago.moneda === "USD" ? null : montoNumerico,
        montoUSD: pago.moneda === "USD" ? montoNumerico : null,
        moneda: pago.moneda,
        formaPago: pago.formaPago,
        destino: pago.destino,
        observaciones: pago.observaciones,
        fecha: new Date().toLocaleDateString('es-AR'),
        fechaCompleta: new Date(),
        cliente: trabajo.cliente,
        trabajoId: trabajo.firebaseId,
        tipo: 'ingreso',
        negocioID: negocioID,
        // Información adicional del trabajo
        trabajoDetalle: trabajo.trabajo,
        modeloDetalle: trabajo.modelo
      };

      // Guardar en Firebase
      await addDoc(collection(db, `negocios/${negocioID}/pagos`), pagoData);

      // 2. Actualizar el trabajo específico a PAGADO
      const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`);
      await updateDoc(trabajoRef, {
        estado: "PAGADO",
        estadoCuentaCorriente: "PAGADO",
        fechaModificacion: new Date().toLocaleDateString('es-AR')
      });

      // 3. Mostrar éxito
      setGuardadoConExito(true);
      
      console.log(`✅ Pago registrado para ${trabajo.cliente} - ${trabajo.trabajo} - $${montoNumerico}`);
      
      // 4. Cerrar modal después de 1.5 segundos y recargar datos
      setTimeout(() => {
        onPagoGuardado(); // Recargar trabajos
        onClose(); // Cerrar modal
        
        // Reset estados
        setGuardadoConExito(false);
        setPago({
          monto: "",
          moneda: "ARS",
          formaPago: "",
          destino: "",
          observaciones: "",
        });
      }, 1500);

    } catch (error) {
      console.error("Error al guardar pago:", error);
      alert("Error al guardar el pago. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-2xl lg:max-w-3xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden transform transition-all duration-300 flex flex-col sm:max-h-[95vh]">
        
        {/* Header del Modal - Con información del trabajo */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Registrar Pago</h3>
              <p className="text-green-100 text-xs sm:text-sm">
                {trabajo.cliente} • {trabajo.modelo} • ${trabajo.precio?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-110 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Contenido del Modal - Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
          
          {/* Información del Trabajo */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🔧</span>
              </div>
              <span className="text-sm sm:text-base">Detalle del Trabajo</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><strong>Cliente:</strong> {trabajo.cliente}</div>
              <div><strong>Fecha:</strong> {trabajo.fecha}</div>
              <div><strong>Modelo:</strong> {trabajo.modelo}</div>
              <div><strong>Trabajo:</strong> {trabajo.trabajo}</div>
              {trabajo.clave && (
                <div><strong>Clave:</strong> {trabajo.clave}</div>
              )}
              <div className="sm:col-span-2">
                <strong>Precio Total:</strong> 
                <span className="text-[#27ae60] font-bold text-lg ml-2">
                  ${trabajo.precio?.toLocaleString() || 0}
                </span>
              </div>
              {trabajo.observaciones && (
                <div className="sm:col-span-2">
                  <strong>Observaciones:</strong> {trabajo.observaciones}
                </div>
              )}
            </div>
          </div>

          {/* Sección de Monto y Moneda */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">💰</span>
              </div>
              <span className="text-sm sm:text-base">Monto del Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Monto recibido:
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder={pago.moneda === "USD" ? "0.00" : "0"}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                />
                {pago.monto && parseFloat(pago.monto) > 0 && (
                  <div className="text-xs text-[#7f8c8d] mt-1">
                    {pago.moneda === "USD" 
                      ? `💵 USD $${parseFloat(pago.monto).toFixed(2)}`
                      : `💰 ARS $${parseFloat(pago.monto).toLocaleString()}`
                    }
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Moneda:
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>

            {/* Botón de monto sugerido */}
            <div className="mt-4">
              <button
                onClick={() => setPago(prev => ({
                  ...prev,
                  monto: trabajo.precio?.toString() || ""
                }))}
                className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                💡 Usar precio total: ${trabajo.precio?.toLocaleString() || 0}
              </button>
            </div>
          </div>

          {/* Sección de Método de Pago */}
          <div className="bg-white rounded-xl border-2 border-[#9b59b6] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🏦</span>
              </div>
              <span className="text-sm sm:text-base">Método de Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Forma de pago: *
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="🔍 Ej: Efectivo, Transferencia..."
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Destino (opcional):
                </label>
                <input
                  type="text"
                  name="destino"
                  value={pago.destino}
                  onChange={handlePagoChange}
                  placeholder="🏪 Cuenta bancaria, caja..."
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
            </div>

            {/* Opciones rápidas de forma de pago */}
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-[#7f8c8d] w-full mb-1">Opciones rápidas:</span>
                {["Efectivo", "Transferencia", "Tarjeta", "MercadoPago"].map((forma) => (
                  <button
                    key={forma}
                    onClick={() => setPago(prev => ({ ...prev, formaPago: forma }))}
                    className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  >
                    {forma}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sección de Observaciones */}
          <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">📝</span>
              </div>
              <span className="text-sm sm:text-base">Observaciones</span>
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                Notas adicionales (opcional):
              </label>
              <textarea
                name="observaciones"
                value={pago.observaciones}
                onChange={handlePagoChange}
                placeholder="💭 Cualquier información adicional sobre el pago..."
                rows={3}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
              />
            </div>
          </div>

          {/* Mensaje de Éxito */}
          {guardadoConExito && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#27ae60] text-xs sm:text-sm font-bold">✓</span>
                </div>
                <span className="text-white font-semibold text-sm sm:text-lg">
                  ¡Pago registrado con éxito! Trabajo marcado como PAGADO
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botones */}
        <div className="bg-[#ecf0f1] border-t-2 border-[#bdc3c7] p-3 sm:p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
            <button
              onClick={onClose}
              disabled={guardando}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm sm:text-base disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardarPago}
              disabled={!pago.monto || !pago.formaPago || guardando || guardadoConExito}
              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                !pago.monto || !pago.formaPago || guardando || guardadoConExito
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#27ae60] hover:bg-[#229954] hover:scale-105"
              }`}
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar Pago</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}