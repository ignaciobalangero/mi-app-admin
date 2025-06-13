// /app/integracion-sheet/components/BotonImportarStock.tsx - VERSIÓN MEJORADA
"use client";

import { useState, useEffect } from "react";
import { collection, setDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";

interface ImportResult {
  success: boolean;
  mensaje: string;
  total?: number;
  detalles?: any;
}

export default function BotonImportarStock({ 
  sheetID, 
  hoja 
}: { 
  sheetID: string; 
  hoja: string; 
}) {
  const { rol } = useRol();
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [importado, setImportado] = useState(false);
  const [progreso, setProgreso] = useState<string>("");

  useEffect(() => {
    if (!rol?.negocioID) return;
    const key = `importado_${rol.negocioID}_${hoja}`;
    const yaImportado = localStorage.getItem(key);
    if (yaImportado === "true") setImportado(true);
  }, [rol?.negocioID, hoja]);

  const importarDesdeSheet = async () => {
    if (!rol?.negocioID || !sheetID || !hoja) {
      setResultado({
        success: false,
        mensaje: "❌ Faltan datos necesarios para la importación"
      });
      return;
    }

    setResultado(null);
    setCargando(true);
    setProgreso("🔄 Inicializando importación...");

    try {
      // 🏪 PASO 1: Obtener configuración del negocio
      setProgreso("💰 Obteniendo configuración de precios...");
      
      const configSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/configuracion`));
      let cotizacionManual = 1000;

      configSnap.forEach((docu) => {
        const data = docu.data();
        if (data.dolarManual) cotizacionManual = Number(data.dolarManual);
      });

      console.log("💰 Configuración obtenida:", { cotizacionManual, negocioID: rol.negocioID });

      // 📡 PASO 2: Llamar a la API robusta
      setProgreso("📊 Leyendo datos de Google Sheets...");
      
      console.log("📡 Enviando solicitud a API:", {
        sheetID: sheetID.substring(0, 20) + "...",
        hoja,
        negocioID: rol.negocioID
      });

      const res = await fetch("/api/leer-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sheetID, 
          hoja, 
          negocioID: rol.negocioID 
        }),
      });

      console.log("📡 Respuesta de API recibida:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });

      // 🔍 PASO 3: Procesar respuesta de la API
      const responseText = await res.text();
      console.log("📄 Respuesta completa (primeros 500 caracteres):", responseText.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("📋 Respuesta parseada:", {
          hasError: !!responseData.error,
          hasDatos: !!responseData.datos,
          totalDatos: responseData.datos?.length,
          meta: responseData.meta
        });
      } catch (parseError) {
        console.error("❌ Error parseando JSON:", parseError);
        throw new Error(`API devolvió respuesta inválida: ${responseText.substring(0, 200)}...`);
      }

      if (!res.ok) {
        console.error("❌ API devolvió error:", responseData);
        throw new Error(responseData.error || `Error ${res.status}: ${res.statusText}`);
      }

      const { datos, meta } = responseData;
      
      // ✅ PASO 4: Validar datos recibidos
      setProgreso("✅ Validando datos recibidos...");
      
      if (!Array.isArray(datos)) {
        throw new Error(`API devolvió datos inválidos. Tipo: ${typeof datos}, Contenido: ${JSON.stringify(datos)}`);
      }

      if (datos.length === 0) {
        setResultado({
          success: false,
          mensaje: "⚠️ No se encontraron modelos en la hoja de Google Sheets",
          detalles: { meta, mensaje: "Verifica que la hoja tenga datos en las columnas correctas" }
        });
        return;
      }

      console.log(`✅ Datos validados: ${datos.length} modelos para importar`);

      // 💾 PASO 5: Guardar en Firebase con progreso
      setProgreso(`💾 Guardando ${datos.length} modelos en Firebase...`);

      let productosGuardados = 0;
      const erroresGuardado: any[] = [];

      const promises = datos.map(async (prod: any, index: number) => {
        try {
          // Calcular precios con cotización actual
          const precioUSD = Number(prod.precioUSD) || 10; // Default si no viene
          const precioARS = Math.round(precioUSD * cotizacionManual);

          const productData = {
            codigo: prod.codigo,
            categoria: prod.categoria || "Sin categoría",
            modelo: prod.modelo || "Sin nombre",
            cantidad: Number(prod.cantidad) || 0,
            precio: precioARS,
            precioUSD,
            cotizacion: cotizacionManual,
            mostrar: "si",
            negocioID: rol.negocioID,
            fechaImportacion: new Date().toISOString(),
            fuenteImportacion: "google_sheets",
            sheetOriginal: sheetID,
            hojaOriginal: hoja
          };

          console.log(`💾 Guardando modelo ${index + 1}/${datos.length}:`, {
            codigo: productData.codigo,
            modelo: productData.modelo,
            precio: productData.precio
          });

          const ref = doc(db, `negocios/${rol.negocioID}/stockExtra/${prod.codigo}`);
          await setDoc(ref, productData);
          
          productosGuardados++;
          
          // Actualizar progreso cada 10 modelos
          if (index % 10 === 0) {
            setProgreso(`💾 Guardando modelos... ${index + 1}/${datos.length}`);
          }

          return productData;
          
        } catch (prodError: any) {
          console.error(`❌ Error guardando modelo ${index + 1}:`, prodError, prod);
          erroresGuardado.push({ 
            index: index + 1, 
            producto: prod, 
            error: prodError.message 
          });
          throw prodError;
        }
      });

      const resultados = await Promise.allSettled(promises);
      const exitosos = resultados.filter(r => r.status === 'fulfilled').length;
      const fallidos = resultados.filter(r => r.status === 'rejected').length;

      console.log(`✅ Guardado completado:`, { 
        exitosos, 
        fallidos, 
        total: datos.length,
        errores: erroresGuardado
      });

      // 🎉 PASO 6: Resultado final
      if (exitosos > 0) {
        setResultado({
          success: true,
          mensaje: `✅ ${exitosos} modelos importados correctamente${fallidos > 0 ? ` (${fallidos} errores)` : ''}`,
          total: exitosos,
          detalles: {
            exitosos,
            fallidos,
            cotizacionUsada: cotizacionManual,
            meta,
            errores: erroresGuardado.slice(0, 5) // Solo primeros 5 errores
          }
        });

        // Marcar como importado solo si hubo éxito TOTAL
        if (fallidos === 0) {
          const key = `importado_${rol.negocioID}_${hoja}`;
          localStorage.setItem(key, "true");
          console.log(`✅ Marcando como importado en localStorage: ${key}`);
          setImportado(true);
        } else {
          console.log(`⚠️ No marcando como importado debido a ${fallidos} errores`);
        }
      } else {
        throw new Error("No se pudo guardar ningún modelo en Firebase");
      }

    } catch (err: any) {
      console.error("❌ Error completo en importación:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
        timestamp: new Date().toISOString()
      });
      
      setResultado({
        success: false,
        mensaje: `❌ Error: ${err.message}`,
        detalles: {
          error: err.message,
          tipo: err.name,
          momento: progreso
        }
      });
      
    } finally {
      setCargando(false);
      setProgreso("");
    }
  };

  const reintentar = () => {
    setResultado(null);
    setImportado(false);
    if (rol?.negocioID) {
      const key = `importado_${rol.negocioID}_${hoja}`;
      localStorage.removeItem(key);
      console.log(`🔄 Limpiando localStorage: ${key}`);
    }
  };

  const forzarReimportacion = () => {
    if (window.confirm("¿Estás seguro de que quieres reimportar? Esto puede crear modelos duplicados.")) {
      reintentar();
    }
  };

  // Verificar estado real del localStorage
  const verificarEstadoImportacion = () => {
    if (!rol?.negocioID) return false;
    const key = `importado_${rol?.negocioID}_${hoja}`;
    const estado = localStorage.getItem(key);
    console.log(`🔍 Estado localStorage para ${key}:`, estado);
    return estado === "true";
  };

  // Mostrar siempre si no ha sido importado exitosamente
  const mostrarBoton = !verificarEstadoImportacion() || !resultado?.success;

  // No mostrar si ya fue importado exitosamente
  if (!mostrarBoton) {
    return (
      <div className="my-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
        <div className="text-green-800 font-medium">
          ✅ Modelos ya importados desde esta hoja
        </div>
        <button
          onClick={forzarReimportacion}
          className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
        >
          🔄 Forzar reimportación
        </button>
      </div>
    );
  }

  return (
    <div className="my-6 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
      <div className="text-center">
        <button
          onClick={importarDesdeSheet}
          disabled={cargando}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${cargando 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
            }
            text-white
          `}
        >
          {cargando ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Importando...
            </span>
          ) : (
            "📥 Importar modelos desde Google Sheets"
          )}
        </button>
        
        {/* Progreso */}
        {progreso && (
          <div className="mt-3 text-sm text-blue-600 font-medium">
            {progreso}
          </div>
        )}
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`mt-4 p-4 rounded-lg border ${
          resultado.success 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="font-medium mb-2">
            {resultado.mensaje}
          </div>
          
          {resultado.total && (
            <div className="text-sm opacity-80">
              Total importado: {resultado.total} modelos
            </div>
          )}
          
          {resultado.detalles && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer hover:opacity-80">
                Ver detalles técnicos
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-700 overflow-auto max-h-40">
                {JSON.stringify(resultado.detalles, null, 2)}
              </pre>
            </details>
          )}
          
          {!resultado.success && (
            <button
              onClick={reintentar}
              className="mt-3 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
            >
              🔄 Reintentar importación
            </button>
          )}
        </div>
      )}

      {/* Información de ayuda */}
      <details className="mt-4 text-sm text-gray-600">
        <summary className="cursor-pointer hover:text-gray-800">
          💡 Información sobre la importación
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-2">
          <p><strong>Formato esperado:</strong> El sistema busca automáticamente datos en columnas B, C, D (categoría, modelo, cantidad)</p>
          <p><strong>Códigos:</strong> Se generan códigos temporales únicos que puedes completar después</p>
          <p><strong>Precios:</strong> Se asigna precio base de $10 USD, luego puedes actualizarlos</p>
          <p><strong>Permisos:</strong> Asegúrate que <code className="bg-gray-200 px-1 rounded">firebase-adminsdk-fbsvc@ingresos-trabajos.iam.gserviceaccount.com</code> tenga acceso al Sheet</p>
        </div>
      </details>
    </div>
  );
}