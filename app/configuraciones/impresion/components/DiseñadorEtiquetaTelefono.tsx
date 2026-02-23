"use client";

import { useState, useEffect } from "react";
import VistaPreviaEtiquetaTelefono from "./VistaPreviaEtiquetaTelefono";

const camposDisponiblesEtiquetaTelefono = [
  { id: 'modelo', nombre: 'Modelo', obligatorio: true },
  { id: 'marca', nombre: 'Marca', obligatorio: false },
  { id: 'gb', nombre: 'Capacidad (GB)', obligatorio: false },
  { id: 'color', nombre: 'Color', obligatorio: false },
  { id: 'estado', nombre: 'Estado (Nuevo/Usado)', obligatorio: false },
  { id: 'bateria', nombre: 'Batería %', obligatorio: false },
  { id: 'imei', nombre: 'IMEI', obligatorio: false },
  { id: 'precioVenta', nombre: 'Precio Venta', obligatorio: false },
  { id: 'fechaIngreso', nombre: 'Fecha Ingreso', obligatorio: false },
];

const telefonoEjemplo = {
  modelo: "iPhone 14 Pro Max",
  marca: "Apple",
  gb: "256",
  color: "Space Black",
  estado: "usado",
  bateria: "95",
  imei: "358240051111110",
  precioVenta: "850000",
  fechaIngreso: "15/08/2025",
};

interface Props {
  plantillaEtiquetaTelefono: any;
  onGuardarPlantilla: (plantilla: any) => void;
  nombreNegocio?: string;
}

export default function DiseñadorEtiquetaTelefono({ plantillaEtiquetaTelefono, onGuardarPlantilla, nombreNegocio }: Props) {
  const [camposSeleccionados, setCamposSeleccionados] = useState(
    plantillaEtiquetaTelefono?.campos || ['modelo', 'marca', 'gb', 'color', 'precioVenta']
  );

  const [configuracion, setConfiguracion] = useState({
    tamaño: plantillaEtiquetaTelefono?.configuracion?.tamaño || '62x29',
    orientacion: plantillaEtiquetaTelefono?.configuracion?.orientacion || 'horizontal',
    mostrarBorde: plantillaEtiquetaTelefono?.configuracion?.mostrarBorde ?? true,
    tamañoTexto: plantillaEtiquetaTelefono?.configuracion?.tamañoTexto || 'mediano',
    mostrarGarantia: plantillaEtiquetaTelefono?.configuracion?.mostrarGarantia ?? false,
  });

  const [vistaPreviaKey, setVistaPreviaKey] = useState(0);

  useEffect(() => {
    if (plantillaEtiquetaTelefono) {
      if (plantillaEtiquetaTelefono.campos) {
        setCamposSeleccionados(plantillaEtiquetaTelefono.campos);
      }
      if (plantillaEtiquetaTelefono.configuracion) {
        setConfiguracion({
          tamaño: plantillaEtiquetaTelefono.configuracion.tamaño || '62x29',
          orientacion: plantillaEtiquetaTelefono.configuracion.orientacion || 'horizontal',
          mostrarBorde: plantillaEtiquetaTelefono.configuracion.mostrarBorde ?? true,
          tamañoTexto: plantillaEtiquetaTelefono.configuracion.tamañoTexto || 'mediano',
          mostrarGarantia: plantillaEtiquetaTelefono.configuracion.mostrarGarantia ?? false,
        });
      }
    }
  }, [plantillaEtiquetaTelefono]);

  useEffect(() => {
    setVistaPreviaKey(prev => prev + 1);
  }, [camposSeleccionados, configuracion, nombreNegocio]);

  const toggleCampo = (campoId: string, incluir: boolean) => {
    if (incluir) {
      setCamposSeleccionados(prev => [...prev, campoId]);
    } else {
      setCamposSeleccionados(prev => prev.filter(id => id !== campoId));
    }
  };

  const guardarPlantilla = () => {
    const plantilla = {
      campos: camposSeleccionados,
      configuracion,
    };
    onGuardarPlantilla(plantilla);
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-[#1a252f] mb-4">📱 Diseñador de Etiquetas de Teléfonos</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Panel de Configuración */}
        <div className="space-y-6">

          {/* Nombre del negocio - informativo */}
          {nombreNegocio && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <span className="text-blue-600 text-sm">🏪</span>
              <div>
                <p className="text-xs text-blue-600 font-medium">Nombre del negocio (desde configuración)</p>
                <p className="text-sm font-bold text-blue-800">{nombreNegocio}</p>
              </div>
            </div>
          )}

          {/* Campos a mostrar */}
          <div>
            <h4 className="font-semibold text-black mb-3">📋 Campos a mostrar:</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {camposDisponiblesEtiquetaTelefono.map(campo => (
                <label
                  key={campo.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    camposSeleccionados.includes(campo.id)
                      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={camposSeleccionados.includes(campo.id)}
                    disabled={campo.obligatorio}
                    onChange={(e) => toggleCampo(campo.id, e.target.checked)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-black">{campo.nombre}</span>
                    {campo.obligatorio && (
                      <span className="text-xs text-blue-600 font-semibold ml-2">(obligatorio)</span>
                    )}
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
                <label className="block text-sm font-medium text-black mb-1">Tamaño de etiqueta Brother QL:</label>
                <select
                  value={configuracion.tamaño}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, tamaño: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                >
                  <option value="62x29">62x29mm - DK-11209 (2.4" x 1.1") Estándar pequeña</option>
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
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm text-black">Mostrar borde</span>
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
          <div className="bg-gray-100 p-4 rounded-lg flex justify-center">
            <VistaPreviaEtiquetaTelefono
              key={vistaPreviaKey}
              campos={camposSeleccionados}
              configuracion={configuracion}
              datosEjemplo={telefonoEjemplo}
              nombreNegocio={nombreNegocio || "Mi Negocio"}
            />
          </div>
          <p className="text-xs text-black mt-2 text-center">
            Vista previa para Brother QL-800 • Con header de negocio
          </p>

          {/* Info campos seleccionados */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
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