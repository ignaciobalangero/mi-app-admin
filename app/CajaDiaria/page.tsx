// app/CajaDiaria/page.tsx - ACTUALIZADA PARA USD/ARS
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
    // Estados principales
    fechaSeleccionada,
    setFechaSeleccionada,
    ventasDelDia,
    cajaCerrada,
    setCajaCerrada,
    
    // 🔧 NUEVOS ESTADOS USD/ARS
    resumenCajaUSD,
    resumenCajaARS,
    diferenciaCajaUSD,
    diferenciaCajaARS,
    
    // Estados existentes
    historialCajas,
    capitalData,
    cotizacionCapital,
    setCotizacionCapital,
    
    // Estados de carga
    cargandoVentas,
    cargandoCapital,
    cargandoHistorial,
    
    // Funciones originales - NOMBRES CORRECTOS
    cerrarCaja,        // ← Era handleCerrarCaja
    nuevaCaja,         // ← Era handleNuevaCaja
    actualizarEfectivo,
    cargarCapital,
    borrarCaja, // 🔧 FUNCIÓN BORRAR
    
    // 🔧 NUEVAS FUNCIONES USD/ARS
    actualizarEfectivoEnCajaUSD,
    actualizarEfectivoEnCajaARS,
    
    // Datos derivados
    isAdmin,
    negocioID
  } = useCajaDiaria();

  // 🔧 DEBUG: Verificar que borrarCaja existe
  console.log('🔍 borrarCaja existe?', typeof borrarCaja, borrarCaja);
  
  // 🔧 TEMPORAL: Crear función de borrar local si no existe
  const funcionBorrar = borrarCaja || (async (fecha: string) => {
    console.log('⚠️ Función borrarCaja no encontrada, usando temporal');
    alert(`Borrar caja del ${fecha} - Función temporal`);
    return false;
  });

  // 🔧 DEBUG: Verificar valores antes de pasar al componente
  console.log('🔍 Pasando props a HistorialCajas:', {
    isAdmin,
    borrarCaja: !!borrarCaja,
    historialLength: historialCajas.length
  });

  // 🔧 TEMPORAL: Forzar admin para testing  
  const isAdminTemporal = true; // ← FORZAR ADMIN TEMPORAL
  
  console.log('🚀 FORZANDO ADMIN TEMPORAL - isAdminTemporal:', isAdminTemporal);

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
                <p className="text-gray-600">Control de ingresos y egresos del día - USD/ARS</p>
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

        {/* 🔧 RESUMEN DE VENTAS SEPARADO POR MONEDA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resumen USD */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="text-green-600">💵</span>
                Ventas USD
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Ventas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${resumenCajaUSD?.totalVentas?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Efectivo</p>
                  <p className="text-xl font-semibold text-green-600">
                    ${resumenCajaUSD?.efectivo?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Transferencias</p>
                  <p className="text-xl font-semibold text-blue-600">
                    ${resumenCajaUSD?.transferencia?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Cta. Corriente</p>
                  <p className="text-xl font-semibold text-orange-600">
                    ${resumenCajaUSD?.cuentaCorriente?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen ARS */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600">💰</span>
                Ventas ARS
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Ventas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${resumenCajaARS?.totalVentas?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Efectivo</p>
                  <p className="text-xl font-semibold text-green-600">
                    ${resumenCajaARS?.efectivo?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Transferencias</p>
                  <p className="text-xl font-semibold text-blue-600">
                    ${resumenCajaARS?.transferencia?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Cta. Corriente</p>
                  <p className="text-xl font-semibold text-orange-600">
                    ${resumenCajaARS?.cuentaCorriente?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔧 CONTROL DE EFECTIVO SEPARADO POR MONEDA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Control Efectivo USD */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="text-green-600">💵</span>
                Control Efectivo USD
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-800">Efectivo esperado:</span>
                  <span className="font-semibold text-gray-900">${resumenCajaUSD?.efectivo?.toLocaleString() || 0}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-gray-800">Efectivo en caja:</label>
                  <input
                    type="number"
                    value={resumenCajaUSD?.efectivoEnCaja || 0}
                    onChange={(e) => actualizarEfectivoEnCajaUSD(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium" 
                    disabled={cajaCerrada}
                    placeholder="0"
                  />
                </div>
                
                {(resumenCajaUSD?.efectivoEnCaja || 0) !== (resumenCajaUSD?.efectivo || 0) && (
                  <div className={`p-3 rounded-lg ${
                    diferenciaCajaUSD > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">
                      Diferencia: ${Math.abs(diferenciaCajaUSD).toLocaleString()} 
                      {diferenciaCajaUSD > 0 ? ' (sobra)' : ' (falta)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Control Efectivo ARS */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600">💰</span>
                Control Efectivo ARS
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-800">Efectivo esperado:</span>
                  <span className="font-semibold text-gray-900">${resumenCajaARS?.efectivo?.toLocaleString() || 0}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-gray-800">Efectivo en caja:</label>
                  <input
                    type="number"
                    value={resumenCajaARS?.efectivoEnCaja || 0}
                    onChange={(e) => actualizarEfectivoEnCajaARS(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium" 
                    disabled={cajaCerrada}
                    placeholder="0"
                  />
                </div>
                
                {(resumenCajaARS?.efectivoEnCaja || 0) !== (resumenCajaARS?.efectivo || 0) && (
                  <div className={`p-3 rounded-lg ${
                    diferenciaCajaARS > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">
                      Diferencia: ${Math.abs(diferenciaCajaARS).toLocaleString()} 
                      {diferenciaCajaARS > 0 ? ' (sobra)' : ' (falta)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Control de Caja */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!cajaCerrada ? (
              <button
                onClick={cerrarCaja}  // ← NOMBRE CORRECTO
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Cerrar Caja del Día
              </button>
            ) : (
              <button
                onClick={nuevaCaja}   // ← NOMBRE CORRECTO
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Nueva Caja
              </button>
            )}
          </div>
          
          {cajaCerrada && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Resumen del Cierre:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-600 font-medium">USD:</p>
                  <p>Diferencia: ${Math.abs(diferenciaCajaUSD).toLocaleString()} 
                    {diferenciaCajaUSD > 0 ? ' (sobra)' : ' (falta)'}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">ARS:</p>
                  <p>Diferencia: ${Math.abs(diferenciaCajaARS).toLocaleString()} 
                    {diferenciaCajaARS > 0 ? ' (sobra)' : ' (falta)'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

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
        <HistorialCajas 
          historialCajas={historialCajas} 
          isAdmin={isAdminTemporal}  // ← Usando variable temporal
          onBorrarCaja={(cajaId, fecha) => borrarCaja(cajaId, fecha)}
        />
      </div>
    </div>
  );
};

export default CajaDiariaPage;