"use client";

import { useState, useEffect } from "react";
import { collection, setDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";

export default function BotonImportarStock({ sheetID, hoja }: { sheetID: string; hoja: string }) {
  const { rol } = useRol();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [importado, setImportado] = useState(false); // ✅ bandera de control

  useEffect(() => {
    if (!rol?.negocioID) return;
    const key = `importado_${rol.negocioID}_${hoja}`;
    const yaImportado = localStorage.getItem(key);
    if (yaImportado === "true") setImportado(true);
  }, [rol?.negocioID, hoja]);

  const importarDesdeSheet = async () => {
    if (!rol?.negocioID || !sheetID || !hoja) return;
    setMensaje(null);
    setCargando(true);

    try {
      const configSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/configuracion`));
      let cotizacionManual = 1000;

      configSnap.forEach((docu) => {
        const data = docu.data();
        if (data.dolarManual) cotizacionManual = Number(data.dolarManual);
      });

      const res = await fetch("/api/leer-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, negocioID: rol?.negocioID }),
      });

      const { datos } = await res.json();
      if (!Array.isArray(datos)) throw new Error("Datos inválidos desde el Sheet");

      const promises = datos.map(async (prod: any) => {
        const precioUSD = Number(prod.precioUSD) || 0;
        const precioARS = Math.round(precioUSD * cotizacionManual);

        const ref = doc(db, `negocios/${rol.negocioID}/stockExtra/${prod.codigo}`);
        await setDoc(ref, {
          codigo: prod.codigo,
          categoria: prod.categoria,
          producto: prod.producto,
          cantidad: Number(prod.cantidad) || 0,
          precio: precioARS,
          precioUSD,
          cotizacion: cotizacionManual,
          mostrar: "si",
          negocioID: rol.negocioID,
        });
      });

      await Promise.all(promises);
      setMensaje("✅ Productos importados correctamente");

      // ✅ Ocultar botón después de importar
      const key = `importado_${rol.negocioID}_${hoja}`;
      localStorage.setItem(key, "true");
      setImportado(true);
    } catch (err) {
      console.error("❌ Error al importar desde Sheet:", err);
      setMensaje("❌ Error al importar desde Sheet");
    } finally {
      setCargando(false);
    }
  };

  if (importado) return null; // 👈 no renderiza el botón si ya se importó

  return (
    <div className="my-4 text-center">
      <button
        onClick={importarDesdeSheet}
        disabled={cargando}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
      >
        {cargando ? "Importando..." : "📥 Importar productos desde Sheet"}
      </button>
      {mensaje && <p className="text-sm mt-2">{mensaje}</p>}
    </div>
  );
}
