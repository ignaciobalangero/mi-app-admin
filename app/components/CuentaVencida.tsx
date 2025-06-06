import React from 'react';

// Interfaz para el estado de cuenta actualizada
interface EstadoCuenta {
  activa: boolean;
  diasRestantes: number;
  fechaVencimiento: Date | null;
  planActivo: string;
  razonBloqueo: 'trial_vencido' | 'pago_pendiente' | 'cuenta_suspendida' | 'negocio_vencido' | null;
  dependeDeNegocio?: boolean;
  adminDelNegocio?: string;
}

interface CuentaVencidaProps {
  estadoCuenta: EstadoCuenta;
  onPagarAhora: () => void;
}

export default function CuentaVencida({ estadoCuenta, onPagarAhora }: CuentaVencidaProps) {
  const getMensaje = () => {
    switch (estadoCuenta.razonBloqueo) {
      case 'trial_vencido':
        return {
          titulo: '🚫 Prueba gratuita finalizada',
          descripcion: 'Tu período de prueba de 7 días ha terminado. Para continuar usando GestiOne, elige un plan que se adapte a tu negocio.',
          icono: '⏰'
        };
      case 'pago_pendiente':
        return {
          titulo: '💳 Pago pendiente',
          descripcion: 'Tu suscripción ha vencido. Renueva tu plan para continuar usando todas las funcionalidades.',
          icono: '💰'
        };
      case 'negocio_vencido':
        return {
          titulo: '🏢 Suscripción del negocio vencida',
          descripcion: `La suscripción del negocio ha vencido. El administrador (${estadoCuenta.adminDelNegocio || 'administrador principal'}) debe renovar el plan para que puedas continuar usando la aplicación.`,
          icono: '🏬'
        };
      case 'cuenta_suspendida':
        return {
          titulo: '⚠️ Cuenta suspendida',
          descripcion: 'Tu cuenta ha sido suspendida. Contacta con soporte para más información.',
          icono: '🔒'
        };
      default:
        return {
          titulo: '❌ Acceso restringido',
          descripcion: 'No puedes acceder a esta funcionalidad en este momento.',
          icono: '🚨'
        };
    }
  };

  const mensaje = getMensaje();
  
  // Si es empleado/cliente con negocio vencido, mostrar interfaz diferente
  const esNegocioVencido = estadoCuenta.razonBloqueo === 'negocio_vencido';

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-4 z-50">
      
      {/* Overlay para desactivar la interfaz de fondo */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-lg mx-auto">
        
        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden">
          
          {/* Header */}
          <div className={`${esNegocioVencido ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'} text-white p-6 text-center`}>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{mensaje.icono}</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{mensaje.titulo}</h2>
            <p className={`${esNegocioVencido ? 'text-orange-100' : 'text-red-100'} text-sm`}>{mensaje.descripcion}</p>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            
            {/* Estado actual */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Plan actual:</span>
                <span className="font-semibold text-gray-800 capitalize">
                  {estadoCuenta.planActivo}
                </span>
              </div>
              {estadoCuenta.fechaVencimiento && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Venció el:</span>
                  <span className="font-semibold text-red-600">
                    {estadoCuenta.fechaVencimiento.toLocaleDateString('es-AR')}
                  </span>
                </div>
              )}
              {estadoCuenta.dependeDeNegocio && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Administrador:</span>
                  <span className="font-semibold text-orange-600">
                    {estadoCuenta.adminDelNegocio}
                  </span>
                </div>
              )}
            </div>

            {/* Planes disponibles - Solo para admins */}
            {!esNegocioVencido && estadoCuenta.razonBloqueo !== 'cuenta_suspendida' && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-800 text-center">
                  🚀 Elige tu plan
                </h3>
                
                {/* Plan Básico */}
                <div className="border-2 border-blue-200 rounded-2xl p-4 hover:border-blue-400 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-blue-800">Plan Básico</h4>
                      <p className="text-sm text-gray-600">Ideal para empezar</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-800">$15</p>
                      <p className="text-xs text-gray-500">/mes</p>
                    </div>
                  </div>
                </div>

                {/* Plan Pro */}
                <div className="border-2 border-green-300 bg-green-50 rounded-2xl p-4 hover:border-green-400 transition-all cursor-pointer relative">
                  <div className="absolute -top-2 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    ⭐ Recomendado
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <h4 className="font-bold text-green-800">Plan Pro</h4>
                      <p className="text-sm text-gray-600">Para negocios en crecimiento</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-800">$25</p>
                      <p className="text-xs text-gray-500">/mes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje especial para empleados/clientes */}
            {esNegocioVencido && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-lg">👥</span>
                  <div className="text-sm text-orange-800">
                    <p className="font-semibold mb-1">Contacta con tu administrador</p>
                    <p>Como empleado o cliente del negocio, no puedes renovar la suscripción directamente. El administrador <strong>{estadoCuenta.adminDelNegocio}</strong> debe realizar el pago para reactivar el acceso.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-3">
              {!esNegocioVencido && estadoCuenta.razonBloqueo !== 'cuenta_suspendida' && (
                <button
                  onClick={onPagarAhora}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-2xl font-bold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span>💳</span>
                  Renovar suscripción
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/dashboard?modo=solo-lectura'}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-2xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>👁️</span>
                Ver datos (solo lectura)
              </button>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 text-lg">💡</span>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">No te preocupes, tus datos están seguros</p>
                  <p>Todos tus trabajos, clientes y configuraciones se mantendrán intactos. Solo necesitas renovar la suscripción para continuar.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}