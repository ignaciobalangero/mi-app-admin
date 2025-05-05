import { useEffect, useState } from "react";
import { auth } from "./auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { app } from "./firebase";

const db = getFirestore(app);

export function useRol() {
  const [user] = useAuthState(auth);
  const [rol, setRol] = useState<"admin" | "empleado" | "cliente" | null>(null);
  const [cliente, setCliente] = useState<string>("");

  useEffect(() => {
    const obtenerRol = async () => {
      if (!user) {
        console.log("❌ No hay usuario autenticado");
        setRol(null);
        setCliente("");
        return;
      }

      console.log("🔑 UID del usuario:", user.uid);

      try {
        const ref = doc(db, "usuarios", user.uid);
        console.log("📄 Intentando obtener documento:", ref.path);

        const snap = await getDoc(ref);

        if (!snap.exists()) {
          console.log("❌ Documento de usuario no encontrado");
          setRol(null);
          setCliente("");
          return;
        }

        const data = snap.data();
        console.log("✅ Datos del usuario:", data);

        setRol(data.rol);
        setCliente(data.nombre || "");

      } catch (error) {
        console.error("❌ Error al obtener rol:", error);
        setRol(null);
        setCliente("");
      }
    };

    obtenerRol();
  }, [user]);

  return { rol, cliente };
}
