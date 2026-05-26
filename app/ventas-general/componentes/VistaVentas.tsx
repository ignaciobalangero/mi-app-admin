"use client";

import { useState, useEffect, useRef } from "react";
import Header from "../../Header";
import TablaVentas from "./TablaVentas";
import ModalVenta from "./ModalVenta";
import { useSearchParams, useRouter } from "next/navigation";
import {
  guardarPedidoParaVenta,
  leerPedidoParaVenta,
  limpiarPedidoParaVenta,
  pedidoTiendaYaProcesado,
  usePedidosTiendaPendientesVenta,
} from "@/lib/usePedidosTiendaPendientesVenta";

export default function VistaVentas() {
  const [refrescar, setRefrescar] = useState(false);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [desdePedidoTienda, setDesdePedidoTienda] = useState(false);
  const [desdeTelefono, setDesdeTelefono] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    count: pedidosPendientes,
    pedidos,
    negocioId,
    tieneAcceso: tieneAccesoPedidos,
    recargar: recargarPedidos,
  } = usePedidosTiendaPendientesVenta();
  const autoPedidoAbierto = useRef(false);

  useEffect(() => {
    const desdeTelefono = searchParams.get("desdeTelefono");
    const desdePedido = searchParams.get("desdePedido");
    const datosPedido = leerPedidoParaVenta();
    const pedidoId = (datosPedido?.pedido as { id?: string } | undefined)?.id;

    if (desdeTelefono === "1" || localStorage.getItem("ventaTelefonoPendiente")) {
      setMostrarModalVenta(true);
      setDesdeTelefono(true);
    }

    if (desdePedido === "1") {
      if (datosPedido && pedidoId && !pedidoTiendaYaProcesado(pedidoId)) {
        setMostrarModalVenta(true);
        setDesdePedidoTienda(true);
      } else {
        router.replace("/ventas-general");
      }
      return;
    }

    if (datosPedido && pedidoId && !pedidoTiendaYaProcesado(pedidoId)) {
      setMostrarModalVenta(true);
      setDesdePedidoTienda(true);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (autoPedidoAbierto.current) return;
    if (!tieneAccesoPedidos || pedidos.length === 0) return;
    if (searchParams.get("desdePedido") === "1") return;
    if (leerPedidoParaVenta()) return;
    if (searchParams.get("desdeTelefono") === "1" || localStorage.getItem("ventaTelefonoPendiente")) return;

    const proximo = pedidos.find((p) => !pedidoTiendaYaProcesado(p.id));
    if (!proximo) return;

    autoPedidoAbierto.current = true;
    guardarPedidoParaVenta(negocioId, proximo);
    setMostrarModalVenta(true);
    setDesdePedidoTienda(true);
  }, [pedidos, tieneAccesoPedidos, negocioId, searchParams]);

  return (
    <>
      <Header />
      <main className="pt-16 sm:pt-16 pb-4 sm:pb-10 bg-gradient-to-br from-[#ecf0f1] via-[#f8f9fa] to-[#e8f4fd] min-h-screen text-[#2c3e50] w-full overflow-x-hidden">
        <div className="w-full px-2 sm:px-4 md:px-6 max-w-[1600px] mx-auto space-y-3 sm:space-y-6">

          {/* Header principal - Compacto en mobile */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 sm:gap-4 bg-white rounded-lg sm:rounded-2xl px-3 sm:px-6 md:px-8 py-3 sm:py-6 shadow-lg border-2 border-[#ecf0f1] max-w-full">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-lg sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-lg sm:text-3xl">💰</span>
              </div>
              <div className="text-left min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-[#2c3e50] truncate">
                  Gestión de Ventas
                </h1>
                <p className="text-[#7f8c8d] text-xs sm:text-base md:text-lg mt-1 line-clamp-1 sm:line-clamp-2">
                  Control completo de transacciones comerciales
                </p>
              </div>
            </div>
          </div>

          {/* Sección de acciones principales - Más compacta */}
          <div className="bg-white rounded-lg sm:rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden w-full">

            {tieneAccesoPedidos && pedidosPendientes > 0 && (
              <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-amber-900">
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 mr-2 rounded-full bg-[#e74c3c] text-white text-xs font-bold">
                    {pedidosPendientes}
                  </span>
                  {pedidosPendientes === 1
                    ? "Hay un pedido de iPhoneTEC sin registrar como venta."
                    : `Hay ${pedidosPendientes} pedidos de iPhoneTEC sin registrar como venta.`}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/iphonetec")}
                  className="text-xs font-semibold text-[#3498db] hover:underline"
                >
                  Ver en iPhoneTEC →
                </button>
              </div>
            )}
            
            {/* Header de la sección - Más compacto */}
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-2xl">🚀</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-xl font-bold">Acciones Rápidas</h2>
                  <p className="text-green-100 text-xs sm:text-sm mt-1 line-clamp-1 sm:line-clamp-2">
                    Inicia una nueva venta o registra la venta de un teléfono
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido de acciones - Más compacto */}
            <div className="p-3 sm:p-6 bg-[#f8f9fa]">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6">
                
                {/* Botón Nueva Venta - Más compacto */}
                <button
                  onClick={() => setMostrarModalVenta(true)}
                  className="group bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#1f4e79] text-white p-3 sm:p-6 rounded-lg sm:rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-transparent hover:border-[#3498db] relative overflow-hidden w-full"
                >
                  {tieneAccesoPedidos && pedidosPendientes > 0 && (
                    <span className="absolute top-2 left-2 sm:top-3 sm:left-3 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e74c3c] text-white text-[10px] font-bold flex items-center justify-center z-10">
                      {pedidosPendientes}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <div className="relative flex items-center justify-center gap-2 sm:gap-4">
                    <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/20 rounded-lg sm:rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:rotate-6 flex-shrink-0">
                      <span className="text-lg sm:text-3xl">📋</span>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm sm:text-xl font-bold">Nueva Venta General</div>
                      <div className="text-blue-100 text-xs sm:text-sm mt-1">Accesorios, repuestos y servicios</div>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-5 h-5 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-white text-xs sm:text-sm">→</span>
                  </div>
                </button>

                {/* Botón Vender Teléfono - Más compacto */}
                <button
                  onClick={() => router.push("/ventas/telefonos")}
                  className="group bg-gradient-to-r from-[#27ae60] to-[#229954] hover:from-[#229954] hover:to-[#196f3d] text-white p-3 sm:p-6 rounded-lg sm:rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-transparent hover:border-[#27ae60] relative overflow-hidden w-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <div className="relative flex items-center justify-center gap-2 sm:gap-4">
                    <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/20 rounded-lg sm:rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:rotate-6 flex-shrink-0">
                      <span className="text-lg sm:text-3xl">📱</span>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm sm:text-xl font-bold">Vender Teléfono</div>
                      <div className="text-green-100 text-xs sm:text-sm mt-1">Desde el stock disponible</div>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-5 h-5 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-white text-xs sm:text-sm">→</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Sección de tabla de ventas - SIN scroll forzado */}
          <div className="bg-white rounded-lg sm:rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden w-full">
            
            {/* Header de la tabla - Más compacto */}
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-2xl">📊</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-xl font-bold">Historial de Ventas</h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 line-clamp-1 sm:line-clamp-2">
                    Todas las transacciones registradas en el sistema
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido de la tabla SIN scroll horizontal forzado */}
            <div className="bg-[#f8f9fa] w-full">
              {/* REMOVIDO: min-w-[1200px] y overflow-x-auto forzado */}
              <TablaVentas refrescar={refrescar} />
            </div>
          </div>

          {/* Footer informativo - Más compacto */}
          <div className="text-center py-2 sm:py-6">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 sm:px-6 py-2 sm:py-3 border border-[#ecf0f1] max-w-full">
              <div className="w-4 h-4 sm:w-6 sm:h-6 bg-[#3498db] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">ℹ️</span>
              </div>
              <p className="text-[#7f8c8d] text-xs sm:text-sm truncate">
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
          onClose={() => {
            setMostrarModalVenta(false);
            setDesdePedidoTienda(false);
            if (searchParams.get("desdePedido") === "1") {
              limpiarPedidoParaVenta();
              router.replace("/ventas-general");
            }
          }}
          desdeTelefono={desdeTelefono}
          desdePedidoTienda={desdePedidoTienda}
          onVentaGuardada={() => void recargarPedidos()}
        />
      )}
    </>
  );
}