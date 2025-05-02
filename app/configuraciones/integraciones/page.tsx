"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function IntegracionGoogleSheetPage() {
  const [sheetID, setSheetID] = useState("");
  const [nombreHoja, setNombreHoja] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [user] = useAuthState(auth);
  const [hojasVinculadas, setHojasVinculadas] = useState<{ hoja: string; id: string }[]>([]);

  useEffect(() => {
    const obtenerHojas = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const negocioID = snap.exists() ? snap.data().negocioID : null;
      if (!negocioID) return;

      const configSnap = await getDoc(doc(db, `configuracion/${negocioID}`));
      const configData = configSnap.exists() ? configSnap.data() : {};
      const hojasGuardadas = configData.googleSheets || [];

      setHojasVinculadas(hojasGuardadas);
    };

    obtenerHojas();
  }, [user]);

  const guardarHoja = async () => {
    if (!user) return setMensaje("⚠️ No hay usuario autenticado");
    if (!sheetID || !nombreHoja) return setMensaje("⚠️ Completá ambos campos");

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const negocioID = snap.exists() ? snap.data().negocioID : null;
    if (!negocioID) return setMensaje("⚠️ No se encontró el negocioID");

    const configRef = doc(db, "configuracion", negocioID);
    const configSnap = await getDoc(configRef);
    const configData = configSnap.exists() ? configSnap.data() : {};
    const hojasActuales = configData.googleSheets || [];

    const yaExiste = hojasActuales.some(
        (h: any) => h.hoja === nombreHoja && h.id === sheetID
      );
      if (yaExiste) {
        setMensaje("⚠️ Esa hoja ya está vinculada");
        return;
      }
                                          
    const nuevasHojas = [...hojasActuales, { hoja: nombreHoja, id: sheetID }];

    await setDoc(configRef, {
      ...configData,
      googleSheets: nuevasHojas,
    });

    setMensaje("✅ Hoja vinculada correctamente");
    setSheetID("");
    setNombreHoja("");
    setHojasVinculadas(nuevasHojas);
  };

  return (
    <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-4 text-center">🔗 Vincular Google Sheets</h1>

      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <input
          type="text"
          value={nombreHoja}
          onChange={(e) => setNombreHoja(e.target.value)}
          placeholder="Nombre de la pestaña (ej: Pantallas)"
          className="w-full p-3 border rounded"
        />
        <input
          type="text"
          value={sheetID}
          onChange={(e) => setSheetID(e.target.value)}
          placeholder="ID de Google Sheet"
          className="w-full p-3 border rounded"
        />
        <button
          onClick={guardarHoja}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          + Agregar hoja
        </button>
        {mensaje && <p className="text-center text-sm">{mensaje}</p>}
      </div>

      {hojasVinculadas.length > 0 && (
        <div className="max-w-xl mx-auto mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">📄 Hojas vinculadas:</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700">
            {hojasVinculadas.map((h, i) => (
              <li key={i}>
                <strong>{h.hoja}</strong>: <code>{h.id}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
