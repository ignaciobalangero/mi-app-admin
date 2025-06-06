"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import Link from "next/link";
import Header from "../Header";
import IntegracionGoogleSheet from "./components/IntegracionGoogleSheet";
import PanelUsuariosExentos from "./components/PanelUsuariosExentos";
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

  const SUPER_ADMIN_UID = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";
  const router = useRouter();

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
            <PanelUsuariosExentos />
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

              {pestanaActiva === "impresion" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">🖨️</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#2c3e50]">Configuración de Impresión Automática</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] border border-[#3498db] rounded-xl p-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={imprimirEtiqueta}
                          onChange={(e) => setImprimirEtiqueta(e.target.checked)}
                          className="w-5 h-5 text-[#3498db] rounded focus:ring-[#3498db]"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🟦</span>
                          <span className="font-medium text-[#2c3e50]">Imprimir etiqueta automáticamente al guardar trabajo</span>
                        </div>
                      </label>
                    </div>

                    <div className="bg-gradient-to-r from-[#fdebd0] to-[#fadbd8] border border-[#e67e22] rounded-xl p-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={imprimirTicket}
                          onChange={(e) => setImprimirTicket(e.target.checked)}
                          className="w-5 h-5 text-[#e67e22] rounded focus:ring-[#e67e22]"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🟥</span>
                          <span className="font-medium text-[#2c3e50]">Imprimir ticket automáticamente al guardar trabajo</span>
                        </div>
                      </label>
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