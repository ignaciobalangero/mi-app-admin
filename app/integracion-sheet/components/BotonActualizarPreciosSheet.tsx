// Botón para actualizar precios ARS en el Sheet desde Firebase
"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

export default function BotonActualizarPreciosSheet({
  sheetID,
  hoja,
}: {
  sheetID: string;
  hoja: string;
}) {
  const { rol } = useRol();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const actualizarPrecios = async () => {
    if (!rol?.negocioID || !sheetID || !hoja) return;
    setCargando(true);
    setMensaje(null);

    try {
      let cotizacion = 1000;

      // Obtener cotización desde configuración manual
      const configSnap = await getDoc(
        doc(db, `negocios/${rol.negocioID}/configuracion/moneda`)
      );
      if (configSnap.exists()) {
        const data = configSnap.data();
        cotizacion = Number(data.dolarManual) || 1000;
      }

      // Obtener productos desde Firebase
      const snap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockExtra`)
      );
      const productos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Formar filas solo con los datos disponibles
      const filas = productos.map((p: any) => {
        const precioUSD = Number(p.precioUSD) || 0;
        const precioARS = Number((precioUSD * cotizacion).toFixed(2));

        return {
          codigo: p.id,
          categoria: p.categoria || "",
          producto: p.producto || "",
          cantidad: p.cantidad || "",
          precioARS,
          precioUSD,
        };
      });

      console.log("🧾 Filas a enviar:", filas);

      // Enviar a la API
      const res = await fetch("/api/actualizar-precios-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, filas }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error desconocido");

      setMensaje("✅ Precios actualizados en el Sheet correctamente");
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      console.error("❌ Error actualizando precios en el Sheet:", err);
      setMensaje("❌ Hubo un problema al actualizar los precios en el Sheet");
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => setMensaje(null), 5000);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header explicativo */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-xl flex items-center justify-center shadow-md">
            <span className="text-lg lg:text-xl">🔄</span>
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-bold text-[#2c3e50]">Actualizar Precios</h3>
            <p className="text-xs lg:text-sm text-[#7f8c8d]">Sincronizar precios con Google Sheets</p>
          </div>
        </div>
      </div>

      {/* Información explicativa */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-[#9b59b6] rounded-lg p-3 lg:p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-[#9b59b6] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs">ℹ️</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#2c3e50]">
              Esta función actualiza los precios en ARS basados en:
            </p>
            <ul className="text-xs text-[#7f8c8d] space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#9b59b6] rounded-full"></span>
                Cotización configurada en el sistema
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#9b59b6] rounded-full"></span>
                Sincronización automática con Google Sheets
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botón principal */}
      <div className="flex justify-center">
        <button
          onClick={actualizarPrecios}
          disabled={cargando}
          className={`bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white py-3 px-6 lg:px-8 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-3 text-sm lg:text-base ${
            cargando ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {cargando ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Actualizando precios...</span>
            </>
          ) : (
            <>
              <span className="text-lg">🔄</span>
              <span>Actualizar precios en Sheet</span>
            </>
          )}
        </button>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`p-3 lg:p-4 rounded-lg border-2 text-center font-medium text-sm lg:text-base transform transition-all duration-300 ${
          mensaje.includes("✅") 
            ? "bg-green-50 border-[#27ae60] text-[#27ae60] animate-pulse"
            : "bg-red-50 border-[#e74c3c] text-[#e74c3c]"
        }`}>
          <div className="flex items-center justify-center gap-2">
            {mensaje.includes("✅") ? (
              <div className="w-5 h-5 bg-[#27ae60] rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            ) : (
              <div className="w-5 h-5 bg-[#e74c3c] rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
            )}
            <span>{mensaje}</span>
          </div>
        </div>
      )}

      {/* Información adicional cuando está cargando */}
      {cargando && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-[#3498db] rounded-lg p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#3498db] rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs">⚡</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2c3e50]">Procesando actualización...</p>
              <p className="text-xs text-[#7f8c8d]">
                Obteniendo datos de Firebase y sincronizando con Google Sheets
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}