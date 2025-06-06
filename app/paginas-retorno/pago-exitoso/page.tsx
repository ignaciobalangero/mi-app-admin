"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PagoExitoso() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente después de 5 segundos
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-800 mb-4">
          ¡Pago Exitoso!
        </h1>
        <p className="text-gray-600 mb-6">
          Tu suscripción ha sido activada correctamente. Ya puedes disfrutar de todos los beneficios de tu plan.
        </p>
        <div className="bg-green-100 p-4 rounded-lg mb-6">
          <p className="text-sm text-green-700">
            Serás redirigido automáticamente en unos segundos...
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors"
        >
          Ir al Dashboard
        </button>
      </div>
    </div>
  );
}