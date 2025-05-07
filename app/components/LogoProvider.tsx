// LogoProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRol } from "@/lib/useRol"; // ✅ Usamos el hook central

interface LogoContextProps {
  logoUrl: string | null;
  cargandoLogo: boolean;
}

const LogoContext = createContext<LogoContextProps>({
  logoUrl: null,
  cargandoLogo: true,
});

export function LogoProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cargandoLogo, setCargandoLogo] = useState(true);
  const [user, loading] = useAuthState(auth);
  const { rol } = useRol();
  const negocioID = rol?.negocioID || "";

  useEffect(() => {
    const cargarLogo = async () => {
      if (loading || !user || !rol || !rol.negocioID) return;


      try {
        const ref = doc(db, `negocios/${negocioID}/configuracion/datos`);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          console.warn("⛔ No se encontró la configuración del negocio");
          setLogoUrl("/logo.png");
        } else {
          const data = snap.data();
          const logo = data.logoUrl || data.logo || "/logo.png";
          setLogoUrl(logo);
          localStorage.setItem("logoUrl", logo);
        }
      } catch (error) {
        console.error("❌ Error al cargar el logo:", error);
        setLogoUrl("/logo.png");
      } finally {
        setCargandoLogo(false);
      }
    };

    cargarLogo();
  }, [user, loading, negocioID]);

  return (
    <LogoContext.Provider value={{ logoUrl, cargandoLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);
