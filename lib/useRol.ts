import { useEffect, useState } from "react";
import { auth } from "./auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { app } from "./firebase";

const db = getFirestore(app);

export function useRol() {
  const [user] = useAuthState(auth);
  const [rol, setRol] = useState<"admin" | "empleado" | null>(null);

  useEffect(() => {
    const obtenerRol = async () => {
      if (user) {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setRol(snap.data().rol);
        }
      }
    };
    obtenerRol();
  }, [user]);

  return rol;
}
