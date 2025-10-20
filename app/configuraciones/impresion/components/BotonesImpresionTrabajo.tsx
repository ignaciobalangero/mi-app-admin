"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ImpresionGestione } from "@/app/configuraciones/impresion/utils/impresionEspecifica";
import ModalImpresoraA4 from "@/app/ingreso/ModalImpresoraA4";

interface Props {
  trabajo: any;
  negocioId: string;
  className?: string;
  ocultarEtiquetasA4?: boolean;
}

export default function BotonesImpresionTrabajo({ 
  trabajo, 
  negocioId, 
  className = "", 
  ocultarEtiquetasA4 = false 
}: Props) {
  const [configuracionImpresion, setConfiguracionImpresion] = useState({
    zerforceActiva: false,
    brotherActiva: false,
    impresionAutomatica: false
  });
  
  const [plantillas, setPlantillas] = useState({
    ticket: null,
    etiqueta: null,
    ticketA4: null,
    etiquetaA4: null
  });

  const [imprimiendo, setImprimiendo] = useState('');
  
  // ✅ NUEVO: Estado para controlar el modal A4
  const [mostrarModalA4, setMostrarModalA4] = useState(false);

  // Cargar configuración al montar el componente
  useEffect(() => {
    cargarConfiguracion();
  }, [negocioId]);

  const cargarConfiguracion = async () => {
    if (!negocioId) return;

    try {
      // Cargar configuración de impresoras
      const configRef = doc(db, `negocios/${negocioId}/configuracion/impresion`);
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        setConfiguracionImpresion(configSnap.data() as any);
      }

      // Cargar plantillas personalizadas
      const plantillasRef = doc(db, `negocios/${negocioId}/configuracion/plantillasImpresion`);
      const plantillasSnap = await getDoc(plantillasRef);
      
      if (plantillasSnap.exists()) {
        setPlantillas(plantillasSnap.data() as any);
      }
    } catch (error) {
      console.error("Error cargando configuración de impresión:", error);
    }
  };

  const validarDatos = (tipo: string) => {
    const camposObligatorios = {
      ticket: ['id', 'cliente'],
      ticketA4: ['id', 'cliente'],
      etiqueta: ['id', 'cliente'],
      etiquetaA4: ['cliente', 'numeroOrden']
    };

    const campos = camposObligatorios[tipo as keyof typeof camposObligatorios] || [];
    
    for (const campo of campos) {
      if (!trabajo[campo] || trabajo[campo].toString().trim() === '') {
        alert(`❌ El campo "${campo}" es obligatorio para imprimir`);
        return false;
      }
    }
    
    return true;
  };

  const imprimirTicketTermico = async () => {
    if (!validarDatos('ticket')) return;
    
    setImprimiendo('ticket');
    try {
      if (plantillas.ticket) {
        ImpresionGestione.ticketZerforce(trabajo);
      } else {
        ImpresionGestione.ticketZerforce(trabajo);
      }
    } catch (error) {
      console.error('Error al imprimir ticket:', error);
      alert('❌ Error al imprimir ticket');
    } finally {
      setImprimiendo('');
    }
  };

  const imprimirEtiquetaBrother = async () => {
    if (!validarDatos('etiqueta')) return;
    
    setImprimiendo('etiqueta');
    try {
      if (plantillas.etiqueta) {
        ImpresionGestione.etiquetaBrother(trabajo);
      } else {
        ImpresionGestione.etiquetaBrother(trabajo);
      }
    } catch (error) {
      console.error('Error al imprimir etiqueta:', error);
      alert('❌ Error al imprimir etiqueta');
    } finally {
      setImprimiendo('');
    }
  };

  // ✅ MODIFICADO: Ahora abre el modal en lugar de imprimir directamente
  const abrirModalTicketA4 = () => {
    if (!validarDatos('ticketA4')) return;
    setMostrarModalA4(true);
  };

  // ✅ NUEVO: Manejar la impresión desde el modal
  const manejarImpresionA4 = (impresoraSeleccionada: string) => {
    console.log(`✅ Ticket A4 impreso con: ${impresoraSeleccionada}`);
    setImprimiendo('');
  };

  // ✅ NUEVO: Cerrar modal
  const cerrarModalA4 = () => {
    setMostrarModalA4(false);
    setImprimiendo('');
  };

  const imprimirEtiquetaA4 = async () => {
    const trabajoParaEtiqueta = {
      ...trabajo,
      numeroOrden: trabajo.id,
    };

    if (!validarDatos('etiquetaA4')) return;
    
    setImprimiendo('etiquetaA4');
    try {
      const trabajosArray = [trabajoParaEtiqueta];
      
      if (plantillas.etiquetaA4) {
        ImpresionGestione.etiquetasA4(trabajosArray);
      } else {
        ImpresionGestione.etiquetasA4(trabajosArray);
      }
    } catch (error) {
      console.error('Error al imprimir etiquetas A4:', error);
      alert('❌ Error al imprimir etiquetas A4');
    } finally {
      setImprimiendo('');
    }
  };

  return (
    <>
      <div className={`bg-white rounded-xl p-4 border border-gray-200 ${className}`}>
        <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
          🖨️ Opciones de Impresión
        </h4>
        
        <div className={`grid gap-3 ${ocultarEtiquetasA4 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
          
          {/* Ticket Térmico */}
          <button
            onClick={imprimirTicketTermico}
            disabled={!configuracionImpresion.zerforceActiva || imprimiendo !== ''}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-lg font-medium transition-all
              ${configuracionImpresion.zerforceActiva 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-200 text-black cursor-not-allowed'
              }
              ${imprimiendo === 'ticket' ? 'opacity-50' : ''}
            `}
          >
            <span className="text-lg">🧾</span>
            <span className="text-xs text-center">
              {imprimiendo === 'ticket' ? 'Imprimiendo...' : 'Ticket Térmico'}
            </span>
            {!configuracionImpresion.zerforceActiva && (
              <span className="text-xs">(Inactiva)</span>
            )}
          </button>

          {/* Etiqueta Brother */}
          <button
            onClick={imprimirEtiquetaBrother}
            disabled={!configuracionImpresion.brotherActiva || imprimiendo !== ''}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-lg font-medium transition-all
              ${configuracionImpresion.brotherActiva 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-200 text-black cursor-not-allowed'
              }
              ${imprimiendo === 'etiqueta' ? 'opacity-50' : ''}
            `}
          >
            <span className="text-lg">🏷️</span>
            <span className="text-xs text-center">
              {imprimiendo === 'etiqueta' ? 'Imprimiendo...' : 'Etiqueta Brother'}
            </span>
            {!configuracionImpresion.brotherActiva && (
              <span className="text-xs">(Inactiva)</span>
            )}
          </button>

          {/* ✅ MODIFICADO: Ticket A4 - Ahora abre modal */}
          <button
            onClick={abrirModalTicketA4}
            disabled={imprimiendo !== ''}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-lg font-medium transition-all
              bg-purple-500 hover:bg-purple-600 text-white
              ${imprimiendo === 'ticketA4' ? 'opacity-50' : ''}
            `}
          >
            <span className="text-lg">📄</span>
            <span className="text-xs text-center">
              {imprimiendo === 'ticketA4' ? 'Imprimiendo...' : 'Ticket A4'}
            </span>
            <span className="text-xs">(Con selector)</span>
          </button>

          {/* Etiquetas A4 - Solo mostrar si no está oculto */}
          {!ocultarEtiquetasA4 && (
            <button
              onClick={imprimirEtiquetaA4}
              disabled={imprimiendo !== ''}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-lg font-medium transition-all
                bg-indigo-500 hover:bg-indigo-600 text-white
                ${imprimiendo === 'etiquetaA4' ? 'opacity-50' : ''}
              `}
            >
              <span className="text-lg">📋</span>
              <span className="text-xs text-center">
                {imprimiendo === 'etiquetaA4' ? 'Imprimiendo...' : 'Etiquetas A4'}
              </span>
              <span className="text-xs">(Múltiples)</span>
            </button>
          )}
        </div>

        {/* Información de estado */}
        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-black">
            <strong>Estado:</strong> 
            {configuracionImpresion.zerforceActiva && ' Zerforce ✅'}
            {configuracionImpresion.brotherActiva && ' Brother ✅'}
            {' A4 ✅'}
            {!configuracionImpresion.zerforceActiva && !configuracionImpresion.brotherActiva && ' Configura tus impresoras'}
          </div>
          {plantillas.ticket || plantillas.etiqueta || plantillas.ticketA4 || plantillas.etiquetaA4 ? (
            <div className="text-xs text-black mt-1">
              <strong>Plantillas:</strong> 
              {plantillas.ticket && ' Ticket'}
              {plantillas.etiqueta && ' Etiqueta'}
              {plantillas.ticketA4 && ' ✅ Ticket-A4'}
              {!ocultarEtiquetasA4 && plantillas.etiquetaA4 && ' Etiquetas-A4'}
              {' personalizadas cargadas'}
            </div>
          ) : (
            <div className="text-xs text-black mt-1">
              ⚠️ No hay plantilla A4 configurada. Ve a Configuraciones → Impresión
            </div>
          )}
        </div>

        {/* Ayuda rápida */}
        <div className="mt-3 text-xs text-black">
          <strong>💡 Tip:</strong> {ocultarEtiquetasA4 
            ? 'El ticket A4 usa tu plantilla personalizada y te permite elegir la impresora.' 
            : 'Los formatos A4 siempre están disponibles. Para usar impresoras térmicas, actívalas en configuración.'
          }
        </div>
      </div>

      {/* ✅ NUEVO: Modal de impresión A4 */}
      <ModalImpresoraA4
        isOpen={mostrarModalA4}
        onClose={cerrarModalA4}
        onImprimir={manejarImpresionA4}
        datosTrabajos={trabajo}
        negocioID={negocioId}
      />
    </>
  );
}