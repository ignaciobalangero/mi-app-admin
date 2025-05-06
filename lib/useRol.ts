// archivo: lib/useRol.ts
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


      // 💡 Obtenemos primero el negocioID desde el usuario actual
      const negocioRef = doc(db, `usuarios/${user.uid}`);
      const negocioSnap = await getDoc(negocioRef);

      if (negocioSnap.exists()) {
        const negocioID = negocioSnap.data().negocioID;
        const userRef = doc(db, `negocios/${negocioID}/usuarios/${user.uid}`);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setRol({
            tipo: data.rol || "sin rol",
            negocioID,
          });
          console.log("✅ Rol obtenido:", data.rol, "| Negocio:", negocioID);
        } else {
          console.warn("⛔ Usuario no encontrado en su negocio.");
        }
      } else {
        console.warn("⛔ No se encontró el negocio del usuario.");
      }
    };

    obtenerRol();
  }, [user, loading]);

  return { rol };
}
