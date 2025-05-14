"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import FormularioAgregarProducto from "../components/FormularioAgregarProducto";
import TablaProductosSheet from "../components/TablaProductosSheet";
import BotonImportarStock from "../components/BotonImportarStock";
import BotonActualizarPreciosSheet from "../components/BotonActualizarPreciosSheet";
import { useRol } from "@/lib/useRol";

export default function StockSheetPage() {
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const [sheetID, setSheetID] = useState<string | null>(null);
  const [nombreHoja, setNombreHoja] = useState<string>("");
  const [hojasVinculadas, setHojasVinculadas] = useState<{ hoja: string; id: string }[]>([]);
  const [recarga, setRecarga] = useState(0);


  useEffect(() => {
    const obtenerDatos = async () => {
      if (!user) return;

      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const negocioID = snap.exists() ? snap.data().negocioID : null;
      if (!negocioID) return;

      const configSnap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
      const configData = configSnap.exists() ? configSnap.data() : {};
      const hojas = configData.googleSheets || [];

      setHojasVinculadas(hojas);
      if (hojas.length > 0) {
        setSheetID(hojas[0].id);
        setNombreHoja(hojas[0].hoja);
      }
    };

    obtenerDatos();
  }, [user]);

  return (
    <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-6 text-center">📄 Stock desde Google Sheet</h1>

      {hojasVinculadas.length === 0 ? (
        <p className="text-center text-red-600">
          ⚠️ No hay hojas vinculadas. Agregalas desde “Configuraciones”.
        </p>
      ) : (
        <>
          <div className="text-center mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">Seleccionar hoja</label>
            <select
              value={nombreHoja}
              onChange={(e) => {
                const seleccionada = hojasVinculadas.find((h) => h.hoja === e.target.value);
                if (seleccionada) {
                  setSheetID(seleccionada.id);
                  setNombreHoja(seleccionada.hoja);
                }
              }}
              className="p-2 border rounded"
            >
              {hojasVinculadas.map((h, i) => (
                <option key={i} value={h.hoja}>
                  {h.hoja}
                </option>
              ))}
            </select>
          </div>

          <p className="text-center text-green-700 mb-4">
            ✅ Vinculado con hoja <strong>{nombreHoja}</strong>:<br />
            <code className="text-sm break-words">{sheetID}</code>
          </p>

          <div className="text-center mb-6">
            <button
              onClick={async () => {
                const confirmar = confirm(`¿Completar códigos faltantes en la hoja "${nombreHoja}"?`);
                if (!confirmar) return;
                try {
                  const res = await fetch("/api/completar-codigos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sheetID, hoja: nombreHoja, negocioID: rol?.negocioID }),
                  });                  

                  const json = await res.json();
                  if (json.ok) {
                    alert("✅ Códigos completados correctamente.");
                    setRecarga((prev) => prev + 1);
                  } else {
                    throw new Error(json.error);
                  }
                } catch (err) {
                  console.error("Error al completar códigos:", err);
                  alert("❌ Error al completar códigos.");
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded"
            >
              🧩 Completar códigos faltantes
            </button>
          </div>

          <FormularioAgregarProducto
  sheetID={sheetID!}
  hoja={nombreHoja}
  onProductoAgregado={() => setRecarga((prev) => prev + 1)} // 🔁 aumenta para forzar actualización
/>
<BotonImportarStock sheetID={sheetID!} hoja={nombreHoja} />
<BotonActualizarPreciosSheet sheetID={sheetID!} hoja={nombreHoja} />

<TablaProductosSheet
  sheetID={sheetID!}
  hoja={nombreHoja}
  recarga={recarga} // ✅ acá pasás el prop faltante
  setRecarga={setRecarga}
/>

        </>
      )}
    </main>
  );
}
