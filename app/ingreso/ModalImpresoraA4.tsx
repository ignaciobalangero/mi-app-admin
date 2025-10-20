"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VistaPreviaTicketA4 from "@/app/configuraciones/impresion/components/VistaPreviaTicketA4";
import ReactDOMServer from 'react-dom/server';

interface ModalImpresoraA4Props {
  isOpen: boolean;
  onClose: () => void;
  onImprimir: (impresoraSeleccionada: string) => void;
  datosTrabajos: any;
  negocioID: string;
}

export default function ModalImpresoraA4({
  isOpen,
  onClose,
  onImprimir,
  datosTrabajos,
  negocioID
}: ModalImpresoraA4Props) {
  
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState<string>("");
  const [plantillaA4, setPlantillaA4] = useState<any>(null);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(true);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const vistaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && negocioID) {
      cargarPlantillaA4();
    }
  }, [isOpen, negocioID]);

  const cargarPlantillaA4 = async () => {
    try {
      setCargandoPlantilla(true);
      const plantillasRef = doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`);
      const plantillasSnap = await getDoc(plantillasRef);

      if (plantillasSnap.exists()) {
        const data = plantillasSnap.data();
        const plantilla = data.ticketA4;
        
        if (plantilla) {
          if (!plantilla.camposSeleccionados && plantilla.campos) {
            plantilla.camposSeleccionados = plantilla.campos;
          }
          setPlantillaA4(plantilla);
        }
      }
    } catch (error) {
      console.error("Error cargando plantilla:", error);
    } finally {
      setCargandoPlantilla(false);
    }
  };

  const prepararDatosParaTicket = (trabajo: any) => {
    return {
      id: trabajo.id || 'N/A',
      fecha: trabajo.fecha || new Date().toLocaleDateString('es-AR'),
      fechaEntrega: trabajo.fechaEntrega || 'A confirmar',
      cliente: trabajo.cliente || 'No especificado',
      telefono: trabajo.telefono || 'No especificado',
      email: trabajo.email || 'No especificado',
      direccion: trabajo.direccion || 'No especificado',
      marca: trabajo.marca || 'No especificado',
      modelo: trabajo.modelo || 'No especificado',
      numeroSerie: trabajo.imei || trabajo.numeroSerie || 'No especificado',
      bateria: trabajo.bateria || 'No verificado',
      bloqueo: trabajo.clave || trabajo.bloqueo || 'No especificado',
      estadoIngreso: trabajo.estadoIngreso || 'Por verificar',
      accesorios: trabajo.accesorios || 'Ninguno',
      trabajo: trabajo.trabajo || 'No especificado',
      diagnostico: trabajo.diagnostico || 'Pendiente',
      solucion: trabajo.solucion || 'Pendiente',
      repuestos: trabajo.repuestos || 'Ninguno',
      tecnico: trabajo.tecnico || 'Sin asignar',
      precio: trabajo.precio ? `$${trabajo.precio}` : '$0.00',
      anticipo: trabajo.anticipo ? `$${trabajo.anticipo}` : '$0.00',
      saldo: trabajo.saldo ? `$${trabajo.saldo}` : trabajo.precio ? `$${trabajo.precio}` : '$0.00',
      metodoPago: trabajo.metodoPago || 'Efectivo',
      observaciones: trabajo.observaciones || '',
    };
  };

  const handleImprimir = () => {
    if (!impresoraSeleccionada) {
      alert("⚠️ Selecciona una impresora");
      return;
    }
    if (!plantillaA4) {
      alert("⚠️ No hay plantilla configurada");
      return;
    }
    if (!datosTrabajos || !datosTrabajos.cliente) {
      alert("⚠️ Faltan datos del trabajo");
      return;
    }
    generarYAbrirTicketA4();
  };

  const generarYAbrirTicketA4 = () => {
    const camposSeleccionados = plantillaA4.camposSeleccionados || plantillaA4.campos;
    const configuracion = plantillaA4.configuracion;
    const datosCompletos = prepararDatosParaTicket(datosTrabajos);

    const componenteHTML = ReactDOMServer.renderToStaticMarkup(
      <VistaPreviaTicketA4
        camposSeleccionados={camposSeleccionados}
        configuracion={configuracion}
        datosEjemplo={datosCompletos}
      />
    );

    const dimensiones = {
      'media-hoja': {
        width: configuracion.orientacion === 'vertical' ? '148mm' : '210mm',
        height: configuracion.orientacion === 'vertical' ? '210mm' : '148mm'
      },
      'hoja-completa': {
        width: configuracion.orientacion === 'vertical' ? '210mm' : '297mm',
        height: configuracion.orientacion === 'vertical' ? '297mm' : '210mm'
      }
    };

    const dim = dimensiones[configuracion.tamañoHoja as keyof typeof dimensiones] || dimensiones['hoja-completa'];

    const htmlCompleto = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ticket A4 - ${datosCompletos.id}</title>
<style>
/* ========== CONFIGURACIÓN CRÍTICA DE PÁGINA ========== */
@page {
  size: ${dim.width} ${dim.height};
  margin: 3mm;
}

/* ========== RESET TOTAL ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: visible;
}

body {
  font-family: Arial, sans-serif;
  background: white;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

/* ========== ESTILOS DE IMPRESIÓN ========== */
@media print {
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  @page {
    size: ${dim.width} ${dim.height};
    margin: 3mm;
  }
  
  /* Container principal SIN transform */
  body > div {
    width: 100% !important;
    max-width: ${dim.width} !important;
    height: auto !important;
    transform: none !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    margin: 0 auto !important;
    padding: 0 !important;
  }
  
  .no-print {
    display: none !important;
  }
}

/* ========== ESTILOS DE PANTALLA (vista previa) ========== */
@media screen {
  body {
    min-height: 100vh;
    padding: 15px;
    background: #e5e7eb;
  }
  
  /* Vista previa con escala reducida SOLO en pantalla */
  body > div:first-child {
    background: white;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    transform: scale(0.6);
    transform-origin: top center;
    margin-bottom: -250px;
  }
}

/* ========== PREVENIR SALTOS DE PÁGINA ========== */
.no-page-break {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
</style>
</head>
<body>
${componenteHTML}
<div class="no-print" style="position:fixed;bottom:15px;right:15px;background:#2563eb;color:white;padding:10px 18px;border-radius:8px;font-size:12px;box-shadow:0 4px 10px rgba(0,0,0,0.2);z-index:9999;font-family:Arial,sans-serif;">
<strong>🖨️</strong> ${impresoraSeleccionada} | <strong>📐</strong> ${dim.width} × ${dim.height}
</div>
</body>
</html>`;

    const ventana = window.open('', '_blank', 'width=900,height=1200');
    if (ventana) {
      ventana.document.write(htmlCompleto);
      ventana.document.close();
      ventana.onload = () => {
        setTimeout(() => {
          ventana.print();
          onImprimir(impresoraSeleccionada);
          onClose();
          ventana.onafterprint = () => ventana.close();
        }, 500);
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Ticket A4</h2>
                <p className="text-sm opacity-90">Selecciona tu impresora</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all">
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {cargandoPlantilla ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando configuración...</p>
              </div>
            </div>
          ) : !plantillaA4 ? (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No hay plantilla configurada</h3>
              <p className="text-gray-600 mb-4">Debes configurar una plantilla A4 en Configuraciones → Impresión</p>
              <button onClick={onClose} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-all">Cerrar</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-800">Plantilla cargada</p>
                    <p className="text-sm text-green-600">
                      {plantillaA4.configuracion?.nombreNegocio || 'Configuración personalizada'} • {plantillaA4.configuracion?.tamañoHoja === 'media-hoja' ? 'Media Hoja (A5)' : 'Hoja Completa (A4)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>🖨️</span> Seleccionar Impresora
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['WiFi', 'Láser', 'Otra'].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setImpresoraSeleccionada(tipo)}
                      className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                        impresoraSeleccionada === tipo
                          ? 'border-blue-500 bg-blue-500 text-white shadow-lg'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
                {impresoraSeleccionada && (
                  <div className="mt-4 bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-sm text-gray-600">✅ <strong>Impresora:</strong> {impresoraSeleccionada}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <span>{mostrarVistaPrevia ? '👁️ Ocultar' : '👁️ Mostrar'} Vista Previa</span>
                </button>
              </div>

              {mostrarVistaPrevia && (
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">📋 Vista Previa</h3>
                  <div className="flex justify-center overflow-auto" ref={vistaRef} style={{ 
                    transform: 'scale(0.35)', 
                    transformOrigin: 'top center',
                    marginBottom: '-400px'
                  }}>
                    <VistaPreviaTicketA4
                      camposSeleccionados={plantillaA4.camposSeleccionados || plantillaA4.campos}
                      configuracion={plantillaA4.configuracion}
                      datosEjemplo={prepararDatosParaTicket(datosTrabajos)}
                    />
                  </div>
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-700">✅ <strong>Esta vista es lo que se imprimirá</strong></p>
                    <p className="text-xs text-green-600 mt-1">Vista reducida solo para previsualización</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!cargandoPlantilla && plantillaA4 && (
          <div className="bg-gray-50 border-t border-gray-200 p-6 flex-shrink-0">
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleImprimir}
                disabled={!impresoraSeleccionada}
                className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  impresoraSeleccionada
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>🖨️</span> Imprimir
              </button>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}