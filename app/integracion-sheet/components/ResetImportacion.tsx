// app/integracion-sheet/components/ResetImportacion.tsx
"use client";

import { useState } from "react";
import { useRol } from "@/lib/useRol";

export default function ResetImportacion({ hoja }: { hoja: string }) {
  const { rol } = useRol();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const resetearImportacion = () => {
    if (!rol?.negocioID) return;
    
    const key = `importado_${rol.negocioID}_${hoja}`;
    localStorage.removeItem(key);
    
    setMensaje(`✅ Reset completado para la hoja "${hoja}". Ahora puedes reimportar.`);
    
    // Recargar la página para mostrar el botón de importar
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const limpiarTodoLocalStorage = () => {
    localStorage.clear();
    setMensaje("✅ Todo el localStorage limpiado. Recargando página...");
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="my-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
      <h3 className="text-lg font-semibold text-orange-800 mb-3">
        🔄 Gestión de Importación
      </h3>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={resetearImportacion}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
          >
            🔄 Resetear esta hoja
          </button>
          
          <button
            onClick={limpiarTodoLocalStorage}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
          >
            🧹 Limpiar todo
          </button>
        </div>
        
        <div className="text-sm text-orange-700">
          <p><strong>Resetear esta hoja:</strong> Permite reimportar solo la hoja actual</p>
          <p><strong>Limpiar todo:</strong> Borra todas las marcas de importación</p>
        </div>
        
        {mensaje && (
          <div className="p-3 bg-green-100 border border-green-200 rounded text-green-800 text-sm">
            {mensaje}
          </div>
        )}
      </div>
    </div>
  );
}