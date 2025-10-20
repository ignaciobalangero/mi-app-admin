// 📁 /app/configuraciones/impresion/components/DiseñadorTicket.tsx
"use client";

import { useState } from "react";
import VistaPreviaTicket from "./VistaPreviaTicket";

const camposDisponibles = [
  { id: 'id', nombre: 'ID del Trabajo', obligatorio: true },
  { id: 'cliente', nombre: 'Cliente', obligatorio: true },
  { id: 'modelo', nombre: 'Modelo del Equipo', obligatorio: false },
  { id: 'trabajo', nombre: 'Tipo de Trabajo', obligatorio: false },
  { id: 'fecha', nombre: 'Fecha', obligatorio: false },
  { id: 'precio', nombre: 'Precio', obligatorio: false },
  { id: 'telefono', nombre: 'Teléfono', obligatorio: false },
  { id: 'observaciones', nombre: 'Observaciones', obligatorio: false },
  { id: 'garantia', nombre: 'Garantía', obligatorio: false },
  { id: 'tecnico', nombre: 'Técnico', obligatorio: false },
];

const trabajoEjemplo = {
  id: "EJMP-001",
  cliente: "Juan Pérez",
  modelo: "iPhone 14 Pro",
  trabajo: "Cambio de pantalla",
  fecha: "18/08/2025",
  precio: 25000,
  telefono: "11-1234-5678",
  observaciones: "Pantalla muy dañada",
  garantia: "30 días",
  tecnico: "Mario González"
};

interface Props {
  plantillaTicket: any;
  onGuardarPlantilla: (plantilla: any) => void;
}

export default function DiseñadorTicket({ plantillaTicket, onGuardarPlantilla }: Props) {
  const [camposSeleccionados, setCamposSeleccionados] = useState(
    plantillaTicket?.campos || ['id', 'cliente', 'modelo', 'trabajo', 'fecha', 'precio']
  );
  
  const [configuracion, setConfiguracion] = useState({
    mostrarLogo: plantillaTicket?.configuracion?.mostrarLogo ?? true,
    tamaño: plantillaTicket?.configuracion?.tamaño || 'normal',
    incluirGarantia: plantillaTicket?.configuracion?.incluirGarantia ?? true,
    formatoFecha: plantillaTicket?.configuracion?.formatoFecha || 'dd/mm/yyyy',
    formatoPrecio: plantillaTicket?.configuracion?.formatoPrecio || 'argentino',
    nombreNegocio: plantillaTicket?.configuracion?.nombreNegocio || 'GESTIONE',
    textoGarantia: plantillaTicket?.configuracion?.textoGarantia || 'Garantía de 30 días por defectos de fabricación'
  });

  const toggleCampo = (campoId: string, incluir: boolean) => {
    if (incluir) {
      setCamposSeleccionados([...camposSeleccionados, campoId]);
    } else {
      setCamposSeleccionados(camposSeleccionados.filter(id => id !== campoId));
    }
  };

  const guardarPlantilla = () => {
    const plantilla = {
      campos: camposSeleccionados,
      configuracion
    };
    onGuardarPlantilla(plantilla);
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-[#1a252f] mb-4">🧾 Diseñador de Tickets</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel de Configuración */}
        <div className="space-y-6">
          
          {/* Campos a mostrar */}
          <div>
            <h4 className="font-semibold text-black mb-3">📋 Campos a mostrar:</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {camposDisponibles.map(campo => (
                <label key={campo.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={camposSeleccionados.includes(campo.id)}
                    disabled={campo.obligatorio}
                    onChange={(e) => toggleCampo(campo.id, e.target.checked)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-black">{campo.nombre}</span>
                    {campo.obligatorio && <span className="text-xs text-black font-semibold ml-2">(obligatorio)</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Configuración General */}
          <div>
            <h4 className="font-semibold text-black mb-3">⚙️ Configuración:</h4>
            <div className="space-y-3">
              
              {/* Tamaño */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Tamaño del ticket:</label>
                <select 
                  value={configuracion.tamaño}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, tamaño: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                >
                  <option value="pequeño">Pequeño (compacto)</option>
                  <option value="normal">Normal (estándar)</option>
                  <option value="grande">Grande (detallado)</option>
                </select>
              </div>

              {/* Nombre del negocio */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Nombre del negocio:</label>
                <input 
                  type="text"
                  value={configuracion.nombreNegocio}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, nombreNegocio: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  placeholder="Nombre de tu negocio"
                />
              </div>

              {/* Opciones adicionales */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.mostrarLogo}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, mostrarLogo: e.target.checked }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm text-black">Mostrar encabezado del negocio</span>
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.incluirGarantia}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, incluirGarantia: e.target.checked }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm text-black">Incluir información de garantía</span>
                </label>
              </div>

              {/* Texto de garantía */}
              {configuracion.incluirGarantia && (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Texto de garantía:</label>
                  <textarea 
                    value={configuracion.textoGarantia}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, textoGarantia: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm h-16 resize-none text-black"
                    placeholder="Texto que aparecerá en la sección de garantía"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Botón Guardar */}
          <button
            onClick={guardarPlantilla}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-all"
          >
            💾 Guardar Diseño de Ticket
          </button>
        </div>

        {/* Vista Previa */}
        <div>
          <h4 className="font-semibold text-black mb-3">👁️ Vista Previa:</h4>
          <div className="bg-gray-100 p-4 rounded-lg">
            <VistaPreviaTicket 
              campos={camposSeleccionados}
              configuracion={configuracion}
              datosEjemplo={trabajoEjemplo}
            />
          </div>
          <p className="text-xs text-black mt-2 text-center">
            Vista previa usando datos de ejemplo
          </p>
        </div>
      </div>
    </div>
  );
}