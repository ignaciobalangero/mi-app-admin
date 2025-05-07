"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import Link from "next/link";
import Header from "../Header";
import IntegracionGoogleSheet from "./components/IntegracionGoogleSheet";
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

export default function Configuraciones() {
  const [user] = useAuthState(auth);
  interface RolInfo {
    tipo: string;
    negocioID: string;
  }  
  const [rol, setRol] = useState<RolInfo | null>(null); // ✅ ahora sí va a funcionar bien
  const [textoGarantia, setTextoGarantia] = useState("");
  const [imprimirEtiqueta, setImprimirEtiqueta] = useState(false);
  const [imprimirTicket, setImprimirTicket] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [nuevoLogo, setNuevoLogo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  const SUPER_ADMIN_UID = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const cargarConfiguracion = async () => {
        // Primero obtenemos el negocioID desde la ruta correcta
        const posiblesNegocios = ["iphonetec", "ignacio", "facu", "loop"]; // si querés podrías traer esto de forma dinámica si fuera necesario
        let negocioID: string | null = null;
  
        for (const id of posiblesNegocios) {
          const snap = await getDoc(doc(db, `negocios/${id}/usuarios/${user.uid}`));
          if (snap.exists()) {
            negocioID = id;
            const data = snap.data();
            setRol({
              tipo: data.rol || "sin rol",
              negocioID,
            });
            break;
          }
        }
  
        if (!negocioID) {
          throw new Error("No se encontró el negocioID del usuario");
        }
  
        // Traer configuración desde la nueva ruta
        const ref = doc(db, `negocios/${negocioID}/configuracion/datos`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setTextoGarantia(data.textoGarantia || "");
          setImprimirEtiqueta(data.imprimirEtiqueta || false);
          setImprimirTicket(data.imprimirTicket || false);
          setLogoUrl(data.logoUrl || "");
        }
      };
      cargarConfiguracion();
    }
  }, [user]);
  

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNuevoLogo(e.target.files[0]);
    }
  };

  
  const guardarConfiguracion = async () => {
    if (!user) return;
    setGuardando(true);
    console.log("✅ Comenzando guardar configuración...");
  
    try {
      // 🔍 Obtener negocioID desde el usuario
      const negocioID = rol?.negocioID;
      if (!negocioID) throw new Error("No se encontró el negocioID del usuario");      
  
      let finalLogoUrl = logoUrl;
  
      if (nuevoLogo) {
        console.log("📤 Subiendo nuevo logo...");
        const storageRef = ref(storage, `logos/${negocioID}/logo.png`);
        await uploadBytes(storageRef, nuevoLogo);
        console.log("✅ Logo subido.");
  
        finalLogoUrl = `${await getDownloadURL(storageRef)}?v=${Date.now()}`;
        console.log("✅ URL de logo obtenida:", finalLogoUrl);
      }
  
      const refDoc = doc(db, `negocios/${negocioID}/configuracion`, "datos");
      console.log("💾 Guardando configuración en Firestore...");
      await setDoc(
        refDoc,
        {
          textoGarantia,
          imprimirEtiqueta,
          imprimirTicket,
          logoUrl: finalLogoUrl,
        },
        { merge: true }
      );
      console.log("✅ Configuración guardada en Firestore.");
  
      alert("✅ Configuración guardada correctamente.");
      setNuevoLogo(null);
      setLogoUrl(finalLogoUrl);
    } catch (error: any) {
      console.error("❌ Error al guardar configuración:", error);
      alert("Hubo un error al guardar: " + error.message);
    } finally {
      console.log("⚡ Finalizando guardarConfiguracion");
      setGuardando(false);
    }
  };
  


  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black relative">
        {user?.uid === SUPER_ADMIN_UID && (
          <div className="absolute top-28 left-4 flex flex-col gap-2">
            <button
              onClick={() => router.push("/admin/super")}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              🏢 Crear nuevo negocio
            </button>
            <button
              onClick={() => router.push("/admin/clientes")}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm"
            >
              🧾 Ver negocios
            </button>
          </div>
        )}


        <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">⚙️ Configuraciones</h1>

        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow space-y-6">

          {rol?.tipo === "admin" && (
            <div className="text-center mb-6 space-y-3">
              <button
                onClick={() => router.push("/configuraciones/crear-usuario")}
                className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded font-semibold"
              >
                👤 Crear usuario
              </button>

              <button
                onClick={() => router.push("/configuraciones/impresion")}
                className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-2 rounded font-semibold"
              >
                🖨️ Configurar impresión
              </button>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-2">📝 Texto fijo para garantía:</label>
            <textarea
              value={textoGarantia}
              onChange={(e) => setTextoGarantia(e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 rounded focus:outline-blue-500"
              placeholder="Condiciones de garantía que aparecerán en el ticket"
            />
          </div>

          <div className="space-y-2">
  <label className="block font-semibold mb-2">🖼️ Logo del sistema (PNG o JPG):</label>

  {logoUrl && (
    <img src={logoUrl} alt="Logo actual" className="w-32 h-auto mb-4 mx-auto rounded shadow" />
  )}

  <div className="flex flex-col items-center space-y-2">
    <label
      htmlFor="logoUpload"
      className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow text-center"
    >
      📤 Seleccionar archivo
    </label>
    <input
      id="logoUpload"
      type="file"
      accept="image/png,image/jpeg"
      onChange={handleLogoChange}
      className="hidden"
    />
    {nuevoLogo && (
      <span className="text-gray-600 text-sm">{nuevoLogo.name}</span>
    )}
  </div>
</div>


          <div className="flex flex-col gap-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={imprimirEtiqueta}
                onChange={(e) => setImprimirEtiqueta(e.target.checked)}
              />
              <span>🟦 Imprimir etiqueta automáticamente al guardar trabajo</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={imprimirTicket}
                onChange={(e) => setImprimirTicket(e.target.checked)}
              />
              <span>🟥 Imprimir ticket automáticamente al guardar trabajo</span>
            </label>
          </div>
          <IntegracionGoogleSheet />
          <div className="text-center mt-6">
            <button
              onClick={guardarConfiguracion}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-semibold text-lg shadow"
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "💾 Guardar configuración"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
