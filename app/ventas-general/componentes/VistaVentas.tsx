"use client";

import { useState, useEffect } from "react";
import Header from "../../Header";
import TablaVentas from "./TablaVentas";
import ModalVenta from "./ModalVenta";
import { useSearchParams, useRouter } from "next/navigation";

export default function VistaVentas() {
  const [refrescar, setRefrescar] = useState(false);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const desdeTelefono = searchParams.get("desdeTelefono");

    if (desdeTelefono === "1" || localStorage.getItem("ventaTelefonoPendiente")) {
      setMostrarModalVenta(true);
    }
  }, [searchParams]);

  return (
    <>
      <Header />
      <main className="pt-20 pb-10 bg-gradient-to-br from-gray-50 via-green-50 to-blue-50 min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto space-y-6">

          {/* Header principal */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-white rounded-xl px-6 py-3 shadow-lg border border-gray-200">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Gestión de Ventas
                </h1>
                <p className="text-gray-600 text-sm">Control completo de transacciones</p>
              </div>
            </div>
          </div>

          {/* Sección de acciones principales */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
              <h2 className="text-lg font-bold flex items-center gap-2">🚀 Acciones Rápidas</h2>
              <p className="text-green-100 mt-1 text-sm">
                Inicia una nueva venta o registra la venta de un teléfono
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-gray-50 to-green-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Botón Nueva Venta */}
                <button
                  onClick={() => setMostrarModalVenta(true)}
                  className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
                    <span className="text-lg">📋</span>
                  </div>
                  <div className="text-left">
                    <div className="text-base font-bold">Nueva Venta</div>
                    <div className="text-blue-100 text-xs">Registrar venta general</div>
                  </div>
                </button>

                {/* Botón Vender Teléfono */}
                <button
                  onClick={() => router.push("/ventas/telefonos")}
                  className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white p-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
                    <span className="text-lg">📱</span>
                  </div>
                  <div className="text-left">
                    <div className="text-base font-bold">Vender Teléfono</div>
                    <div className="text-green-100 text-xs">Desde el stock disponible</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Sección de tabla de ventas */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
              <h2 className="text-lg font-bold flex items-center gap-2">📊 Historial de Ventas</h2>
              <p className="text-blue-100 mt-1 text-sm">Todas las transacciones registradas en el sistema</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50">
              <TablaVentas refrescar={refrescar} />
            </div>
          </div>
        </div>
      </main>

      {/* Modal de carga de venta */}
      {mostrarModalVenta && (
        <ModalVenta
          refrescar={refrescar}
          setRefrescar={setRefrescar}
          onClose={() => setMostrarModalVenta(false)}
          desdeTelefono={true}
        />
      )}
    </>
  );
}
