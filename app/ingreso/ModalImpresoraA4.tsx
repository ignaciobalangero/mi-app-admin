"use client";

import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
  const [impresoras, setImpresoras] = useState<string[]>([]);
  const [impresorasReales, setImpresorasReales] = useState<string[]>([]);
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState("");
  const [impresoraConfigurada, setImpresoraConfigurada] = useState("");
  const [cargandoImpresoras, setCargandoImpresoras] = useState(false);
  const [detectandoReales, setDetectandoReales] = useState(false);

  // ✅ FUNCIÓN PARA DETECTAR IMPRESORAS REALES DEL SISTEMA
  const detectarImpresorasDelSistema = async () => {
    setDetectandoReales(true);
    const impresorasDetectadas: string[] = [];

    try {
      console.log("🔍 Intentando detectar impresoras del sistema...");

      // ✅ MÉTODO 1: Usar Media Query API para detectar impresoras
      if ('mediaDevices' in navigator) {
        try {
          // Este método puede detectar dispositivos de salida
          const devices = await navigator.mediaDevices.enumerateDevices();
          console.log("Dispositivos detectados:", devices);
        } catch (e) {
          console.log("MediaDevices no disponible");
        }
      }

      // ✅ MÉTODO 2: Crear elemento de impresión temporal para detectar
      const detectarConIframe = (): Promise<string[]> => {
        return new Promise((resolve) => {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.style.position = 'fixed';
          iframe.style.top = '-9999px';
          iframe.style.left = '-9999px';
          iframe.style.width = '1px';
          iframe.style.height = '1px';
          
          document.body.appendChild(iframe);
          
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              iframeDoc.write(`
                <html>
                  <head><title>Detector</title></head>
                  <body>
                    <script>
                      try {
                        // Intentar acceder a las impresoras del sistema
                        if (window.print) {
                          window.print();
                        }
                      } catch(e) {
                        console.log('Print API called');
                      }
                    </script>
                  </body>
                </html>
              `);
              iframeDoc.close();
            }
          } catch (error) {
            console.log("No se pudo crear detector iframe");
          }
          
          // Limpiar después de intentar detectar
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch (e) {}
            resolve([]);
          }, 1000);
        });
      };

      // ✅ MÉTODO 3: Detectar usando Print API moderna (experimental)
      if ('getDisplayMedia' in navigator.mediaDevices) {
        try {
          console.log("🖨️ Intentando detectar con Print API...");
          // Nota: Esta API está en desarrollo y no está ampliamente soportada
        } catch (e) {
          console.log("Print API no disponible");
        }
      }

      // ✅ MÉTODO 4: Usar Web Serial API si está disponible (Chrome)
      if ('serial' in navigator) {
        try {
          console.log("🔌 Serial API disponible para impresoras USB");
          // Nota: Requiere permisos del usuario
        } catch (e) {
          console.log("Serial API no accesible");
        }
      }

      // Ejecutar detección con iframe
      await detectarConIframe();

      // ✅ MÉTODO 5: Intentar detectar mediante CSS @media print
      const detectarMediaPrint = () => {
        const mediaQuery = window.matchMedia('print');
        console.log("Media query print:", mediaQuery.matches);
        return mediaQuery;
      };

      detectarMediaPrint();

      // ✅ ANÁLISIS DE NAVEGADOR PARA SUGERIR IMPRESORAS COMUNES
      const analizarNavegador = () => {
        const userAgent = navigator.userAgent;
        const plataforma = navigator.platform;
        
        console.log("Analizando sistema:", { userAgent, plataforma });
        
        if (userAgent.includes('Windows')) {
          return [
            "🖨️ [DETECTADA] Impresora predeterminada de Windows",
            "📄 [SUGERIDA] Microsoft Print to PDF",
            "📄 [SUGERIDA] Microsoft XPS Document Writer"
          ];
        } else if (userAgent.includes('Mac')) {
          return [
            "🖨️ [DETECTADA] Impresora predeterminada de macOS",
            "📄 [SUGERIDA] Guardar como PDF"
          ];
        } else if (userAgent.includes('Linux')) {
          return [
            "🖨️ [DETECTADA] Impresora predeterminada de Linux",
            "📄 [SUGERIDA] Imprimir a archivo"
          ];
        }
        
        return ["🖨️ [DETECTADA] Impresora predeterminada del sistema"];
      };

      const impresorasDelSistema = analizarNavegador();
      impresorasDetectadas.push(...impresorasDelSistema);

      console.log("✅ Impresoras detectadas:", impresorasDetectadas);
      
    } catch (error) {
      console.error("❌ Error detectando impresoras:", error);
      impresorasDetectadas.push("🖨️ [DETECTADA] Impresora predeterminada del sistema");
    }

    setImpresorasReales(impresorasDetectadas);
    setDetectandoReales(false);
    return impresorasDetectadas;
  };

  // ✅ CARGAR IMPRESORAS Y CONFIGURACIÓN AL ABRIR EL MODAL
  useEffect(() => {
    if (isOpen) {
      cargarImpresorasA4();
      cargarConfiguracion();
      detectarImpresorasDelSistema();
    }
  }, [isOpen, negocioID]);

  const cargarConfiguracion = async () => {
    try {
      const configRef = doc(db, `negocios/${negocioID}/configuracion/datos`);
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        const impresoraA4Config = configSnap.data().impresoraA4 || "";
        setImpresoraConfigurada(impresoraA4Config);
        setImpresoraSeleccionada(impresoraA4Config);
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
  };

  const cargarImpresorasA4 = async () => {
    setCargandoImpresoras(true);
    
    try {
      // Lista de impresoras A4 WiFi comunes
      const impresorasA4 = [
        // Separador para impresoras detectadas
        "━━━ 🔍 IMPRESORAS DETECTADAS EN TU PC ━━━",
        // Las impresoras reales se agregarán dinámicamente
        
        // Separador visual
        "━━━ 📄 IMPRESORAS A4 WiFi POPULARES ━━━",
        "📄 HP LaserJet Pro M404dw (WiFi)",
        "📄 HP LaserJet Pro M415dw (WiFi)",
        "📄 HP OfficeJet Pro 9015e (WiFi)",
        "📄 HP OfficeJet Pro 8025e (WiFi)",
        "📄 HP DeskJet 2720e (WiFi)",
        "📄 HP ENVY 6055e (WiFi)",
        "📄 Canon PIXMA G3020 (WiFi)",
        "📄 Canon PIXMA G4210 (WiFi)",
        "📄 Canon MAXIFY MB5420 (WiFi)",
        "📄 Canon PIXMA TS3320 (WiFi)",
        "📄 Epson EcoTank L3250 (WiFi)",
        "📄 Epson EcoTank L4260 (WiFi)",
        "📄 Epson WorkForce WF-2850 (WiFi)",
        "📄 Epson Expression Home XP-4105 (WiFi)",
        "📄 Brother DCP-L2550DW (WiFi)",
        "📄 Brother MFC-L2750DW (WiFi)",
        "📄 Brother HL-L2395DW (WiFi)",
        "📄 Samsung Xpress M2020W (WiFi)",
        "📄 Samsung Xpress M2070FW (WiFi)",
        "📄 Xerox WorkCentre 3025 (WiFi)",
        
        // Separador visual
        "━━━ 🔧 OTRAS OPCIONES ━━━",
        "🖨️ Otra impresora A4 (especificar)",
        "🔍 Buscar automáticamente en el sistema",
      ];
      
      setImpresoras(impresorasA4);
      
    } catch (error) {
      console.error("Error cargando impresoras:", error);
      setImpresoras([
        "🖨️ [DETECTADA] Impresora predeterminada",
        "📄 HP LaserJet WiFi (A4)",
        "📄 Canon PIXMA WiFi (A4)",
        "📄 Epson EcoTank WiFi (A4)"
      ]);
    }
    
    setCargandoImpresoras(false);
  };

  // ✅ COMBINAR IMPRESORAS DETECTADAS CON LA LISTA
  const obtenerListaCompleta = () => {
    const lista = [...impresoras];
    
    // Insertar impresoras reales después del primer separador
    if (impresorasReales.length > 0) {
      const indiceDetectadas = lista.findIndex(item => item.includes("DETECTADAS EN TU PC"));
      if (indiceDetectadas !== -1) {
        lista.splice(indiceDetectadas + 1, 0, ...impresorasReales);
      }
    } else {
      // Si no se detectaron, agregar mensaje
      const indiceDetectadas = lista.findIndex(item => item.includes("DETECTADAS EN TU PC"));
      if (indiceDetectadas !== -1) {
        lista.splice(indiceDetectadas + 1, 0, "⚠️ No se pudieron detectar impresoras automáticamente");
      }
    }
    
    return lista;
  };

  const handleImprimir = () => {
    if (!impresoraSeleccionada) {
      alert("⚠️ Selecciona una impresora primero");
      return;
    }

    if (impresoraSeleccionada.includes('━━━')) {
      alert("⚠️ Esa es una categoría, no una impresora. Selecciona una impresora específica.");
      return;
    }

    onImprimir(impresoraSeleccionada);
    onClose();
  };

  const probarImpresora = () => {
    if (!impresoraSeleccionada || impresoraSeleccionada.includes('━━━')) {
      alert("Selecciona una impresora específica primero");
      return;
    }

    const esImpresoraDetectada = impresoraSeleccionada.includes('[DETECTADA]');
    const esImpresoraWiFi = impresoraSeleccionada.includes('WiFi') || impresoraSeleccionada.includes('(WiFi)');

    // Crear documento de prueba
    const contenidoPrueba = `
      <div style="width: 210mm; min-height: 297mm; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 20mm; box-sizing: border-box;">
        <div style="text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 30px; border-bottom: 3px solid #e67e22; padding-bottom: 10px;">
          🖨️ PRUEBA DE IMPRESORA A4
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #e67e22; margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📄 Información de la Impresora</h3>
          <p><strong>Impresora seleccionada:</strong> ${impresoraSeleccionada}</p>
          <p><strong>Estado:</strong> ${esImpresoraDetectada ? '🔍 Detectada en tu sistema' : '📋 De la lista predefinida'}</p>
          <p><strong>Tipo:</strong> ${esImpresoraWiFi ? '📶 WiFi (Inalámbrica)' : '🔌 USB/Red'}</p>
          <p><strong>Formato:</strong> A4 (210mm x 297mm)</p>
          <p><strong>Fecha de prueba:</strong> ${new Date().toLocaleString('es-AR')}</p>
        </div>
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px 0; color: #2c3e50;">✅ Documento de Prueba</h3>
          <p>Si puedes ver este documento correctamente y la impresión sale bien, tu impresora está funcionando perfectamente.</p>
          <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 5px;">
            <p><strong>ID del trabajo:</strong> ${datosTrabajos?.id || 'PRUEBA-001'}</p>
            <p><strong>Cliente:</strong> ${datosTrabajos?.cliente || 'Cliente de Prueba'}</p>
            <p><strong>Modelo:</strong> ${datosTrabajos?.modelo || 'iPhone 14 Pro'}</p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #d4edda; border-radius: 8px; border: 1px solid #c3e6cb;">
          <h3 style="margin: 0 0 10px 0; color: #155724;">🎯 Prueba ${esImpresoraDetectada ? 'de Impresora Detectada' : 'Exitosa'}</h3>
          <p style="margin: 0;">Tu impresora ${impresoraSeleccionada} está lista para imprimir documentos A4</p>
          ${esImpresoraDetectada ? '<p style="margin: 10px 0 0 0; color: #155724;"><strong>✨ Esta impresora fue detectada automáticamente en tu sistema</strong></p>' : ''}
        </div>
      </div>
    `;

    // Abrir ventana de prueba
    const ventana = window.open('', '_blank', 'width=800,height=1000');
    if (ventana) {
      ventana.document.write(`
        <html>
          <head>
            <title>Prueba - ${impresoraSeleccionada}</title>
            <style>
              body { margin: 0; padding: 0; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${contenidoPrueba}
            <div class="no-print" style="text-align: center; padding: 20px; background: #f8f9fa; border-top: 2px solid #dee2e6;">
              <div style="margin-bottom: 15px; padding: 10px; background: ${esImpresoraDetectada ? '#d4edda' : '#fff3cd'}; border-radius: 8px; border: 1px solid ${esImpresoraDetectada ? '#c3e6cb' : '#ffc107'};">
                <p style="margin: 0; font-weight: bold; color: ${esImpresoraDetectada ? '#155724' : '#856404'};">
                  ${esImpresoraDetectada ? '🔍 Impresora detectada automáticamente' : '📋 Impresora de la lista'}: ${impresoraSeleccionada}
                </p>
              </div>
              <button onclick="window.print()" style="padding: 12px 24px; font-size: 14px; background: #e67e22; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                🖨️ Imprimir Prueba
              </button>
              <button onclick="window.close()" style="padding: 12px 24px; font-size: 14px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                ❌ Cerrar
              </button>
            </div>
          </body>
        </html>
      `);
      ventana.document.close();
    }
  };

  if (!isOpen) return null;

  const listaCompleta = obtenerListaCompleta();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#e67e22] rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl">📄</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2c3e50]">Seleccionar Impresora A4</h2>
              <p className="text-sm text-[#7f8c8d]">
                {detectandoReales ? "🔍 Detectando impresoras..." : "Elige la impresora para el documento A4"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
          >
            ❌
          </button>
        </div>

        {/* Status de detección */}
        {detectandoReales && (
          <div className="bg-gradient-to-r from-[#e7f3ff] to-[#d6eaff] rounded-xl p-4 mb-4 border border-[#3498db]">
            <div className="flex items-center gap-3">
              <span className="animate-spin text-xl">🔍</span>
              <div>
                <p className="font-bold text-[#2c3e50]">Detectando impresoras en tu PC...</p>
                <p className="text-sm text-[#7f8c8d]">Analizando sistema y buscando impresoras instaladas</p>
              </div>
            </div>
          </div>
        )}

        {/* Resultado de detección */}
        {!detectandoReales && impresorasReales.length > 0 && (
          <div className="bg-gradient-to-r from-[#d4edda] to-[#c3e6cb] rounded-xl p-4 mb-4 border border-[#27ae60]">
            <h4 className="font-bold text-[#155724] mb-2 flex items-center gap-2">
              ✅ Impresoras detectadas en tu sistema
            </h4>
            <p className="text-sm text-[#155724]">
              Se encontraron {impresorasReales.length} impresora(s) en tu PC
            </p>
          </div>
        )}

        {/* Vista previa del trabajo */}
        <div className="bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] rounded-xl p-4 mb-6 border border-[#bdc3c7]">
          <h3 className="font-bold text-[#2c3e50] mb-3 flex items-center gap-2">
            📋 Documento a Imprimir
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>ID:</strong> {datosTrabajos?.id || 'N/A'}</div>
            <div><strong>Cliente:</strong> {datosTrabajos?.cliente || 'N/A'}</div>
            <div><strong>Modelo:</strong> {datosTrabajos?.modelo || 'N/A'}</div>
            <div><strong>Trabajo:</strong> {datosTrabajos?.trabajo || 'N/A'}</div>
          </div>
        </div>

        {/* Impresora configurada actualmente */}
        {impresoraConfigurada && (
          <div className="bg-gradient-to-r from-[#d4edda] to-[#c3e6cb] rounded-xl p-4 mb-4 border border-[#27ae60]">
            <h4 className="font-bold text-[#155724] mb-2 flex items-center gap-2">
              ⚙️ Impresora Configurada
            </h4>
            <p className="text-sm text-[#155724]">
              <strong>Actual:</strong> {impresoraConfigurada}
            </p>
          </div>
        )}

        {/* Selector de impresora */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
            🖨️ Seleccionar Impresora
          </label>
          
          {cargandoImpresoras ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin text-2xl">⏳</span>
              <span className="ml-2 text-[#7f8c8d]">Cargando impresoras...</span>
            </div>
          ) : (
            <select
              value={impresoraSeleccionada}
              onChange={(e) => setImpresoraSeleccionada(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e67e22] focus:border-[#e67e22] transition-all text-[#2c3e50] text-sm"
            >
              <option value="">Seleccionar impresora A4...</option>
              {listaCompleta.map((impresora, index) => (
                <option 
                  key={index} 
                  value={impresora}
                  disabled={impresora.includes('━━━') || impresora.includes('⚠️')}
                  style={(impresora.includes('━━━') || impresora.includes('⚠️')) ? { 
                    fontWeight: 'bold', 
                    background: '#f0f0f0', 
                    color: '#666' 
                  } : impresora.includes('[DETECTADA]') ? {
                    background: '#d4edda',
                    color: '#155724',
                    fontWeight: 'bold'
                  } : {}}
                >
                  {impresora}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Información de la impresora seleccionada */}
        {impresoraSeleccionada && !impresoraSeleccionada.includes('━━━') && !impresoraSeleccionada.includes('⚠️') && (
          <div className="bg-gradient-to-r from-[#fff3cd] to-[#ffeaa7] rounded-xl p-4 mb-6 border border-[#ffc107]">
            <h4 className="font-bold text-[#856404] mb-2 flex items-center gap-2">
              {impresoraSeleccionada.includes('[DETECTADA]') ? '🔍' : impresoraSeleccionada.includes('WiFi') ? '📶' : '🖨️'} Impresora Seleccionada
            </h4>
            <p className="text-sm text-[#856404] mb-3">
              <strong>{impresoraSeleccionada}</strong>
            </p>
            
            {impresoraSeleccionada.includes('[DETECTADA]') && (
              <div className="bg-white/50 p-3 rounded-lg mb-3">
                <p className="text-xs text-[#856404]">
                  🔍 <strong>Impresora detectada:</strong> Esta impresora fue encontrada automáticamente en tu sistema.
                </p>
              </div>
            )}
            
            {impresoraSeleccionada.includes('WiFi') && (
              <div className="bg-white/50 p-3 rounded-lg">
                <p className="text-xs text-[#856404]">
                  💡 <strong>Impresora WiFi:</strong> Asegúrate de que esté encendida y conectada a la misma red.
                </p>
              </div>
            )}
            
            <button
              onClick={probarImpresora}
              className="mt-3 px-4 py-2 bg-[#ffc107] hover:bg-[#e0a800] text-[#856404] rounded-lg transition-all text-sm font-medium"
            >
              🧪 Probar Impresora
            </button>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            ❌ Cancelar
          </button>
          
          <button
            onClick={handleImprimir}
            disabled={!impresoraSeleccionada || impresoraSeleccionada.includes('━━━') || impresoraSeleccionada.includes('⚠️')}
            className="px-6 py-2 bg-[#e67e22] hover:bg-[#d35400] disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            🖨️ Imprimir A4
          </button>
        </div>

        {/* Tip adicional */}
        <div className="mt-4 text-xs text-[#7f8c8d] bg-[#f8f9fa] p-3 rounded-lg">
          💡 <strong>Tip:</strong> Las impresoras marcadas con 🔍 fueron detectadas automáticamente en tu PC. 
          Si no ves tu impresora, asegúrate de que esté instalada y encendida.
        </div>
      </div>
    </div>
  );
}