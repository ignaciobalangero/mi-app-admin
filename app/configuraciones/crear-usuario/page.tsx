"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  getAuth,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function CrearUsuarioPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("empleado");
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resumenCreado, setResumenCreado] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const obtenerNegocio = async () => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          const negocio = snap.data().negocioID;
          if (negocio) setNegocioID(negocio);
        }
      }
    };
    obtenerNegocio();
  }, [user]);

  const crearUsuario = async () => {
    if (!nombre.trim()) return setMensaje("⚠️ Ingresá el nombre del cliente.");
    if (!email.trim()) return setMensaje("⚠️ Ingresá un email válido.");
    if (!password || password.length < 6)
      return setMensaje("⚠️ La contraseña debe tener al menos 6 caracteres.");
    if (!rol) return setMensaje("⚠️ Seleccioná un rol válido.");
    if (!negocioID)
      return setMensaje("❌ No se encontró un negocioID válido. Iniciá sesión nuevamente.");

    setCargando(true);
    setMensaje("");
    setResumenCreado(null);

    try {
      const authAdmin = getAuth();

      const metodos = await fetchSignInMethodsForEmail(authAdmin, email);
      if (metodos.length > 0) {
        setMensaje("❌ Ya existe un usuario con este email.");
        setCargando(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(authAdmin, email, password);
      const nuevoUID = userCredential.user.uid;

      await setDoc(doc(db, "usuarios", nuevoUID), {
        email: email.toLowerCase(),
        negocioID,
        rol,
        nombre: nombre.trim().toLowerCase(),
      });

      // 🔧 Crear configuración automáticamente si no existe
      const configRef = doc(db, "configuracion", negocioID);
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        await setDoc(configRef, {
          logoUrl: "",
          creado: new Date().toISOString(),
        });
        console.log("✅ Configuración del negocio creada");
      } else {
        console.log("ℹ️ Configuración ya existente");
      }

      setMensaje("✅ Usuario creado correctamente.");
      setResumenCreado({ email, rol, negocioID });
      setEmail("");
      setPassword("");
      setRol("empleado");
      setNombre("");
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      setMensaje("❌ " + error.message);
    }

    setCargando(false);
  };

  return (
    <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-6 text-center">Crear usuario</h1>

      <div className="max-w-md mx-auto bg-white p-6 rounded shadow space-y-4">
        <input
          type="text"
          placeholder="Nombre del cliente (exacto)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-700"
        />
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
          disabled={cargando}
          className={`w-full py-2 px-4 rounded text-white ${cargando ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {cargando ? "Creando..." : "Crear usuario"}
        </button>

        {mensaje && <p className="text-sm mt-2 text-center">{mensaje}</p>}

        {resumenCreado && (
          <div className="mt-4 text-sm text-green-700 text-center">
            <p>
              Usuario creado: <strong>{resumenCreado.email}</strong> ({resumenCreado.rol})<br />
              Asociado a: <strong>{resumenCreado.negocioID}</strong>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
