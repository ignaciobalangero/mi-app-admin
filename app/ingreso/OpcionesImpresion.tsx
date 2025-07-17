"use client";

import { useState } from "react";
import ModalImpresoraA4 from "./ModalImpresoraA4";

interface OpcionesImpresionProps {
  onImprimir: (opciones: {
    ticket: boolean;
    etiqueta: boolean;
    ticketA4: boolean;
  }) => void;
  // ✅ NUEVA FUNCIÓN ESPECÍFICA PARA A4 CON IMPRESORA
  onImprimirA4ConImpresora?: (
    opciones: {
      ticket: boolean;
      etiqueta: boolean;
      ticketA4: boolean;
    },
    impresoraA4: string
  ) => void;
  mostrandoOpciones: boolean;
  onToggleOpciones: () => void;
  datosTrabajos?: any;
  negocioID?: string;
}

export default function OpcionesImpresion({ 
  onImprimir, 
  onImprimirA4ConImpresora, // ✅ NUEVA PROP
  mostrandoOpciones, 
  onToggleOpciones,
  datosTrabajos,
  negocioID 
}: OpcionesImpresionProps) {
  const [opciones, setOpciones] = useState({
    ticket: true,
    etiqueta: false,
    ticketA4: false,
  });

  // ✅ ESTADOS PARA EL MODAL A4
  const [mostrandoModalA4, setMostrandoModalA4] = useState(false);
  const [opcionesPendientes, setOpcionesPendientes] = useState({
    ticket: false,
    etiqueta: false,
    ticketA4: false,
  });

  const handleOpcionChange = (tipo: keyof typeof opciones) => {
    setOpciones(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  // ✅ FUNCIÓN MEJORADA CON VALIDACIONES
  const handleImprimir = () => {
    // Verificar que al menos una opción esté seleccionada
    const haySeleccion = Object.values(opciones).some(valor => valor);
    
    if (!haySeleccion) {
      alert("⚠️ Selecciona al menos una opción de impresión");
      return;
    }

    // ✅ VALIDACIÓN ADICIONAL PARA A4
    if (opciones.ticketA4 && negocioID && onImprimirA4ConImpresora) {
      // Verificar que tenemos los datos necesarios
      if (!datosTrabajos || !datosTrabajos.cliente) {
        alert("⚠️ Falta información del trabajo. Completa al menos el campo cliente.");
        return;
      }
      
      setOpcionesPendientes(opciones);
      setMostrandoModalA4(true);
      return;
    }

    // ✅ SI NO HAY A4 O NO HAY FUNCIÓN ESPECÍFICA, PROCEDER NORMALMENTE
    try {
      onImprimir(opciones);
      
      // Limpiar opciones después de imprimir exitosamente
      setOpciones({
        ticket: true,
        etiqueta: false,
        ticketA4: false,
      });
    } catch (error) {
      console.error("Error al imprimir:", error);
      alert("Hubo un error al procesar la impresión. Inténtalo de nuevo.");
    }
  };

  // ✅ FUNCIÓN MEJORADA CON MANEJO DE ERRORES
  const manejarSeleccionImpresora = (impresoraSeleccionada: string) => {
    console.log(`🖨️ Imprimiendo A4 con: ${impresoraSeleccionada}`);
    
    try {
      // ✅ USAR LA FUNCIÓN ESPECÍFICA PARA A4 SI EXISTE
      if (onImprimirA4ConImpresora) {
        onImprimirA4ConImpresora(opcionesPendientes, impresoraSeleccionada);
      } else {
        // Fallback: usar la función normal
        onImprimir(opcionesPendientes);
      }
      
      // Limpiar estado solo después de éxito
      setOpciones({
        ticket: true,
        etiqueta: false,
        ticketA4: false,
      });
      setOpcionesPendientes({
        ticket: false,
        etiqueta: false,
        ticketA4: false,
      });
      
    } catch (error) {
      console.error("Error al procesar impresión:", error);
      alert("Hubo un error al procesar la impresión. Inténtalo de nuevo.");
    }
  };

  // ✅ FUNCIÓN PARA CERRAR MODAL A4
  const handleCerrarModalA4 = () => {
    setMostrandoModalA4(false);
    setOpcionesPendientes({
      ticket: false,
      etiqueta: false,
      ticketA4: false,
    });
  };

  if (!mostrandoOpciones) {
    return (
      <button
        onClick={onToggleOpciones}
        className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
      >
        🖨️ Opciones de Impresión
      </button>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1] mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[#9b59b6] rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">🖨️</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#2c3e50]">Opciones de Impresión</h3>
            <p className="text-[#7f8c8d] mt-1">Selecciona qué documentos imprimir</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Ticket Normal */}
          <div className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            opciones.ticket 
              ? 'border-[#3498db] bg-[#ebf3fd]' 
              : 'border-[#bdc3c7] bg-white hover:bg-[#f8f9fa]'
          }`}>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.ticket}
                onChange={() => handleOpcionChange('ticket')}
                className="w-5 h-5 text-[#3498db] rounded focus:ring-[#3498db]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🧾</span>
                  <span className="font-bold text-[#2c3e50]">Ticket Normal</span>
                </div>
                <p className="text-sm text-[#7f8c8d]">
                  Ticket compacto de 80mm para impresoras térmicas
                </p>
                <div className="mt-2 text-xs text-[#3498db] font-medium">
                  📐 80mm x variable
                </div>
              </div>
            </label>
          </div>

          {/* Etiqueta */}
          <div className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            opciones.etiqueta 
              ? 'border-[#27ae60] bg-[#d5f4e6]' 
              : 'border-[#bdc3c7] bg-white hover:bg-[#f8f9fa]'
          }`}>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.etiqueta}
                onChange={() => handleOpcionChange('etiqueta')}
                className="w-5 h-5 text-[#27ae60] rounded focus:ring-[#27ae60]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🏷️</span>
                  <span className="font-bold text-[#2c3e50]">Etiqueta</span>
                </div>
                <p className="text-sm text-[#7f8c8d]">
                  Etiqueta adhesiva con datos básicos del equipo
                </p>
                <div className="mt-2 text-xs text-[#27ae60] font-medium">
                  📐 62mm x 29mm
                </div>
              </div>
            </label>
          </div>

          {/* Ticket A4 */}
          <div className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            opciones.ticketA4 
              ? 'border-[#e67e22] bg-[#fdebd0]' 
              : 'border-[#bdc3c7] bg-white hover:bg-[#f8f9fa]'
          }`}>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.ticketA4}
                onChange={() => handleOpcionChange('ticketA4')}
                className="w-5 h-5 text-[#e67e22] rounded focus:ring-[#e67e22]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📄</span>
                  <span className="font-bold text-[#2c3e50]">Ticket A4</span>
                </div>
                <p className="text-sm text-[#7f8c8d]">
                  Ticket completo en hoja A4 con todos los detalles
                </p>
                <div className="mt-2 text-xs text-[#e67e22] font-medium">
                  📐 210mm x 297mm
                </div>
                {/* Indicador visual cuando A4 está seleccionado */}
                {opciones.ticketA4 && negocioID && onImprimirA4ConImpresora && (
                  <div className="mt-2 text-xs bg-[#fff3cd] text-[#856404] p-2 rounded border border-[#ffc107]">
                    💡 <strong>Se abrirá selector de impresora</strong>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Vista previa de selección */}
        <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6">
          <h4 className="font-bold text-[#2c3e50] mb-2">📋 Documentos a imprimir:</h4>
          <div className="flex flex-wrap gap-2">
            {opciones.ticket && (
              <span className="bg-[#3498db] text-white px-3 py-1 rounded-full text-sm font-medium">
                🧾 Ticket Normal
              </span>
            )}
            {opciones.etiqueta && (
              <span className="bg-[#27ae60] text-white px-3 py-1 rounded-full text-sm font-medium">
                🏷️ Etiqueta
              </span>
            )}
            {opciones.ticketA4 && (
              <span className="bg-[#e67e22] text-white px-3 py-1 rounded-full text-sm font-medium">
                📄 Ticket A4 {negocioID && onImprimirA4ConImpresora ? '(con selector)' : ''}
              </span>
            )}
            {!Object.values(opciones).some(v => v) && (
              <span className="text-[#7f8c8d] italic">Ningún documento seleccionado</span>
            )}
          </div>
        </div>

        {/* Información adicional para A4 */}
        {opciones.ticketA4 && negocioID && onImprimirA4ConImpresora && (
          <div className="bg-gradient-to-r from-[#fff3cd] to-[#ffeaa7] rounded-xl p-4 mb-6 border border-[#ffc107]">
            <div className="flex items-center gap-3 text-[#856404]">
              <div className="w-8 h-8 bg-[#ffc107] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📄</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Ticket A4 seleccionado:</strong> Se abrirá un modal para que elijas la impresora específica (WiFi, láser, etc.)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleImprimir}
            className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-8 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 justify-center"
          >
            {opciones.ticketA4 && negocioID && onImprimirA4ConImpresora ? (
              <>
                🖨️ Continuar con A4
                <span className="text-xs bg-white/20 px-2 py-1 rounded">Elegir impresora</span>
              </>
            ) : (
              <>
                🖨️ Imprimir Seleccionados
              </>
            )}
          </button>
          
          <button
            onClick={onToggleOpciones}
            className="bg-gradient-to-r from-[#95a5a6] to-[#7f8c8d] hover:from-[#7f8c8d] hover:to-[#6c7b7d] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 justify-center"
          >
            ❌ Cancelar
          </button>
        </div>

        {/* Tip informativo */}
        <div className="mt-4 text-xs text-[#7f8c8d] bg-[#f8f9fa] p-3 rounded-lg">
          💡 <strong>Tip:</strong> 
          {opciones.ticketA4 && negocioID && onImprimirA4ConImpresora
            ? " El documento A4 te permitirá elegir entre impresoras WiFi, láser y otras opciones disponibles"
            : " Puedes seleccionar múltiples opciones para imprimir todo a la vez"
          }
        </div>
      </div>

      {/* ✅ MODAL DE SELECCIÓN DE IMPRESORA A4 - USANDO LA FUNCIÓN RENOMBRADA */}
      {negocioID && onImprimirA4ConImpresora && (
        <ModalImpresoraA4
          isOpen={mostrandoModalA4}
          onClose={handleCerrarModalA4}
          onImprimir={manejarSeleccionImpresora}
          datosTrabajos={datosTrabajos}
          negocioID={negocioID}
        />
      )}
    </>
  );
}