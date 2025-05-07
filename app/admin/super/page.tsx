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

    try {
      const { initializeApp } = await import("firebase/app");
      const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");

      // ✅ Crear usuario en app secundaria
      const secondaryApp = initializeApp(auth.app.options, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const nuevoUID = userCredential.user.uid;

      // 🔐 Desloguear cuenta secundaria antes de usar Firestore
      await signOut(secondaryAuth);

      // ✅ Ahora sí, escribir datos desde sesión principal
      await setDoc(doc(db, "usuarios", nuevoUID), {
        email,
        negocioID,
        rol: "admin",
      });

      // ✅ AGREGADO: Crear también el documento en /negocios/{negocioID}/usuarios/{uid}
await setDoc(doc(db, `negocios/${negocioID}/usuarios/${nuevoUID}`), {
  email,
  rol: "admin",
});

      await setDoc(doc(db, `negocios/${negocioID}`), {
        creadoPor: currentUID,
        nombre: negocioID,
        creadoEn: new Date(),
      });

      await setDoc(doc(db, `negocios/${negocioID}/configuracion/datos`), {
        logoURL: "",
        condicionesGarantia: "",
      });

      setMensaje("✅ Cuenta creada con éxito");
      setEmail("");
      setPassword("");
      setNegocioID("");
    } catch (error: any) {
      console.error("Error al crear negocio:", error);
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  useEffect(() => {
    if (currentUID && currentUID !== SUPER_ADMIN_UID) {
      router.push("/");
    }
  }, [currentUID, router]);

  if (currentUID && currentUID !== SUPER_ADMIN_UID) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        <p className="text-lg">Acceso denegado. Redirigiendo...</p>
      </div>
    );
  }

  if (!currentUID) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <p className="text-lg">Verificando acceso...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="bg-gray-100 p-6 rounded-xl shadow-md w-full max-w-xl">
        <h1 className="text-2xl text-black font-bold mb-4">Panel de Super Admin</h1>

        <div className="space-y-4 bg-white p-4 rounded shadow">
          <input
            type="text"
            placeholder="Nombre del negocio (ID)"
            value={negocioID}
            onChange={(e) => setNegocioID(e.target.value)}
            className="w-full text-black border p-2 rounded placeholder-gray-700"
          />
          <input
            type="email"
            placeholder="Email del administrador"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-black border p-2 rounded placeholder-gray-700"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-black border p-2 rounded placeholder-gray-700"
          />

          <button
            onClick={crearNegocio}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Crear negocio
          </button>

          {mensaje && <p className="text-sm mt-2">{mensaje}</p>}
        </div>
      </div>
    </main>
  );
}
