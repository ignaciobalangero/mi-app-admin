"use client";

import { useState, useEffect } from "react";
import VistaPreviaEtiquetaA4 from "./VistaPreviaEtiquetaA4";

const camposDisponiblesEtiquetaA4 = [
  { id: 'cliente', nombre: 'Cliente', obligatorio: true },
  { id: 'numeroOrden', nombre: 'Número de Orden', obligatorio: true },
  { id: 'modelo', nombre: 'Modelo', obligatorio: false },
  { id: 'marca', nombre: 'Marca', obligatorio: false },
  { id: 'clave', nombre: 'Clave/Password', obligatorio: false },
  { id: 'trabajo', nombre: 'Tipo de Trabajo', obligatorio: false },
  { id: 'fecha', nombre: 'Fecha', obligatorio: false },
  { id: 'tecnico', nombre: 'Técnico', obligatorio: false },
  { id: 'observaciones', nombre: 'Observaciones', obligatorio: false },
  { id: 'imei', nombre: 'IMEI/Serie', obligatorio: false },
  { id: 'estado', nombre: 'Estado', obligatorio: false },
  { id: 'prioridad', nombre: 'Prioridad', obligatorio: false },
];

const trabajoEjemplo = {
  cliente: "Juan Pérez",
  numeroOrden: "GT-001",
  modelo: "iPhone 14",
  marca: "Apple",
  clave: "1234",
  trabajo: "Pantalla",
  fecha: "15/08",
  tecnico: "Carlos",
  observaciones: "Urgente",
  imei: "123456789",
  estado: "En proceso",
  prioridad: "Alta"
};

interface Props {
  plantillaEtiquetaA4: any;
  onGuardarPlantilla: (plantilla: any) => void;
}

