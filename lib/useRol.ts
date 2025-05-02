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
      if (user) {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setRol(data.rol);
          setCliente(data.nombre || ""); // 👈 Esto es lo que agregamos
        }
      }
    };
    obtenerRol();
  }, [user]);

  return { rol, cliente };
}
