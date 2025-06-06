"use client";
import React, { useState } from 'react';
import { useVerificarEstadoCuenta } from '@/lib/verificarEstadoCuenta'; // ✅ DESCOMENTAR
import { auth } from '@/lib/firebase'; // ✅ YA ESTABA IMPORTADO

// Definir tipos para solucionar el error de TypeScript
interface Plan {
  nombre: string;
  precio: number;
  descripcion: string;
  caracteristicas: string[];
  color: 'blue' | 'green';
  popular?: boolean;
}

export default function Suscripciones() {
  const { estadoCuenta } = useVerificarEstadoCuenta(); // ✅ DESCOMENTAR
  const [planSeleccionado, setPlanSeleccionado] = useState<'basico' | 'pro'>('pro');
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Tipar el objeto planes correctamente
  const planes: Record<'basico' | 'pro', Plan> = {
    basico: {
      nombre: 'Plan Básico',
      precio: 15,
      descripcion: 'Perfecto para empezar',
      caracteristicas: [
        'Hasta 100 trabajos por mes',
        'Gestión básica de clientes',
        'Reportes simples',
        'Soporte por email',
        '1 usuario'
      ],
      color: 'blue'
    },
    pro: {
      nombre: 'Plan Pro',
      precio: 25,
      descripcion: 'Para negocios en crecimiento',
      caracteristicas: [
        'Trabajos ilimitados',
        'Gestión avanzada de clientes',
        'Reportes detallados',
        'Soporte prioritario',
        'Hasta 5 usuarios',
        'Integraciones premium',
        'Respaldos automáticos'
      ],
      color: 'green',
      popular: true
    }
  };

  // ✅ FUNCIÓN ACTUALIZADA PARA MERCADOPAGO
  const handleProcesarPago = async () => {
    if (!auth.currentUser) {
      alert('Debes estar logueado para procesar el pago');
      return;
    }

    setProcesandoPago(true);
    
    try {
      console.log(`🚀 Procesando pago para plan: ${planSeleccionado}`);
      console.log(`👤 Usuario: ${auth.currentUser.uid}`);
      console.log(`📧 Email: ${auth.currentUser.email}`);
      
      // ✅ LLAMAR A NUESTRA API DE MERCADOPAGO
      const response = await fetch('/api/crear-suscripcion', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          plan: planSeleccionado,
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email
        })
      });

      const data = await response.json();
      console.log('📥 Respuesta de la API:', data);

      if (response.ok && data.initPoint) {
        console.log('✅ Redirigiendo a MercadoPago...');
        // ✅ REDIRIGIR A MERCADOPAGO
        window.location.href = data.initPoint;
      } else {
        throw new Error(data.error || 'Error procesando pago');
      }
      
    } catch (error) {
      console.error('❌ Error procesando pago:', error);
      alert('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🚀 Elige tu plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Continúa haciendo crecer tu negocio con GestiOne. 
            Elige el plan que mejor se adapte a tus necesidades.
          </p>
          
          {/* ✅ DESCOMENTAR PARA MOSTRAR ESTADO DE CUENTA */}
          {estadoCuenta && !estadoCuenta.activa && (
            <div className="mt-6 inline-block bg-yellow-100 border border-yellow-300 rounded-2xl px-6 py-3">
              <p className="text-yellow-800 font-medium">
                ⏰ Tu {estadoCuenta.planActivo === 'trial' ? 'prueba gratuita' : 'suscripción'} venció hace{' '}
                {Math.abs(estadoCuenta.diasRestantes)} días
              </p>
            </div>
          )}

          {/* ✅ MOSTRAR DÍAS RESTANTES SI LA CUENTA ESTÁ ACTIVA */}
          {estadoCuenta && estadoCuenta.activa && estadoCuenta.planActivo === 'trial' && (
            <div className="mt-6 inline-block bg-green-100 border border-green-300 rounded-2xl px-6 py-3">
              <p className="text-green-800 font-medium">
                ✅ Tu prueba gratuita vence en {estadoCuenta.diasRestantes} días
              </p>
            </div>
          )}
        </div>

        {/* Planes */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {Object.entries(planes).map(([key, plan]) => {
            const isSelected = planSeleccionado === key;
            const colorClasses = {
              blue: {
                border: isSelected ? 'border-blue-500' : 'border-blue-200',
                bg: isSelected ? 'bg-blue-50' : 'bg-white',
                button: 'bg-blue-500 hover:bg-blue-600',
                text: 'text-blue-800'
              },
              green: {
                border: isSelected ? 'border-green-500' : 'border-green-200',
                bg: isSelected ? 'bg-green-50' : 'bg-white',
                button: 'bg-green-500 hover:bg-green-600',
                text: 'text-green-800'
              }
            };
            
            const colors = colorClasses[plan.color];

            return (
              <div
                key={key}
                onClick={() => setPlanSeleccionado(key as 'basico' | 'pro')}
                className={`relative cursor-pointer rounded-3xl border-2 p-8 transition-all duration-200 hover:shadow-lg ${colors.border} ${colors.bg}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                      ⭐ Más popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-bold ${colors.text} mb-2`}>
                    {plan.nombre}
                  </h3>
                  <p className="text-gray-600 mb-4">{plan.descripcion}</p>
                  <div className="flex items-end justify-center">
                    <span className={`text-5xl font-bold ${colors.text}`}>
                      ${plan.precio}
                    </span>
                    <span className="text-gray-500 ml-2 mb-2">/mes</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.caracteristicas.map((caracteristica, index) => (
                    <li key={index} className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      {caracteristica}
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className="absolute inset-0 border-2 border-dashed border-gray-400 rounded-3xl pointer-events-none opacity-50"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumen y pago */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-lg border-2 border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
              📋 Resumen de tu suscripción
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan seleccionado:</span>
                <span className="font-semibold">{planes[planSeleccionado].nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Facturación:</span>
                <span className="font-semibold">Mensual</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-green-600">
                    ${planes[planSeleccionado].precio}/mes
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleProcesarPago}
              disabled={procesandoPago}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3 ${
                procesandoPago
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              {procesandoPago ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Procesando pago...
                </>
              ) : (
                <>
                  <span>💳</span>
                  Pagar ${planes[planSeleccionado].precio}/mes
                </>
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                🔒 Pago seguro procesado con MercadoPago
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Puedes cancelar en cualquier momento
              </p>
            </div>
          </div>
        </div>

        {/* Garantía */}
        <div className="text-center mt-12">
          <div className="inline-block bg-blue-50 border border-blue-200 rounded-2xl px-8 py-6 max-w-2xl">
            <h4 className="font-bold text-blue-800 mb-2">
              💝 Garantía de satisfacción
            </h4>
            <p className="text-blue-700 text-sm">
              Si no estás completamente satisfecho, te devolvemos tu dinero en los primeros 30 días. 
              Sin preguntas, sin complicaciones.
            </p>
          </div>
        </div>

        {/* ✅ BOTONES DE PRUEBA (REMOVER EN PRODUCCIÓN) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-center mt-8 p-4 bg-gray-100 rounded-2xl">
            <p className="text-sm text-gray-600 mb-4">🔧 Botones de prueba (solo en desarrollo):</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  // Simular trial vencido
                  alert("Ve a Firebase Console y cambia fechaVencimiento a una fecha pasada para probar");
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
              >
                ⚠️ Simular trial vencido
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
              >
                🔄 Recargar página
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}