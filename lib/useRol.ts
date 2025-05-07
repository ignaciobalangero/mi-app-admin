// lib/useRol.ts
import { useEffect, useState } from "react";
import { auth } from "./auth";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

interface RolInfo {
  tipo: string;
  negocioID: string;
}

export function useRol() {
  const [user, loading] = useAuthState(auth);
  const [rol, setRol] = useState<RolInfo | null>(null);

  useEffect(() => {
    const obtenerRol = async () => {
      if (loading || !user) return;
      console.log("🔍 Buscando usuario con UID:", user.uid);

      try {
        // ✅ Leer primero desde la colección global "usuarios" para obtener el negocioID
        const globalRef = doc(db, `usuarios/${user.uid}`);
        const globalSnap = await getDoc(globalRef);

        if (!globalSnap.exists()) {
          console.warn("⛔ No se encontró el usuario en /usuarios/");
          return;
        }

        const { negocioID } = globalSnap.data();

        if (!negocioID) {
          console.warn("⛔ El documento global no tiene negocioID");
          return;
        }

        // ✅ Luego buscamos el documento dentro del negocio para saber el rol
        const negocioRef = doc(db, `negocios/${negocioID}/usuarios/${user.uid}`);
        const snap = await getDoc(negocioRef);

        if (!snap.exists()) {
          console.warn("⛔ No se encontró el usuario dentro del negocio");
          return;
        }

        const data = snap.data();

        setRol({
          tipo: data.rol || "sin rol",
          negocioID,
        });

        console.log("✅ Rol obtenido:", data.rol, "| Negocio:", negocioID);
      } catch (error) {
        console.error("❌ Error al obtener rol:", error);
      }
    };

    obtenerRol();
  }, [user, loading]);

  return { rol };
}
