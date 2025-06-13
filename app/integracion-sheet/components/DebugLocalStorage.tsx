// /app/integracion-sheet/components/DebugLocalStorage.tsx
"use client";

import { useState, useEffect } from "react";
import { useRol } from "@/lib/useRol";

export default function DebugLocalStorage() {
  const { rol } = useRol();
  const [localStorageData, setLocalStorageData] = useState<Record<string, string>>({});

  const actualizarEstado = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key) || "";
      }
    }
    setLocalStorageData(data);
  };

  useEffect(() => {
    actualizarEstado();
  }, []);

  const limpiarClave = (key: string) => {
    localStorage.removeItem(key);
    actualizarEstado();
  };

  const limpiarTodo = () => {
    if (window.confirm("¿Estás seguro de limpiar todo el localStorage?")) {
      localStorage.clear();
      actualizarEstado();
    }
  };

  const clavesPorNegocio = Object.keys(localStorageData).filter(key => 
    key.includes(`importado_${rol?.negocioID}`)
  );

  return (
    <div className="my-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-800">
          🔍 Debug LocalStorage
        </h3>
        <div className="space-x-2">
          <button
            onClick={actualizarEstado}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={limpiarTodo}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            🧹 Limpiar todo
          </button>
        </div>
      </div>

      {/* Claves del negocio actual */}
      {clavesPorNegocio.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-blue-800 mb-2">
            📊 Importaciones de este negocio ({rol?.negocioID}):
          </h4>
          <div className="space-y-2">
            {clavesPorNegocio.map(key => (
              <div key={key} className="flex items-center justify-between bg-white p-2 rounded border">
                <div className="text-sm">
                  <span className="font-mono text-blue-600">{key}</span>
                  <span className="ml-2 text-gray-600">= {localStorageData[key]}</span>
                </div>
                <button
                  onClick={() => limpiarClave(key)}
                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Todas las claves */}
      <details className="text-sm">
        <summary className="cursor-pointer text-blue-700 hover:text-blue-800">
          Ver todo el localStorage ({Object.keys(localStorageData).length} claves)
        </summary>
        <div className="mt-2 max-h-40 overflow-auto bg-white p-2 rounded border">
          {Object.keys(localStorageData).length === 0 ? (
            <div className="text-gray-500 text-center py-2">
              LocalStorage vacío
            </div>
          ) : (
            <pre className="text-xs text-gray-700">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          )}
        </div>
      </details>

      {/* Info útil */}
      <div className="mt-3 text-xs text-blue-600">
        <p>• Las claves con formato <code>importado_[negocioID]_[hoja]</code> controlan qué hojas ya fueron importadas</p>
        <p>• Si una hoja aparece como importada pero quieres reimportarla, elimina su clave específica</p>
      </div>
    </div>
  );
}