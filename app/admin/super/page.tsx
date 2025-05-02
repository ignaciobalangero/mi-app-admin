"use client";

import { useEffect, useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

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
      setMensaje("Completá todos los campos");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const nuevoUID = userCredential.user.uid;

      // Guardamos info del usuario
      await setDoc(doc(db, "usuarios", nuevoUID), {
        email,
        negocioID,
        rol: "admin",
      });

      // Creamos estructura inicial del negocio
      await setDoc(doc(db, "negocios", negocioID, "configuracion", "global"), {
        logoURL: "",
        condicionesGarantia: "",
      });

      setMensaje(`✅ Negocio creado correctamente con UID: ${nuevoUID}`);
      setEmail("");
      setPassword("");
      setNegocioID("");
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  if (currentUID && currentUID !== SUPER_ADMIN_UID) {
    router.push("/");
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
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Panel de Super Admin</h1>

     

      <div className="space-y-4 bg-white p-4 rounded shadow">
        <input
          type="text"
          placeholder="Nombre del negocio (ID)"
          value={negocioID}
          onChange={(e) => setNegocioID(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-700"
        />
        <input
          type="email"
          placeholder="Email del administrador"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-700"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-700"
        />

        <button
          onClick={crearNegocio}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Crear negocio
        </button>

        {mensaje && <p className="text-sm mt-2">{mensaje}</p>}
      </div>
    </main>
  );
}
