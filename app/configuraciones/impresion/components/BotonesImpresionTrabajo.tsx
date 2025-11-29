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

  useEffect(() => {
    cargarConfiguracion();
  }, [negocioId]);

  const cargarConfiguracion = async () => {
    if (!negocioId) return;

    try {
      const configRef = doc(db, `negocios/${negocioId}/configuracion/impresion`);
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        setConfiguracionImpresion(configSnap.data() as any);
      }

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
      ImpresionGestione.ticketZerforce(trabajo);
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

      // ✅ LEER CONFIGURACIÓN DE LA ETIQUETA
      const configuracionEtiqueta = plantillas.etiqueta || {
        campos: ['cliente', 'numeroOrden', 'modelo', 'trabajo'],
        configuracion: {
          tamaño: '62x29',
          orientacion: 'horizontal',
          mostrarBorde: true,
          tamañoTexto: 'mediano'
        }
      };

      const contenidoEtiqueta = generarHTMLEtiquetaBrother(
        trabajo, 
        nombreNegocio,
        configuracionEtiqueta.campos,
        configuracionEtiqueta.configuracion
      );
      
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

  const imprimirTicketA4 = async () => {
    if (!validarDatos('ticketA4')) return;
    
    setImprimiendo('ticketA4');
    try {
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

      const contenidoA4 = generarHTMLTicketA4(trabajo, logoUrl, garantiaServicio);
      
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

      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
        <div className="text-xs text-black">
          <strong>💡 Tip:</strong> Al hacer clic, se abrirá directamente el diálogo de impresión de tu navegador para elegir la impresora.
        </div>
      </div>
    </div>
  );
}

// ========================================
// ✅ FUNCIÓN QUE RESPETA CONFIGURACIÓN
// ========================================
function generarHTMLEtiquetaBrother(
  datos: any, 
  nombreNegocio: string,
  camposSeleccionados: string[],
  configuracion: any
) {
  
  // Mapeo de IDs de campos a datos del trabajo
  const mapaCampos: any = {
    'cliente': { label: 'CLIENTE', valor: datos.cliente, large: true },
    'numeroOrden': { label: 'CÓDIGO', valor: datos.id, large: true },
    'modelo': { label: 'MODELO', valor: datos.modelo, large: true },
    'clave': { label: 'CLAVE', valor: datos.clave, large: false },
    'trabajo': { label: 'TRABAJO', valor: datos.trabajo, large: false },
    'imei': { label: 'IMEI', valor: datos.imei, large: false, monospace: true }
  };

  // Dividir campos en dos columnas
  const mitad = Math.ceil(camposSeleccionados.length / 2);
  const columnaIzq = camposSeleccionados.slice(0, mitad);
  const columnaDer = camposSeleccionados.slice(mitad);

  // Generar HTML para campos
  const generarCampos = (campos: string[]) => {
    return campos.map(campoId => {
      const campo = mapaCampos[campoId];
      if (!campo) return '';
      
      const claseValue = campo.large ? 'value value-large' : 'value';
      const claseExtra = campo.monospace ? ' imei' : '';
      
      return `
        <div class="field">
          <span class="label">${campo.label}:</span>
          <span class="${claseValue}${claseExtra}">${campo.valor || 'N/A'}</span>
        </div>
      `;
    }).join('');
  };

  // Obtener tamaño de fuente según configuración
  const obtenerTamañoFuente = () => {
    switch(configuracion.tamañoTexto) {
      case 'muy-pequeño': return { label: '6px', value: '7px', valueLarge: '8px', imei: '6px' };
      case 'pequeño': return { label: '6.5px', value: '7.5px', valueLarge: '8.5px', imei: '6.5px' };
      case 'mediano': 
      default: return { label: '7px', value: '8px', valueLarge: '9px', imei: '7px' };
    }
  };

  const tamaños = obtenerTamañoFuente();
  const mostrarBorde = configuracion.mostrarBorde !== false;

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
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: 62mm;
            height: 29mm;
            overflow: hidden;
            font-family: Arial, sans-serif;
          }
          
          body {
            ${mostrarBorde ? 'border: 4px solid #000;' : ''}
            display: flex;
            flex-direction: column;
          }
          
          .header {
            background: #fff;
            color: #000;
            text-align: center;
            padding: 2mm 0;
            margin-top: 1mm;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 1.5mm;
            border-bottom: 3px solid #000;
            flex-shrink: 0;
          }
          
          .content {
            display: flex;
            flex: 1;
            padding: 2.5mm 3mm;
            gap: 3mm;
            overflow: hidden;
          }
          
          .column {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
          }
          
          .field {
            display: flex;
            align-items: baseline;
            gap: 1.5mm;
            line-height: 1.3;
            margin-bottom: 1mm;
          }
          
          .label {
            font-weight: 900;
            color: #000;
            font-size: ${tamaños.label};
            text-transform: uppercase;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          .value {
            color: #000;
            font-size: ${tamaños.value};
            font-weight: 900;
            word-wrap: break-word;
            overflow: hidden;
          }
          
          .value-large {
            font-size: ${tamaños.valueLarge};
            font-weight: 900;
          }
          
          .imei {
            font-family: 'Courier New', monospace;
            font-size: ${tamaños.imei};
            font-weight: 900;
            letter-spacing: 0.2mm;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        
        <div class="header">${nombreNegocio || 'GESTIONE'}</div>
        
        <div class="content">
          
          <div class="column">
            ${generarCampos(columnaIzq)}
          </div>
          
          <div class="column">
            ${generarCampos(columnaDer)}
          </div>
          
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