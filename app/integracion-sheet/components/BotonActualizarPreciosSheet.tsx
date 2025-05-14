// Botón para actualizar precios ARS en el Sheet desde Firebase
"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { obtenerDatosDesdeSheet } from "@/app/api/lib/googleSheets";

export default function BotonActualizarPreciosSheet({ sheetID, hoja }: { sheetID: string; hoja: string }) {
  const { rol } = useRol();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const actualizarPrecios = async () => {
    if (!rol?.negocioID || !sheetID || !hoja) return;
    setCargando(true);
    setMensaje(null);

    try {
      let cotizacion = 1000;

      // Obtener cotización desde configuración manual
      const configSnap = await getDoc(doc(db, `negocios/${rol.negocioID}/configuracion/moneda`));
      if (configSnap.exists()) {
        const data = configSnap.data();
        cotizacion = Number(data.dolarManual) || 1000;
      }

      // Obtener productos
  // Obtener productos
const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`));
const productos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

// 🟡 Obtener datos actuales del Sheet para conservar valores
const datosActuales = await obtenerDatosDesdeSheet(sheetID, `${hoja}!A2:Z`);

// Formar nuevas filas para el Sheet
const filas = productos.map((p: any) => {
  const precioUSD = Number(p.precioUSD) || 0;
  const precioARS = Number((precioUSD * cotizacion).toFixed(2));
  const filaSheet = datosActuales.find((f: string[]) => f[0] === p.id);

  return {
    codigo: p.id,
    categoria: p.categoria || filaSheet?.[1] || "",
    producto: p.producto || filaSheet?.[2] || "",
    cantidad: p.cantidad || filaSheet?.[3] || "",    
    precioARS,
    precioUSD: p.precioUSD ?? Number(filaSheet?.[5]) ?? 0,
  };
});

      console.log("🧾 Filas a actualizar:", filas);
      // Llamada a API para actualizar el Sheet
      const res = await fetch("/api/actualizar-precios-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, filas, negocioID: rol?.negocioID }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error desconocido");

      setMensaje("✅ Precios actualizados en el Sheet correctamente");
    } catch (err) {
      console.error("❌ Error actualizando precios en el Sheet:", err);
      setMensaje("❌ Hubo un problema al actualizar los precios en el Sheet");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="my-4 text-center">
      <button
        onClick={actualizarPrecios}
        disabled={cargando}
        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
      >
        {cargando ? "Actualizando..." : "🔁 Actualizar precios en Sheet"}
      </button>
      {mensaje && <p className="text-sm mt-2">{mensaje}</p>}
    </div>
  );
}
