"use client";
import { useState } from "react";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PrecioOfertaGestione from "../components/PrecioOfertaGestione";
import {
  PRECIO_MENSUAL_OFERTA_ARS,
  formatoPrecioGestione,
} from "@/lib/preciosGestione";

export default function Registro() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nombreEmpresa: "",
    nombreCompleto: "",
    telefono: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validarFormulario = () => {
    if (!form.email || !form.password || !form.confirmPassword || !form.nombreEmpresa || !form.nombreCompleto) {
      setError("Por favor completa todos los campos obligatorios");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Por favor ingresa un email válido");
      return false;
    }

    return true;
  };

  const handleRegistro = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    setError("");

    try {
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      // 2. Calcular fecha de vencimiento (7 días desde hoy)
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

      // 3. Crear ID del negocio basado en el nombre de la empresa
      const negocioID = form.nombreEmpresa
        .toLowerCase()
        .replace(/\s+/g, '-')        // Espacios por guiones
        .replace(/[^a-z0-9-]/g, '')   // Solo letras, números y guiones
        .substring(0, 20) + '-' + Date.now().toString().slice(-4); // Agregar timestamp

      console.log("📝 Creando usuario con estructura híbrida...");

      // 4. ✅ CREAR PERFIL EN COLECCIÓN GLOBAL USUARIOS (CON ROL)
      await setDoc(doc(db, "usuarios", user.uid), {
        email: form.email,
        nombreCompleto: form.nombreCompleto,
        telefono: form.telefono || "",
        fechaRegistro: new Date(),
        
        // ✅ DATOS DE BILLING Y PLAN
        planActivo: "trial",
        fechaVencimiento: fechaVencimiento,
        estado: "activo",
        
        // ✅ DATOS DEL NEGOCIO PRINCIPAL
        negocioID: negocioID,
        rol: "admin", // ✅ ROL EN COLECCIÓN GLOBAL
        
        // ✅ DATOS DE FACTURACIÓN
        facturacion: {
          metodoPago: null,
          subscriptionId: null,
          proximoPago: null
        },
        
        // ✅ DATOS PARA IDENTIFICACIÓN EN FIREBASE CONSOLE
        displayName: `${form.nombreCompleto} (${form.nombreEmpresa})`,
        negocioNombre: form.nombreEmpresa
      });

      console.log("✅ Usuario creado en colección global con rol:", "admin");

      // 5. ✅ CREAR NEGOCIO
      await setDoc(doc(db, "negocios", negocioID), {
        nombre: form.nombreEmpresa,
        propietario: user.uid,
        fechaCreacion: new Date(),
        planActivo: "trial",
        estado: "activo",
        configuracion: {
          monedaPrincipal: "ARS",
          timezone: "America/Argentina/Buenos_Aires"
        }
      });

      console.log("✅ Negocio creado:", negocioID);

      // 6. ✅ CREAR USUARIO DENTRO DEL NEGOCIO (CON ROL Y PERMISOS DETALLADOS)
      await setDoc(doc(db, "negocios", negocioID, "usuarios", user.uid), {
        email: form.email,
        nombreCompleto: form.nombreCompleto,
        negocioID: negocioID, // ✅ REFERENCIA AL NEGOCIO
        rol: "admin", // ✅ ROL TAMBIÉN AQUÍ
        fechaIngreso: new Date(),
        estado: "activo",
        
        // ✅ PERMISOS DETALLADOS PARA EL NEGOCIO
        permisos: {
          ventas: true,
          productos: true,
          reportes: true,
          configuracion: true,
          usuarios: true, // ✅ Permiso para gestionar usuarios (botones de admin)
          crearUsuarios: true,
          editarUsuarios: true,
          eliminarUsuarios: true,
          impresion: true,
          garantias: true
        }
      });

      console.log("✅ Usuario creado dentro del negocio con permisos completos");

      // 7. ✅ REDIRIGIR AL DASHBOARD
      router.push("/?bienvenida=true");

    } catch (err: any) {
      console.error("❌ Error en registro:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este email ya está registrado. Intenta iniciar sesión.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña es muy débil. Usa al menos 6 caracteres.");
      } else {
        setError("Error al crear la cuenta. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-[#f8f9fa] via-[#ecf0f1] to-[#bdc3c7] flex items-center justify-center p-4 overflow-auto">
      
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 sm:w-32 sm:h-32 bg-[#27ae60]/10 rounded-full blur-xl"></div>
        <div className="absolute top-20 right-10 w-24 h-24 sm:w-48 sm:h-48 bg-[#f39c12]/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-10 w-20 h-20 sm:w-40 sm:h-40 bg-[#9b59b6]/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-16 h-16 sm:w-24 sm:h-24 bg-[#3498db]/10 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        
        {/* LOGO */}
        <div className="text-center mb-6">
          <Link href="/login" className="inline-block p-3 sm:p-4 bg-white rounded-2xl sm:rounded-3xl shadow-xl border-2 border-[#ecf0f1] hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="GestiOne Logo"
              className="w-40 sm:w-56 h-auto object-contain"
            />
          </Link>
        </div>

        {/* FORMULARIO PRINCIPAL */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-[#ecf0f1] overflow-hidden">
          
          {/* Header del formulario */}
          <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-lg sm:text-xl">🎉</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Crear Cuenta</h2>
            </div>
            <p className="text-green-100 text-xs sm:text-sm mb-3">
              7 días gratis · sin tarjeta
            </p>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
              <PrecioOfertaGestione compact />
            </div>
          </div>

          {/* Contenido del formulario */}
          <div className="p-4 sm:p-6 bg-gradient-to-b from-[#f8f9fa] to-white space-y-3 sm:space-y-4">
            
            {/* Nombre completo */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#2c3e50] mb-1">
                👤 Nombre completo *
              </label>
              <input
                type="text"
                name="nombreCompleto"
                placeholder="Tu nombre y apellido"
                value={form.nombreCompleto}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-[#bdc3c7] rounded-lg sm:rounded-xl bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                disabled={loading}
              />
            </div>

            {/* Nombre empresa */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#2c3e50] mb-1">
                🏢 Nombre de tu empresa *
              </label>
              <input
                type="text"
                name="nombreEmpresa"
                placeholder="Ej: Mi Empresa SRL"
                value={form.nombreEmpresa}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-[#bdc3c7] rounded-lg sm:rounded-xl bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#2c3e50] mb-1">
                📧 Email *
              </label>
              <input
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-[#bdc3c7] rounded-lg sm:rounded-xl bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                disabled={loading}
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#2c3e50] mb-1">
                📱 Teléfono (opcional)
              </label>
              <input
                type="tel"
                name="telefono"
                placeholder="+54 9 11 1234-5678"
                value={form.telefono}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-[#bdc3c7] rounded-lg sm:rounded-xl bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                disabled={loading}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#2c3e50] mb-1">
                🔒 Contraseña *
              </label>
              <input
                type="password"
                name="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-[#bdc3c7] rounded-lg sm:rounded-xl bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                disabled={loading}
              />
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#2c3e50] mb-1">
                🔒 Confirmar contraseña *
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleRegistro()}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-[#bdc3c7] rounded-lg sm:rounded-xl bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                disabled={loading}
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border-2 border-[#e74c3c] rounded-lg sm:rounded-xl">
                <p className="text-[#e74c3c] text-xs sm:text-sm font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  {error}
                </p>
              </div>
            )}

            {/* Plan y prueba */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-[#3498db]/10 to-[#2980b9]/10 border-2 border-[#3498db] rounded-lg sm:rounded-xl space-y-3">
              <PrecioOfertaGestione />
              <div>
                <h4 className="text-[#3498db] font-bold text-xs mb-1 flex items-center gap-2">
                  <span>✨</span>
                  ¿Qué incluye tu prueba gratuita?
                </h4>
                <ul className="text-[#2c3e50] text-xs space-y-0.5">
                  <li>• 7 días de acceso completo</li>
                  <li>• Todas las funcionalidades disponibles</li>
                  <li>• Sin límite de transacciones</li>
                  <li>• Soporte técnico incluido</li>
                  <li>• Después del trial: {formatoPrecioGestione(PRECIO_MENSUAL_OFERTA_ARS)}/mes (oferta)</li>
                </ul>
              </div>
            </div>

            {/* Botón de registro */}
            <button
              onClick={handleRegistro}
              disabled={loading}
              className={`w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base ${
                loading
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] hover:scale-105 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creando cuenta...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Comenzar prueba gratuita
                </>
              )}
            </button>

            {/* Enlaces */}
            <div className="text-center pt-2">
              <Link 
                href="/login" 
                className="text-[#3498db] hover:text-[#2980b9] font-medium transition-colors text-xs sm:text-sm"
              >
                ¿Ya tienes cuenta? <span className="underline">Inicia sesión</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-[#7f8c8d] text-xs">
            Al registrarte aceptas nuestros términos y condiciones
          </p>
        </div>
      </div>
    </div>
  );
}