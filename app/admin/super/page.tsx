"use client";

import { useEffect, useState } from "react";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const SUPER_ADMIN_UID = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";

export default function SuperAdminPage() {
  const auth = getAuth();
  const router = useRouter();
  const [currentUID, setCurrentUID] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [negocioID, setNegocioID] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUID(user?.uid || null);
    });
    return () => unsubscribe();
  }, [auth]);

  const crearNegocio = async () => {
    if (!email || !password || !negocioID) {
      setMensaje("⚠️ Completá todos los campos");
      return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      setMensaje("❌ El email ingresado no es válido");
      return;
    }

    setCreando(true);
    try {
      const { initializeApp } = await import("firebase/app");
      const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");

      const secondaryApp = initializeApp(auth.app.options, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const nuevoUID = userCredential.user.uid;

      await signOut(secondaryAuth);

      // Guardar usuario en ambas rutas
      await setDoc(doc(db, `negocios/${negocioID}/usuarios/${nuevoUID}`), {
        email,
        negocioID,
        rol: "admin",
      });

      await setDoc(doc(db, `usuarios/${nuevoUID}`), {
        email,
        negocioID,
        rol: "admin",
      });

      await setDoc(doc(db, `negocios/${negocioID}`), {
        creadoPor: currentUID,
        nombre: negocioID,
        creadoEn: new Date(),
      });

      // Crear configuración inicial con campos de garantía
      await setDoc(doc(db, `negocios/${negocioID}/configuracion/datos`), {
        logoURL: "",
        textoGarantia: "", // Para servicio técnico
        textoGarantiaTelefonos: "", // Para venta de teléfonos
        imprimirEtiqueta: false,
        imprimirTicket: false,
      });

      setMensaje("✅ Negocio creado exitosamente");
      setEmail("");
      setPassword("");
      setNegocioID("");
    } catch (error: any) {
      console.error("Error al crear negocio:", error);
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCreando(false);
    }
  };

  useEffect(() => {
    if (currentUID && currentUID !== SUPER_ADMIN_UID) {
      router.push("/");
    }
  }, [currentUID, router]);

  if (currentUID && currentUID !== SUPER_ADMIN_UID) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <p className="text-lg font-medium">Acceso denegado. Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUID) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 text-[#7f8c8d]">
            <span className="animate-spin text-2xl">⏳</span>
            <p className="text-lg">Verificando acceso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">👑</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Panel de Super Admin
              </h1>
              <p className="text-blue-100">
                Crear y gestionar negocios en GestiOne
              </p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#9b59b6] rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🏢</span>
            </div>
            <h2 className="text-lg font-bold text-[#2c3e50]">Gestión de Negocios</h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/admin/negocios")}
              className="bg-gradient-to-r from-[#34495e] to-[#2c3e50] hover:from-[#2c3e50] hover:to-[#1a252f] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
            >
              🏢 Ver todos los negocios
            </button>
            
            <button
              onClick={() => router.push("/configuraciones")}
              className="bg-gradient-to-r from-[#7f8c8d] to-[#95a5a6] hover:from-[#6c7b7d] hover:to-[#839192] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
            >
              ⚙️ Ir a configuraciones
            </button>
          </div>
        </div>

        {/* Formulario de creación */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
          <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">➕</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Crear Nuevo Negocio</h2>
                <p className="text-green-100 text-sm">Registra un nuevo negocio en el sistema</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                📝 Nombre del Negocio (ID)
              </label>
              <input
                type="text"
                placeholder="Ej: iphonetec, loop, etc."
                value={negocioID}
                onChange={(e) => setNegocioID(e.target.value)}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                📧 Email del Administrador
              </label>
              <input
                type="email"
                placeholder="admin@negocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                🔒 Contraseña
              </label>
              <input
                type="password"
                placeholder="Contraseña segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
              />
            </div>

            <button
              onClick={crearNegocio}
              disabled={creando}
              className="w-full bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white py-3 px-6 rounded-lg font-bold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {creando ? (
                <>
                  <span className="animate-spin text-xl">⏳</span>
                  Creando negocio...
                </>
              ) : (
                <>
                  <span className="text-xl">🏢</span>
                  Crear Negocio
                </>
              )}
            </button>

            {mensaje && (
              <div className={`p-4 rounded-xl border ${
                mensaje.includes("✅") 
                  ? "bg-[#d5f4e6] border-[#27ae60] text-[#27ae60]" 
                  : "bg-[#fadbd8] border-[#e74c3c] text-[#e74c3c]"
              }`}>
                <p className="font-medium">{mensaje}</p>
              </div>
            )}
          </div>
        </div>

        {/* Info adicional */}
        <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-2xl p-4 border border-[#bdc3c7]">
          <div className="flex items-center gap-3 text-[#2c3e50]">
            <div className="w-8 h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💡</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                <strong>Información:</strong> Al crear un negocio se generará automáticamente la estructura inicial con configuraciones de garantía, impresión y otros ajustes predeterminados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}