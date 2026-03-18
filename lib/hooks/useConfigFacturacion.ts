"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export function useConfigFacturacion(negocioID: string | undefined) {
  const [facturacionElectronicaHabilitada, setFacturacionElectronicaHabilitada] = useState(false);

  useEffect(() => {
    if (!negocioID) {
      setFacturacionElectronicaHabilitada(false);
      return;
    }
    const load = async () => {
      try {
        const configSnap = await getDoc(doc(db, `negocios/${negocioID}/configuracion`, "datos"));
        if (configSnap.exists()) {
          setFacturacionElectronicaHabilitada(!!configSnap.data()?.facturacionElectronicaHabilitada);
        }
      } catch {
        setFacturacionElectronicaHabilitada(false);
      }
    };
    load();
  }, [negocioID]);

  return { facturacionElectronicaHabilitada };
}
