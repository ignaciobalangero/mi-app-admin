"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ImpresionGestione } from "@/app/configuraciones/impresion/utils/impresionEspecifica";

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

  // ✅ TICKET TÉRMICO - Impresión directa
  const imprimirTicketTermico = async () => {
    if (!validarDatos('ticket')) return;
    
    setImprimiendo('ticket');
    try {
      ImpresionGestione.ticketZerforce(trabajo);
    } catch (error) {
      console.error('Error al imprimir ticket:', error);
      alert('❌ Error al imprimir ticket');
    } finally {
      setImprimiendo('');
    }
  };

  // ✅ ETIQUETA BROTHER - Impresión DIRECTA (sin modal)
  const imprimirEtiquetaBrother = async () => {
    if (!validarDatos('etiqueta')) return;
    
    setImprimiendo('etiqueta');
    try {
      // Cargar nombre del negocio
      let nombreNegocio = '';
      try {
        const negocioRef = doc(db, `negocios/${negocioId}`);
        const negocioSnap = await getDoc(negocioRef);
        if (negocioSnap.exists()) {
          nombreNegocio = negocioSnap.data().nombre || "";
        }
      } catch (error) {
        console.error("Error cargando nombre del negocio:", error);
      }

      // Generar HTML de la etiqueta
      const contenidoEtiqueta = generarHTMLEtiquetaBrother(trabajo, nombreNegocio);
      
      // Abrir ventana de impresión directamente
      const ventana = window.open('', '_blank', 'width=800,height=600');
      if (ventana) {
        ventana.document.write(contenidoEtiqueta);
        ventana.document.close();
        ventana.focus();
      } else {
        alert("⚠️ El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.");
      }
    } catch (error) {
      console.error('Error al imprimir etiqueta Brother:', error);
      alert('❌ Error al imprimir etiqueta');
    } finally {
      setImprimiendo('');
    }
  };

  // ✅ TICKET A4 - Impresión DIRECTA (sin modal)
  const imprimirTicketA4 = async () => {
    if (!validarDatos('ticketA4')) return;
    
    setImprimiendo('ticketA4');
    try {
      // Cargar configuración del negocio
      let logoUrl = '';
      let garantiaServicio = '';
      
      try {
        const configRef = doc(db, `negocios/${negocioId}/configuracion/datos`);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const configData = configSnap.data();
          logoUrl = configData.logoUrl || '';
          garantiaServicio = configData.textoGarantia || '';
        }
      } catch (error) {
        console.error("Error obteniendo configuración:", error);
      }

      // Generar HTML del ticket A4
      const contenidoA4 = generarHTMLTicketA4(trabajo, logoUrl, garantiaServicio);
      
      // Abrir ventana de impresión directamente
      const ventana = window.open('', '_blank', 'width=800,height=600');
      if (ventana) {
        ventana.document.write(contenidoA4);
        ventana.document.close();
        ventana.focus();
      } else {
        alert("⚠️ El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.");
      }
    } catch (error) {
      console.error('Error al imprimir ticket A4:', error);
      alert('❌ Error al imprimir ticket A4');
    } finally {
      setImprimiendo('');
    }
  };

  // ✅ ETIQUETAS A4 - Múltiples
  const imprimirEtiquetaA4 = async () => {
    const trabajoParaEtiqueta = {
      ...trabajo,
      numeroOrden: trabajo.id,
    };

    if (!validarDatos('etiquetaA4')) return;
    
    setImprimiendo('etiquetaA4');
    try {
      const trabajosArray = [trabajoParaEtiqueta];
      ImpresionGestione.etiquetasA4(trabajosArray);
    } catch (error) {
      console.error('Error al imprimir etiquetas A4:', error);
      alert('❌ Error al imprimir etiquetas A4');
    } finally {
      setImprimiendo('');
    }
  };

  return (
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

        {/* ✅ Etiqueta Brother - IMPRESIÓN DIRECTA */}
        <button
          onClick={imprimirEtiquetaBrother}
          disabled={imprimiendo !== ''}
          className={`
            flex flex-col items-center gap-2 p-3 rounded-lg font-medium transition-all
            bg-green-500 hover:bg-green-600 text-white
            ${imprimiendo === 'etiqueta' ? 'opacity-50' : ''}
          `}
        >
          <span className="text-lg">🏷️</span>
          <span className="text-xs text-center">
            {imprimiendo === 'etiqueta' ? 'Imprimiendo...' : 'Etiqueta Brother'}
          </span>
        </button>

        {/* ✅ Ticket A4 - IMPRESIÓN DIRECTA */}
        <button
          onClick={imprimirTicketA4}
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
        </button>

        {/* Etiquetas A4 */}
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
          </button>
        )}
      </div>

      {/* Información */}
      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
        <div className="text-xs text-black">
          <strong>💡 Tip:</strong> Al hacer clic, se abrirá directamente el diálogo de impresión de tu navegador para elegir la impresora.
        </div>
      </div>
    </div>
  );
}

// ========================================
// FUNCIONES AUXILIARES PARA GENERAR HTML
// ========================================

