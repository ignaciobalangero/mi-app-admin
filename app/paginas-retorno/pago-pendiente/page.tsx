"use client";
import { useRouter } from 'next/navigation';

export default function PagoPendiente() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-yellow-800 mb-4">
          Pago Pendiente
        </h1>
        <p className="text-gray-600 mb-6">
          Tu pago está siendo procesado. Esto puede tomar unos minutos dependiendo del método de pago utilizado.
        </p>
        <div className="bg-yellow-100 p-4 rounded-lg mb-6">
          <p className="text-sm text-yellow-700">
            Te notificaremos por email cuando se confirme tu pago. Mientras tanto, puedes seguir usando tu cuenta.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-yellow-500 text-white px-6 py-3 rounded-xl hover:bg-yellow-600 transition-colors"
          >
            Volver al Dashboard
          </button>
          <button
            onClick={() => router.push('/suscripciones')}
            className="w-full bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-colors"
          >
            Ver Suscripciones
          </button>
        </div>
      </div>
    </div>
  );
}