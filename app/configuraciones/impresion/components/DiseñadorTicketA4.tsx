"use client";

import { useState, useEffect } from "react";
import VistaPreviaTicketA4 from "./VistaPreviaTicketA4";

// 🎨 COMPONENTE TOAST INTEGRADO
interface ToastProps {
  mensaje: string;
  tipo: 'exito' | 'error';
  mostrar: boolean;
}

function Toast({ mensaje, tipo, mostrar }: ToastProps) {
  if (!mostrar) return null;

  const estilos = {
    exito: {
      gradient: 'from-green-500 to-green-600',
      icono: '✅',
      border: 'border-green-400',
    },
    error: {
      gradient: 'from-red-500 to-red-600',
      icono: '❌',
      border: 'border-red-400',
    }
  };

  const estilo = estilos[tipo];

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-slide-in">
      <div className={`
        bg-gradient-to-r ${estilo.gradient} 
        text-white rounded-2xl shadow-2xl
        border-2 ${estilo.border}
        min-w-[320px] max-w-[450px]
        overflow-hidden
        transform transition-all duration-300
      `}>
        <div className="h-1 bg-white/30"></div>
        
        <div className="p-5 flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-3xl">{estilo.icono}</span>
          </div>
          
          <div className="flex-1">
            <p className="text-base font-semibold leading-relaxed">
              {mensaje}
            </p>
          </div>
        </div>
        
        <div className="h-1 bg-white/20 relative overflow-hidden">
          <div className="h-full bg-white/60 animate-progress"></div>
        </div>
      </div>
    </div>
  );
}

// 📋 Campos organizados por secciones
const seccionesCampos = {
  cliente: {
    nombre: '👤 Datos del Cliente',
    campos: [
      { id: 'cliente', nombre: 'Nombre del Cliente', obligatorio: true },
      { id: 'telefono', nombre: 'Teléfono', obligatorio: false },
      { id: 'email', nombre: 'Email', obligatorio: false },
      { id: 'direccion', nombre: 'Dirección', obligatorio: false },
    ]
  },
  equipo: {
    nombre: '📱 Datos del Equipo',
    campos: [
      { id: 'modelo', nombre: 'Modelo', obligatorio: false },
      { id: 'marca', nombre: 'Marca', obligatorio: false },
      { id: 'numeroSerie', nombre: 'Número de Serie/IMEI', obligatorio: false },
      { id: 'estadoIngreso', nombre: 'Estado al Ingreso', obligatorio: false },
      { id: 'accesorios', nombre: 'Accesorios Incluidos', obligatorio: false },
      { id: 'bateria', nombre: 'Nivel de Batería', obligatorio: false },
      { id: 'bloqueo', nombre: 'Bloqueo de Pantalla', obligatorio: false },
    ]
  },
  trabajo: {
    nombre: '🔧 Trabajo Realizado',
    campos: [
      { id: 'trabajo', nombre: 'Tipo de Trabajo', obligatorio: false },
      { id: 'diagnostico', nombre: 'Diagnóstico', obligatorio: false },
      { id: 'solucion', nombre: 'Solución Aplicada', obligatorio: false },
      { id: 'repuestos', nombre: 'Repuestos Utilizados', obligatorio: false },
      { id: 'tecnico', nombre: 'Técnico Asignado', obligatorio: false },
    ]
  },
  pago: {
    nombre: '💰 Información de Pago',
    campos: [
      { id: 'precio', nombre: 'Precio Total', obligatorio: false },
      { id: 'anticipo', nombre: 'Anticipo/Seña', obligatorio: false },
      { id: 'saldo', nombre: 'Saldo Pendiente', obligatorio: false },
      { id: 'metodoPago', nombre: 'Método de Pago', obligatorio: false },
    ]
  },
  otros: {
    nombre: '📝 Otros Datos',
    campos: [
      { id: 'id', nombre: 'ID de Orden', obligatorio: true },
      { id: 'fecha', nombre: 'Fecha de Ingreso', obligatorio: false },
      { id: 'fechaEntrega', nombre: 'Fecha de Entrega Estimada', obligatorio: false },
      { id: 'observaciones', nombre: 'Observaciones', obligatorio: false },
    ]
  }
};

