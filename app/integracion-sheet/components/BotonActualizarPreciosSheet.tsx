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

export default function BotonActualizarPreciosSheet({
  sheetID,
  hoja,
}: {
  sheetID: string;
  hoja: string;
}) {
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
      const configSnap = await getDoc(
        doc(db, `negocios/${rol.negocioID}/configuracion/moneda`)
      );
      if (configSnap.exists()) {
        const data = configSnap.data();
        cotizacion = Number(data.dolarManual) || 1000;
      }

      // Obtener productos desde Firebase
      const snap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockExtra`)
      );
      const productos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Formar filas solo con los datos disponibles
      const filas = productos.map((p: any) => {
        const precioUSD = Number(p.precioUSD) || 0;
        const precioARS = Number((precioUSD * cotizacion).toFixed(2));

        return {
          codigo: p.id,
          categoria: p.categoria || "",
          producto: p.producto || "",
          cantidad: p.cantidad || "",
          precioARS,
          precioUSD,
        };
      });

      console.log("🧾 Filas a enviar:", filas);

      // Enviar a la API
      const res = await fetch("/api/actualizar-precios-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, filas }),
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
