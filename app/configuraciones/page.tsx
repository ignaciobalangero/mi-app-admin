"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import Link from "next/link";
import Header from "../Header";
import IntegracionGoogleSheet from "./components/IntegracionGoogleSheet";
import GestionSuscripcion from "./components/GestionSuscripcion";
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
import PanelRecalculoGlobal from "./components/PanelRecalculoGlobal";

export default function Configuraciones() {
  const [user] = useAuthState(auth);
  interface RolInfo {
    tipo: string;
    negocioID: string;
  }  
  const [rol, setRol] = useState<RolInfo | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState("");           // ✅ NUEVO
  const [textoGarantiaServicio, setTextoGarantiaServicio] = useState("");
  const [textoGarantiaTelefonos, setTextoGarantiaTelefonos] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [nuevoLogo, setNuevoLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // ✅ NUEVO: preview local
  const [guardando, setGuardando] = useState(false);
  const [pestanaActiva, setPestanaActiva] = useState("general");
  const [mostrarPanelExentos, setMostrarPanelExentos] = useState(false);

  const SUPER_ADMIN_UID = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const cargarConfiguracion = async () => {
        try {
          const userSnap = await getDoc(doc(db, "usuarios", user.uid));
          if (!userSnap.exists()) throw new Error("Usuario no encontrado");

          const userData = userSnap.data();
          const negocioID = userData.negocioID;
          const rolUsuario = userData.rol;

          if (!negocioID) throw new Error("No se encontró el negocioID del usuario");

          setRol({ tipo: rolUsuario || "sin rol", negocioID });

          const configRef = doc(db, `negocios/${negocioID}/configuracion/datos`);
          const configSnap = await getDoc(configRef);
          if (configSnap.exists()) {
            const data = configSnap.data();
            setNombreNegocio(data.nombreNegocio || "");             // ✅ NUEVO
            setTextoGarantiaServicio(data.textoGarantia || "");
            setTextoGarantiaTelefonos(data.textoGarantiaTelefonos || "");
            setLogoUrl(data.logoUrl || "");
          }
        } catch (error) {
          console.error("Error cargando configuración:", error);
        }
      };
      cargarConfiguracion();
    }
  }, [user]);

  // ✅ NUEVO: Preview local del logo al seleccionar archivo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setNuevoLogo(file);
      const previewURL = URL.createObjectURL(file);
      setLogoPreview(previewURL);
    }
  };

  const guardarConfiguracion = async () => {
    if (!user) return;
    setGuardando(true);
  
    try {
      const negocioID = rol?.negocioID;
      if (!negocioID) throw new Error("No se encontró el negocioID del usuario");      
  
      let finalLogoUrl = logoUrl;
  
      if (nuevoLogo) {
        const storageRef = ref(storage, `logos/${negocioID}/logo.png`);
        await uploadBytes(storageRef, nuevoLogo);
        finalLogoUrl = `${await getDownloadURL(storageRef)}?v=${Date.now()}`;
      }
  
      const refDoc = doc(db, `negocios/${negocioID}/configuracion`, "datos");
      await setDoc(
        refDoc,
        {
          nombreNegocio: nombreNegocio.trim(),                      // ✅ NUEVO
          textoGarantia: textoGarantiaServicio,
          textoGarantiaTelefonos: textoGarantiaTelefonos,
          logoUrl: finalLogoUrl,
        },
        { merge: true }
      );
  
      alert("✅ Configuración guardada correctamente.");
      setNuevoLogo(null);
      setLogoPreview(null);
      setLogoUrl(finalLogoUrl);
    } catch (error: any) {
      console.error("❌ Error al guardar configuración:", error);
      alert("Hubo un error al guardar: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const pestanas = [
    { id: "general", label: "General", icono: "⚙️" },
    { id: "garantias", label: "Garantías", icono: "🛡️" },
    { id: "suscripcion", label: "Suscripción", icono: "💳" },
  ];

  if (mostrarPanelExentos) {
    return (
      <>
        <Header />
        <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black">
          <div className="w-full px-4 max-w-[1200px] mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMostrarPanelExentos(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                ← Volver a Configuraciones
              </button>
            </div>
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
            <>
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
              <PanelRecalculoGlobal />
            </>
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
                  🖨️ Configurar Impresoras
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
                <div className="space-y-8">

                  {/* ✅ NOMBRE DEL NEGOCIO */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#2c3e50] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🏪</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2c3e50]">Nombre del Negocio</h3>
                    </div>
                    <div className="max-w-md">
                      <input
                        type="text"
                        value={nombreNegocio}
                        onChange={(e) => setNombreNegocio(e.target.value)}
                        placeholder="Ej: Tecno Service, Phone Center, etc."
                        className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#2c3e50] focus:border-[#2c3e50] transition-all text-[#2c3e50] text-sm"
                      />
                      <p className="text-xs text-[#7f8c8d] mt-2">
                        Este nombre aparecerá en los remitos, tickets y documentos generados.
                      </p>
                    </div>
                  </div>

                  {/* LOGO */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🖼️</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2c3e50]">Logo del Sistema</h3>
                    </div>

                    {/* Muestra preview local si hay uno nuevo, si no el guardado */}
                    {(logoPreview || logoUrl) && (
                      <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 mb-4 flex flex-col items-center gap-2">
                        <img
                          src={logoPreview || logoUrl}
                          alt="Logo"
                          className="w-32 h-auto rounded-lg shadow-sm object-contain"
                        />
                        {logoPreview && (
                          <span className="text-xs text-[#f39c12] font-medium bg-[#fdebd0] px-2 py-1 rounded-full">
                            Vista previa — aún no guardado
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col items-start gap-3">
                      <label
                        htmlFor="logoUpload"
                        className="cursor-pointer bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white font-medium py-2 px-6 rounded-lg shadow transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
                      >
                        📤 {logoUrl ? "Cambiar logo" : "Seleccionar logo"}
                      </label>
                      <input
                        id="logoUpload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      {nuevoLogo && (
                        <div className="flex items-center gap-2 text-[#7f8c8d] text-sm bg-[#f8f9fa] px-3 py-2 rounded-lg border border-[#bdc3c7]">
                          <span>📎</span>
                          <span>{nuevoLogo.name}</span>
                          <button
                            onClick={() => {
                              setNuevoLogo(null);
                              setLogoPreview(null);
                            }}
                            className="ml-2 text-[#e74c3c] hover:text-[#c0392b] font-bold"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-[#7f8c8d]">
                        PNG, JPG o WEBP. Se mostrará en tickets y documentos del sistema.
                      </p>
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
                      <p className="text-sm font-medium flex-1">
                        <strong>Tip:</strong> Las garantías aparecerán automáticamente en los documentos correspondientes: servicio técnico en tickets y teléfonos en remitos de venta.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {pestanaActiva === "suscripcion" && (
                <GestionSuscripcion />
              )}
            </div>
          </div>

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