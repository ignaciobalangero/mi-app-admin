"use client";

import { useRouter } from "next/navigation";

export default function TutorialImpresion() {
  const router = useRouter();

  return (
    <div className="p-6 text-black bg-gray-100 min-h-screen">
      <button
        onClick={() => router.push("/configuraciones/impresion")}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Volver a Configuración de impresión
      </button>

      <h1 className="text-3xl font-bold mb-4 text-center">🖨️ Tutorial de Configuración de QZ Tray</h1>

      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow space-y-4 text-sm leading-relaxed">
        <p>
          Para que el sistema pueda imprimir automáticamente tickets o etiquetas,
          necesitás instalar un pequeño programa llamado <strong>QZ Tray</strong>.
        </p>

        <ol className="list-decimal list-inside space-y-2">
          <li>
            Descargá QZ Tray desde:{" "}
            <a
              href="https://qz.io/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              https://qz.io/download
            </a>
          </li>
          <li>Instalalo normalmente en tu computadora (siguiente, siguiente, finalizar).</li>
          <li>Una vez instalado, abrí QZ Tray. Debería aparecer un ícono en la barra de tareas.</li>
          <li>Permití los permisos del navegador si te lo solicita.</li>
          <li>Desde esta app, hacé clic en <strong>Probar impresión</strong> para verificar que esté funcionando.</li>
        </ol>

        <p className="text-green-700 font-semibold">
          Si se imprime correctamente, ¡ya está todo listo! 🎉
        </p>
      </div>
    </div>
  );
}
