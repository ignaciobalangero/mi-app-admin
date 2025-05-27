import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import axios from "axios";

export default function useCotizacion(negocioID: string) {
  const [usarDolarManual, setUsarDolarManual] = useState(false);
  const [dolarManual, setDolarManual] = useState<number | null>(null);
  const [cotizacion, setCotizacion] = useState<number | null>(null);

  useEffect(() => {
    const obtenerConfiguracion = async () => {
      if (!negocioID) return;
      try {
        const configRef = doc(db, `negocios/${negocioID}/configuracion/moneda`);
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          const data = snap.data();
          setUsarDolarManual(data.usarDolarManual ?? false);
          setDolarManual(data.dolarManual ?? null);

          if (data.usarDolarManual && data.dolarManual) {
            setCotizacion(data.dolarManual);
            console.log("💲 Cotización manual usada:", data.dolarManual);
          } else {
            const res = await axios.get("https://dolarapi.com/v1/dolares/blue");
            setCotizacion(res.data.venta);
            console.log("💲 Cotización API usada:", res.data.venta);
          }
        }
      } catch (err) {
        console.error("❌ Error leyendo configuración de moneda:", err);
        setCotizacion(null); // ya no usamos 1000 como fallback
      }
    };
    obtenerConfiguracion();
  }, [negocioID]);

  const actualizarCotizacion = async (valor: number) => {
    if (!negocioID) return;
    setDolarManual(valor);
    setUsarDolarManual(true);
    setCotizacion(valor);
    await setDoc(
      doc(db, `negocios/${negocioID}/configuracion/moneda`),
      {
        usarDolarManual: true,
        dolarManual: valor,
      },
      { merge: true }
    );
  };

  return {
    cotizacion: cotizacion ?? 0, // evitamos usar 1000 por default
    dolarManual,
    usarDolarManual,
    actualizarCotizacion,
  };
}