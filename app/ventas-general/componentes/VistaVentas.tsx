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
      <main className="pt-20 pb-10 bg-gradient-to-br from-[#ecf0f1] via-[#f8f9fa] to-[#e8f4fd] min-h-screen text-[#2c3e50] w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto space-y-6">

          {/* Header principal - Estilo GestiOne */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-4 bg-white rounded-2xl px-8 py-6 shadow-lg border-2 border-[#ecf0f1]">
              <div className="w-16 h-16 bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">💰</span>
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-[#2c3e50]">
                  Gestión de Ventas
                </h1>
                <p className="text-[#7f8c8d] text-lg mt-1">Control completo de transacciones comerciales</p>
              </div>
            </div>
          </div>

          {/* Sección de acciones principales - Estilo GestiOne */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden max-w-6xl mx-auto">
            
            {/* Header de la sección */}
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Acciones Rápidas</h2>
                  <p className="text-green-100 text-sm mt-1">
                    Inicia una nueva venta o registra la venta de un teléfono
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido de acciones */}
            <div className="p-6 bg-[#f8f9fa]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Botón Nueva Venta - Estilo GestiOne */}
                <button
                  onClick={() => setMostrarModalVenta(true)}
                  className="group bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#1f4e79] text-white p-6 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-transparent hover:border-[#3498db] relative overflow-hidden"
                >
                  {/* Efecto de brillo */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <div className="relative flex items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:rotate-6">
                      <span className="text-3xl">📋</span>
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-bold">Nueva Venta General</div>
                      <div className="text-blue-100 text-sm mt-1">Accesorios, repuestos y servicios</div>
                    </div>
                  </div>
                  
                  {/* Indicador de acción */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-white text-sm">→</span>
                  </div>
                </button>

                {/* Botón Vender Teléfono - Estilo GestiOne */}
                <button
                  onClick={() => router.push("/ventas/telefonos")}
                  className="group bg-gradient-to-r from-[#27ae60] to-[#229954] hover:from-[#229954] hover:to-[#196f3d] text-white p-6 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-transparent hover:border-[#27ae60] relative overflow-hidden"
                >
                  {/* Efecto de brillo */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <div className="relative flex items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:rotate-6">
                      <span className="text-3xl">📱</span>
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-bold">Vender Teléfono</div>
                      <div className="text-green-100 text-sm mt-1">Desde el stock disponible</div>
                    </div>
                  </div>
                  
                  {/* Indicador de acción */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-white text-sm">→</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Sección de tabla de ventas - Estilo GestiOne */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
            
            {/* Header de la tabla */}
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Historial de Ventas</h2>
                  <p className="text-blue-100 text-sm mt-1">Todas las transacciones registradas en el sistema</p>
                </div>
              </div>
            </div>

            {/* Contenido de la tabla */}
            <div className="bg-[#f8f9fa]">
              <TablaVentas refrescar={refrescar} />
            </div>
          </div>

          {/* Footer informativo */}
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-[#ecf0f1]">
              <div className="w-6 h-6 bg-[#3498db] rounded-full flex items-center justify-center">
                <span className="text-white text-xs">ℹ️</span>
              </div>
              <p className="text-[#7f8c8d] text-sm">
                <strong className="text-[#2c3e50]">GestiOne</strong> - Sistema de gestión empresarial
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de venta */}
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