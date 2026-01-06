"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  negocioID: string;
  totales: {
    efectivoARS: number;
    efectivoUSD: number;
    transferenciasARS: number;
    transferenciasUSD: number;
    tarjetasARS: number;
    cuentaCorrienteARS: number;
    cuentaCorrienteUSD: number;
    gastosARS: number;
    gastosUSD: number;
  };
  onClose: () => void;
  onCerrado: () => void;
}

export default function ModalCerrarCaja({ negocioID, totales, onClose, onCerrado }: Props) {
  const [efectivoRealARS, setEfectivoRealARS] = useState("");
  const [efectivoRealUSD, setEfectivoRealUSD] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [cerrando, setCerrando] = useState(false);

  const diferenciaARS = efectivoRealARS ? Number(efectivoRealARS) - totales.efectivoARS : 0;
  const diferenciaUSD = efectivoRealUSD ? Number(efectivoRealUSD) - totales.efectivoUSD : 0;

  const cerrarCaja = async () => {
    if (!efectivoRealARS && totales.efectivoARS > 0) {
      alert("⚠️ Ingresá el efectivo real contado en ARS");
      return;
    }

    setCerrando(true);

    try {
      const hoy = new Date();
      const fechaFormato = hoy.toLocaleDateString("es-AR");
      const docId = fechaFormato.split("/").reverse().join("-"); // 2026-01-06

      await setDoc(doc(db, `negocios/${negocioID}/cierresCaja/${docId}`), {
        fecha: fechaFormato,
        efectivoEsperadoARS: totales.efectivoARS,
        efectivoEsperadoUSD: totales.efectivoUSD,
        efectivoRealARS: Number(efectivoRealARS) || 0,
        efectivoRealUSD: Number(efectivoRealUSD) || 0,
        diferenciaARS,
        diferenciaUSD,
        transferenciasARS: totales.transferenciasARS,
        transferenciasUSD: totales.transferenciasUSD,
        tarjetasARS: totales.tarjetasARS,
        cuentaCorrienteARS: totales.cuentaCorrienteARS,
        cuentaCorrienteUSD: totales.cuentaCorrienteUSD,
        gastosARS: totales.gastosARS,
        gastosUSD: totales.gastosUSD,
        observaciones: observaciones.trim(),
        cerradoPor: "Usuario", // Agregar nombre real
        fechaCierre: new Date(),
      });

      // Toast de éxito
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 18px;
        font-weight: 600;
      `;
      toast.innerHTML = `
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
          ✓
        </div>
        <span>Caja cerrada correctamente</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);

      onCerrado();
    } catch (error) {
      console.error("Error cerrando caja:", error);
      alert("❌ Error al cerrar la caja");
    } finally {
      setCerrando(false);
    }
  };

  const formatearPrecio = (valor: number) => {
    return `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Cerrar Caja</h3>
                <p className="text-sm text-green-100">Cierre del día {new Date().toLocaleDateString("es-AR")}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Resumen de ingresos */}
          <div className="bg-[#f8f9fa] rounded-xl p-4">
            <h4 className="font-bold text-[#2c3e50] mb-3">📊 Resumen del Día</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#7f8c8d]">Transferencias ARS:</span>
                <span className="font-bold text-[#2c3e50]">{formatearPrecio(totales.transferenciasARS)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7f8c8d]">Tarjetas:</span>
                <span className="font-bold text-[#2c3e50]">{formatearPrecio(totales.tarjetasARS)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7f8c8d]">Cuenta Corriente ARS:</span>
                <span className="font-bold text-[#2c3e50]">{formatearPrecio(totales.cuentaCorrienteARS)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7f8c8d]">Gastos ARS:</span>
                <span className="font-bold text-red-600">{formatearPrecio(totales.gastosARS)}</span>
              </div>
            </div>
          </div>

          {/* Verificación de efectivo */}
          <div className="space-y-4">
            <h4 className="font-bold text-[#2c3e50]">💵 Verificación de Efectivo</h4>
            
            {/* ARS */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-[#7f8c8d]">Efectivo esperado (ARS):</span>
                <span className="text-xl font-bold text-green-700">{formatearPrecio(totales.efectivoARS)}</span>
              </div>
              
              <input
                type="number"
                value={efectivoRealARS}
                onChange={(e) => setEfectivoRealARS(e.target.value)}
                placeholder="Ingresá el efectivo real contado"
                className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-[#2c3e50]"
                />

              {efectivoRealARS && (
                <div className={`mt-3 p-3 rounded-lg ${
                  diferenciaARS === 0 ? "bg-blue-50 border-2 border-blue-200" :
                  diferenciaARS > 0 ? "bg-green-100 border-2 border-green-300" :
                  "bg-red-100 border-2 border-red-300"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Diferencia:</span>
                    <span className={`text-lg font-bold ${
                      diferenciaARS === 0 ? "text-blue-700" :
                      diferenciaARS > 0 ? "text-green-700" :
                      "text-red-700"
                    }`}>
                      {diferenciaARS > 0 ? "+" : ""}{formatearPrecio(diferenciaARS)}
                      {diferenciaARS === 0 ? " ✓ Exacto" : diferenciaARS > 0 ? " (Sobrante)" : " (Faltante)"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* USD (opcional) */}
            {totales.efectivoUSD > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[#7f8c8d]">Efectivo esperado (USD):</span>
                  <span className="text-xl font-bold text-blue-700">${totales.efectivoUSD}</span>
                </div>
                
                <input
                  type="number"
                  value={efectivoRealUSD}
                  onChange={(e) => setEfectivoRealUSD(e.target.value)}
                  placeholder="Ingresá el efectivo real en USD"
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-[#2c3e50]"
                  />

                {efectivoRealUSD && diferenciaUSD !== 0 && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    diferenciaUSD > 0 ? "bg-green-100 border-2 border-green-300" : "bg-red-100 border-2 border-red-300"
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">Diferencia:</span>
                      <span className={`text-lg font-bold ${diferenciaUSD > 0 ? "text-green-700" : "text-red-700"}`}>
                        {diferenciaUSD > 0 ? "+" : ""}${diferenciaUSD}
                        {diferenciaUSD > 0 ? " (Sobrante)" : " (Faltante)"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-[#2c3e50] mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Faltante por cambio dado a cliente..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all resize-none text-[#2c3e50]"
              />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-[#f8f9fa] rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={cerrarCaja}
            disabled={cerrando}
            className={`flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all ${
              cerrando
                ? "bg-[#bdc3c7] cursor-not-allowed"
                : "bg-[#27ae60] hover:bg-[#229954]"
            }`}
          >
            {cerrando ? "Cerrando..." : "🔒 Cerrar Caja"}
          </button>
        </div>

      </div>
    </div>
  );
}