"use client";

import { useEffect, useState } from "react";
import ServicioPropioForm from "./ServicioPropioForm";
import type { RegistroServicioPropio } from "./useServicios";

interface DatosServicio {
    lugar: string;
    motivo: string;
    fechaEnvio: string;
    costoServicio: string;
    monedaServicio: string;
    observacionesServicio: string;
  }
  
  interface ModalEnviarServicioProps {
    mostrar: boolean;
    telefono: any;
    datosServicio: DatosServicio;
    setDatosServicio: React.Dispatch<React.SetStateAction<DatosServicio>>;
    onEnviar: () => void;
    onCerrar: () => void;
    negocioID: string;
    cotizacion: number | null;
    onRegistrarPropio: (payload: RegistroServicioPropio) => Promise<void>;
  }
  
  export default function ModalEnviarServicio({
    mostrar,
    telefono,
    datosServicio,
    setDatosServicio,
    onEnviar,
    onCerrar,
    negocioID,
    cotizacion,
    onRegistrarPropio,
  }: ModalEnviarServicioProps) {
    const [modo, setModo] = useState<"taller" | "propio">("taller");
    const [guardando, setGuardando] = useState(false);
    useEffect(() => {
      if (mostrar) {
        setModo("taller");
        setGuardando(false);
      }
    }, [mostrar, telefono?.id]);
    if (!mostrar || !telefono) return null;
    const monedaEquipo = String(telefono.moneda || "USD").toUpperCase() === "ARS" ? "ARS" : "USD";
  
    return (
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-gray-200 max-h-[92vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Enviar a Servicio Técnico</h2>
                <p className="text-orange-100 text-sm">{telefono.modelo} - {telefono.marca}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModo("taller")}
                className={`py-2 rounded-lg text-sm font-semibold border-2 ${
                  modo === "taller"
                    ? "bg-orange-600 border-orange-600 text-white"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              >
                Taller externo
              </button>
              <button
                type="button"
                onClick={() => setModo("propio")}
                className={`py-2 rounded-lg text-sm font-semibold border-2 ${
                  modo === "propio"
                    ? "bg-orange-600 border-orange-600 text-white"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              >
                Servicio propio
              </button>
            </div>

            {modo === "propio" ? (
              <ServicioPropioForm
                key={telefono.id}
                negocioID={negocioID}
                monedaEquipo={monedaEquipo}
                precioCompra={Number(telefono.precioCompra) || 0}
                cotizacion={cotizacion}
                guardando={guardando}
                onCancelar={onCerrar}
                onConfirmar={async (payload) => {
                  setGuardando(true);
                  try {
                    await onRegistrarPropio(payload);
                  } finally {
                    setGuardando(false);
                  }
                }}
              />
            ) : (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏪 Lugar del servicio *
              </label>
              <input
                type="text"
                value={datosServicio.lugar}
                onChange={(e) => setDatosServicio(prev => ({...prev, lugar: e.target.value}))}
                placeholder="Ej: Servicio técnico López"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔧 Motivo del servicio *
              </label>
              <input
                type="text"
                value={datosServicio.motivo}
                onChange={(e) => setDatosServicio(prev => ({...prev, motivo: e.target.value}))}
                placeholder="Ej: Cambio de pantalla, reparación de batería"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Fecha de envío
              </label>
              <input
                type="text"
                value={datosServicio.fechaEnvio}
                onChange={(e) => setDatosServicio(prev => ({...prev, fechaEnvio: e.target.value}))}
                placeholder="Automático: hoy"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
  
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Costo estimado del servicio
                </label>
                <input
                  type="number"
                  value={datosServicio.costoServicio}
                  onChange={(e) => setDatosServicio(prev => ({...prev, costoServicio: e.target.value}))}
                  placeholder="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💱 Moneda del servicio
                </label>
                <select
                  value={datosServicio.monedaServicio}
                  onChange={(e) => setDatosServicio(prev => ({...prev, monedaServicio: e.target.value}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="USD">🇺🇸 USD</option>
                  <option value="ARS">🇦🇷 ARS</option>
                </select>
              </div>
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Observaciones
              </label>
              <textarea
                value={datosServicio.observacionesServicio}
                onChange={(e) => setDatosServicio(prev => ({...prev, observacionesServicio: e.target.value}))}
                placeholder="Observaciones adicionales..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCerrar}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={onEnviar}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
              >
                Enviar a Servicio
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    );
  }