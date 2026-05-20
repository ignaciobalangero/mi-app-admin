// LogoProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { usePathname } from "next/navigation";
import { useRol } from "@/lib/useRol"; // ✅ Usamos el hook central
import { esConsultaStockPublico } from "@/lib/rutasPublicas";

interface LogoContextProps {
  logoUrl: string | null;
  cargandoLogo: boolean;
}

const LogoContext = createContext<LogoContextProps>({
  logoUrl: null,
  cargandoLogo: true,
});

export function LogoProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const esTiendaPublica = esConsultaStockPublico(pathname);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cargandoLogo, setCargandoLogo] = useState(!esTiendaPublica);
  const [user, loading] = useAuthState(auth);
  const { rol } = useRol();
  const negocioID = rol?.negocioID || "";

  useEffect(() => {
    if (esTiendaPublica) {
      setCargandoLogo(false);
      return;
    }

    const cargarLogo = async () => {
      if (loading || !user || !rol || !rol.negocioID) {
        // Si no hay negocio, usar logo por defecto
        setLogoUrl("/logo.png");
        setCargandoLogo(false);
        return;
      }

      try {
        console.log("🔍 Cargando logo para negocio:", negocioID);
        
        // 🔧 RUTAS CORREGIDAS - En el orden correcto
        const posiblesRutas = [
          `negocios/${negocioID}/configuracion/datos`,      // ✅ PRIMERA - Es la correcta
          `negocios/${negocioID}/configuracion/general`,     // Fallback 1
          `negocios/${negocioID}/configuracion/logo`         // Fallback 2
        ];

        let logoEncontrado = false;

        for (const ruta of posiblesRutas) {
          try {
            console.log(`🔍 Probando ruta: ${ruta}`);
            const ref = doc(db, ruta);
            const snap = await getDoc(ref);
            
            if (snap.exists()) {
              const data = snap.data();
              const logo = data.logoUrl || data.logo || null;
              
              if (logo) {
                console.log("✅ Logo encontrado:", logo);
                setLogoUrl(logo);
                logoEncontrado = true;
                break;
              }
            }
          } catch (error) {
            console.log(`❌ Error en ruta ${ruta}:`, error);
            // Continuar con la siguiente ruta
          }
        }

        if (!logoEncontrado) {
          console.warn("⛔ No se encontró logo en ninguna ubicación, usando por defecto");
          setLogoUrl("/logo.png");
        }

      } catch (error) {
        console.error("❌ Error general al cargar el logo:", error);
        setLogoUrl("/logo.png");
      } finally {
        setCargandoLogo(false);
      }
    };

    cargarLogo();
  }, [user, loading, negocioID, rol, esTiendaPublica]);

  return (
    <LogoContext.Provider value={{ logoUrl, cargandoLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);