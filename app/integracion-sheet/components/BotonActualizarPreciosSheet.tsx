// Botón para actualizar precios ARS en el Sheet desde Firebase - VERSIÓN MEJORADA
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
  const [paso, setPaso] = useState<string>("");

  // 🧹 Función para limpiar modelos fantasma del localStorage
  const limpiarModelosFantasma = async () => {
    if (!rol?.negocioID) return 0;

    try {
      console.log("🧹 Iniciando limpieza de modelos fantasma...");
      setPaso("Limpiando modelos fantasma...");

      // Limpiar cualquier clave temporal del localStorage
      const claves = Object.keys(localStorage);
      let limpiados = 0;

      claves.forEach(clave => {
        if (
          clave.includes('TEMP_') || 
          clave.includes(`importado_${rol.negocioID}`) ||
          clave.includes('modelo_temp_')
        ) {
          localStorage.removeItem(clave);
          limpiados++;
        }
      });

      console.log(`🧹 ${limpiados} elementos temporales limpiados del localStorage`);
      return limpiados;

    } catch (error) {
      console.error("❌ Error limpiando localStorage:", error);
      return 0;
    }
  };

  const actualizarPrecios = async () => {
    if (!rol?.negocioID || !sheetID || !hoja) return;
    setCargando(true);
    setMensaje(null);
    setPaso("");

    try {
      // 🧹 PASO 1: Limpiar modelos fantasma
      const fantasmasLimpiados = await limpiarModelosFantasma();
      if (fantasmasLimpiados > 0) {
        console.log(`✅ ${fantasmasLimpiados} elementos temporales limpiados`);
      }

      // 💰 PASO 2: Obtener cotización
      setPaso("Obteniendo cotización...");
      let cotizacion = 1000;

      const configSnap = await getDoc(
        doc(db, `negocios/${rol.negocioID}/configuracion/moneda`)
      );
      if (configSnap.exists()) {
        const data = configSnap.data();
        cotizacion = Number(data.dolarManual) || 1000;
      }

      console.log("💰 Cotización obtenida:", cotizacion);

      // 📦 PASO 3: Obtener modelos desde Firebase
      setPaso("Obteniendo modelos de Firebase...");
      const snap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockExtra`)
      );
      const productos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      console.log(`📦 ${productos.length} modelos obtenidos de Firebase`);

      // 🚫 PASO 4: Filtrar modelos válidos (sin temporales)
      const productosValidos = productos.filter((p: any) => 
        p.id && 
        !p.id.startsWith('TEMP_') && 
        !p.id.includes('temp') &&
        p.id.length > 3 // Evitar códigos muy cortos sospechosos
      );

      console.log(`✅ ${productosValidos.length} modelos válidos después del filtrado`);

      if (productosValidos.length === 0) {
        throw new Error("No hay modelos válidos para actualizar");
      }

      // 📊 PASO 5: Formar filas para el Sheet
      setPaso("Preparando datos para el Sheet...");
      const filas = productosValidos.map((p: any) => {
        const precioUSD = Number(p.precioUSD) || Number(p.precio1) || 0;
        const precioARS = Number((precioUSD * cotizacion).toFixed(2));

        // 🎯 CORRECCIÓN PRINCIPAL: Manejar cantidad 0 correctamente
        let cantidad;
        if (p.cantidad !== undefined && p.cantidad !== null) {
          cantidad = p.cantidad; // ✅ Esto permite 0
        } else {
          cantidad = ""; // Solo usar vacío si realmente no hay cantidad
        }

        console.log(`🔍 Procesando ${p.id}: cantidad=${p.cantidad}, cantidad final=${cantidad}`);

        return {
          codigo: p.id,
          categoria: p.categoria || "",
          modelo: p.modelo || "",
          cantidad: cantidad, // 🎯 USAR LA VARIABLE CORREGIDA
          precioARS,
          precioUSD,
        };
      });
      console.log("🧾 Filas preparadas para enviar:", filas.length);

      // 🔄 PASO 6: Enviar a la API
      setPaso("Actualizando precios en Google Sheets...");
      const res = await fetch("/api/actualizar-precios-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, filas }),
      });

      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || json.detalles || "Error desconocido");
      }

      // ✅ ÉXITO
      const mensajeExito = fantasmasLimpiados > 0 
        ? `✅ Precios actualizados correctamente (${fantasmasLimpiados} elementos temporales limpiados)`
        : "✅ Precios actualizados en el Sheet correctamente";

      setMensaje(mensajeExito);
      console.log("🎉 Actualización completada exitosamente");
      
      // Limpiar mensaje después de 4 segundos
      setTimeout(() => setMensaje(null), 4000);

    } catch (err: any) {
      console.error("❌ Error actualizando precios:", err);
      
      const mensajeError = err.message?.includes("modelos válidos") 
        ? "❌ No hay modelos válidos para actualizar (solo modelos temporales encontrados)"
        : `❌ Error al actualizar precios: ${err.message}`;
      
      setMensaje(mensajeError);
      
      // Limpiar mensaje de error después de 6 segundos
      setTimeout(() => setMensaje(null), 6000);
    } finally {
      setCargando(false);
      setPaso("");
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
              Esta función actualiza los precios en ARS y limpia automáticamente:
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
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#e74c3c] rounded-full"></span>
                🆕 Elimina modelos temporales automáticamente
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
              <span>Actualizar precios + Limpiar</span>
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

      {/* Información del paso actual cuando está cargando */}
      {cargando && paso && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-[#3498db] rounded-lg p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#3498db] rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs">⚡</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2c3e50]">{paso}</p>
              <p className="text-xs text-[#7f8c8d]">
                Procesando actualización completa con limpieza automática
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Información adicional cuando está cargando sin paso específico */}
      {cargando && !paso && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-[#3498db] rounded-lg p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#3498db] rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs">⚡</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2c3e50]">Iniciando proceso...</p>
              <p className="text-xs text-[#7f8c8d]">
                Preparando actualización y limpieza de datos
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}