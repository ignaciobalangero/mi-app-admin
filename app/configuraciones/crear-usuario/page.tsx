"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function CrearUsuarioPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("empleado");
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();

  useEffect(() => {
    const obtenerNegocio = async () => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          setNegocioID(snap.data().negocioID);
        }
      }
    };
    obtenerNegocio();
  }, [user]);

  const crearUsuario = async () => {
    if (!email || !password || !rol) {
      setMensaje("Completá todos los campos.");
      return;
    }
    try {
      const authAdmin = getAuth();
      const userCredential = await createUserWithEmailAndPassword(authAdmin, email, password);
      const nuevoUID = userCredential.user.uid;

      await setDoc(doc(db, "usuarios", nuevoUID), {
        email,
        negocioID,
        rol,
      });

      setMensaje("✅ Usuario creado correctamente.");
      setEmail("");
      setPassword("");
      setRol("empleado");
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      setMensaje("❌ " + error.message);
    }
  };

  return (
    <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-6 text-center">Crear usuario</h1>

      <div className="max-w-md mx-auto bg-white p-6 rounded shadow space-y-4">
        <input
          type="email"
          placeholder="Email del nuevo usuario"
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
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="empleado">Empleado</option>
          <option value="cliente">Cliente</option>
        </select>

        <button
          onClick={crearUsuario}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Crear usuario
        </button>

        {mensaje && <p className="text-sm mt-2 text-center">{mensaje}</p>}
      </div>
    </main>
  );
}
