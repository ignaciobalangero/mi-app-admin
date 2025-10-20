"use client";

import { useState } from "react";
import VistaPreviaEtiquetaTelefono from "./VistaPreviaEtiquetaTelefono";

const camposDisponiblesEtiquetaTelefono = [
  { id: 'modelo', nombre: 'Modelo', obligatorio: true },
  { id: 'marca', nombre: 'Marca', obligatorio: true },
  { id: 'codigoBarras', nombre: 'Código de Barras (IMEI)', obligatorio: false },
  { id: 'imei', nombre: 'IMEI Visible', obligatorio: false },
  { id: 'bateria', nombre: 'Batería %', obligatorio: false },
  { id: 'gb', nombre: 'Capacidad GB', obligatorio: false },
  { id: 'color', nombre: 'Color', obligatorio: false },
  { id: 'estado', nombre: 'Estado (Nuevo/Usado)', obligatorio: false },
  { id: 'precioVenta', nombre: 'Precio Venta', obligatorio: false },
  { id: 'fechaIngreso', nombre: 'Fecha Ingreso', obligatorio: false },
];

const telefonoEjemplo = {
  id: 'TEL-001',
  codigoBarras: '7894561230123',
  modelo: 'iPhone 14 Pro Max',
  marca: 'Apple',
  imei: '358240051111110',
  bateria: '95',
  gb: '256',
  color: 'Space Black',
  estado: 'usado',
  precioVenta: '$850.000',
  fechaIngreso: '15/08/2025'
};

interface Props {
  plantillaEtiquetaTelefono: any;
  onGuardarPlantilla: (plantilla: any) => void;
}

export default function DiseñadorEtiquetaTelefono({ plantillaEtiquetaTelefono, onGuardarPlantilla }: Props) {
  const [camposSeleccionados, setCamposSeleccionados] = useState(
    plantillaEtiquetaTelefono?.campos || ['modelo', 'marca', 'gb', 'precioVenta', 'estado']
  );
  
  const [configuracion, setConfiguracion] = useState({
    nombreNegocio: plantillaEtiquetaTelefono?.configuracion?.nombreNegocio || 'GESTIONE',
    tamaño: plantillaEtiquetaTelefono?.configuracion?.tamaño || '62x29',
    orientacion: plantillaEtiquetaTelefono?.configuracion?.orientacion || 'horizontal',
    tamañoTexto: plantillaEtiquetaTelefono?.configuracion?.tamañoTexto || 'pequeño',
    mostrarBordes: plantillaEtiquetaTelefono?.configuracion?.mostrarBordes ?? true,
    incluirCodigoBarras: plantillaEtiquetaTelefono?.configuracion?.incluirCodigoBarras ?? true,
    tipoCodigoBarras: plantillaEtiquetaTelefono?.configuracion?.tipoCodigoBarras || 'CODE128',
    mostrarGarantia: plantillaEtiquetaTelefono?.configuracion?.mostrarGarantia ?? true,
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
      <h3 className="text-lg font-bold text-[#1a252f] mb-4">📱 Diseñador de Etiquetas de Teléfonos</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel de Configuración */}
        <div className="space-y-6">
          
          {/* Campos a mostrar */}
          <div>
            <h4 className="font-semibold text-black mb-3">📋 Campos a mostrar:</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {camposDisponiblesEtiquetaTelefono.map(campo => (
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

          {/* Configuración de Formato */}
          <div>
            <h4 className="font-semibold text-black mb-3">⚙️ Formato:</h4>
            <div className="space-y-3">
              
              {/* Nombre del negocio */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Nombre del Negocio:</label>
                <input 
                  type="text"
                  value={configuracion.nombreNegocio}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, nombreNegocio: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  placeholder="Nombre de tu negocio"
                />
              </div>

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
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Orientación */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Orientación:</label>
                <select 
                  value={configuracion.orientacion}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, orientacion: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
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

              {/* Tipo de código de barras */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Tipo de código de barras:</label>
                <select 
                  value={configuracion.tipoCodigoBarras}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, tipoCodigoBarras: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                >
                  <option value="CODE128">CODE128 (estándar)</option>
                  <option value="CODE39">CODE39</option>
                  <option value="EAN13">EAN13</option>
                  <option value="QR">QR Code</option>
                </select>
              </div>

              {/* Opciones visuales */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.mostrarBordes}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, mostrarBordes: e.target.checked }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm text-black">Mostrar borde</span>
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.incluirCodigoBarras}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, incluirCodigoBarras: e.target.checked }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm text-black">Incluir código de barras</span>
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={configuracion.mostrarGarantia}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, mostrarGarantia: e.target.checked }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm text-black">Mostrar línea de garantía</span>
                </label>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h5 className="font-semibold text-black text-sm mb-2">💡 Consejos:</h5>
            <ul className="text-xs text-black space-y-1">
              <li>• Menos campos = texto más grande y legible</li>
              <li>• El código de barras usa el IMEI del teléfono</li>
              <li>• QR Code es ideal para información completa</li>
              <li>• Orientación horizontal recomendada para más datos</li>
            </ul>
          </div>

          {/* Botón Guardar */}
          <button
            onClick={guardarPlantilla}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-all"
          >
            💾 Guardar Diseño de Etiqueta Teléfono
          </button>
        </div>

        {/* Vista Previa */}
        <div>
          <h4 className="font-semibold text-black mb-3">👁️ Vista Previa:</h4>
          <div className="bg-gray-100 p-4 rounded-lg flex justify-center items-center min-h-[300px]">
            <VistaPreviaEtiquetaTelefono 
              campos={camposSeleccionados}
              configuracion={configuracion}
              datosEjemplo={telefonoEjemplo}
            />
          </div>
          <p className="text-xs text-black mt-2 text-center">
            Vista previa para Brother QL-800
          </p>
          
          {/* Información de campos seleccionados */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-black">
              <strong>Campos seleccionados:</strong> {camposSeleccionados.length}/{camposDisponiblesEtiquetaTelefono.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {camposSeleccionados.map(campo => 
                camposDisponiblesEtiquetaTelefono.find(c => c.id === campo)?.nombre
              ).join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}