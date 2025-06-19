interface ModalRetornarServicioProps {
    mostrar: boolean;
    telefono: any;
    costoRetorno: string;
    setCostoRetorno: (valor: string) => void;
    onRetornar: (sumarAlCosto: boolean) => void;
    onCerrar: () => void;
  }
  
  export default function ModalRetornarServicio({
    mostrar,
    telefono,
    costoRetorno,
    setCostoRetorno,
    onRetornar,
    onCerrar
  }: ModalRetornarServicioProps) {
    if (!mostrar || !telefono) return null;
  
    return (
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 transform transition-all duration-300">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Retornar del Servicio</h2>
                <p className="text-green-100 text-sm">{telefono.modelo} - {telefono.marca}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💰 Costo final del servicio ({telefono.servicioTecnico?.monedaServicio || 'USD'})
              </label>
              <input
                type="number"
                value={costoRetorno}
                onChange={(e) => setCostoRetorno(e.target.value)}
                placeholder="0"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
  
            {parseFloat(costoRetorno) > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">💸 ¿Sumar al costo del equipo?</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Costo actual del equipo: <strong>${telefono.precioCompra || 0}</strong></div>
                  <div>Costo del servicio: <strong>+${parseFloat(costoRetorno) || 0}</strong></div>
                  <div className="border-t border-blue-300 pt-2 mt-2">
                    Nuevo costo total sería: <strong>${(parseFloat(telefono.precioCompra) || 0) + (parseFloat(costoRetorno) || 0)}</strong>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCerrar}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </button>
              
              {parseFloat(costoRetorno) > 0 ? (
                <>
                  <button
                    onClick={() => onRetornar(false)}
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all duration-200"
                  >
                    No sumar al costo
                  </button>
                  <button
                    onClick={() => onRetornar(true)}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
                  >
                    ✅ Sumar al costo
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onRetornar(false)}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
                >
                  ✅ Completar retorno
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }