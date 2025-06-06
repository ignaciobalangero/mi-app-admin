// components/AppWrapper.tsx
"use client";
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useVerificarEstadoCuenta } from '@/lib/verificarEstadoCuenta';
import CuentaVencida from '@/app/components/CuentaVencida';

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const [user, userLoading] = useAuthState(auth);
  const { estadoCuenta, loading } = useVerificarEstadoCuenta();
  const router = useRouter();
  const pathname = usePathname();

  // ✅ PÁGINAS QUE NO REQUIEREN VERIFICACIÓN DE CUENTA
  const paginasLibres = [
    '/login',
    '/registro',
    '/crear-cuenta',
    '/suscripciones',
    '/recuperar-password',
    '/terminos',
    '/privacidad'
  ];

  // Verificar si la página actual está en la lista de páginas libres
  const esPaginaLibre = paginasLibres.some(pagina => pathname.startsWith(pagina));

  // ✅ MANEJAR REDIRECCIÓN EN useEffect (evita el error de React)
  useEffect(() => {
    if (!userLoading && !user && !esPaginaLibre) {
      router.push('/login');
    }
  }, [user, userLoading, esPaginaLibre, router]);

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario y no es página libre, mostrar loading mientras redirige
  if (!user && !esPaginaLibre) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // ✅ SI ES PÁGINA LIBRE, MOSTRAR SIN RESTRICCIONES (SIN SIDEBAR)
  if (esPaginaLibre) {
    return <>{children}</>;
  }

  // Si hay estado de cuenta y NO está activa, mostrar pantalla de cuenta vencida
  if (estadoCuenta && !estadoCuenta.activa) {
    return (
      <CuentaVencida 
        estadoCuenta={estadoCuenta}
        onPagarAhora={() => router.push('/suscripciones')}
      />
    );
  }

  // Si todo está bien, mostrar la aplicación normal
  return <>{children}</>;
}