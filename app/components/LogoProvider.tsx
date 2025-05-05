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
  const [user, loading] = useAuthState(auth); // ✅ Agregado `loading`

  useEffect(() => {
    const cargarLogo = async () => {
      console.log("🌀 Buscando logo...");

      if (loading) return; // ✅ Esperamos a que se cargue Firebase Auth

      if (!user) {
        console.log("⛔ No hay usuario, usando logo por defecto");
        setLogoUrl("/logo.png");
        setCargandoLogo(false);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (!docSnap.exists()) {
          console.log("⛔ Usuario no encontrado");
          setLogoUrl("/logo.png");
          return;
        }

        const { negocioID } = docSnap.data();
        if (!negocioID) {
          console.log("⛔ Sin negocioID");
          setLogoUrl("/logo.png");
          return;
        }

        const configSnap = await getDoc(doc(db, "configuracion", negocioID));
        if (!configSnap.exists()) {
          console.log("⛔ Configuración no encontrada");
          setLogoUrl("/logo.png");
          return;
        }

        const data = configSnap.data();
        console.log("✅ Datos config:", data);

        const logo = data.logoUrl || data.logo;

        if (logo) {
          console.log("🎯 Logo encontrado:", logo);
          setLogoUrl(logo);
          localStorage.setItem("logoUrl", logo);
        } else {
          setLogoUrl("/logo.png"); // fallback
        }
      } catch (error) {
        console.error("❌ Error al cargar el logo:", error);
        setLogoUrl("/logo.png");
      } finally {
        setCargandoLogo(false);
      }
    };

    cargarLogo();
  }, [user, loading]);

  return (
    <LogoContext.Provider value={{ logoUrl, cargandoLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);
