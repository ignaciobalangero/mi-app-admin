import { useState } from "react";
import Link from "next/link";

export default function IntegracionGoogleSheet() {
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false); // 👈 NUEVO estado

  return (
    <div className="text-center mt-6 space-y-4">
      <button
        onClick={() => setMostrarOpciones(!mostrarOpciones)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
      >
        🔗 Integración Google Sheet
      </button>

      {mostrarOpciones && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-700">
            Integración con Google Sheets
          </h2>
          <div className="flex justify-center gap-4">
            <Link
              href="/configuraciones/integraciones"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              + Agregar Google Sheet
            </Link>
            <button
              onClick={() => setMostrarManual(true)} // 👈 Mostrar el manual
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              📄 Manual para vincular listas
            </button>
          </div>

          {mostrarManual && (
            <div className="relative max-w-xl mx-auto p-4 bg-white border border-gray-300 rounded shadow text-left">
              <button
                onClick={() => setMostrarManual(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-lg"
              >
                ✖
              </button>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                Paso a paso para vincular tu hoja:
              </h3>
              <ol className="list-decimal pl-5 space-y-1 text-gray-700 text-sm">
                <li>Entrá a <strong>Google Sheets</strong> y creá una hoja nueva o abrí una existente.</li>
                <li>Compartila con este correo: <code>XXXXX@XXXXX.iam.gserviceaccount.com</code> con permiso de editor.</li>
                <li>Copiá el ID de la URL: todo lo que está entre <code>/d/</code> y <code>/edit</code>.</li>
                <li>Pegalo en la sección <strong>“Agregar Google Sheet”</strong> de esta app.</li>
                <li>Guardá y empezá a usar tu hoja integrada.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

