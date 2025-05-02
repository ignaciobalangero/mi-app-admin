"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";

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
  const [user] = useAuthState(auth);

  useEffect(() => {
    const cargarLogo = async () => {
      console.log("🌀 Buscando logo...");

      try {
        if (!user) {
          console.log("⛔ No hay usuario");
          return;
        }

        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (!docSnap.exists()) {
          console.log("⛔ Usuario no encontrado");
          return;
        }

        const { negocioID } = docSnap.data();
        if (!negocioID) {
          console.log("⛔ Sin negocioID");
          return;
        }

        const configSnap = await getDoc(doc(db, "configuracion", negocioID));
        if (!configSnap.exists()) {
          console.log("⛔ Configuración no encontrada");
          return;
        }

        const data = configSnap.data();
        console.log("✅ Datos config:", data);

        const logo = data.logoUrl || data.logo;

        if (logo) {
          console.log("🎯 Logo encontrado:", logo);
          setLogoUrl(logo);
          localStorage.setItem("logoUrl", logo);
        }
      } catch (error) {
        console.error("❌ Error al cargar el logo:", error);
      } finally {
        setCargandoLogo(false);
      }
    };

    cargarLogo();
  }, [user]);

  return (
    <LogoContext.Provider value={{ logoUrl, cargandoLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);
