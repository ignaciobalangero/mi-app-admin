// /app/integracion-sheet/components/DebugGoogleSheets.tsx
"use client";

import { useState } from "react";

interface DebugResult {
  exito: boolean;
  tests?: any;
  diagnostico?: any;
  recomendaciones?: string[];
  cuentaDeServicio?: string;
  error?: string;
}

export default function DebugGoogleSheets({ 
  sheetID, 
  hoja 
}: { 
  sheetID: string; 
  hoja: string; 
}) {
  const [resultado, setResultado] = useState<DebugResult | null>(null);
  const [cargando, setCargando] = useState(false);

  const ejecutarTest = async () => {
    setCargando(true);
    setResultado(null);

    try {
      const res = await fetch("/api/test-google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja }),
      });

      const data = await res.json();
      setResultado(data);

    } catch (error: any) {
      setResultado({
        exito: false,
        error: error.message,
        recomendaciones: ["Error de conexión al ejecutar tests"]
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="my-6 p-4 border border-yellow-200 rounded-lg bg-yellow-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-yellow-800">
          🔧 Diagnóstico Google Sheets
        </h3>
        <button
          onClick={ejecutarTest}
          disabled={cargando}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50"
        >
          {cargando ? "🔄 Ejecutando..." : "🧪 Ejecutar Test"}
        </button>
      </div>

      {resultado && (
        <div className="space-y-4">
          {/* Estado general */}
          <div className={`p-3 rounded border ${
            resultado.exito 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="font-medium">
              {resultado.exito ? "✅ Diagnóstico exitoso" : "❌ Problemas detectados"}
            </div>
          </div>

          {/* Cuenta de servicio */}
          {resultado.cuentaDeServicio && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm text-blue-800">
                <strong>📧 Cuenta de servicio:</strong>
                <code className="ml-2 bg-blue-100 px-2 py-1 rounded text-xs">
                  {resultado.cuentaDeServicio}
                </code>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Esta cuenta debe tener permisos de Editor en tu Google Sheet
              </div>
            </div>
          )}

          {/* Diagnóstico detallado */}
          {resultado.diagnostico && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="text-sm font-medium text-gray-800 mb-2">📊 Estado de componentes:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(resultado.diagnostico).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-600">{formatearKey(key)}:</span>
                    <span className={value ? "text-green-600" : "text-red-600"}>
                      {value ? "✅" : "❌"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recomendaciones */}
          {resultado.recomendaciones && resultado.recomendaciones.length > 0 && (
            <div className="p-3 bg-white border border-gray-200 rounded">
              <div className="text-sm font-medium text-gray-800 mb-2">💡 Recomendaciones:</div>
              <ul className="space-y-1 text-sm">
                {resultado.recomendaciones.map((rec, index) => (
                  <li key={index} className="text-gray-700">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tests detallados (colapsable) */}
          {resultado.tests && (
            <details className="p-3 bg-gray-50 border border-gray-200 rounded">
              <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-gray-600">
                🔍 Ver tests detallados
              </summary>
              <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-60 text-gray-700">
                {JSON.stringify(resultado.tests, null, 2)}
              </pre>
            </details>
          )}

          {/* Error específico */}
          {resultado.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <div className="text-sm font-medium text-red-800 mb-1">❌ Error:</div>
              <div className="text-sm text-red-700">{resultado.error}</div>
            </div>
          )}
        </div>
      )}

      {/* Información de ayuda */}
      <details className="mt-4 text-xs text-gray-600">
        <summary className="cursor-pointer hover:text-gray-800">
          ❓ ¿Qué hace este diagnóstico?
        </summary>
        <div className="mt-2 space-y-1">
          <p>• Verifica las variables de entorno de Google Sheets</p>
          <p>• Prueba la autenticación con Google API</p>
          <p>• Confirma que el documento existe y es accesible</p>
          <p>• Valida que la hoja especificada existe</p>
          <p>• Verifica permisos de lectura/escritura</p>
        </div>
      </details>
    </div>
  );
}

function formatearKey(key: string): string {
  const traducciones: Record<string, string> = {
    configuracionOK: "Configuración",
    autenticacionOK: "Autenticación", 
    documentoExiste: "Documento existe",
    hojaExiste: "Hoja existe",
    permisosLecturaOK: "Permisos lectura"
  };
  
  return traducciones[key] || key;
}