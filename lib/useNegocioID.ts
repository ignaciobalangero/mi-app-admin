import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./auth";

export function useNegocioID() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");

  useEffect(() => {
    const obtenerNegocioID = async () => {
      if (!user) return;
      const snap = await getDocs(query(collection(db, "usuarios"), where("email", "==", user.email)));
      snap.forEach((docu) => {
        const data = docu.data();
        if (data.negocioID) setNegocioID(data.negocioID);
      });
    };
    obtenerNegocioID();
  }, [user]);

  return negocioID;
}
