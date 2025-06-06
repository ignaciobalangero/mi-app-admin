"use client";
import { useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

interface Plan {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  caracteristicas: string[];
  popular?: boolean;
}

const planes: Plan[] = [
  {
    id: "basico",
    nombre: "Plan Básico",
    precio: 100,
    descripcion: "Perfecto para empezar",
    caracteristicas: [
      "Hasta 100 trabajos por mes",
      "1 usuario",
      "Soporte por email",
      "Reportes básicos"
    ]
  },
  {
    id: "pro",
    nombre: "Plan Pro", 
    precio: 200,
    descripcion: "Para negocios en crecimiento",
    caracteristicas: [
      "Trabajos ilimitados",
      "Hasta 5 usuarios",
      "Soporte prioritario", 
      "Reportes avanzados",
      "Integración con Google Sheets"
    ],
    popular: true
  }
];

export default function GestionSuscripcion() {
  const [user] = useAuthState(auth);
  const { rol, suscripcion, loading } = useRol();
  const [procesandoPago, setProcesandoPago] = useState<string | null>(null);
  const [mostrarPlanes, setMostrarPlanes] = useState(false);

  // 💰 Proceso de pago REAL con tu API existente
  const procesarPago = async (plan: Plan) => {
    if (!user || !rol) return;
    
    setProcesandoPago(plan.id);
    
    try {
      console.log('🚀 Iniciando pago para plan:', plan.nombre);
      
      // Crear suscripción usando tu API existente
      const response = await fetch('/api/crear-suscripcion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: plan.id, // "basico" o "pro"
          userId: user.uid,
          userEmail: user.email || 'usuario@email.com'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la suscripción');
      }

      const { initPoint } = await response.json();
      
      console.log('✅ Preferencia creada, redirigiendo a MercadoPago...');
      
      // Redirigir a MercadoPago
      window.location.href = initPoint;
      
    } catch (error) {
      console.error('❌ Error al procesar pago:', error);
      alert('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setProcesandoPago(null);
    }
  };

  const renovarPlanActual = async () => {
    if (!suscripcion) return;
    
    const planActual = planes.find(p => p.id === suscripcion.planActual) || planes[0];
    await procesarPago(planActual);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!suscripcion) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No se pudo cargar la información de suscripción</p>
      </div>
    );
  }

  // Determinar color según días restantes
  const getColorDias = (dias: number | null) => {
    if (!dias) return 'text-gray-500';
    if (dias > 30) return 'text-green-600';
    if (dias > 7) return 'text-yellow-600'; 
    return 'text-red-600';
  };

  const getEstadoBadge = (activa: boolean) => {
    return activa 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'No disponible';
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  return (
    <div className="space-y-6">
      {/* Estado Actual de la Suscripción */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Estado de tu Suscripción</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(suscripcion.suscripcionActiva)}`}>
            {suscripcion.suscripcionActiva ? '✅ Activa' : '❌ Inactiva'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Plan Actual</h3>
            <p className="text-xl font-bold text-gray-800 capitalize">
              {suscripcion.planActual || 'No definido'}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Días Restantes</h3>
            <p className={`text-xl font-bold ${getColorDias(suscripcion.diasRestantes)}`}>
              {suscripcion.diasRestantes !== null ? `${suscripcion.diasRestantes} días` : 'No disponible'}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Vence el</h3>
            <p className="text-xl font-bold text-gray-800">
              {formatearFecha(suscripcion.fechaVencimiento)}
            </p>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={renovarPlanActual}
            disabled={procesandoPago === suscripcion.planActual}
            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            {procesandoPago === suscripcion.planActual ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                🔄 Renovar Plan Actual
              </>
            )}
          </button>
          
          <button
            onClick={() => setMostrarPlanes(!mostrarPlanes)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            👀 {mostrarPlanes ? 'Ocultar' : 'Ver'} Todos los Planes
          </button>
        </div>

        {/* Alertas importantes */}
        {suscripcion.diasRestantes !== null && suscripcion.diasRestantes <= 7 && suscripcion.suscripcionActiva && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>¡Atención!</strong> Tu suscripción vence en {suscripcion.diasRestantes} días. 
                  Renueva ahora para no perder el acceso.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Planes Disponibles */}
      {mostrarPlanes && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Planes Disponibles
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {planes.map((plan) => (
              <div
                key={plan.id}
                className={`relative border rounded-lg p-6 transition-all hover:shadow-lg ${
                  plan.popular 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 text-sm font-medium rounded-full">
                      ⭐ Más Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {plan.nombre}
                  </h3>
                  <p className="text-gray-600 mb-4">{plan.descripcion}</p>
                  <p className="text-3xl font-bold text-gray-800">
                    ${plan.precio.toLocaleString()}
                    <span className="text-lg font-normal text-gray-600">/mes</span>
                  </p>
                </div>
                
                <ul className="space-y-2 mb-6">
                  {plan.caracteristicas.map((caracteristica, index) => (
                    <li key={index} className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✓</span>
                      {caracteristica}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => procesarPago(plan)}
                  disabled={procesandoPago === plan.id}
                  className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                    plan.popular
                      ? 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white'
                      : 'bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white'
                  }`}
                >
                  {procesandoPago === plan.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creando pago...
                    </div>
                  ) : (
                    `💳 Pagar con MercadoPago`
                  )}
                </button>
                
                {suscripcion.planActual === plan.id && (
                  <div className="mt-3 text-center">
                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      📋 Plan Actual
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}