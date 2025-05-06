"use client";

import { useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function TestPermisos() {
  const [user] = useAuthState(auth);

  useEffect(() => {
    const probarPermisos = async () => {
      if (!user) {
        console.warn("⛔ No hay usuario autenticado");
        return;
      }

      const negocioID = "iphonetec"; // modificá según necesites

      try {
        // 1. Usuario dentro de /negocios/{negocioID}/usuarios/{uid}
        const usuarioRef = doc(db, `negocios/${negocioID}/usuarios/${user.uid}`);
        const usuarioSnap = await getDoc(usuarioRef);
        console.log("🧾 Usuario:", usuarioSnap.exists() ? usuarioSnap.data() : "No existe");

        // 2. Configuración del negocio
        const configRef = doc(db, `configuracion/${negocioID}`);
        const configSnap = await getDoc(configRef);
        console.log("⚙️ Configuración:", configSnap.exists() ? configSnap.data() : "No existe");

        // 3. Otro ejemplo: acceso a colección interna
        const ejemploRef = doc(db, `negocios/${negocioID}/ventaTelefonos/ejemplo`);
        const ejemploSnap = await getDoc(ejemploRef);
        console.log("📦 Ejemplo colección interna:", ejemploSnap.exists() ? ejemploSnap.data() : "No existe");

      } catch (error: any) {
        console.error("❌ Error de permisos o acceso:", error.message || error);
      }
    };

    probarPermisos();
  }, [user]);

  return <div className="p-6 text-white">Revisando permisos en consola...</div>;
}
