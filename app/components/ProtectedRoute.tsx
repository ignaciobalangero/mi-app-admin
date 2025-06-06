// components/ProtectedRoute.tsx
import React from 'react';
import { useVerificarEstadoCuenta } from '@/lib/verificarEstadoCuenta';
import CuentaVencida from '@/app/components/CuentaVencida';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiereAccesoCompleto?: boolean; // Si es false, permite modo solo lectura
  funcionalidad?: string; // Nombre de la funcionalidad específica
}

export default function ProtectedRoute({ 
  children, 
  requiereAccesoCompleto = true,
  funcionalidad 
}: ProtectedRouteProps) {
  const { estadoCuenta, loading } = useVerificarEstadoCuenta();
  const router = useRouter();

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando estado de cuenta...</p>
        </div>
      </div>
    );
  }

  // Si no hay estado de cuenta, redirigir al login
  if (!estadoCuenta) {
    router.push('/login');
    return null;
  }

  // Si la cuenta está activa, permitir acceso normal
  if (estadoCuenta.activa) {
    return <>{children}</>;
  }

  // Si requiere acceso completo y la cuenta no está activa, mostrar pantalla de pago
  if (requiereAccesoCompleto) {
    return (
      <CuentaVencida 
        estadoCuenta={estadoCuenta}
        onPagarAhora={() => router.push('/pagos')}
      />
    );
  }

  // Si no requiere acceso completo, mostrar con restricciones
  return (
    <div className="relative">
      {/* Overlay de solo lectura */}
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
        <p className="text-sm font-medium">
          ⚠️ Modo solo lectura - Tu cuenta ha vencido. 
          <button 
            onClick={() => router.push('/pagos')}
            className="underline ml-2 hover:text-yellow-200"
          >
            Renovar ahora
          </button>
        </p>
      </div>
      
      {/* Contenido con estilo desactivado */}
      <div className="pt-10 filter grayscale-[50%] pointer-events-none">
        {children}
      </div>
    </div>
  );
}

// HOC para usar en páginas específicas
export function withProtection(
  WrappedComponent: React.ComponentType<any>,
  options: { requiereAccesoCompleto?: boolean; funcionalidad?: string } = {}
) {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}

// Ejemplos de uso:
// export default withProtection(MiComponente, { requiereAccesoCompleto: true });
// export default withProtection(Dashboard, { requiereAccesoCompleto: false }); // Permite solo lectura