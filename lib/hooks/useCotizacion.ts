import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function useCotizacion(negocioID: string) {
  const [usarDolarManual, setUsarDolarManual] = useState(false);
  const [dolarManual, setDolarManual] = useState<number | null>(null);

  const cotizacion = usarDolarManual && dolarManual ? dolarManual : 1000;

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
        }
      } catch (err) {
        console.error("❌ Error leyendo configuración de moneda:", err);
      }
    };
    obtenerConfiguracion();
  }, [negocioID]);

  const actualizarCotizacion = async (valor: number) => {
    if (!negocioID) return;
    setDolarManual(valor);
    setUsarDolarManual(true);
    await setDoc(
      doc(db, `negocios/${negocioID}/configuracion/moneda`),
      {
        usarDolarManual: true,
        dolarManual: valor,
      },
      { merge: true }
    );
  };

  return { cotizacion, dolarManual, usarDolarManual, actualizarCotizacion };
}
