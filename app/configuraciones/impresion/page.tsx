"use client";

import { useRouter } from "next/navigation";
import { imprimirEtiqueta } from "@/lib/qzPrinter";

export default function ImpresionConfig() {
  const router = useRouter();

  const probarImpresion = async () => {
    try {
      await imprimirEtiqueta("✅ Prueba de impresión - Sistema Ingresos");
      alert("✅ Impresión enviada correctamente");
    } catch (error) {
      alert("❌ No se pudo imprimir. Verificá QZ Tray");
      console.error("Error de impresión de prueba:", error);
    }
  };

  return (
    <div className="p-6 text-black bg-gray-100 min-h-screen">
      <button
        onClick={() => router.push("/configuraciones")}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Volver a Configuraciones
      </button>

      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">
          🖨️ Configuración de impresión
        </h1>

        <p className="text-gray-700">
          Para imprimir automáticamente etiquetas o tickets desde el sistema,
          es necesario instalar el programa <strong>QZ Tray</strong> en tu computadora.
        </p>

        <div className="text-center">
          <a
            href="https://qz.io/download"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold inline-block"
          >
            🔽 Descargar QZ Tray
          </a>
        </div>

        <div className="flex flex-col md:flex-row justify-center gap-4">
          <button
            onClick={probarImpresion}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold"
          >
            ✅ Probar impresión
          </button>

          <button
            onClick={() => router.push("/configuraciones/impresion/tutorial")}
            className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded font-semibold"
          >
            📘 Ver tutorial de configuración
          </button>
        </div>
      </div>
    </div>
  );
}
