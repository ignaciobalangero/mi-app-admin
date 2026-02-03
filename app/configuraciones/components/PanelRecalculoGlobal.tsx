"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PanelRecalculoGlobal() {
  const [habilitado, setHabilitado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setCargando(true);
    try {
      const configRef = doc(db, "configuracionGlobal/sistema");
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        setHabilitado(configSnap.data().habilitarRecalculoSaldos || false);
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    } finally {
      setCargando(false);
    }
  };

  const toggleHabilitar = async () => {
    const nuevoEstado = !habilitado;
    
    const confirmacion = window.confirm(
      nuevoEstado
        ? "¿Estás seguro que querés HABILITAR el botón de recálculo para TODOS los negocios?\n\nEsto permitirá que cualquier negocio pueda recalcular sus saldos."
        : "¿Estás seguro que querés DESHABILITAR el botón de recálculo?\n\nLos negocios NO podrán acceder a la herramienta de recálculo."
    );

    if (!confirmacion) return;

    setGuardando(true);
    try {
      const configRef = doc(db, "configuracionGlobal/sistema");
      await setDoc(configRef, {
        habilitarRecalculoSaldos: nuevoEstado,
        ultimaModificacion: new Date().toISOString(),
      }, { merge: true });

      setHabilitado(nuevoEstado);
      alert(`✅ Botón de recálculo ${nuevoEstado ? 'HABILITADO' : 'DESHABILITADO'} globalmente`);
    } catch (error) {
      console.error("Error guardando configuración:", error);
      alert("❌ Error al guardar la configuración");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-[#ecf0f1]">
        <div className="flex items-center justify-center gap-2 text-[#7f8c8d]">
          <div className="w-5 h-5 border-2 border-[#3498db] border-t-transparent rounded-full animate-spin"></div>
          Cargando configuración...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-[#ecf0f1]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#e74c3c] rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">🔄</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#2c3e50]">Herramienta de Recálculo de Saldos</h2>
          <p className="text-[#7f8c8d] text-xs">Control global para todos los negocios</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-500 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-orange-800 mb-1">Herramienta de Emergencia</h3>
            <p className="text-sm text-orange-700">
              Esta funcionalidad permite a los negocios recalcular todos sus saldos desde cero. 
              Solo habilitar cuando sea necesario para corregir inconsistencias.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#f8f9fa] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#2c3e50] mb-1">Estado Actual</h3>
            <p className="text-sm text-[#7f8c8d]">
              El botón está actualmente <strong>{habilitado ? "HABILITADO" : "DESHABILITADO"}</strong> para todos los negocios
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold ${
            habilitado ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}>
            {habilitado ? "✅ ACTIVO" : "❌ INACTIVO"}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={toggleHabilitar}
          disabled={guardando}
          className={`px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2 ${
            guardando
              ? "bg-[#bdc3c7] cursor-not-allowed"
              : habilitado
              ? "bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226]"
              : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60]"
          }`}
        >
          {guardando ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Guardando...
            </>
          ) : habilitado ? (
            <>
              <span>🔒</span>
              Deshabilitar Recálculo Global
            </>
          ) : (
            <>
              <span>🔓</span>
              Habilitar Recálculo Global
            </>
          )}
        </button>
      </div>

      {habilitado && (
        <div className="mt-4 bg-green-50 border border-green-500 rounded-lg p-3">
          <p className="text-sm text-green-800">
            ✅ <strong>Botón habilitado:</strong> Todos los negocios pueden ver y usar el botón "Recalcular Saldos" en su página de Cuenta Corriente.
          </p>
        </div>
      )}
    </div>
  );
}