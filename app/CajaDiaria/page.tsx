// app/CajaDiaria/page.tsx
"use client";

import React from 'react';
import { DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { useCajaDiaria } from './hooks/useCajaDiaria';
import ResumenVentas from './components/ResumenVentas';
import ControlEfectivo from './components/ControlEfectivo';
import PanelCapital from './components/PanelCapital';
import TablaVentasDia from './components/TablaVentasDia';
import HistorialCajas from './components/HistorialCajas';

const CajaDiariaPage = () => {
  const {
    // Estados
    fechaSeleccionada,
    setFechaSeleccionada,
    ventasDelDia,
    resumenCaja,
    cajaCerrada,
    diferenciaCaja,
    historialCajas,
    capitalData,
    cotizacionCapital,
    setCotizacionCapital,
    cargandoVentas,
    cargandoCapital,
    
    // Funciones
    handleCerrarCaja,
    handleNuevaCaja,
    actualizarEfectivoEnCaja,
    actualizarEfectivo,
    cargarCapital,
    
    // Datos derivados
    isAdmin,
    negocioID
  } = useCajaDiaria();

  if (!negocioID) {
    return (
        <div className="min-h-screen bg-gray-50">
  <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Acceso Requerido</h3>
            <p className="text-gray-600">Necesitas estar logueado para acceder a la caja diaria.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Caja Diaria</h1>
                <p className="text-gray-600">Control de ingresos y egresos del día</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <input
  type="date"
  value={fechaSeleccionada}
  onChange={(e) => setFechaSeleccionada(e.target.value)}
  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
  disabled={cajaCerrada}
/>
              </div>
              
              {cajaCerrada && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Caja Cerrada</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resumen de Ventas del Día */}
        <ResumenVentas resumenCaja={resumenCaja} />

        {/* Control de Efectivo en Caja */}
        <ControlEfectivo
          resumenCaja={resumenCaja}
          cajaCerrada={cajaCerrada}
          diferenciaCaja={diferenciaCaja}
          fechaSeleccionada={fechaSeleccionada}
          onCerrarCaja={handleCerrarCaja}
          onNuevaCaja={handleNuevaCaja}
          onActualizarEfectivo={actualizarEfectivoEnCaja}
        />

        {/* Panel de Capital - Solo Admin */}
        {isAdmin && (
          <PanelCapital
            capitalData={capitalData}
            cotizacionCapital={cotizacionCapital}
            cargandoCapital={cargandoCapital}
            onActualizarEfectivo={actualizarEfectivo}
            onRecargarCapital={cargarCapital}
            onCambiarCotizacion={setCotizacionCapital}
          />
        )}

        {/* Tabla de Ventas del Día */}
        <TablaVentasDia
          ventasDelDia={ventasDelDia}
          fechaSeleccionada={fechaSeleccionada}
          cargandoVentas={cargandoVentas}
        />

        {/* Historial de Cajas por Mes */}
        <HistorialCajas historialCajas={historialCajas} />
      </div>
    </div>
  );
};

export default CajaDiariaPage;