"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VistaPreviaEtiqueta from "@/app/configuraciones/impresion/components/VistaPreviaEtiqueta";
import ReactDOMServer from 'react-dom/server';

interface ModalImpresoraBrotherProps {
  isOpen: boolean;
  onClose: () => void;
  onImprimir: (impresoraSeleccionada: string) => void;
  datosTrabajos: any;
  negocioID: string;
}

export default function ModalImpresoraBrother({
  isOpen,
  onClose,
  onImprimir,
  datosTrabajos,
  negocioID
}: ModalImpresoraBrotherProps) {
  
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState<string>("");
  const [plantillaEtiqueta, setPlantillaEtiqueta] = useState<any>(null);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(true);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const vistaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && negocioID) {
      cargarPlantillaEtiqueta();
    }
  }, [isOpen, negocioID]);

  const cargarPlantillaEtiqueta = async () => {
    try {
      setCargandoPlantilla(true);
      const plantillasRef = doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`);
      const plantillasSnap = await getDoc(plantillasRef);

      if (plantillasSnap.exists()) {
        const data = plantillasSnap.data();
        const plantilla = data.etiqueta;
        
        if (plantilla) {
          if (!plantilla.campos && plantilla.camposSeleccionados) {
            plantilla.campos = plantilla.camposSeleccionados;
          }
          setPlantillaEtiqueta(plantilla);
        }
      }
    } catch (error) {
      console.error("Error cargando plantilla de etiqueta:", error);
    } finally {
      setCargandoPlantilla(false);
    }
  };

  const formatearMoneda = (valor: string | number): string => {
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(numero)) return '0';
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const prepararDatosParaEtiqueta = (trabajo: any) => {
    return {
      cliente: trabajo.cliente || 'No especificado',
      numeroOrden: trabajo.id || 'N/A',
      modelo: trabajo.modelo || 'No especificado',
      clave: trabajo.clave || '',
      trabajo: trabajo.trabajo || 'No especificado',
      obs: trabajo.observaciones || '',
      imei: trabajo.imei || trabajo.numeroSerie || '',
      accesorios: trabajo.accesorios || 'Ninguno',
      anticipo: trabajo.anticipo || '0',
      saldo: trabajo.saldo || trabajo.precio || '0',
      codigoBarras: "|||| |||| ||||"
    };
  };

  const handleImprimir = () => {
    if (!impresoraSeleccionada) {
      alert("⚠️ Selecciona una impresora Brother");
      return;
    }
    if (!plantillaEtiqueta) {
      alert("⚠️ No hay plantilla de etiqueta configurada");
      return;
    }
    if (!datosTrabajos || !datosTrabajos.cliente) {
      alert("⚠️ Faltan datos del trabajo");
      return;
    }
    
    // ✨ ALERTA IMPORTANTE PARA EL USUARIO
    const confirmar = window.confirm(
      `📐 Vas a imprimir en: ${plantillaEtiqueta.configuracion?.tamaño || '62x29'}mm\n\n` +
      `⚠️ IMPORTANTE: Si Windows muestra un diálogo de selección:\n` +
      `✅ Selecciona: "2.4\\" Cinta continua" o "62mm x 29mm"\n` +
      `❌ NO selecciones: "1.1\\" x 3.5\\" o "EQ-31535"\n\n` +
      `¿Continuar con la impresión?`
    );
    
    if (!confirmar) return;
    
    generarYAbrirEtiqueta();
  };

  const generarYAbrirEtiqueta = () => {
    const camposSeleccionados = plantillaEtiqueta.campos || plantillaEtiqueta.camposSeleccionados || ['cliente', 'numeroOrden', 'modelo', 'trabajo'];
    const configuracion = plantillaEtiqueta.configuracion || {
      tamaño: '62x29',  // ✅ DEFAULT: 62x29mm (el más común)
      orientacion: 'horizontal',
      mostrarBorde: true,
      fondoOrden: true,
      tamañoTexto: 'pequeño',
      incluirCodigoBarras: false
    };
    
    // 🔍 LOG IMPORTANTE PARA DEBUG
    console.log('🏷️ Generando etiqueta Brother con configuración:', {
      tamañoConfigurado: configuracion.tamaño,
      plantillaCompleta: plantillaEtiqueta,
      camposSeleccionados: camposSeleccionados.length
    });
    
    const datosCompletos = prepararDatosParaEtiqueta(datosTrabajos);

    // 🎯 USAR VistaPreviaEtiqueta OPTIMIZADO (con ajuste dinámico)
    const componenteHTML = ReactDOMServer.renderToStaticMarkup(
      <VistaPreviaEtiqueta
        campos={camposSeleccionados}
        configuracion={configuracion}
        datosEjemplo={datosCompletos}
      />
    );

    // ✅ DIMENSIONES EXACTAS BROTHER QL (en milímetros exactos)
    const dimensionesBrotherQL = {
      '62x29': { 
        width: '62mm', 
        height: '29mm',
        widthPx: '234px',    // 62mm a 96 DPI = 2.4"
        heightPx: '109px',   // 29mm a 96 DPI = 1.1"
        pulgadas: '2.4" x 1.1"'
      },
      '29x90': { 
        width: '29mm', 
        height: '90mm',
        widthPx: '109px',    // 29mm a 96 DPI = 1.1"
        heightPx: '340px',   // 90mm a 96 DPI = 3.5"
        pulgadas: '1.1" x 3.5"'
      },
      '38x90': { 
        width: '38mm', 
        height: '90mm',
        widthPx: '143px',    // 38mm a 96 DPI
        heightPx: '340px',   // 90mm a 96 DPI
        pulgadas: '1.5" x 3.5"'
      },
      '62x100': { 
        width: '62mm', 
        height: '100mm',
        widthPx: '234px',
        heightPx: '378px',
        pulgadas: '2.4" x 3.9"'
      }
    };

    // ✅ USAR 62x29 como DEFAULT (el más común)
    const dim = dimensionesBrotherQL[configuracion.tamaño as keyof typeof dimensionesBrotherQL] || dimensionesBrotherQL['62x29'];
    
    // 🔍 LOG PARA DEBUG
    console.log('📐 Configuración de etiqueta Brother:', {
      tamañoConfigurado: configuracion.tamaño,
      dimensionesUsadas: dim,
      pulgadas: dim.pulgadas || 'No especificado'
    });

    const htmlCompleto = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Etiqueta Brother QL - ${datosCompletos.numeroOrden}</title>
<style>
/* ========== CONFIGURACIÓN CRÍTICA BROTHER QL ========== */
@page {
  size: ${dim.width} ${dim.height};
  margin: 0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  width: ${dim.width};
  height: ${dim.height};
  margin: 0;
  padding: 0;
}

body {
  width: ${dim.width};
  height: ${dim.height};
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: white;
}

/* ========== FORZAR AJUSTE EN IMPRESIÓN ========== */
@media print {
  html, body {
    width: ${dim.width} !important;
    height: ${dim.height} !important;
    max-width: ${dim.width} !important;
    max-height: ${dim.height} !important;
    overflow: hidden !important;
  }
  
  @page {
    size: ${dim.width} ${dim.height};
    margin: 0;
  }
}

/* ========== PRESERVAR COLORES Y ESTILOS ========== */
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
</style>
</head>
<body>
${componenteHTML}

<script>
  window.onload = () => {
    // ⏱️ TIMEOUT EXTENDIDO para asegurar renderizado
    setTimeout(() => {
      const dim = {
        width: '${dim.width}',
        height: '${dim.height}'
      };
      
      try {
        const body = document.body;
        if (body) {
          body.style.width = dim.width;
          body.style.height = dim.height;
          body.style.maxWidth = dim.width;
          body.style.maxHeight = dim.height;
        }
      } catch (e) {
        console.warn('No se pudo forzar dimensiones:', e);
      }
    }, 100);
    
    // 🎯 MENSAJE PARA EL USUARIO
    console.log('⚠️ IMPORTANTE: Si Windows muestra un diálogo, selecciona "2.4\\" Cinta continua" (NO "1.1\\" x 3.5\\"")');
    
    // 🖨️ IMPRIMIR AUTOMÁTICAMENTE
    setTimeout(() => {
      window.print();
    }, 800);
  };
  
  // 🔄 CERRAR VENTANA DESPUÉS DE IMPRIMIR
  window.onafterprint = () => {
    setTimeout(() => window.close(), 500);
  };
</script>
</body>
</html>`;

    const ventana = window.open('', '_blank', `width=400,height=600`);
    if (!ventana) {
      alert('⚠️ Por favor permite ventanas emergentes para imprimir');
      return;
    }

    ventana.document.write(htmlCompleto);
    ventana.document.close();

    // ✅ CALLBACK DESPUÉS DE ABRIR VENTANA
    ventana.onload = () => {
      setTimeout(() => {
        const dim = dimensionesBrotherQL[configuracion.tamaño as keyof typeof dimensionesBrotherQL] || dimensionesBrotherQL['62x29'];
        
        try {
          const body = ventana.document.body;
          if (body) {
            body.style.width = dim.width;
            body.style.height = dim.height;
            body.style.maxWidth = dim.width;
            body.style.maxHeight = dim.height;
          }
        } catch (e) {
          console.warn('No se pudo forzar dimensiones:', e);
        }
      }, 100);
      
      // 🎯 MENSAJE PARA EL USUARIO
      console.log('⚠️ IMPORTANTE: Si Windows muestra un diálogo, selecciona "2.4\\" Cinta continua" (NO "1.1\\" x 3.5\\"")');
      
      // 🖨️ IMPRIMIR AUTOMÁTICAMENTE
      setTimeout(() => {
        window.print();
      }, 800);
    };
    
    // 🔄 CERRAR VENTANA DESPUÉS DE IMPRIMIR
    window.onafterprint = () => {
      setTimeout(() => window.close(), 500);
    };
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏷️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Etiqueta Brother QL</h2>
                <p className="text-sm opacity-90">Selecciona tu impresora y tamaño de rollo</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6">
          {cargandoPlantilla ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando configuración de etiqueta...</p>
              </div>
            </div>
          ) : !plantillaEtiqueta ? (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No hay plantilla de etiqueta configurada</h3>
              <p className="text-gray-600 mb-4">Debes configurar una plantilla de etiqueta en Configuraciones → Impresión</p>
              <button 
                onClick={onClose} 
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* INFO PLANTILLA */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-800">Plantilla de etiqueta cargada</p>
                    <p className="text-sm text-green-600">
                      Tamaño configurado: {plantillaEtiqueta.configuracion?.tamaño === '62x29' ? '62x29mm (estándar)' : plantillaEtiqueta.configuracion?.tamaño === '38x90' ? '38x90mm (alargada)' : plantillaEtiqueta.configuracion?.tamaño || '62x29mm'} • 
                      Campos: {(plantillaEtiqueta.campos || plantillaEtiqueta.camposSeleccionados || []).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* ⚠️ ADVERTENCIA IMPORTANTE */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-2">Importante antes de imprimir:</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• <strong>Verifica el rollo físico</strong> en tu impresora Brother</li>
                      <li>• <strong>Tamaño configurado:</strong> {plantillaEtiqueta.configuracion?.tamaño || '62x29mm'}</li>
                      <li>• <strong>Debe coincidir</strong> con el rollo instalado en la máquina</li>
                      <li>• Si el rollo es diferente, ve a <strong>Configuraciones → Impresión</strong> y cambia el tamaño</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* SELECTOR DE IMPRESORA */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>🖨️</span> Seleccionar Impresora Brother
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['Brother QL-800', 'Brother QL-700', 'Otra Brother'].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setImpresoraSeleccionada(tipo)}
                      className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                        impresoraSeleccionada === tipo
                          ? 'border-green-500 bg-green-500 text-white shadow-lg'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
                {impresoraSeleccionada && (
                  <div className="mt-4 bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-sm text-gray-600">✅ <strong>Impresora:</strong> {impresoraSeleccionada}</p>
                  </div>
                )}
              </div>

              {/* BOTÓN VISTA PREVIA */}
              <div className="flex justify-center">
                <button
                  onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <span>{mostrarVistaPrevia ? '👁️ Ocultar' : '👁️ Mostrar'} Vista Previa</span>
                </button>
              </div>

              {/* VISTA PREVIA CON COMPONENTE OPTIMIZADO */}
              {mostrarVistaPrevia && (
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">📋 Vista Previa</h3>
                  <div className="flex justify-center overflow-auto" ref={vistaRef} style={{ 
                    transform: 'scale(2.5)', 
                    transformOrigin: 'center center',
                    padding: '80px 0'
                  }}>
                    <VistaPreviaEtiqueta
                      campos={plantillaEtiqueta.campos || plantillaEtiqueta.camposSeleccionados || ['cliente', 'numeroOrden']}
                      configuracion={plantillaEtiqueta.configuracion}
                      datosEjemplo={prepararDatosParaEtiqueta(datosTrabajos)}
                    />
                  </div>
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-700">✅ <strong>Esta vista es EXACTAMENTE lo que se imprimirá</strong></p>
                    <p className="text-xs text-green-600 mt-1">Vista ampliada 2.5x solo para previsualización - La impresión respeta tamaño real</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER - BOTONES */}
        {!cargandoPlantilla && plantillaEtiqueta && (
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
                <span>🏷️</span> Imprimir Etiqueta
              </button>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>
            
            {/* TIP ADICIONAL */}
            <div className="mt-4 text-xs text-center text-gray-600">
              💡 Si aparece error de tamaño, verifica que el rollo físico coincida con el configurado ({plantillaEtiqueta.configuracion?.tamaño || '62x29mm'})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}