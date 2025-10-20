"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import Header from "../../Header";
import ConfiguracionImpresoras from "./components/ConfiguracionImpresoras";
import DiseñadorTicket from "./components/DiseñadorTicket";
import DiseñadorEtiqueta from "./components/DiseñadorEtiqueta";
import DiseñadorTicketA4 from "./components/DiseñadorTicketA4";
import DiseñadorEtiquetaA4 from "./components/DiseñadorEtiquetaA4";
import DiseñadorEtiquetaTelefono from "./components/DiseñadorEtiquetaTelefono";
import { ImpresionGestione } from "./utils/impresionEspecifica";

// 🎨 COMPONENTE TOAST
interface ToastProps {
  mensaje: string;
  tipo: 'exito' | 'error' | 'info';
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
    },
    info: {
      gradient: 'from-blue-500 to-blue-600',
      icono: 'ℹ️',
      border: 'border-blue-400',
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

export default function ConfiguracionImpresion() {
  const [user] = useAuthState(auth);
  
  // 🎨 ESTADO DEL TOAST
  const [toast, setToast] = useState<ToastProps>({
    mensaje: '',
    tipo: 'exito',
    mostrar: false
  });

  // Función helper para mostrar toast
  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    setToast({ mensaje, tipo, mostrar: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, mostrar: false }));
    }, 3000);
  };

  const [configuracion, setConfiguracion] = useState({
    zerforceActiva: false,
    brotherActiva: false,
    impresionAutomatica: false
  });
  
  const [plantillaTicket, setPlantillaTicket] = useState(null);
  const [plantillaEtiqueta, setPlantillaEtiqueta] = useState(null);
  const [plantillaTicketA4, setPlantillaTicketA4] = useState(null);
  const [plantillaEtiquetaA4, setPlantillaEtiquetaA4] = useState(null);
  const [plantillaEtiquetaTelefono, setPlantillaEtiquetaTelefono] = useState(null);
  
  const [activeTab, setActiveTab] = useState('configuracion');
  const [negocioID, setNegocioID] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (user) {
      cargarConfiguracion();
    }
  }, [user]);

  const cargarConfiguracion = async () => {
    try {
      const userSnap = await getDoc(doc(db, "usuarios", user!.uid));
      const userData = userSnap.data();
      const negocioId = userData?.negocioID;
      setNegocioID(negocioId);

      const configRef = doc(db, `negocios/${negocioId}/configuracion/impresion`);
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        setConfiguracion(configSnap.data() as any);
      }

      const plantillasRef = doc(db, `negocios/${negocioId}/configuracion/plantillasImpresion`);
      const plantillasSnap = await getDoc(plantillasRef);
      
      if (plantillasSnap.exists()) {
        const plantillasData = plantillasSnap.data();
        setPlantillaTicket(plantillasData.ticket || null);
        setPlantillaEtiqueta(plantillasData.etiqueta || null);
        setPlantillaTicketA4(plantillasData.ticketA4 || null);
        setPlantillaEtiquetaA4(plantillasData.etiquetaA4 || null);
        setPlantillaEtiquetaTelefono(plantillasData.etiquetaTelefono || null);
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      const configRef = doc(db, `negocios/${negocioID}/configuracion/impresion`);
      await setDoc(configRef, configuracion);
      mostrarToast("✅ Configuración guardada exitosamente");
    } catch (error) {
      console.error("Error guardando:", error);
      mostrarToast("❌ Error al guardar configuración", "error");
    } finally {
      setGuardando(false);
    }
  };

  const guardarPlantillaTicket = async (plantilla: any) => {
    try {
      const plantillasRef = doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`);
      await setDoc(plantillasRef, { 
        ticket: plantilla,
        etiqueta: plantillaEtiqueta,
        ticketA4: plantillaTicketA4,
        etiquetaA4: plantillaEtiquetaA4,
        etiquetaTelefono: plantillaEtiquetaTelefono
      }, { merge: true });
      
      setPlantillaTicket(plantilla);
      mostrarToast("✅ Diseño de ticket guardado exitosamente");
    } catch (error) {
      console.error("Error guardando plantilla ticket:", error);
      mostrarToast("❌ Error al guardar diseño de ticket", "error");
    }
  };

  const guardarPlantillaEtiqueta = async (plantilla: any) => {
    try {
      const plantillasRef = doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`);
      await setDoc(plantillasRef, { 
        ticket: plantillaTicket,
        etiqueta: plantilla,
        ticketA4: plantillaTicketA4,
        etiquetaA4: plantillaEtiquetaA4,
        etiquetaTelefono: plantillaEtiquetaTelefono
      }, { merge: true });
      
      setPlantillaEtiqueta(plantilla);
      mostrarToast("✅ Diseño de etiqueta guardado exitosamente");
    } catch (error) {
      console.error("Error guardando plantilla etiqueta:", error);
      mostrarToast("❌ Error al guardar diseño de etiqueta", "error");
    }
  };

  const guardarPlantillaTicketA4 = async (plantilla: any) => {
    try {
      const plantillasRef = doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`);
      await setDoc(plantillasRef, { 
        ticket: plantillaTicket,
        etiqueta: plantillaEtiqueta,
        ticketA4: plantilla,
        etiquetaA4: plantillaEtiquetaA4,
        etiquetaTelefono: plantillaEtiquetaTelefono
      }, { merge: true });
      
      setPlantillaTicketA4(plantilla);
      mostrarToast("✅ Diseño de ticket A4 guardado exitosamente");
    } catch (error) {
      console.error("Error guardando plantilla ticket A4:", error);
      mostrarToast("❌ Error al guardar diseño de ticket A4", "error");
    }
  };

  const guardarPlantillaEtiquetaA4 = async (plantilla: any) => {
    try {
      const plantillasRef = doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`);
      await setDoc(plantillasRef, { 
        ticket: plantillaTicket,
        etiqueta: plantillaEtiqueta,
        ticketA4: plantillaTicketA4,
        etiquetaA4: plantilla,
        etiquetaTelefono: plantillaEtiquetaTelefono
      }, { merge: true });
      
      setPlantillaEtiquetaA4(plantilla);
      mostrarToast("✅ Diseño de etiquetas A4 guardado exitosamente");
    } catch (error) {
      console.error("Error guardando plantilla etiquetas A4:", error);
      mostrarToast("❌ Error al guardar diseño de etiquetas A4", "error");
    }
  };

  const guardarPlantillaEtiquetaTelefono = async (plantilla: any) => {
    try {
      const plantillasRef = doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`);
      await setDoc(plantillasRef, { 
        ticket: plantillaTicket,
        etiqueta: plantillaEtiqueta,
        ticketA4: plantillaTicketA4,
        etiquetaA4: plantillaEtiquetaA4,
        etiquetaTelefono: plantilla
      }, { merge: true });
      
      setPlantillaEtiquetaTelefono(plantilla);
      mostrarToast("✅ Diseño de etiqueta teléfono guardado exitosamente");
    } catch (error) {
      console.error("Error guardando plantilla etiqueta teléfono:", error);
      mostrarToast("❌ Error al guardar diseño de etiqueta teléfono", "error");
    }
  };

  const probarZerforce = () => {
    const trabajoPrueba = {
      id: "PRUEBA-001",
      cliente: "Cliente de Prueba", 
      modelo: "iPhone 14 Pro",
      trabajo: "Cambio de pantalla",
      fecha: new Date().toLocaleDateString('es-AR'),
      precio: 25000
    };
    
    ImpresionGestione.ticketZerforce(trabajoPrueba);
  };

  const probarBrother = () => {
    const trabajoPrueba = {
      id: "PRUEBA-001",
      cliente: "Cliente de Prueba",
      telefono: "+54 11 1234-5678",
      modelo: "iPhone 14 Pro"
    };
    
    ImpresionGestione.etiquetaBrother(trabajoPrueba);
  };

  const probarTicketA4 = () => {
    const trabajoPrueba = {
      id: "GT-2025-001234",
      cliente: "Juan Carlos Pérez",
      fecha: new Date().toLocaleDateString('es-AR'),
      fechaEntrega: "18/08/2025",
      telefono: "+54 11 4567-8900",
      modelo: "iPhone 14 Pro Max",
      marca: "Apple",
      trabajo: "Reparación de pantalla",
      precio: 85000,
      anticipo: 40000,
      saldo: 45000,
      tecnico: "Carlos Mendoza"
    };
    
    ImpresionGestione.ticketA4(trabajoPrueba);
  };

  const probarEtiquetasA4 = () => {
    const trabajosPrueba = [
      {
        id: "GT-001",
        cliente: "Juan Pérez",
        telefono: "+54 11 1234-5678",
        modelo: "iPhone 14 Pro"
      },
      {
        id: "GT-002",
        cliente: "María García",
        telefono: "+54 11 8765-4321",
        modelo: "Samsung Galaxy S23"
      },
      {
        id: "GT-003",
        cliente: "Carlos López",
        telefono: "+54 11 5555-6666",
        modelo: "Xiaomi 13 Pro"
      }
    ];
    
    ImpresionGestione.etiquetasA4(trabajosPrueba);
  };

  const probarEtiquetaTelefono = () => {
    const telefonoPrueba = {
      modelo: "iPhone 14 Pro Max",
      almacenamiento: "256GB",
      color: "Negro Espacial",
      precio: 850000,
      estado: "Excelente",
      imei: "352048108763243"
    };
    
    ImpresionGestione.etiquetaTelefono(telefonoPrueba);
  };

  return (
    <>
      {/* 🎨 TOAST GLOBAL */}
      <Toast {...toast} />

      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">🖨️ Configuración de Impresión</h1>
            <p className="text-blue-100">Configura tus impresoras y diseña tus tickets y etiquetas</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('configuracion')}
                className={`flex-1 min-w-0 px-4 py-4 text-center font-medium transition-all whitespace-nowrap ${
                  activeTab === 'configuracion' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-50 text-black hover:bg-gray-100'
                }`}
              >
                ⚙️ Configuración
              </button>
              <button
                onClick={() => setActiveTab('ticket')}
                className={`flex-1 min-w-0 px-4 py-4 text-center font-medium transition-all whitespace-nowrap ${
                  activeTab === 'ticket' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-50 text-black hover:bg-gray-100'
                }`}
              >
                🧾 Tickets Térmicos
              </button>
              <button
                onClick={() => setActiveTab('etiqueta')}
                className={`flex-1 min-w-0 px-4 py-4 text-center font-medium transition-all whitespace-nowrap ${
                  activeTab === 'etiqueta' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-50 text-black hover:bg-gray-100'
                }`}
              >
                🏷️ Etiquetas Brother
              </button>
              <button
                onClick={() => setActiveTab('etiquetaTelefono')}
                className={`flex-1 min-w-0 px-4 py-4 text-center font-medium transition-all whitespace-nowrap ${
                  activeTab === 'etiquetaTelefono' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-50 text-black hover:bg-gray-100'
                }`}
              >
                📱 Etiquetas Teléfono
              </button>
              <button
                onClick={() => setActiveTab('ticketA4')}
                className={`flex-1 min-w-0 px-4 py-4 text-center font-medium transition-all whitespace-nowrap ${
                  activeTab === 'ticketA4' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-50 text-black hover:bg-gray-100'
                }`}
              >
                📄 Tickets A4
              </button>
              <button
                onClick={() => setActiveTab('etiquetaA4')}
                className={`flex-1 min-w-0 px-4 py-4 text-center font-medium transition-all whitespace-nowrap ${
                  activeTab === 'etiquetaA4' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-50 text-black hover:bg-gray-100'
                }`}
              >
                📋 Etiquetas A4
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'configuracion' && (
                <div className="space-y-6">
                  <ConfiguracionImpresoras 
                    configuracion={configuracion}
                    setConfiguracion={setConfiguracion}
                    onProbarZerforce={probarZerforce}
                    onProbarBrother={probarBrother}
                  />

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-black mb-3">🆕 Pruebas formato A4:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={probarTicketA4}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        📄 Probar Ticket A4
                      </button>
                      <button
                        onClick={probarEtiquetasA4}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        📋 Probar Etiquetas A4
                      </button>
                    </div>
                    <p className="text-xs text-black mt-2">* Estas pruebas usan configuración por defecto</p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                    <h4 className="font-semibold text-black mb-3">📱 Prueba Etiqueta Teléfono:</h4>
                    <button
                      onClick={probarEtiquetaTelefono}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
                    >
                      🏷️ Probar Etiqueta Teléfono
                    </button>
                    <p className="text-xs text-black mt-2">* Usa configuración por defecto para Brother QL-800</p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={guardarConfiguracion}
                      disabled={guardando}
                      className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white px-8 py-3 rounded-lg font-bold disabled:bg-gray-400 transition-all"
                    >
                      {guardando ? "Guardando..." : "💾 Guardar Configuración"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'ticket' && (
                <DiseñadorTicket 
                  plantillaTicket={plantillaTicket}
                  onGuardarPlantilla={guardarPlantillaTicket}
                />
              )}

              {activeTab === 'etiqueta' && (
                <DiseñadorEtiqueta 
                  plantillaEtiqueta={plantillaEtiqueta}
                  onGuardarPlantilla={guardarPlantillaEtiqueta}
                />
              )}

              {activeTab === 'etiquetaTelefono' && (
                <DiseñadorEtiquetaTelefono 
                  plantillaEtiquetaTelefono={plantillaEtiquetaTelefono}
                  onGuardarPlantilla={guardarPlantillaEtiquetaTelefono}
                />
              )}

              {activeTab === 'ticketA4' && (
                <DiseñadorTicketA4 
                  plantillaTicketA4={plantillaTicketA4}
                  onGuardarPlantilla={guardarPlantillaTicketA4}
                />
              )}

              {activeTab === 'etiquetaA4' && (
                <DiseñadorEtiquetaA4 
                  plantillaEtiquetaA4={plantillaEtiquetaA4}
                  onGuardarPlantilla={guardarPlantillaEtiquetaA4}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${configuracion.zerforceActiva ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div>
                  <div className="font-semibold text-black text-sm">Zerforce TP85E</div>
                  <div className="text-xs text-black">
                    {configuracion.zerforceActiva ? 'Activa' : 'Inactiva'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${configuracion.brotherActiva ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div>
                  <div className="font-semibold text-black text-sm">Brother QL-800</div>
                  <div className="text-xs text-black">
                    {configuracion.brotherActiva ? 'Activa' : 'Inactiva'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${plantillaTicket && plantillaEtiqueta ? 'bg-blue-500' : 'bg-orange-400'}`}></div>
                <div>
                  <div className="font-semibold text-black text-sm">Diseños Térmicos</div>
                  <div className="text-xs text-black">
                    {plantillaTicket && plantillaEtiqueta ? 'Configurados' : 'Pendientes'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${plantillaEtiquetaTelefono ? 'bg-orange-500' : 'bg-orange-400'}`}></div>
                <div>
                  <div className="font-semibold text-black text-sm">Etiquetas Teléfono</div>
                  <div className="text-xs text-black">
                    {plantillaEtiquetaTelefono ? 'Configurado' : 'Por configurar'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${plantillaTicketA4 ? 'bg-purple-500' : 'bg-orange-400'}`}></div>
                <div>
                  <div className="font-semibold text-black text-sm">Tickets A4</div>
                  <div className="text-xs text-black">
                    {plantillaTicketA4 ? 'Configurado' : 'Por configurar'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${plantillaEtiquetaA4 ? 'bg-indigo-500' : 'bg-orange-400'}`}></div>
                <div>
                  <div className="font-semibold text-black text-sm">Etiquetas A4</div>
                  <div className="text-xs text-black">
                    {plantillaEtiquetaA4 ? 'Configurado' : 'Por configurar'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
            <h3 className="font-bold text-green-800 mb-3">🚀 Guía Rápida</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <div className="font-semibold text-black">1. Configurar</div>
                <div className="text-black">Activa tus impresoras y prueba funcionamiento</div>
              </div>
              <div>
                <div className="font-semibold text-black">2. Tickets Térmicos</div>
                <div className="text-black">Para Zerforce TP85E (80mm)</div>
              </div>
              <div>
                <div className="font-semibold text-black">3. Etiquetas Brother</div>
                <div className="text-black">Para Brother QL-800 (62x29mm)</div>
              </div>
              <div>
                <div className="font-semibold text-black">4. Etiquetas Teléfono</div>
                <div className="text-black">Etiquetas para stock de teléfonos</div>
              </div>
              <div>
                <div className="font-semibold text-black">5. Tickets A4</div>
                <div className="text-black">Órdenes completas en formato A4</div>
              </div>
              <div>
                <div className="font-semibold text-black">6. Etiquetas A4</div>
                <div className="text-black">Múltiples etiquetas en hoja A4</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 🎨 ESTILOS CSS PARA LAS ANIMACIONES */}
      <style jsx global>{`
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