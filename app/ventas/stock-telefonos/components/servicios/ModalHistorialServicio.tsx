interface ModalHistorialServiciosProps {
    mostrar: boolean;
    telefono: any;
    onCerrar: () => void;
  }
  
  export default function ModalHistorialServicios({
    mostrar,
    telefono,
    onCerrar
  }: ModalHistorialServiciosProps) {
    if (!mostrar || !telefono) return null;
  
    return (
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-200 transform transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Historial de Servicios</h2>
                <p className="text-blue-100 text-sm">{telefono.modelo} - {telefono.marca}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 max-h-96 overflow-y-auto">
            {telefono.historialServicios && telefono.historialServicios.length > 0 ? (
              <div className="space-y-4">
                {telefono.historialServicios.map((servicio: any, index: number) => (
                  <div key={servicio.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>🏪 Lugar:</strong> {servicio.lugar}
                      </div>
                      <div>
                        <strong>🔧 Motivo:</strong> {servicio.motivo}
                      </div>
                      <div>
                        <strong>📅 Enviado:</strong> {servicio.fechaEnvio}
                      </div>
                      <div>
                        <strong>📅 Retornado:</strong> {servicio.fechaRetorno || 'En servicio'}
                      </div>
                      <div>
                        <strong>💰 Costo:</strong> ${servicio.costoFinal || servicio.costoServicio || 0} {servicio.monedaServicio || 'USD'}
                      </div>
                      <div>
                        <strong>📝 Estado:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          servicio.fechaRetorno ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {servicio.fechaRetorno ? 'Completado' : 'En servicio'}
                        </span>
                        {servicio.sumadoAlCosto && (
                          <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                            💸 Sumado al costo
                          </span>
                        )}
                      </div>
                    </div>
                    {servicio.observacionesServicio && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <strong>📝 Observaciones:</strong> {servicio.observacionesServicio}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="text-sm text-blue-800">
                    <strong>💰 Costo total en servicios:</strong> $
                    {telefono.costoTotalServicio || 
                      telefono.historialServicios?.reduce((sum: number, s: any) => 
                        sum + (s.costoFinal || s.costoServicio || 0), 0
                      ) || 0}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Costo real = Precio compra + Servicios = $
                    {(telefono.precioCompra || 0) + (telefono.costoTotalServicio || 0)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔧</span>
                </div>
                <p>Este teléfono no tiene historial de servicios técnicos</p>
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={onCerrar}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }