"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import Link from "next/link";
import Header from "../Header";
import IntegracionGoogleSheet from "./components/IntegracionGoogleSheet";
//import PanelUsuariosExentos from "./components/PanelUsuariosExentos";
import GestionSuscripcion from "./components/GestionSuscripcion"; // ✅ NUEVO IMPORT
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Configuraciones() {
  const [user] = useAuthState(auth);
  interface RolInfo {
    tipo: string;
    negocioID: string;
  }  
  const [rol, setRol] = useState<RolInfo | null>(null);
  const [textoGarantiaServicio, setTextoGarantiaServicio] = useState("");
  const [textoGarantiaTelefonos, setTextoGarantiaTelefonos] = useState("");
  const [imprimirEtiqueta, setImprimirEtiqueta] = useState(false);
  const [imprimirTicket, setImprimirTicket] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [nuevoLogo, setNuevoLogo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [pestanaActiva, setPestanaActiva] = useState("general");
  const [mostrarPanelExentos, setMostrarPanelExentos] = useState(false);

  // ✅ NUEVOS ESTADOS PARA IMPRESORAS (incluyendo A4)
  const [impresoraTicket, setImpresoraTicket] = useState("");
  const [impresoraEtiqueta, setImpresoraEtiqueta] = useState("");
  const [impresoraA4, setImpresoraA4] = useState("");
  const [impresoras, setImpresoras] = useState<string[]>([]);
  const [cargandoImpresoras, setCargandoImpresoras] = useState(false);

  const SUPER_ADMIN_UID = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";
  const router = useRouter();

  // ✅ FUNCIÓN CORREGIDA - SIN EJECUTAR window.print() AUTOMÁTICAMENTE
  const obtenerImpresorasReales = async () => {
    console.log("🔍 Detectando impresoras del sistema...");
    setCargandoImpresoras(true);
    
    let impresorasDetectadas: string[] = [];
    
    try {
      // Lista expandida con impresoras WiFi comunes y categorización
      const impresorasComunes = [
        "📟 Impresora predeterminada del sistema",
        
        // Separador visual
        "━━━ IMPRESORAS TÉRMICAS (Tickets) ━━━",
        "🧾 Epson TM-T88V (USB/Red)",
        "🧾 Epson TM-T20III (USB/WiFi)",
        "🧾 Epson TM-T82III (USB/WiFi)",
        "🧾 Star TSP143III (USB/WiFi)",
        "🧾 Star TSP654II (WiFi)",
        "🧾 Citizen CT-S310II (WiFi)",
        "🧾 Bixolon SRP-350III (USB/Red)",
        "🧾 Bixolon SRP-Q300 (WiFi)",
        
        // Separador visual
        "━━━ IMPRESORAS DE ETIQUETAS ━━━",
        "🏷️ Brother QL-800 (USB)",
        "🏷️ Brother QL-820NWB (WiFi)",
        "🏷️ Brother QL-1110NWB (WiFi)",
        "🏷️ Zebra ZD421 (USB/WiFi)",
        "🏷️ Zebra GK420d (USB)",
        "🏷️ Dymo LabelWriter 450 (USB)",
        "🏷️ Dymo LabelWriter 4XL (USB)",
        "🏷️ TSC TE210 (USB/WiFi)",
        "🏷️ TSC TTP-244 Pro (USB)",
        
        // Separador visual
        "━━━ IMPRESORAS A4 WiFi POPULARES ━━━",
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
        "━━━ OTRAS OPCIONES ━━━",
        "🖨️ Otra impresora térmica (especificar en nombre)",
        "🖨️ Otra impresora de etiquetas (especificar en nombre)",
        "🖨️ Otra impresora A4 (especificar en nombre)"
      ];
      
      impresorasDetectadas = impresorasComunes;
      
      // ✅ ELIMINAR DETECCIÓN QUE CAUSA EL MODAL AUTOMÁTICO
      // Ya no intentamos detectar impresoras reales del navegador
      // porque eso ejecutaba window.print() automáticamente
      
    } catch (error) {
      console.error("❌ Error detectando impresoras:", error);
      impresorasDetectadas = [
        "📟 Impresora predeterminada",
        "🧾 Epson TM-T88V (Tickets)",
        "🏷️ Brother QL-800 (Etiquetas)", 
        "📄 HP LaserJet WiFi (A4)"
      ];
    }
    
    console.log(`✅ ${impresorasDetectadas.length} impresoras en la lista`);
    setImpresoras(impresorasDetectadas);
    setCargandoImpresoras(false);
  };

  // ✅ FUNCIÓN MEJORADA PARA PROBAR IMPRESORAS (SOLO CUANDO SE HACE CLIC)
  const probarImpresoraReal = async (tipo: 'ticket' | 'etiqueta' | 'a4', nombreImpresora: string) => {
    if (!nombreImpresora) {
      alert("Selecciona una impresora primero");
      return;
    }

    // Verificar si es un separador
    if (nombreImpresora.includes('━━━')) {
      alert("⚠️ Esa es una categoría, no una impresora. Selecciona una impresora específica.");
      return;
    }

    console.log(`🖨️ Probando impresora: ${nombreImpresora} (${tipo})`);
    
    // ✅ CONFIRMACIÓN ANTES DE ABRIR MODAL DE IMPRESIÓN
    const confirmar = confirm(`¿Quieres abrir una ventana de prueba para la impresora: ${nombreImpresora}?`);
    if (!confirmar) {
      return;
    }
    
    // Detectar si es una impresora WiFi
    const esImpresoraWiFi = nombreImpresora.includes('WiFi') || nombreImpresora.includes('(WiFi)');
    const esImpresoraPredeterminada = nombreImpresora.includes('📟');

    const contenidoPrueba = tipo === 'ticket' 
      ? `
        <div style="width: 300px; font-family: 'Courier New', monospace; font-size: 12px; padding: 10px;">
          <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
            PRUEBA DE IMPRESORA DE TICKETS
          </div>
          <div style="margin-bottom: 15px;">
            <strong>ID:</strong> PRUEBA-001<br>
            <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}<br>
            <strong>Cliente:</strong> Cliente de Prueba<br>
            <strong>Modelo:</strong> iPhone 14 Pro<br>
            <strong>Trabajo:</strong> Cambio de pantalla<br>
            <strong>Precio:</strong> $15,000
          </div>
          <div style="text-align: center; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; font-size: 10px;">
            Prueba generada el ${new Date().toLocaleString('es-AR')}<br>
            Impresora: ${nombreImpresora}<br>
            ${esImpresoraWiFi ? '<strong>📶 Conexión WiFi detectada</strong>' : ''}
            ${esImpresoraPredeterminada ? '<strong>🖨️ Impresora del sistema</strong>' : ''}
          </div>
        </div>
      `
      : tipo === 'etiqueta'
      ? `
        <div style="width: 62mm; height: 29mm; font-family: Arial, sans-serif; font-size: 8px; line-height: 1.2; padding: 2mm; box-sizing: border-box; border: 1px solid #000;">
          <div style="text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 1mm;">
            PRUEBA-001
          </div>
          <div style="font-size: 7px;">
            <strong>Cliente:</strong> Cliente de Prueba<br>
            <strong>Modelo:</strong> iPhone 14 Pro<br>
            <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}<br>
            <strong>Conexión:</strong> ${esImpresoraWiFi ? 'WiFi 📶' : 'USB/Red'}
          </div>
        </div>
      `
      : `
        <div style="width: 210mm; min-height: 297mm; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 20mm; box-sizing: border-box;">
          <div style="text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 30px; border-bottom: 3px solid #e67e22; padding-bottom: 10px;">
            PRUEBA DE IMPRESORA A4
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #e67e22; margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; color: #2c3e50;">🖨️ Información de la Impresora</h3>
            <p><strong>Nombre:</strong> ${nombreImpresora}</p>
            <p><strong>Conexión:</strong> ${esImpresoraWiFi ? '📶 WiFi (Inalámbrica)' : esImpresoraPredeterminada ? '🖨️ Sistema' : '🔌 USB/Red'}</p>
            <p><strong>Formato:</strong> A4 (210mm x 297mm)</p>
            <p><strong>Fecha de prueba:</strong> ${new Date().toLocaleString('es-AR')}</p>
            ${esImpresoraWiFi ? '<p style="color: #27ae60;"><strong>✅ Impresora WiFi - Perfecta para documentos A4</strong></p>' : ''}
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
              <h3 style="margin: 0 0 10px 0; color: #2c3e50;">📋 Trabajo de Prueba</h3>
              <p><strong>ID:</strong> PRUEBA-001</p>
              <p><strong>Cliente:</strong> Cliente de Prueba</p>
              <p><strong>Modelo:</strong> iPhone 14 Pro</p>
              <p><strong>Trabajo:</strong> Cambio de pantalla</p>
              <p><strong>Precio:</strong> $15,000</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60;">
              <h3 style="margin: 0 0 10px 0; color: #2c3e50;">🔧 Configuración</h3>
              <p><strong>Sistema:</strong> ${navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : 'Linux'}</p>
              <p><strong>Navegador:</strong> ${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Otro'}</p>
              <p><strong>Red:</strong> ${esImpresoraWiFi ? 'WiFi (Inalámbrica)' : 'Cableada'}</p>
            </div>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border: 1px solid #27ae60; text-align: center;">
            <h3 style="margin: 0 0 10px 0; color: #27ae60;">✅ Prueba de Impresión Exitosa</h3>
            <p style="margin: 0;">Si puedes ver este documento correctamente, tu impresora está configurada y funcionando.</p>
            ${esImpresoraWiFi ? '<p style="margin: 10px 0 0 0; color: #27ae60;"><strong>📶 Impresora WiFi detectada - Lista para usar</strong></p>' : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1; font-size: 10px; color: #7f8c8d;">
            Documento de prueba generado el ${new Date().toLocaleString('es-AR')}<br>
            GestiOne - Sistema de Gestión de Servicio Técnico
          </div>
        </div>
      `;

    // ✅ CREAR VENTANA SOLO CUANDO EL USUARIO HACE CLIC EN "PROBAR"
    const ventana = window.open('', '_blank', 
      tipo === 'ticket' ? 'width=400,height=600' : 
      tipo === 'etiqueta' ? 'width=300,height=250' : 
      'width=800,height=1000'
    );
    
    if (!ventana) {
      alert("⚠️ El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.");
      return;
    }

    ventana.document.write(`
      <html>
        <head>
          <title>Prueba ${tipo === 'ticket' ? 'Ticket' : tipo === 'etiqueta' ? 'Etiqueta' : 'A4'} - ${nombreImpresora}</title>
          <style>
            body { margin: 0; padding: 0; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            .wifi-status {
              background: ${esImpresoraWiFi ? '#d4edda' : '#fff3cd'};
              border: 1px solid ${esImpresoraWiFi ? '#c3e6cb' : '#ffeaa7'};
              color: ${esImpresoraWiFi ? '#155724' : '#856404'};
              padding: 10px;
              border-radius: 5px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          ${contenidoPrueba}
          <div class="no-print" style="text-align: center; margin-top: 20px; padding: 15px; background: #f8f9fa; border-top: 2px solid #dee2e6;">
            <div class="wifi-status">
              ${esImpresoraWiFi 
                ? '📶 <strong>Impresora WiFi:</strong> Esta impresora se conecta de forma inalámbrica' 
                : esImpresoraPredeterminada 
                ? '🖨️ <strong>Impresora del sistema:</strong> Usará la impresora predeterminada de tu PC'
                : '🔌 <strong>Impresora cableada:</strong> Esta impresora se conecta por USB o red'
              }
            </div>
            <p style="margin: 10px 0; font-weight: bold; font-size: 14px;">📄 ${nombreImpresora}</p>
            <button onclick="window.print()" style="padding: 12px 24px; font-size: 14px; background: ${tipo === 'ticket' ? '#3498db' : tipo === 'etiqueta' ? '#27ae60' : '#e67e22'}; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
              🖨️ Imprimir en ${nombreImpresora.substring(0, 25)}${nombreImpresora.length > 25 ? '...' : ''}
            </button>
            <button onclick="window.close()" style="padding: 12px 24px; font-size: 14px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
              ❌ Cerrar
            </button>
            <div style="margin-top: 10px; font-size: 12px; color: #6c757d;">
              💡 <strong>Tip:</strong> ${esImpresoraWiFi ? 'Verifica que tu impresora WiFi esté conectada a la misma red' : 'Verifica que la impresora esté encendida y conectada'}
            </div>
          </div>
        </body>
      </html>
    `);
    ventana.document.close();
    
    console.log(`🖨️ Ventana de prueba abierta para: ${nombreImpresora}`);
  };

  // ✅ BOTÓN PARA REFRESCAR LISTA DE IMPRESORAS
  const BotonRefrescarImpresoras = () => (
    <div className="mb-4 flex items-center gap-3">
      <button
        onClick={() => {
          setImpresoras([]);
          obtenerImpresorasReales();
        }}
        disabled={cargandoImpresoras}
        className="px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9] transition-all text-sm flex items-center gap-2 disabled:bg-gray-400"
      >
        {cargandoImpresoras ? (
          <>
            <span className="animate-spin">⏳</span>
            Detectando...
          </>
        ) : (
          <>
            🔄 Actualizar Lista
          </>
        )}
      </button>
      
      <div className="text-sm text-[#7f8c8d]">
        💡 <strong>Tip:</strong> Si tu impresora WiFi no aparece, asegúrate de que esté encendida y conectada a la red
      </div>
    </div>
  );

useEffect(() => {
  if (user) {
    const cargarConfiguracion = async () => {
      try {
        // 🔧 CAMBIO: Usar la misma estructura que crear-usuario
        const userSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (!userSnap.exists()) {
          throw new Error("Usuario no encontrado");
        }

        const userData = userSnap.data();
        const negocioID = userData.negocioID;
        const rolUsuario = userData.rol;

        if (!negocioID) {
          throw new Error("No se encontró el negocioID del usuario");
        }

        // Establecer el rol usando la estructura correcta
        setRol({
          tipo: rolUsuario || "sin rol",
          negocioID,
        });

        // ✅ CARGAR IMPRESORAS SIN EJECUTAR window.print()
        await obtenerImpresorasReales();

        // Cargar configuración del negocio
        const configRef = doc(db, `negocios/${negocioID}/configuracion/datos`);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          setTextoGarantiaServicio(data.textoGarantia || "");
          setTextoGarantiaTelefonos(data.textoGarantiaTelefonos || "");
          setImprimirEtiqueta(data.imprimirEtiqueta || false);
          setImprimirTicket(data.imprimirTicket || false);
          setLogoUrl(data.logoUrl || "");
          // ✅ CARGAR CONFIGURACIÓN DE IMPRESORAS
          setImpresoraTicket(data.impresoraTicket || "");
          setImpresoraEtiqueta(data.impresoraEtiqueta || "");
          setImpresoraA4(data.impresoraA4 || "");
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      }
    };
    cargarConfiguracion();
  }
}, [user]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNuevoLogo(e.target.files[0]);
    }
  };

  const guardarConfiguracion = async () => {
    if (!user) return;
    setGuardando(true);
    console.log("✅ Comenzando guardar configuración...");
  
    try {
      const negocioID = rol?.negocioID;
      if (!negocioID) throw new Error("No se encontró el negocioID del usuario");      
  
      let finalLogoUrl = logoUrl;
  
      if (nuevoLogo) {
        console.log("📤 Subiendo nuevo logo...");
        const storageRef = ref(storage, `logos/${negocioID}/logo.png`);
        await uploadBytes(storageRef, nuevoLogo);
        console.log("✅ Logo subido.");
  
        finalLogoUrl = `${await getDownloadURL(storageRef)}?v=${Date.now()}`;
        console.log("✅ URL de logo obtenida:", finalLogoUrl);
      }
  
      const refDoc = doc(db, `negocios/${negocioID}/configuracion`, "datos");
      console.log("💾 Guardando configuración en Firestore...");
      await setDoc(
        refDoc,
        {
          textoGarantia: textoGarantiaServicio,
          textoGarantiaTelefonos: textoGarantiaTelefonos,
          imprimirEtiqueta,
          imprimirTicket,
          logoUrl: finalLogoUrl,
          // ✅ GUARDAR CONFIGURACIÓN DE IMPRESORAS
          impresoraTicket,
          impresoraEtiqueta,
          impresoraA4,
        },
        { merge: true }
      );
      console.log("✅ Configuración guardada en Firestore.");
  
      alert("✅ Configuración guardada correctamente.");
      setNuevoLogo(null);
      setLogoUrl(finalLogoUrl);
    } catch (error: any) {
      console.error("❌ Error al guardar configuración:", error);
      alert("Hubo un error al guardar: " + error.message);
    } finally {
      console.log("⚡ Finalizando guardarConfiguracion");
      setGuardando(false);
    }
  };

  // ✅ PESTAÑAS ACTUALIZADAS CON SUSCRIPCIÓN
  const pestanas = [
    { id: "general", label: "General", icono: "⚙️" },
    { id: "garantias", label: "Garantías", icono: "🛡️" },
    { id: "impresion", label: "Impresión", icono: "🖨️" },
    { id: "suscripcion", label: "Suscripción", icono: "💳" }, // ← NUEVA PESTAÑA
  ];

  // ✅ MOSTRAR PANEL DE USUARIOS EXENTOS SI ESTÁ ACTIVO
  if (mostrarPanelExentos) {
    return (
      <>
        <Header />
        <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black">
          <div className="w-full px-4 max-w-[1200px] mx-auto space-y-6">
            
            {/* Botón para volver */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMostrarPanelExentos(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                ← Volver a Configuraciones
              </button>
            </div>

            {/* Panel de usuarios exentos */}
          
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black">
        <div className="w-full px-4 max-w-[1200px] mx-auto space-y-6">
          
          {user?.uid === SUPER_ADMIN_UID && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-2xl p-4 shadow-lg">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/admin/super")}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2"
                >
                  🏢 Crear nuevo negocio
                </button>
                <button
                  onClick={() => router.push("/admin/negocios")}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2"
                >
                  🧾 Ver negocios
                </button>
                <button
                  onClick={() => setMostrarPanelExentos(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2"
                >
                  👑 Gestionar usuarios exentos
                </button>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">⚙️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Configuraciones del Sistema
                </h1>
                <p className="text-blue-100 text-sm">
                  Administra la configuración general de tu negocio
                </p>
              </div>
            </div>
          </div>

          {rol?.tipo === "admin" && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#3498db] rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">👤</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2c3e50]">Gestión de Usuarios</h2>
                  <p className="text-[#7f8c8d] text-xs">Administra usuarios y permisos</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/configuraciones/crear-usuario")}
                  className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
                >
                  👤 Crear usuario
                </button>

                <button
                  onClick={() => router.push("/configuraciones/impresion")}
                  className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
                >
                  🖨️ Configurar impresión
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
            <div className="border-b border-[#ecf0f1]">
              <div className="flex overflow-x-auto">
                {pestanas.map((pestana) => (
                  <button
                    key={pestana.id}
                    onClick={() => setPestanaActiva(pestana.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 ${
                      pestanaActiva === pestana.id
                        ? "border-[#3498db] text-[#3498db] bg-[#ebf3fd]"
                        : "border-transparent text-[#7f8c8d] hover:text-[#2c3e50] hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <span className="text-lg">{pestana.icono}</span>
                    {pestana.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {pestanaActiva === "general" && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🖼️</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2c3e50]">Logo del Sistema</h3>
                    </div>

                    {logoUrl && (
                      <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 mb-4">
                        <img src={logoUrl} alt="Logo actual" className="w-32 h-auto mx-auto rounded-lg shadow-sm" />
                      </div>
                    )}

                    <div className="flex flex-col items-center space-y-3">
                      <label
                        htmlFor="logoUpload"
                        className="cursor-pointer bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white font-medium py-2 px-6 rounded-lg shadow transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                      >
                        📤 Seleccionar archivo
                      </label>
                      <input
                        id="logoUpload"
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      {nuevoLogo && (
                        <span className="text-[#7f8c8d] text-sm bg-[#f8f9fa] px-3 py-1 rounded-lg">
                          {nuevoLogo.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <IntegracionGoogleSheet />
                </div>
              )}

              {pestanaActiva === "garantias" && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🔧</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2c3e50]">Garantía - Servicio Técnico</h3>
                    </div>
                    <textarea
                      value={textoGarantiaServicio}
                      onChange={(e) => setTextoGarantiaServicio(e.target.value)}
                      className="w-full h-32 p-4 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                      placeholder="Condiciones de garantía para reparaciones que aparecerán en el ticket..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#e67e22] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">📱</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2c3e50]">Garantía - Venta de Teléfonos</h3>
                    </div>
                    <textarea
                      value={textoGarantiaTelefonos}
                      onChange={(e) => setTextoGarantiaTelefonos(e.target.value)}
                      className="w-full h-32 p-4 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e67e22] focus:border-[#e67e22] transition-all text-[#2c3e50] text-sm"
                      placeholder="Políticas de garantía para venta de teléfonos que aparecerán en el remito..."
                    />
                  </div>

                  <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
                    <div className="flex items-center gap-3 text-[#2c3e50]">
                      <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">💡</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          <strong>Tip:</strong> Las garantías aparecerán automáticamente en los documentos correspondientes: servicio técnico en tickets y teléfonos en remitos de venta.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ PESTAÑA DE IMPRESIÓN CORREGIDA SIN MODAL AUTOMÁTICO */}
              {pestanaActiva === "impresion" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">🖨️</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#2c3e50]">Configuración de Impresión</h3>
                  </div>

                  {/* Configuración de Impresoras Específicas */}
                  <div className="bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] rounded-xl p-6 border border-[#bdc3c7] mb-6">
                    <h4 className="font-bold text-[#2c3e50] mb-4 flex items-center gap-2">
                      🖨️ Configuración de Impresoras Específicas
                    </h4>
                    
                    {/* ✅ BOTÓN PARA REFRESCAR IMPRESORAS */}
                    <BotonRefrescarImpresoras />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Impresora de Tickets */}
                      <div>
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                          🧾 Impresora de Tickets (80mm)
                        </label>
                        <select
                          value={impresoraTicket}
                          onChange={(e) => setImpresoraTicket(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-sm"
                        >
                          <option value="">Seleccionar impresora de tickets</option>
                          {impresoras.map((impresora, index) => (
                            <option 
                              key={index} 
                              value={impresora}
                              disabled={impresora.includes('━━━')}
                              style={impresora.includes('━━━') ? { 
                                fontWeight: 'bold', 
                                background: '#f0f0f0', 
                                color: '#666' 
                              } : {}}
                            >
                              {impresora}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-[#7f8c8d] mt-1">Para tickets térmicos de 80mm</p>
                        
                        <button
                          onClick={() => probarImpresoraReal('ticket', impresoraTicket)}
                          disabled={!impresoraTicket || impresoraTicket.includes('━━━')}
                          className="mt-3 px-4 py-2 bg-[#3498db] text-white rounded-lg disabled:bg-gray-400 hover:bg-[#2980b9] transition-all text-sm w-full"
                        >
                          🧾 Probar Tickets
                        </button>
                      </div>

                      {/* Impresora de Etiquetas */}
                      <div>
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                          🏷️ Impresora de Etiquetas (62x29mm)
                        </label>
                        <select
                          value={impresoraEtiqueta}
                          onChange={(e) => setImpresoraEtiqueta(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                        >
                          <option value="">Seleccionar impresora de etiquetas</option>
                          {impresoras.map((impresora, index) => (
                            <option 
                              key={index} 
                              value={impresora}
                              disabled={impresora.includes('━━━')}
                              style={impresora.includes('━━━') ? { 
                                fontWeight: 'bold', 
                                background: '#f0f0f0', 
                                color: '#666' 
                              } : {}}
                            >
                              {impresora}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-[#7f8c8d] mt-1">Para etiquetas adhesivas de 62x29mm</p>
                        
                        <button
                          onClick={() => probarImpresoraReal('etiqueta', impresoraEtiqueta)}
                          disabled={!impresoraEtiqueta || impresoraEtiqueta.includes('━━━')}
                          className="mt-3 px-4 py-2 bg-[#27ae60] text-white rounded-lg disabled:bg-gray-400 hover:bg-[#229954] transition-all text-sm w-full"
                        >
                          🏷️ Probar Etiquetas
                        </button>
                      </div>

                      {/* Impresora A4 */}
                      <div>
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                          📄 Impresora A4 (WiFi/Láser)
                        </label>
                        <select
                          value={impresoraA4}
                          onChange={(e) => setImpresoraA4(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e67e22] focus:border-[#e67e22] transition-all text-[#2c3e50] text-sm"
                        >
                          <option value="">Seleccionar impresora A4</option>
                          {impresoras.map((impresora, index) => (
                            <option 
                              key={index} 
                              value={impresora}
                              disabled={impresora.includes('━━━')}
                              style={impresora.includes('━━━') ? { 
                                fontWeight: 'bold', 
                                background: '#f0f0f0', 
                                color: '#666' 
                              } : {}}
                            >
                              {impresora}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-[#7f8c8d] mt-1">Para documentos A4 completos</p>
                        
                        <button
                          onClick={() => probarImpresoraReal('a4', impresoraA4)}
                          disabled={!impresoraA4 || impresoraA4.includes('━━━')}
                          className="mt-3 px-4 py-2 bg-[#e67e22] text-white rounded-lg disabled:bg-gray-400 hover:bg-[#d35400] transition-all text-sm w-full"
                        >
                          📄 Probar A4
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Impresión automática al guardar */}
                  <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] rounded-xl p-4 border border-[#3498db]">
                    <h4 className="font-bold text-[#2c3e50] mb-4 flex items-center gap-2">
                      ⚡ Impresión Automática al Guardar
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="bg-white border border-[#3498db] rounded-lg p-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={imprimirTicket}
                            onChange={(e) => setImprimirTicket(e.target.checked)}
                            className="w-4 h-4 text-[#3498db] rounded focus:ring-[#3498db]"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🧾</span>
                            <span className="font-medium text-[#2c3e50]">Ticket automático</span>
                            {impresoraTicket && (
                              <span className="text-xs bg-[#3498db] text-white px-2 py-1 rounded">
                                {impresoraTicket.substring(0, 20)}
                              </span>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="bg-white border border-[#27ae60] rounded-lg p-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={imprimirEtiqueta}
                            onChange={(e) => setImprimirEtiqueta(e.target.checked)}
                            className="w-4 h-4 text-[#27ae60] rounded focus:ring-[#27ae60]"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏷️</span>
                            <span className="font-medium text-[#2c3e50]">Etiqueta automática</span>
                            {impresoraEtiqueta && (
                              <span className="text-xs bg-[#27ae60] text-white px-2 py-1 rounded">
                                {impresoraEtiqueta.substring(0, 20)}
                              </span>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-[#7f8c8d] bg-[#f8f9fa] p-2 rounded">
                      💡 <strong>Nota:</strong> Estas opciones se ejecutarán automáticamente al usar "Guardar Trabajo". 
                      Para más control, usa "Opciones de Impresión" en el formulario.
                    </div>
                  </div>

                  {/* Formatos disponibles */}
                  <div className="bg-gradient-to-r from-[#fdebd0] to-[#fadbd8] rounded-xl p-4 border border-[#e67e22]">
                    <h4 className="font-bold text-[#2c3e50] mb-4 flex items-center gap-2">
                      📐 Formatos de Impresión Disponibles
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-[#3498db]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🧾</span>
                          <span className="font-bold text-[#2c3e50]">Ticket Normal</span>
                        </div>
                        <p className="text-sm text-[#7f8c8d] mb-2">
                          Ticket compacto para impresoras térmicas de 80mm
                        </p>
                        <div className="text-xs bg-[#ebf3fd] p-2 rounded">
                          <strong>Incluye:</strong> ID, Cliente, Modelo, Trabajo, Precio, Fecha, CheckIn
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-[#27ae60]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🏷️</span>
                          <span className="font-bold text-[#2c3e50]">Etiqueta</span>
                        </div>
                        <p className="text-sm text-[#7f8c8d] mb-2">
                          Etiqueta adhesiva de 62x29mm para etiquetar equipos
                        </p>
                        <div className="text-xs bg-[#d5f4e6] p-2 rounded">
                          <strong>Incluye:</strong> ID, Cliente, Modelo, Fecha (compacto)
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-[#e67e22]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">📄</span>
                          <span className="font-bold text-[#2c3e50]">Ticket A4</span>
                        </div>
                        <p className="text-sm text-[#7f8c8d] mb-2">
                          Documento completo en hoja A4 con todos los detalles
                        </p>
                        <div className="text-xs bg-[#fdebd0] p-2 rounded">
                          <strong>Incluye:</strong> Todo + CheckIn + Garantías + Logo + Firmas
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuración adicional */}
                  <div className="bg-white rounded-xl p-4 border-2 border-[#ecf0f1]">
                    <h4 className="font-bold text-[#2c3e50] mb-4 flex items-center gap-2">
                      ⚙️ Configuración Adicional
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg">
                        <div>
                          <span className="font-medium text-[#2c3e50]">Mostrar logo en documentos</span>
                          <p className="text-sm text-[#7f8c8d]">Incluir el logo del negocio en tickets y documentos A4</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="w-5 h-5 text-[#3498db] rounded focus:ring-[#3498db]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg">
                        <div>
                          <span className="font-medium text-[#2c3e50]">Incluir garantías en tickets</span>
                          <p className="text-sm text-[#7f8c8d]">Agregar texto de garantía al pie de los tickets</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="w-5 h-5 text-[#3498db] rounded focus:ring-[#3498db]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NUEVA PESTAÑA DE SUSCRIPCIÓN */}
              {pestanaActiva === "suscripcion" && (
                <GestionSuscripcion />
              )}
            </div>
          </div>

          {/* Solo mostrar botón guardar para pestañas que no sean suscripción */}
          {pestanaActiva !== "suscripcion" && (
            <div className="flex justify-center">
              <button
                onClick={guardarConfiguracion}
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-8 py-3 rounded-2xl font-bold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-3"
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <span className="animate-spin text-xl">⏳</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="text-xl">💾</span>
                    Guardar configuración
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}