export default function DiseñadorEtiquetaA4({ plantillaEtiquetaA4, onGuardarPlantilla }: Props) {
  const [camposSeleccionados, setCamposSeleccionados] = useState(
    plantillaEtiquetaA4?.campos || ['cliente', 'numeroOrden', 'modelo', 'trabajo']
  );
  
  const [configuracion, setConfiguracion] = useState({
    tamañoEtiqueta: plantillaEtiquetaA4?.configuracion?.tamañoEtiqueta || '62x29',
    etiquetasPorFila: plantillaEtiquetaA4?.configuracion?.etiquetasPorFila || 3,
    etiquetasPorColumna: plantillaEtiquetaA4?.configuracion?.etiquetasPorColumna || 9,
    separacionHorizontal: plantillaEtiquetaA4?.configuracion?.separacionHorizontal || 2,
    separacionVertical: plantillaEtiquetaA4?.configuracion?.separacionVertical || 2,
    margenSuperior: plantillaEtiquetaA4?.configuracion?.margenSuperior || 15,
    margenIzquierdo: plantillaEtiquetaA4?.configuracion?.margenIzquierdo || 8,
    orientacionEtiqueta: plantillaEtiquetaA4?.configuracion?.orientacionEtiqueta || 'horizontal',
    tamañoTexto: plantillaEtiquetaA4?.configuracion?.tamañoTexto || 'pequeño',
    mostrarBorde: plantillaEtiquetaA4?.configuracion?.mostrarBorde ?? true,
    fondoOrden: plantillaEtiquetaA4?.configuracion?.fondoOrden ?? true,
    incluirCodigoBarras: plantillaEtiquetaA4?.configuracion?.incluirCodigoBarras ?? false,
  });

  // ========================================
  // ✅ EFECTO PARA ACTUALIZAR CUANDO CAMBIA plantillaEtiquetaA4
  // ========================================
  useEffect(() => {
    if (plantillaEtiquetaA4) {
      console.log("📥 Cargando plantilla A4 desde Firebase:", plantillaEtiquetaA4);
      
      // Actualizar campos seleccionados
      if (plantillaEtiquetaA4.campos) {
        setCamposSeleccionados(plantillaEtiquetaA4.campos);
      }
      
      // Actualizar configuración
      if (plantillaEtiquetaA4.configuracion) {
        setConfiguracion({
          tamañoEtiqueta: plantillaEtiquetaA4.configuracion.tamañoEtiqueta || '62x29',
          etiquetasPorFila: plantillaEtiquetaA4.configuracion.etiquetasPorFila || 3,
          etiquetasPorColumna: plantillaEtiquetaA4.configuracion.etiquetasPorColumna || 9,
          separacionHorizontal: plantillaEtiquetaA4.configuracion.separacionHorizontal || 2,
          separacionVertical: plantillaEtiquetaA4.configuracion.separacionVertical || 2,
          margenSuperior: plantillaEtiquetaA4.configuracion.margenSuperior || 15,
          margenIzquierdo: plantillaEtiquetaA4.configuracion.margenIzquierdo || 8,
          orientacionEtiqueta: plantillaEtiquetaA4.configuracion.orientacionEtiqueta || 'horizontal',
          tamañoTexto: plantillaEtiquetaA4.configuracion.tamañoTexto || 'pequeño',
          mostrarBorde: plantillaEtiquetaA4.configuracion.mostrarBorde ?? true,
          fondoOrden: plantillaEtiquetaA4.configuracion.fondoOrden ?? true,
          incluirCodigoBarras: plantillaEtiquetaA4.configuracion.incluirCodigoBarras ?? false,
        });
      }
    }
  }, [plantillaEtiquetaA4]); // ← Se ejecuta cuando plantillaEtiquetaA4 cambia

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
    console.log("💾 Guardando plantilla A4:", plantilla);
    onGuardarPlantilla(plantilla);
  };

  const totalEtiquetas = configuracion.etiquetasPorFila * configuracion.etiquetasPorColumna;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-black mb-4">🏷️ Diseñador de Etiquetas A4</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel de Configuración */}
        <div className="space-y-6">
          
          {/* Configuración de Layout */}
          <div>
            <h4 className="font-semibold text-black mb-3">📐 Layout de Hoja A4:</h4>
            <div className="space-y-3">
              
              {/* Tamaño de etiqueta */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Tamaño de etiqueta:</label>
                <select 
                  value={configuracion.tamañoEtiqueta}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, tamañoEtiqueta: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                >
                  <option value="62x29">62x29mm (Brother DK-11209)</option>
                  <option value="38x90">38x90mm (Brother DK-11208)</option>
                  <option value="52x29">52x29mm (Estándar)</option>
                </select>
              </div>

              {/* Distribución */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Por fila:</label>
                  <input 
                    type="number"
                    min="1" max="8"
                    value={configuracion.etiquetasPorFila}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, etiquetasPorFila: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Por columna:</label>
                  <input 
                    type="number"
                    min="1" max="15"
                    value={configuracion.etiquetasPorColumna}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, etiquetasPorColumna: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  />
                </div>
              </div>

              {/* Márgenes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Margen superior (mm):</label>
                  <input 
                    type="number"
                    min="0" max="30"
                    value={configuracion.margenSuperior}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, margenSuperior: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Margen izquierdo (mm):</label>
                  <input 
                    type="number"
                    min="0" max="30"
                    value={configuracion.margenIzquierdo}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, margenIzquierdo: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  />
                </div>
              </div>

              {/* Separaciones */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Separación H (mm):</label>
                  <input 
                    type="number"
                    min="0" max="10"
                    value={configuracion.separacionHorizontal}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, separacionHorizontal: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Separación V (mm):</label>
                  <input 
                    type="number"
                    min="0" max="10"
                    value={configuracion.separacionVertical}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, separacionVertical: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de Etiqueta */}
          <div>
            <h4 className="font-semibold text-black mb-3">⚙️ Formato de Etiqueta:</h4>
            <div className="space-y-3">
              
              {/* Orientación y tamaño de texto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Orientación:</label>
                  <select 
                    value={configuracion.orientacionEtiqueta}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, orientacionEtiqueta: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Tamaño texto:</label>
                  <select 
                    value={configuracion.tamañoTexto}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, tamañoTexto: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-black"
                  >
                    <option value="muy-pequeño">Muy pequeño</option>
                    <option value="pequeño">Pequeño</option>
                    <option value="mediano">Mediano</option>
                  </select>
                </div>
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

          {/* Campos a mostrar */}
          <div>
            <h4 className="font-semibold text-black mb-3">📋 Campos a mostrar:</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {camposDisponiblesEtiquetaA4.map(campo => (
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
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h5 className="font-semibold text-black text-sm mb-2">💡 Resumen:</h5>
            <ul className="text-xs text-black space-y-1">
              <li>• <strong>Total etiquetas por hoja:</strong> {totalEtiquetas}</li>
              <li>• <strong>Campos seleccionados:</strong> {camposSeleccionados.length}</li>
              <li>• Ajusta márgenes según tu impresora</li>
              <li>• Usa papel adhesivo compatible con A4</li>
            </ul>
          </div>

          {/* Botón Guardar */}
          <button
            onClick={guardarPlantilla}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-all"
          >
            💾 Guardar Diseño de Etiquetas A4
          </button>
        </div>

        {/* Vista Previa */}
        <div>
          <h4 className="font-semibold text-black mb-3">👁️ Vista Previa:</h4>
          <div className="bg-gray-100 p-4 rounded-lg">
            <VistaPreviaEtiquetaA4 
              camposSeleccionados={camposSeleccionados}
              configuracion={configuracion}
              camposDisponibles={camposDisponiblesEtiquetaA4}
            />
          </div>
          <p className="text-xs text-black mt-2 text-center">
            Vista previa para impresora A4
          </p>
          
          {/* Información de campos seleccionados */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-black">
              <strong>Distribución:</strong> {configuracion.etiquetasPorFila}×{configuracion.etiquetasPorColumna} = {totalEtiquetas} etiquetas
            </div>
            <div className="text-xs text-black mt-1">
              <strong>Campos:</strong> {camposSeleccionados.map(campo => 
                camposDisponiblesEtiquetaA4.find(c => c.id === campo)?.nombre
              ).join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}