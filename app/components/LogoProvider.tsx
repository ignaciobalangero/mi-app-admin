"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { usePathname } from "next/navigation";
import { useRol } from "@/lib/useRol";
import { esConsultaStockPublico } from "@/lib/rutasPublicas";
import {
  extraerLogoUrl,
  negocioIdDesdeRutaConsultaStock,
  rutasConfigLogo,
} from "@/lib/logoNegocio";

interface LogoContextProps {
  logoUrl: string | null;
  cargandoLogo: boolean;
}

const LogoContext = createContext<LogoContextProps>({
  logoUrl: null,
  cargandoLogo: true,
});

async function cargarLogoFirestore(negocioId: string): Promise<string | null> {
  for (const ruta of rutasConfigLogo(negocioId)) {
    try {
      const snap = await getDoc(doc(db, ruta));
      if (snap.exists()) {
        const logo = extraerLogoUrl(snap.data());
        if (logo) return logo;
      }
    } catch {
      // siguiente ruta
    }
  }
  try {
    const negSnap = await getDoc(doc(db, `negocios/${negocioId}`));
    if (negSnap.exists()) {
      const logo = extraerLogoUrl(negSnap.data());
      if (logo) return logo;
    }
  } catch {
    // sin logo en doc negocio
  }
  return null;
}

export function LogoProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const esTiendaPublica = esConsultaStockPublico(pathname);
  const negocioIdTienda = esTiendaPublica ? negocioIdDesdeRutaConsultaStock(pathname) : null;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cargandoLogo, setCargandoLogo] = useState(true);
  const [user, loading] = useAuthState(auth);
  const { rol } = useRol();
  const negocioID = rol?.negocioID || "";

  useEffect(() => {
    let cancel = false;

    const finalizar = (logo: string | null) => {
      if (cancel) return;
      setLogoUrl(logo);
      setCargandoLogo(false);
    };

    async function cargarTiendaPublica(id: string) {
      setCargandoLogo(true);
      const logo = await cargarLogoFirestore(id);
      finalizar(logo);
    }

    async function cargarAdmin() {
      if (loading) return;

      if (!user || !rol?.negocioID) {
        finalizar("/logo.png");
        return;
      }

      setCargandoLogo(true);
      const logo = await cargarLogoFirestore(negocioID);
      finalizar(logo ?? "/logo.png");
    }

    if (esTiendaPublica && negocioIdTienda) {
      void cargarTiendaPublica(negocioIdTienda);
    } else if (esTiendaPublica) {
      finalizar(null);
    } else {
      void cargarAdmin();
    }

    return () => {
      cancel = true;
    };
  }, [user, loading, negocioID, rol, esTiendaPublica, negocioIdTienda]);

  return (
    <LogoContext.Provider value={{ logoUrl, cargandoLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);
