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
import PanelCuentasNegocio from "./components/PanelCuentasNegocio";
import { getSuperAdminUidClient, esSuperAdminUsuario } from "@/lib/superAdminConstants";
import {
  TIENDA_PUBLICA_VACIA,
  tiendaPublicaDesdeFirestore,
  type TiendaPublicaEditable,
} from "@/lib/tiendaPublicaTypes";
import { normalizarUrlExterna } from "@/lib/urlExterna";

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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [nuevoLogoGestione, setNuevoLogoGestione] = useState<File | null>(null);
  const [logoGestionePreview, setLogoGestionePreview] = useState<string | null>(null);
  const [tiendaPublica, setTiendaPublica] = useState<TiendaPublicaEditable>({
    ...TIENDA_PUBLICA_VACIA,
  });
  const [guardando, setGuardando] = useState(false);
  const [pestanaActiva, setPestanaActiva] = useState("general");
  const [mostrarPanelExentos, setMostrarPanelExentos] = useState(false);
  const [facturacionElectronicaHabilitada, setFacturacionElectronicaHabilitada] = useState(false);
  const [facturacionElectronicaSolicitada, setFacturacionElectronicaSolicitada] = useState(false);
  const [mostrarModalFacturacion, setMostrarModalFacturacion] = useState(false);
  const [cuitFacturacion, setCuitFacturacion] = useState("");
  const [puntoVentaFacturacion, setPuntoVentaFacturacion] = useState("1");
  const [guardandoFacturacion, setGuardandoFacturacion] = useState(false);

  const SUPER_ADMIN_UID = getSuperAdminUidClient();
  const esSuperAdmin = esSuperAdminUsuario(user);
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
            setTiendaPublica(tiendaPublicaDesdeFirestore(data.tiendaPublica));
            setFacturacionElectronicaHabilitada(!!data.facturacionElectronicaHabilitada);
            setFacturacionElectronicaSolicitada(!!data.facturacionElectronicaSolicitada);
            setCuitFacturacion(data.cuit != null ? String(data.cuit) : "");
            setPuntoVentaFacturacion(data.puntoVenta != null ? String(data.puntoVenta) : "1");
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

  const handleLogoGestioneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setNuevoLogoGestione(file);
      setLogoGestionePreview(URL.createObjectURL(file));
    }
  };

  const guardarConfiguracion = async () => {
    if (!user) return;
    setGuardando(true);
  
    try {
      const negocioID = rol?.negocioID;
      if (!negocioID) throw new Error("No se encontró el negocioID del usuario");      
  
      let finalLogoUrl = logoUrl;
      let finalGestioneLogoUrl = tiendaPublica.gestioneLogoUrl;
  
      if (nuevoLogo) {
        const storageRef = ref(storage, `logos/${negocioID}/logo.png`);
        await uploadBytes(storageRef, nuevoLogo);
        finalLogoUrl = `${await getDownloadURL(storageRef)}?v=${Date.now()}`;
      }

      if (esSuperAdmin && nuevoLogoGestione) {
        const storageRef = ref(storage, `logos/${negocioID}/gestione-logo.png`);
        await uploadBytes(storageRef, nuevoLogoGestione);
        finalGestioneLogoUrl = `${await getDownloadURL(storageRef)}?v=${Date.now()}`;
      }
  
      const refDoc = doc(db, `negocios/${negocioID}/configuracion`, "datos");
      const datosGuardar: Record<string, unknown> = {
        nombreNegocio: nombreNegocio.trim(),
        textoGarantia: textoGarantiaServicio,
        textoGarantiaTelefonos: textoGarantiaTelefonos,
        logoUrl: finalLogoUrl,
      };

      if (esSuperAdmin) {
        datosGuardar.tiendaPublica = {
          telefono: tiendaPublica.telefono.trim(),
          email: tiendaPublica.email.trim(),
          direccion: tiendaPublica.direccion.trim(),
          horarios: tiendaPublica.horarios.trim(),
          comoComprar: tiendaPublica.comoComprar.trim(),
          pagoEnvios: tiendaPublica.pagoEnvios.trim(),
          productosGarantia: tiendaPublica.productosGarantia.trim(),
          mediosPago: tiendaPublica.mediosPago.trim(),
          mediosEnvio: tiendaPublica.mediosEnvio.trim(),
          instagram: tiendaPublica.instagram.trim(),
          facebook: tiendaPublica.facebook.trim(),
          youtube: tiendaPublica.youtube.trim(),
          tiktok: tiendaPublica.tiktok.trim(),
          gestioneLogoUrl: finalGestioneLogoUrl.trim(),
          gestioneEnlace: normalizarUrlExterna(tiendaPublica.gestioneEnlace),
          listaPreciosGremioUrl: normalizarUrlExterna(tiendaPublica.listaPreciosGremioUrl),
          listaPreciosGremioTitulo: tiendaPublica.listaPreciosGremioTitulo.trim(),
        };
      }

      await setDoc(refDoc, datosGuardar, { merge: true });
  
      alert("✅ Configuración guardada correctamente.");
      setNuevoLogo(null);
      setLogoPreview(null);
      if (esSuperAdmin) {
        setNuevoLogoGestione(null);
        setLogoGestionePreview(null);
        setTiendaPublica((prev) => ({ ...prev, gestioneLogoUrl: finalGestioneLogoUrl }));
      }
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
    { id: "facturacion", label: "Facturación electrónica", icono: "🧾" },
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

          {(rol?.tipo === "admin" || rol?.tipo === "empleado") && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#3498db] rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">👤</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2c3e50]">Usuarios del negocio</h2>
                  <p className="text-[#7f8c8d] text-xs">
                    {rol?.tipo === "admin"
                      ? "Alta de cuentas, impresoras y listado de equipo + clientes con portal"
                      : "Listado de administrador, empleados y clientes con acceso al portal"}
                  </p>
                </div>
              </div>

              {rol?.tipo === "admin" && (
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
              )}

              <div className={`${rol?.tipo === "admin" ? "mt-6 border-t border-[#ecf0f1] pt-6" : ""}`}>
                <PanelCuentasNegocio
                  nombreNegocioLocal={nombreNegocio || undefined}
                  negocioIdLocal={rol?.negocioID}
                />
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
                        PNG, JPG o WEBP. Se muestra en tickets, documentos y la tienda web de consulta-stock.
                      </p>
                    </div>
                  </div>

                  {/* TIENDA WEB PÚBLICA — solo superadmin (iphonetec / plataforma) */}
                  {esSuperAdmin && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#1a2433] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🛒</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#2c3e50]">Tienda web (consulta-stock)</h3>
                        <p className="text-xs text-[#7f8c8d]">
                          Pie de página y datos de contacto visibles para tus clientes.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                      {(
                        [
                          ["telefono", "Teléfono / WhatsApp", "549351…"],
                          ["email", "Email", "contacto@tunegocio.com"],
                          ["direccion", "Dirección", "Calle 123, Ciudad"],
                          ["horarios", "Horarios", "Lun a Vie 9–18 hs"],
                          ["instagram", "Instagram (URL)", "https://instagram.com/…"],
                          ["facebook", "Facebook (URL)", "https://facebook.com/…"],
                          ["youtube", "YouTube (URL)", ""],
                          ["tiktok", "TikTok (URL)", ""],
                          ["mediosPago", "Medios de pago", "Transferencia, efectivo, MP…"],
                          ["mediosEnvio", "Medios de envío", "Retiro en local, Andreani…"],
                        ] as const
                      ).map(([key, label, placeholder]) => (
                        <div key={key} className={key.startsWith("como") || key.startsWith("pago") || key.startsWith("productos") ? "md:col-span-2" : ""}>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">{label}</label>
                          <input
                            type="text"
                            value={tiendaPublica[key]}
                            onChange={(e) =>
                              setTiendaPublica((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={placeholder}
                            className="w-full p-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm text-[#2c3e50] focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20"
                          />
                        </div>
                      ))}
                      {(
                        [
                          ["comoComprar", "¿Cómo comprar?"],
                          ["pagoEnvios", "Pago y envíos"],
                          ["productosGarantia", "Productos y garantía"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="md:col-span-2">
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">{label}</label>
                          <textarea
                            value={tiendaPublica[key]}
                            onChange={(e) =>
                              setTiendaPublica((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            rows={3}
                            className="w-full p-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm text-[#2c3e50] focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20 resize-y"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[#7f8c8d] mt-3">
                      El WhatsApp de pedidos se configura en Stock repuestos. El logo de arriba se usa en el encabezado y el pie.
                    </p>
                    <Link
                      href="/configuraciones/tienda-web"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1a2433] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c3e50]"
                    >
                      🛒 Configurar checkout (transportistas, CBU, pagos)
                    </Link>
                  </div>
                  )}

                  {/* BANNERS CONSULTA-STOCK — solo superadmin */}
                  {esSuperAdmin && (
                  <div className="border-t border-[#ecf0f1] pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#3498db] to-[#9b59b6] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🖼️</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#2c3e50]">Banners en consulta-stock</h3>
                        <p className="text-xs text-[#7f8c8d]">
                          Dos carteles promocionales arriba del catálogo (estilo tienda profesional).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 max-w-4xl lg:grid-cols-2">
                      <div className="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-4">
                        <h4 className="text-sm font-bold text-[#1e3a5f] mb-1">Banner 1 — Gestione</h4>
                        <p className="text-xs text-[#7f8c8d] mb-3">
                          Logo del software Gestione. Subilo acá (PNG/JPG con fondo transparente recomendado).
                        </p>
                        {(logoGestionePreview || tiendaPublica.gestioneLogoUrl) && (
                          <div className="mb-3 flex justify-center rounded-lg bg-white p-3 border border-sky-100">
                            <img
                              src={logoGestionePreview || tiendaPublica.gestioneLogoUrl}
                              alt="Logo Gestione"
                              className="max-h-16 object-contain"
                            />
                          </div>
                        )}
                        <label
                          htmlFor="logoGestioneUpload"
                          className="cursor-pointer inline-flex items-center gap-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white font-medium py-2 px-4 rounded-lg text-sm shadow hover:scale-[1.02] transition"
                        >
                          📤 {tiendaPublica.gestioneLogoUrl ? "Cambiar logo Gestione" : "Subir logo Gestione"}
                        </label>
                        <input
                          id="logoGestioneUpload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleLogoGestioneChange}
                          className="hidden"
                        />
                        {nuevoLogoGestione && (
                          <p className="mt-2 text-xs text-[#7f8c8d]">📎 {nuevoLogoGestione.name} — guardá para aplicar</p>
                        )}
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
                            Enlace opcional (web Gestione)
                          </label>
                          <input
                            type="url"
                            value={tiendaPublica.gestioneEnlace}
                            onChange={(e) =>
                              setTiendaPublica((prev) => ({ ...prev, gestioneEnlace: e.target.value }))
                            }
                            placeholder="https://www.gestione.com.ar"
                            className="w-full p-2 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border-2 border-neutral-300 bg-neutral-50 p-4">
                        <h4 className="text-sm font-bold text-[#2c3e50] mb-1">Banner 2 — Lista gremio</h4>
                        <p className="text-xs text-[#7f8c8d] mb-3">
                          Usa el <strong>logo del negocio</strong> (arriba). Pegá acá el link de Google Drive — el banner entero es clicable.
                        </p>
                        {(logoPreview || logoUrl) && (
                          <div className="mb-3 flex justify-center rounded-lg bg-neutral-900 p-4">
                            <img
                              src={logoPreview || logoUrl}
                              alt="Logo negocio"
                              className="max-h-14 object-contain"
                            />
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
                              Link Google Drive (lista de precios)
                            </label>
                            <input
                              type="url"
                              value={tiendaPublica.listaPreciosGremioUrl}
                              onChange={(e) =>
                                setTiendaPublica((prev) => ({
                                  ...prev,
                                  listaPreciosGremioUrl: e.target.value,
                                }))
                              }
                              placeholder="https://drive.google.com/file/d/…/view"
                              className="w-full p-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm focus:border-[#3498db]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#2c3e50] mb-1">
                              Texto del banner
                            </label>
                            <input
                              type="text"
                              value={tiendaPublica.listaPreciosGremioTitulo}
                              onChange={(e) =>
                                setTiendaPublica((prev) => ({
                                  ...prev,
                                  listaPreciosGremioTitulo: e.target.value,
                                }))
                              }
                              placeholder="Lista de precios de trabajos a gremio"
                              className="w-full p-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  <IntegracionGoogleSheet />
                </div>
              )}

              {pestanaActiva === "facturacion" && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🧾</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2c3e50]">Facturación electrónica</h3>
                    </div>
                    <div className="bg-gradient-to-r from-[#f5eef8] to-[#ebf0f9] rounded-xl p-5 border-2 border-[#d5dbdb]">
                      {/* Super admin: no ve "hablar con nosotros"; la habilitación se hace desde Ver negocios */}
                      {user?.uid === SUPER_ADMIN_UID ? (
                        <div>
                          <p className="text-[#2c3e50] mb-4">La facturación electrónica se habilita por negocio desde la lista de negocios.</p>
                          <button
                            type="button"
                            onClick={() => router.push("/admin/negocios")}
                            className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white font-medium py-2 px-5 rounded-lg shadow transition-all flex items-center gap-2"
                          >
                            🏪 Ir a Ver negocios
                          </button>
                          <p className="text-sm text-[#7f8c8d] mt-3">Ahí podés activar o desactivar la facturación electrónica para cada negocio (columna &quot;Fact. electrónica&quot;).</p>
                        </div>
                      ) : facturacionElectronicaHabilitada ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-[#27ae60]">
                            <span className="text-2xl">✅</span>
                            <div>
                              <p className="font-semibold">Facturación electrónica habilitada</p>
                              <p className="text-sm text-[#7f8c8d]">Podés emitir facturas (A, B, etc.) desde Ventas y desde Gestión de trabajos / Resumen.</p>
                            </div>
                          </div>
                          <div className="border-t border-[#d5dbdb] pt-4 mt-4 space-y-3">
                            <p className="text-sm font-semibold text-[#2c3e50]">Datos para AFIP</p>
                            <div>
                              <label className="block text-sm text-[#2c3e50] mb-1">CUIT del negocio (11 dígitos)</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={11}
                                value={cuitFacturacion}
                                onChange={(e) => setCuitFacturacion(e.target.value.replace(/\D/g, ""))}
                                placeholder="Ej: 20123456789"
                                className="w-full max-w-xs rounded-lg border border-[#bdc3c7] px-3 py-2 text-[#2c3e50]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-[#2c3e50] mb-1">Punto de venta (número)</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={puntoVentaFacturacion}
                                onChange={(e) => setPuntoVentaFacturacion(e.target.value.replace(/\D/g, ""))}
                                placeholder="1"
                                className="w-full max-w-xs rounded-lg border border-[#bdc3c7] px-3 py-2 text-[#2c3e50]"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={guardandoFacturacion || !cuitFacturacion.trim()}
                              onClick={async () => {
                                if (!rol?.negocioID || !cuitFacturacion.trim()) return;
                                setGuardandoFacturacion(true);
                                try {
                                  const refDoc = doc(db, `negocios/${rol.negocioID}/configuracion`, "datos");
                                  await setDoc(refDoc, {
                                    cuit: cuitFacturacion.trim().replace(/\D/g, ""),
                                    puntoVenta: puntoVentaFacturacion.trim() ? parseInt(puntoVentaFacturacion, 10) || 1 : 1,
                                  }, { merge: true });
                                  alert("Datos de facturación guardados.");
                                } catch (e) {
                                  console.error(e);
                                  alert("Error al guardar.");
                                } finally {
                                  setGuardandoFacturacion(false);
                                }
                              }}
                              className="bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg"
                            >
                              {guardandoFacturacion ? "Guardando..." : "Guardar CUIT y punto de venta"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[#2c3e50] mb-3">Emití facturas electrónicas (A, B, etc.) desde la plataforma.</p>
                          {facturacionElectronicaSolicitada ? (
                            <div className="flex items-center gap-3 text-[#f39c12] bg-[#fdebd0] rounded-lg px-4 py-3">
                              <span className="text-xl">📩</span>
                              <div>
                                <p className="font-semibold">Solicitud enviada</p>
                                <p className="text-sm">Nos pondremos en contacto para habilitar la facturación electrónica.</p>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMostrarModalFacturacion(true)}
                              className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white font-medium py-2 px-5 rounded-lg shadow transition-all flex items-center gap-2"
                            >
                              🧾 Quiero habilitar facturación electrónica
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
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

          {pestanaActiva !== "suscripcion" && pestanaActiva !== "facturacion" && (
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

        {/* Modal: hay que contactarnos para habilitar facturación */}
        {mostrarModalFacturacion && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#9b59b6] rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl">🧾</span>
                </div>
                <h3 className="text-xl font-bold text-[#2c3e50]">Facturación electrónica</h3>
              </div>
              <p className="text-[#2c3e50] mb-6">
                Para habilitar esta función <strong>tenés que hablar con nosotros</strong>. Nosotros la activamos desde la plataforma y te avisamos cuando esté lista.
              </p>
              <p className="text-sm text-[#7f8c8d] mb-6">
                Contactanos por el medio que uses normalmente (email, WhatsApp, etc.) y decinos que querés activar facturación electrónica para tu negocio.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarModalFacturacion(false)}
                  className="flex-1 py-2 rounded-xl font-semibold bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb]"
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!rol?.negocioID) return;
                    try {
                      const refDoc = doc(db, `negocios/${rol.negocioID}/configuracion`, "datos");
                      await setDoc(refDoc, {
                        facturacionElectronicaSolicitada: true,
                        facturacionElectronicaSolicitadaFecha: new Date().toISOString(),
                      }, { merge: true });
                      setFacturacionElectronicaSolicitada(true);
                      setMostrarModalFacturacion(false);
                    } catch (e) {
                      console.error(e);
                      alert("No se pudo registrar la solicitud. Intentá de nuevo.");
                    }
                  }}
                  className="flex-1 py-2 rounded-xl font-semibold bg-[#9b59b6] text-white hover:bg-[#8e44ad]"
                >
                  Quiero que me contacten
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}