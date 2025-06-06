"use client";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError("Credenciales inválidas. Verifica tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-[#ecf0f1] to-[#bdc3c7] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#3498db]/10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-[#9b59b6]/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-[#27ae60]/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-[#f39c12]/10 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* LOGO CENTRADO */}
        <div className="text-center mb-6">
          <div className="inline-block p-6 bg-white rounded-4xl shadow-xl border-2 border-[#ecf0f1]">
            <img
              src="/logo.png"
              alt="GestiOne Logo"
              className="w-48 h-auto object-contain"
            />
          </div>
        </div>

        {/* FORMULARIO PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#ecf0f1] overflow-hidden">
          
          {/* Header del formulario */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">🔐</span>
              </div>
              <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
            </div>
            <p className="text-blue-100 text-sm">
              Accede a tu cuenta de GestiOne
            </p>
          </div>

          {/* Contenido del formulario */}
          <div className="p-8 bg-gradient-to-b from-[#f8f9fa] to-white">
            
            {/* Campo Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                📧 Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-xl bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                disabled={loading}
              />
            </div>

            {/* Campo Contraseña */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                🔒 Contraseña
              </label>
              <input
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
                className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-xl bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                disabled={loading}
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-[#e74c3c] rounded-xl">
                <p className="text-[#e74c3c] text-sm font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  {error}
                </p>
              </div>
            )}

            {/* Botón de login */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-3 ${
                loading
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] hover:scale-105 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Ingresando...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Ingresar a GestiOne
                </>
              )}
            </button>

            {/* Enlaces adicionales */}
            <div className="mt-6 text-center space-y-3">
              <Link 
                href="/registro" 
                className="block text-[#3498db] hover:text-[#2980b9] font-medium transition-colors"
              >
                ¿No tienes cuenta? <span className="underline">Regístrate aquí</span>
              </Link>
              
              <Link 
                href="/recuperar-password" 
                className="block text-[#7f8c8d] hover:text-[#2c3e50] text-sm transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Información de prueba gratuita */}
            <div className="mt-6 p-4 bg-gradient-to-r from-[#27ae60]/10 to-[#2ecc71]/10 border-2 border-[#27ae60] rounded-xl">
              <div className="text-center">
                <p className="text-[#27ae60] font-bold text-sm flex items-center justify-center gap-2 mb-1">
                  <span>🎉</span>
                  ¡Prueba gratuita de 7 días!
                </p>
                <p className="text-[#2c3e50] text-xs">
                  Regístrate y usa GestiOne sin compromiso
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-[#7f8c8d] text-sm">
            © 2025 GestiOne - Sistema de gestión empresarial
          </p>
        </div>
      </div>
    </div>
  );
}