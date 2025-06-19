interface ModalVerServicioActualProps {
    mostrar: boolean;
    telefono: any;
    onCerrar: () => void;
    onRetornarAhora: () => void;
  }
  
  export default function ModalVerServicioActual({
    mostrar,
    telefono,
    onCerrar,
    onRetornarAhora
  }: ModalVerServicioActualProps) {
    if (!mostrar || !telefono) return null;
  
    return (
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 transform transition-all duration-300">
          <div className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-t-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Servicio Técnico Actual</h2>
                <p className="text-orange-100 text-sm">{telefono.modelo} - {telefono.marca}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <strong className="text-orange-800">🏪 Lugar del servicio:</strong>
                  <div className="text-orange-700 mt-1">{telefono.servicioTecnico?.lugar || 'N/A'}</div>
                </div>
                
                <div>
                  <strong className="text-orange-800">🔧 Motivo:</strong>
                  <div className="text-orange-700 mt-1">{telefono.servicioTecnico?.motivo || 'N/A'}</div>
                </div>
                
                <div>
                  <strong className="text-orange-800">📅 Fecha de envío:</strong>
                  <div className="text-orange-700 mt-1">{telefono.servicioTecnico?.fechaEnvio || 'N/A'}</div>
                </div>
                
                <div>
                  <strong className="text-orange-800">💰 Costo estimado:</strong>
                  <div className="text-orange-700 mt-1">
                    ${telefono.servicioTecnico?.costoServicio || 0} {telefono.servicioTecnico?.monedaServicio || 'USD'}
                  </div>
                </div>
                
                {telefono.servicioTecnico?.observacionesServicio && (
                  <div>
                    <strong className="text-orange-800">📝 Observaciones:</strong>
                    <div className="text-orange-700 mt-1">{telefono.servicioTecnico.observacionesServicio}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                <span>Estado: En servicio técnico</span>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCerrar}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                Cerrar
              </button>
              <button
                onClick={onRetornarAhora}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
              >
                ✅ Retornar ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }