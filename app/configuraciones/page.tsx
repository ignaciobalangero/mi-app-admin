"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import Header from "../Header";
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
  const [rol, setRol] = useState(""); // Para verificar rol admin
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
        const ref = doc(db, "configuracion", "global");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setTextoGarantia(data.textoGarantia || "");
          setImprimirEtiqueta(data.imprimirEtiqueta || false);
          setImprimirTicket(data.imprimirTicket || false);
          setLogoUrl(data.logoUrl || "");
        }

        // Traer rol desde Firestore
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
          setRol(userDoc.data().rol || "");
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

    try {
      let finalLogoUrl = logoUrl;

      if (nuevoLogo) {
        const storageRef = ref(storage, `logos/${user.uid}/logo.png`);
        await uploadBytes(storageRef, nuevoLogo);
        finalLogoUrl = await getDownloadURL(storageRef);
      }

      const refDoc = doc(db, "configuracion", "global");
      await setDoc(refDoc, {
        textoGarantia,
        imprimirEtiqueta,
        imprimirTicket,
        logoUrl: finalLogoUrl,
      });

      alert("Configuración guardada correctamente.");
      setNuevoLogo(null);
      setLogoUrl(finalLogoUrl);
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      alert("❌ Hubo un error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black relative">

        {/* Botones solo para el super admin */}
        {user?.uid === SUPER_ADMIN_UID && (
          <div className="absolute top-28 left-4 flex flex-col gap-2">
            <button
              onClick={() => router.push("/admin/super")}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              Crear nuevo negocio
            </button>
            <button
              onClick={() => router.push("/admin/clientes")}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm"
            >
              NEGOCIOS
            </button>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-6 text-center">Configuraciones</h1>

        <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow space-y-6">

          {/* Botón visible para todos los administradores */}
          {rol === "admin" && (
            <div className="text-center mb-6">
              <button
                onClick={() => router.push("/configuraciones/crear-usuario")}
                className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded font-semibold"
              >
                Crear usuario
              </button>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-2">Texto fijo para garantía:</label>
            <textarea
              value={textoGarantia}
              onChange={(e) => setTextoGarantia(e.target.value)}
              className="w-full h-40 p-3 border border-gray-400 rounded"
              placeholder="Condiciones de garantía que aparecerán en el ticket"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">Logo del sistema (PNG o JPG):</label>
            {logoUrl && (
              <img src={logoUrl} alt="Logo actual" className="w-32 h-auto mb-2" />
            )}
            <input type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} />
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={imprimirEtiqueta}
                onChange={(e) => setImprimirEtiqueta(e.target.checked)}
              />
              <span>Imprimir etiqueta automáticamente al guardar trabajo</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={imprimirTicket}
                onChange={(e) => setImprimirTicket(e.target.checked)}
              />
              <span>Imprimir ticket automáticamente al guardar trabajo</span>
            </label>
          </div>

          <button
            onClick={guardarConfiguracion}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold"
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </main>
    </>
  );
}