function generarHTMLEtiquetaBrother(datos: any, nombreNegocio: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Etiqueta - ${datos.id}</title>
        <meta charset="UTF-8">
        <style>
          @page { 
            size: 62mm 29mm; 
            margin: 0; 
          }
          html, body {
            width: 62mm;
            height: 29mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          body { 
            font-family: Arial, sans-serif;
            padding: 1mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 9px;
            padding-bottom: 1mm;
            border-bottom: 1px solid #000;
            margin-bottom: 1mm;
          }
          .content {
            display: flex;
            gap: 2mm;
            font-size: 8px;
            flex: 1;
          }
          .column {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }
          .field {
            display: flex;
            flex-direction: column;
          }
          .label {
            font-weight: bold;
            font-size: 7px;
            color: #555;
          }
          .value {
            font-size: 8px;
            line-height: 1.1;
            word-wrap: break-word;
            white-space: normal;
          }
          .footer {
            text-align: center;
            font-size: 6px;
            color: #888;
            margin-top: 1mm;
            padding-top: 1mm;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">${nombreNegocio || 'GestiOne'}</div>
        
        <div class="content">
          <div class="column">
            <div class="field">
              <span class="label">Código:</span>
              <span class="value">${datos.id || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="label">Modelo:</span>
              <span class="value">${datos.modelo || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="label">Trabajo:</span>
              <span class="value">${datos.trabajo || 'N/A'}</span>
            </div>
          </div>
          
          <div class="column">
            <div class="field">
              <span class="label">Cliente:</span>
              <span class="value">${datos.cliente || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="label">Clave:</span>
              <span class="value">${datos.clave || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="label">IMEI:</span>
              <span class="value">${datos.imei || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">GestiOne</div>

        <script>
          window.addEventListener('load', function() {
            setTimeout(() => window.print(), 500);
          });
          window.addEventListener('afterprint', function() {
            window.close();
          });
        </script>
      </body>
    </html>
  `;
}

function generarHTMLTicketA4(datos: any, logoUrl: string, garantia: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Orden de Servicio - ${datos.id}</title>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 20mm; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.5; 
            color: #333;
          }
          @media print { body { margin: 0; padding: 0; } }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 150px; max-height: 80px; margin-bottom: 20px; }
          .title { 
            font-weight: bold; 
            font-size: 24px; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 10px; 
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .info-box { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid #3498db; 
          }
          .info-box.client { border-left-color: #27ae60; }
          .info-box h3 { margin: 0 0 10px 0; color: #2c3e50; }
          .info-box p { margin: 5px 0; }
          .observations { 
            background: #fff3cd; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid #ffc107; 
            margin-bottom: 30px; 
          }
          .signatures { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ecf0f1; }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          .signature-box { text-align: center; }
          .signature-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 50px; }
          .warranty { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            margin-top: 30px; 
            border: 1px solid #dee2e6; 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #ecf0f1; 
            font-size: 10px; 
            color: #7f8c8d; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
          <div class="title">ORDEN DE SERVICIO TÉCNICO</div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>📋 Información del Trabajo</h3>
            <p><strong>ID:</strong> ${datos.id}</p>
            <p><strong>Fecha:</strong> ${datos.fecha}</p>
            <p><strong>Modelo:</strong> ${datos.modelo || 'No especificado'}</p>
            <p><strong>Trabajo:</strong> ${datos.trabajo || 'No especificado'}</p>
            ${datos.precio ? `<p><strong>Precio:</strong> $${datos.precio}</p>` : ''}
          </div>
          
          <div class="info-box client">
            <h3>👤 Datos del Cliente</h3>
            <p><strong>Nombre:</strong> ${datos.cliente}</p>
            ${datos.clave ? `<p><strong>Clave:</strong> ${datos.clave}</p>` : ''}
            ${datos.imei ? `<p><strong>IMEI:</strong> ${datos.imei}</p>` : ''}
          </div>
        </div>
        
        ${datos.observaciones ? `
          <div class="observations">
            <h3 style="margin: 0 0 10px 0; color: #2c3e50;">📝 Observaciones</h3>
            <p style="margin: 0;">${datos.observaciones}</p>
          </div>
        ` : ''}
        
        <div class="signatures">
          <div class="signature-grid">
            <div class="signature-box">
              <div class="signature-line"></div>
              <p style="margin: 0; font-weight: bold;">Firma del Cliente</p>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <p style="margin: 0; font-weight: bold;">Firma del Técnico</p>
            </div>
          </div>
        </div>
        
        ${garantia ? `
          <div class="warranty">
            <h3 style="margin: 0 0 10px 0; color: #2c3e50;">🛡️ Términos de Garantía</h3>
            <p style="font-size: 10px; line-height: 1.4; margin: 0;">${garantia}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          Documento generado el ${new Date().toLocaleString('es-AR')}
        </div>

        <script>
          window.addEventListener('load', function() {
            setTimeout(() => window.print(), 500);
          });
          window.addEventListener('afterprint', function() {
            window.close();
          });
        </script>
      </body>
    </html>
  `;
}