"use client";
import { useRouter } from 'next/navigation';

export default function PagoFallido() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-red-800 mb-4">
          Pago No Procesado
        </h1>
        <p className="text-gray-600 mb-6">
          Hubo un problema con tu pago. No te preocupes, no se realizó ningún cargo a tu tarjeta.
        </p>
        <div className="bg-red-100 p-4 rounded-lg mb-6">
          <p className="text-sm text-red-700">
            Puedes intentar nuevamente o contactar con soporte si el problema persiste.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/suscripciones')}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors"
          >
            Intentar Nuevamente
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}