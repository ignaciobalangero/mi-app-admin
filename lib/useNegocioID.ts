import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./auth";
import { useRol } from "@/lib/useRol";

export function useNegocioID() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const { rol } = useRol();

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);
  

  return negocioID;
}
