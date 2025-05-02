"use client";
import { useState } from "react";
import { auth } from "../../lib/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/"); // Redirige al inicio si el login es exitoso
    } catch (err) {
      setError("Credenciales inválidas");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start pt-12 px-4">
      
    {/* LOGO CENTRADO ARRIBA */}
    <img
      src="/logo.png"
      alt="Logo"
      className="w-72 h-auto object-contain mb-8"
    />

    {/* FORMULARIO CENTRADO MÁS ABAJO */}
    <div className="bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-md mt-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Iniciar sesión</h2>


        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-gray-700 border border-gray-600"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()} // ← esta es la magia
          className="w-full p-3 mb-4 rounded bg-gray-700 border border-gray-600"
        />

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition"
        >
          Ingresar
        </button>
      </div>
    </div>
  );
}
