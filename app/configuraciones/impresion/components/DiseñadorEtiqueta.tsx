// 📁 /app/configuraciones/impresion/components/DiseñadorEtiqueta.tsx
"use client";

import { useState } from "react";
import VistaPreviaEtiqueta from "./VistaPreviaEtiqueta";

const camposDisponiblesEtiqueta = [
  { id: 'cliente', nombre: 'Cliente', obligatorio: true },
  { id: 'numeroOrden', nombre: 'Número de Orden', obligatorio: true },
  { id: 'modelo', nombre: 'Modelo', obligatorio: false },
  { id: 'clave', nombre: 'Clave/Password', obligatorio: false },
  { id: 'trabajo', nombre: 'Tipo de Trabajo', obligatorio: false },
  { id: 'obs', nombre: 'Observaciones', obligatorio: false },
  { id: 'imei', nombre: 'IMEI', obligatorio: false },
  { id: 'codigoBarras', nombre: 'Código de Barras (futuro)', obligatorio: false },
];

const trabajoEjemplo = {
  cliente: "Juan Pérez",
  numeroOrden: "ORD-2025-001",
  modelo: "iPhone 14 Pro",
  clave: "1234",
  trabajo: "Cambio de pantalla",
  obs: "Pantalla muy dañada",
  imei: "358240051111110",
  codigoBarras: "|||| |||| ||||"
};

interface Props {
  plantillaEtiqueta: any;
  onGuardarPlantilla: (plantilla: any) => void;
}

export default function DiseñadorEtiqueta({ plantillaEtiqueta, onGuardarPlantilla }: Props) {
  const [camposSeleccionados, setCamposSeleccionados] = useState(
    plantillaEtiqueta?.campos || ['cliente', 'numeroOrden', 'modelo', 'trabajo']
  );
  
  const [configuracion, setConfiguracion] = useState({
    tamaño: plantillaEtiqueta?.configuracion?.tamaño || '62x29',
    orientacion: plantillaEtiqueta?.configuracion?.orientacion || 'horizontal',
    mostrarBorde: plantillaEtiqueta?.configuracion?.mostrarBorde ?? true,
    fondoOrden: plantillaEtiqueta?.configuracion?.fondoOrden ?? true,
    tamañoTexto: plantillaEtiqueta?.configuracion?.tamañoTexto || 'pequeño',
    incluirCodigoBarras: plantillaEtiqueta?.configuracion?.incluirCodigoBarras ?? false,
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
      <h3 className="text-lg font-bold text-[#1a252f] mb-4">🏷️ Diseñador de Etiquetas</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel de Configuración */}
        <div className="space-y-6">
          
          {/* Campos a mostrar */}
          <div>
            <h4 className="font-semibold text-black mb-3">📋 Campos a mostrar:</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {camposDisponiblesEtiqueta.map(campo => (
                <label key={campo.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={camposSeleccionados.includes(campo.id)}
                    disabled={campo.obligatorio}
                    onChange={(e) => toggleCampo(campo.id, e.target.checked)}
                    className="w-4 h-4 text-green-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-black">{campo.nombre}</span>
                    {campo.obligatorio && <span className="text-xs text-black font-semibold ml-2">(obligatorio)</span>}
                    {campo.id === 'codigoBarras' && <span className="text-xs text-black ml-2">(próximamente)</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Configuración de Formato */}
          <div>
            <h4 className="font-semibold text-black mb-3">⚙️ Formato:</h4>
            <div className="space-y-3">
              
              {/* Tamaño */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Tamaño de etiqueta:</label>
                <select 
                  value={configuracion.tamaño}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, tamaño: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                >
                  <option value="62x29">62x29mm (Brother QL-800 estándar)</option>
                  <option value="38x90">38x90mm (Brother QL-800 alargada)</option>
                </select>
              </div>

             
              {/* Tamaño de texto */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Tamaño de texto:</label>
                <select 
                  value={configuracion.tamañoTexto}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, tamañoTexto: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                >
                  <option value="muy-pequeño">Muy pequeño (más campos)</option>
                  <option value="pequeño">Pequeño (estándar)</option>
                  <option value="mediano">Mediano (legible)</option>
                </select>
              </div>

              {/* Opciones visuales */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.mostrarBorde}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, mostrarBorde: e.target.checked }))}
                    className="w-4 h-4 text-green-500"
                  />
                  <span className="text-sm text-black">Mostrar borde</span>
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.fondoOrden}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, fondoOrden: e.target.checked }))}
                    className="w-4 h-4 text-green-500"
                  />
                  <span className="text-sm text-black">Número de orden con fondo negro</span>
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.incluirCodigoBarras}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, incluirCodigoBarras: e.target.checked }))}
                    className="w-4 h-4 text-green-500"
                  />
                  <span className="text-sm text-black">Reservar espacio para código de barras</span>
                </label>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h5 className="font-semibold text-black text-sm mb-2">💡 Consejos:</h5>
            <ul className="text-xs text-black space-y-1">
              <li>• Menos campos = texto más grande</li>
              <li>• IMEI se mostrará parcialmente si es muy largo</li>
              <li>• El código de barras se implementará próximamente</li>
              <li>• Orientación horizontal recomendada para más datos</li>
            </ul>
          </div>

          {/* Botón Guardar */}
          <button
            onClick={guardarPlantilla}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-all"
          >
            💾 Guardar Diseño de Etiqueta
          </button>
        </div>

        {/* Vista Previa */}
        <div>
          <h4 className="font-semibold text-black mb-3">👁️ Vista Previa:</h4>
          <div className="bg-gray-100 p-4 rounded-lg flex justify-center">
            <VistaPreviaEtiqueta 
              campos={camposSeleccionados}
              configuracion={configuracion}
              datosEjemplo={trabajoEjemplo}
            />
          </div>
          <p className="text-xs text-black mt-2 text-center">
            Vista previa para Brother QL-800
          </p>
          
          {/* Información de campos seleccionados */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-black">
              <strong>Campos seleccionados:</strong> {camposSeleccionados.length}/8
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {camposSeleccionados.map(campo => 
                camposDisponiblesEtiqueta.find(c => c.id === campo)?.nombre
              ).join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}