const trabajoEjemplo = {
  id: 'GT-2025-001234',
  cliente: 'Juan Carlos Pérez',
  fecha: '15/08/2025',
  fechaEntrega: '18/08/2025',
  telefono: '+54 11 4567-8900',
  email: 'juancarlos@email.com',
  direccion: 'Av. Corrientes 1234, CABA',
  modelo: 'iPhone 14 Pro Max',
  marca: 'Apple',
  numeroSerie: 'F2LK3H4J5K6L',
  estadoIngreso: 'Pantalla rota, rayones leves en la carcasa',
  accesorios: 'Cargador original, cable USB-C, funda',
  bateria: '85%',
  bloqueo: 'Sí - Código: 1234',
  trabajo: 'Reparación de pantalla',
  diagnostico: 'Pantalla fracturada, táctil no responde en zona superior',
  solucion: 'Reemplazo de pantalla OLED original',
  repuestos: 'Pantalla OLED iPhone 14 Pro Max',
  tecnico: 'Carlos Mendoza',
  precio: '$85.000',
  anticipo: '$40.000',
  saldo: '$45.000',
  metodoPago: 'Efectivo + Transferencia',
  observaciones: 'Cliente solicita llamada antes de entregar. Urgente.'
};

interface Props {
  plantillaTicketA4: any;
  onGuardarPlantilla: (plantilla: any) => void;
}

