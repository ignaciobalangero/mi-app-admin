// Archivo: app/configuraciones/whatsapp/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ConfiguracionWhatsappPage() {
  const [user] = useAuthState(auth);
  const [instanceID, setInstanceID] = useState("");
  const [token, setToken] = useState("");
  const [plantilla, setPlantilla] = useState("Hola {{cliente}}, tu equipo {{modelo}} ya está listo para retirar.");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const negocioID = snap.exists() ? snap.data().negocioID : null;
      if (!negocioID) return;

      const configRef = doc(db, "configuracion", negocioID);
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        const data = configSnap.data().whatsapp || {};
        setInstanceID(data.instanceID || "");
        setToken(data.token || "");
        setPlantilla(data.plantilla || plantilla);
      }
    };
    cargarDatos();
  }, [user]);

  const guardar = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const negocioID = snap.exists() ? snap.data().negocioID : null;
    if (!negocioID) return;

    await updateDoc(doc(db, "configuracion", negocioID), {
      whatsapp: { instanceID, token, plantilla },
    });
    setMensaje("✅ Configuración guardada correctamente");
  };

  return (
    <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-6 text-center">🔧 Configuración de WhatsApp</h1>

      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <input
          type="text"
          value={instanceID}
          onChange={(e) => setInstanceID(e.target.value)}
          placeholder="Instance ID de UltraMsg"
          className="w-full p-3 border rounded"
        />
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token de UltraMsg"
          className="w-full p-3 border rounded"
        />
        <textarea
          value={plantilla}
          onChange={(e) => setPlantilla(e.target.value)}
          placeholder="Plantilla del mensaje. Usá {{cliente}} y {{modelo}}"
          className="w-full p-3 border rounded h-32"
        />

        <button
          onClick={guardar}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          Guardar configuración
        </button>

        {mensaje && <p className="text-center text-sm text-green-700">{mensaje}</p>}
      </div>
    </main>
  );
}
