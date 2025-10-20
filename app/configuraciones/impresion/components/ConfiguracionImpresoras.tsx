"use client";

interface Props {
  configuracion: {
    zerforceActiva: boolean;
    brotherActiva: boolean;
    impresionAutomatica: boolean;
  };
  setConfiguracion: (config: any) => void;
  onProbarZerforce: () => void;
  onProbarBrother: () => void;
}

export default function ConfiguracionImpresoras({ 
  configuracion, 
  setConfiguracion, 
  onProbarZerforce, 
  onProbarBrother 
}: Props) {
  return (
    <div className="space-y-6">
      
      {/* Información */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-bold text-yellow-800 mb-2">📋 Impresoras Recomendadas</h3>
        <p className="text-yellow-700 text-sm mb-3">
          Para garantizar compatibilidad total, GestiOne está optimizado para:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded border">
            <div className="font-semibold text-blue-600">🧾 Zerforce TP85E</div>
            <div className="text-sm text-gray-600">Tickets térmicos 80mm</div>
            <div className="text-xs text-gray-500 mt-1">Precio aprox: $45,000 ARS</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="font-semibold text-green-600">🏷️ Brother QL-800</div>
            <div className="text-sm text-gray-600">Etiquetas adhesivas</div>
            <div className="text-xs text-gray-500 mt-1">Precio aprox: $55,000 ARS</div>
          </div>
        </div>
      </div>

      {/* Configuración Principal */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-[#1a252f]">⚙️ Configuración de Impresoras</h3>
        
        <div className="space-y-4">
          {/* Zerforce TP85E */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800">🧾 Zerforce TP85E</h4>
                <p className="text-sm text-blue-600">Impresora térmica para tickets de trabajo</p>
                <p className="text-xs text-blue-500 mt-1">Conectar por USB, instalar driver desde CD incluido</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.zerforceActiva}
                    onChange={(e) => setConfiguracion(prev => ({
                      ...prev, 
                      zerforceActiva: e.target.checked
                    }))}
                    className="w-5 h-5 text-blue-500"
                  />
                  <span className="text-sm font-medium">Activar</span>
                </label>
                <button 
                  onClick={onProbarZerforce}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-all"
                >
                  🧾 Probar
                </button>
              </div>
            </div>
          </div>

          {/* Brother QL-800 */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-green-800">🏷️ Brother QL-800</h4>
                <p className="text-sm text-green-600">Impresora de etiquetas adhesivas para equipos</p>
                <p className="text-xs text-green-500 mt-1">Conectar por USB, descargar driver desde brother.com</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.brotherActiva}
                    onChange={(e) => setConfiguracion(prev => ({
                      ...prev, 
                      brotherActiva: e.target.checked
                    }))}
                    className="w-5 h-5 text-green-500"
                  />
                  <span className="text-sm font-medium">Activar</span>
                </label>
                <button 
                  onClick={onProbarBrother}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-all"
                >
                  🏷️ Probar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opciones Adicionales */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-[#1a252f]">🔧 Opciones de Impresión</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input 
              type="checkbox"
              checked={configuracion.impresionAutomatica}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev, 
                impresionAutomatica: e.target.checked
              }))}
              className="w-5 h-5 text-blue-500"
            />
            <div>
              <div className="font-medium text-black">⚡ Impresión automática al guardar trabajo</div>
              <div className="text-sm text-gray-600">
                Imprime ticket y etiqueta automáticamente cuando guardas un trabajo
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Soporte */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-bold text-blue-800 mb-2">🔧 ¿Tienes otra impresora?</h4>
        <p className="text-sm text-blue-700 mb-3">
          Si tienes un modelo diferente, podemos optimizar GestiOne para tu impresora específica.
        </p>
        <button 
          onClick={() => window.open('https://wa.me/+543582416759', '_blank')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
        >
          💬 Contactar Soporte
        </button>
      </div>
    </div>
  );
}