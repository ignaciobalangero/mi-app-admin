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
      if (loading || !user || !rol || !rol.negocioID) {
        // Si no hay negocio, usar logo por defecto
        setLogoUrl("/logo.png");
        setCargandoLogo(false);
        return;
      }

      try {
        console.log("🔍 Cargando logo para negocio:", negocioID);
        
        // 🔧 RUTAS CORREGIDAS - Probar diferentes posibles ubicaciones
        const posiblesRutas = [
          `negocios/${negocioID}/configuracion/general`,
          `negocios/${negocioID}/configuracion/datos/general`,
          `negocios/${negocioID}/configuracion/logo`
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
  }, [user, loading, negocioID, rol]);

  return (
    <LogoContext.Provider value={{ logoUrl, cargandoLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);