export default function DiseñadorTicketA4({ plantillaTicketA4, onGuardarPlantilla }: Props) {
  // 🎨 ESTADO DEL TOAST
  const [toast, setToast] = useState<ToastProps>({
    mensaje: '',
    tipo: 'exito',
    mostrar: false
  });

  // 🔧 CARGAR CONFIGURACIÓN DESDE PROPS (con useEffect para actualizar cuando cambie plantillaTicketA4)
  const [camposSeleccionados, setCamposSeleccionados] = useState<string[]>([]);
  const [configuracion, setConfiguracion] = useState<any>({});

  // CRÍTICO: useEffect para cargar la configuración cuando cambie plantillaTicketA4
  useEffect(() => {
    console.log('📥 Cargando plantilla desde Firebase:', plantillaTicketA4);
    
    if (plantillaTicketA4) {
      // Cargar campos (soporte para "campos" o "camposSeleccionados")
      const campos = plantillaTicketA4.camposSeleccionados || plantillaTicketA4.campos || ['id', 'cliente', 'telefono', 'fecha', 'modelo', 'trabajo', 'precio', 'anticipo', 'saldo'];
      setCamposSeleccionados(campos);
      
      // Cargar configuración
      setConfiguracion({
        nombreNegocio: plantillaTicketA4.configuracion?.nombreNegocio || 'GESTIONE',
        telefonoNegocio: plantillaTicketA4.configuracion?.telefonoNegocio || '+54 11 1234-5678',
        direccionNegocio: plantillaTicketA4.configuracion?.direccionNegocio || 'Av. Ejemplo 1234, CABA',
        textoEncabezado: plantillaTicketA4.configuracion?.textoEncabezado || 'ORDEN DE TRABAJO',
        
        tamañoHoja: plantillaTicketA4.configuracion?.tamañoHoja || 'hoja-completa',
        duplicarTicket: plantillaTicketA4.configuracion?.duplicarTicket ?? false,
        orientacion: plantillaTicketA4.configuracion?.orientacion || 'vertical',
        espaciado: plantillaTicketA4.configuracion?.espaciado || 'normal',
        colorEncabezado: plantillaTicketA4.configuracion?.colorEncabezado || '#2563eb',
        
        incluirLogo: plantillaTicketA4.configuracion?.incluirLogo ?? true,
        incluirGarantia: plantillaTicketA4.configuracion?.incluirGarantia ?? true,
        textoGarantia: plantillaTicketA4.configuracion?.textoGarantia || 'Garantía de 30 días por defectos de mano de obra. No cubre daños por mal uso, líquidos o golpes.',
        incluirFirmas: plantillaTicketA4.configuracion?.incluirFirmas ?? true,
        incluirPiePagina: plantillaTicketA4.configuracion?.incluirPiePagina ?? true,
        textoPiePagina: plantillaTicketA4.configuracion?.textoPiePagina || 'Gracias por confiar en nosotros',
        mostrarBordes: plantillaTicketA4.configuracion?.mostrarBordes ?? true,
      });

      console.log('✅ Configuración cargada:', {
        campos,
        tamañoHoja: plantillaTicketA4.configuracion?.tamañoHoja,
        espaciado: plantillaTicketA4.configuracion?.espaciado
      });
    } else {
      // Si no hay plantilla, usar valores por defecto
      console.log('⚠️ No hay plantilla guardada, usando valores por defecto');
      setCamposSeleccionados(['id', 'cliente', 'telefono', 'fecha', 'modelo', 'trabajo', 'precio', 'anticipo', 'saldo']);
      setConfiguracion({
        nombreNegocio: 'GESTIONE',
        telefonoNegocio: '+54 11 1234-5678',
        direccionNegocio: 'Av. Ejemplo 1234, CABA',
        textoEncabezado: 'ORDEN DE TRABAJO',
        tamañoHoja: 'hoja-completa',
        duplicarTicket: false,
        orientacion: 'vertical',
        espaciado: 'normal',
        colorEncabezado: '#2563eb',
        incluirLogo: true,
        incluirGarantia: true,
        textoGarantia: 'Garantía de 30 días por defectos de mano de obra. No cubre daños por mal uso, líquidos o golpes.',
        incluirFirmas: true,
        incluirPiePagina: true,
        textoPiePagina: 'Gracias por confiar en nosotros',
        mostrarBordes: true,
      });
    }
  }, [plantillaTicketA4]);

  const toggleCampo = (campoId: string, incluir: boolean) => {
    if (incluir) {
      setCamposSeleccionados([...camposSeleccionados, campoId]);
    } else {
      setCamposSeleccionados(camposSeleccionados.filter(id => id !== campoId));
    }
  };

  const toggleSeccionCompleta = (seccion: string, incluir: boolean) => {
    const camposSeccion = seccionesCampos[seccion as keyof typeof seccionesCampos].campos
      .filter(c => !c.obligatorio)
      .map(c => c.id);
    
    if (incluir) {
      const nuevoSet = new Set([...camposSeleccionados, ...camposSeccion]);
      setCamposSeleccionados(Array.from(nuevoSet));
    } else {
      setCamposSeleccionados(camposSeleccionados.filter(id => !camposSeccion.includes(id)));
    }
  };

  const contarCamposSeccion = (seccion: string) => {
    const camposSeccion = seccionesCampos[seccion as keyof typeof seccionesCampos].campos.map(c => c.id);
    return camposSeleccionados.filter(id => camposSeccion.includes(id)).length;
  };

  const guardarPlantilla = () => {
    const plantilla = {
      camposSeleccionados: camposSeleccionados,
      campos: camposSeleccionados, // Mantener compatibilidad
      configuracion: configuracion
    };

    console.log('💾 Guardando plantilla en Firebase:', plantilla);
    
    onGuardarPlantilla(plantilla);
    
    setToast({
      mensaje: '✅ Diseño de Ticket A4 guardado exitosamente',
      tipo: 'exito',
      mostrar: true
    });

    setTimeout(() => {
      setToast(prev => ({ ...prev, mostrar: false }));
    }, 3000);
  };

  return (
    <>
      <Toast {...toast} />

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Configuración */}
          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
            {/* Información del Negocio */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <h3 className="font-bold text-lg text-black mb-3">🏢 Información del Negocio</h3>
              <div className="space-y-3">
                <input 
                  type="text"
                  value={configuracion.nombreNegocio || ''}
                  onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, nombreNegocio: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  placeholder="Nombre del Negocio"
                />
                <input 
                  type="text"
                  value={configuracion.telefonoNegocio || ''}
                  onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, telefonoNegocio: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  placeholder="Teléfono"
                />
                <input 
                  type="text"
                  value={configuracion.direccionNegocio || ''}
                  onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, direccionNegocio: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  placeholder="Dirección"
                />
                <input 
                  type="text"
                  value={configuracion.textoEncabezado || ''}
                  onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, textoEncabezado: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  placeholder="Texto del Encabezado"
                />
              </div>
            </div>

            {/* Diseño y Formato */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <h3 className="font-bold text-lg text-black mb-3">🎨 Diseño y Formato</h3>
              <div className="space-y-3">
                {/* Tamaño de Hoja */}
                <div>
                  <label className="text-sm font-medium text-black block mb-1">Tamaño de Hoja:</label>
                  <select 
                    value={configuracion.tamañoHoja || 'hoja-completa'}
                    onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, tamañoHoja: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  >
                    <option value="hoja-completa">Hoja Completa (A4 - 210x297mm)</option>
                    <option value="media-hoja">Media Hoja (A5 - 148x210mm)</option>
                  </select>
                </div>

                {/* Espaciado */}
                <div>
                  <label className="text-sm font-medium text-black block mb-1">Espaciado:</label>
                  <select 
                    value={configuracion.espaciado || 'normal'}
                    onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, espaciado: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  >
                    <option value="compacto">Compacto (más contenido)</option>
                    <option value="normal">Normal (balance)</option>
                    <option value="espacioso">Espacioso (más legible)</option>
                  </select>
                </div>

                {/* Color de Encabezado */}
                <div>
                  <label className="text-sm font-medium text-black block mb-1">Color del Encabezado:</label>
                  <input 
                    type="color"
                    value={configuracion.colorEncabezado || '#2563eb'}
                    onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, colorEncabezado: e.target.value }))}
                    className="w-full h-10 p-1 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Duplicar Ticket */}
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="duplicarTicket"
                    checked={configuracion.duplicarTicket || false}
                    onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, duplicarTicket: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="duplicarTicket" className="text-sm text-black">
                    Duplicar Ticket (Original + Copia)
                  </label>
                </div>
              </div>
            </div>

            {/* Elementos Visuales */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <h3 className="font-bold text-lg text-black mb-3">✨ Elementos Visuales</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="incluirLogo"
                      checked={configuracion.incluirLogo ?? true}
                      onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, incluirLogo: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="incluirLogo" className="text-sm text-black">
                      Incluir Logo
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="incluirFirmas"
                      checked={configuracion.incluirFirmas ?? true}
                      onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, incluirFirmas: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="incluirFirmas" className="text-sm text-black">
                      Incluir Firmas
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="mostrarBordes"
                      checked={configuracion.mostrarBordes ?? true}
                      onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, mostrarBordes: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="mostrarBordes" className="text-sm text-black">
                      Mostrar Bordes
                    </label>
                  </div>
                </div>

                {/* Garantía */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="incluirGarantia"
                      checked={configuracion.incluirGarantia ?? true}
                      onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, incluirGarantia: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="incluirGarantia" className="text-sm text-black">
                      Incluir Texto de Garantía
                    </label>
                  </div>
                  {configuracion.incluirGarantia && (
                    <textarea 
                      value={configuracion.textoGarantia || ''}
                      onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, textoGarantia: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                      rows={2}
                    />
                  )}
                </div>

                {/* Pie de Página */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="incluirPiePagina"
                      checked={configuracion.incluirPiePagina ?? true}
                      onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, incluirPiePagina: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="incluirPiePagina" className="text-sm text-black">
                      Incluir Pie de Página
                    </label>
                  </div>
                  {configuracion.incluirPiePagina && (
                    <input 
                      type="text"
                      value={configuracion.textoPiePagina || ''}
                      onChange={(e) => setConfiguracion((prev: any) => ({ ...prev, textoPiePagina: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Selección de Campos por Sección */}
            {Object.entries(seccionesCampos).map(([seccionKey, seccion]) => (
              <div key={seccionKey} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-black">{seccion.nombre}</h4>
                  <button
                    onClick={() => {
                      const todosMarcados = contarCamposSeccion(seccionKey) === seccion.campos.filter(c => !c.obligatorio).length;
                      toggleSeccionCompleta(seccionKey, !todosMarcados);
                    }}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    {contarCamposSeccion(seccionKey) === seccion.campos.filter(c => !c.obligatorio).length ? 'Desmarcar' : 'Marcar'} Todos
                  </button>
                </div>
                <div className="space-y-2">
                  {seccion.campos.map(campo => (
                    <div key={campo.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id={campo.id}
                        checked={camposSeleccionados.includes(campo.id)}
                        onChange={(e) => toggleCampo(campo.id, e.target.checked)}
                        disabled={campo.obligatorio}
                        className="w-4 h-4"
                      />
                      <label htmlFor={campo.id} className="text-sm text-black flex-1">
                        {campo.nombre}
                        {campo.obligatorio && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Consejos */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Consejos:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>ID</strong> y <strong>Cliente</strong> son obligatorios</li>
                <li>• <strong>Media Hoja</strong> ahorra papel (ideal para talleres pequeños)</li>
                <li>• <strong>Duplicar</strong> genera Original + Copia automáticamente</li>
                <li>• <strong>Firmas</strong> dan validez legal al documento</li>
                <li>• Menos campos = mejor legibilidad</li>
                <li>• Total de campos: <span className="font-bold">{camposSeleccionados.length}</span></li>
              </ul>
            </div>

            {/* Botón Guardar */}
            <button
              onClick={guardarPlantilla}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-all sticky bottom-0"
            >
              💾 Guardar Diseño de Ticket A4
            </button>
          </div>

          {/* Vista Previa */}
          <div className="sticky top-0">
            <h4 className="font-semibold text-black mb-3">👁️ Vista Previa:</h4>
            <div className="bg-gray-100 p-4 rounded-lg flex justify-center overflow-auto max-h-[700px]">
              <VistaPreviaTicketA4 
                camposSeleccionados={camposSeleccionados}
                configuracion={configuracion}
                datosEjemplo={trabajoEjemplo}
              />
            </div>
            <p className="text-xs text-black mt-2 text-center">
              Vista previa para impresora A4 | 
              Tamaño: {configuracion.tamañoHoja === 'media-hoja' ? 'Media Hoja (A5)' : 'Hoja Completa (A4)'}
              {configuracion.duplicarTicket && ' | Duplicado ✓'}
            </p>
          </div>
        </div>
      </div>

      {/* 🎨 ESTILOS CSS PARA LAS ANIMACIONES */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-progress {
          animation: progress 3s linear;
        }
      `}</style>
    </>
  );
}