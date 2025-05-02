"use client";

import { useEffect } from "react";
import { auth } from "@/lib/auth";
import { getIdTokenResult } from "firebase/auth";

export default function VerificarNegocioID() {
  useEffect(() => {
    const obtenerNegocioID = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.warn("⛔ No hay usuario autenticado");
        return;
      }

      const token = await getIdTokenResult(user, true);
      const negocioID = token.claims.negocioID;

      if (negocioID) {
        console.log("✅ negocioID en token:", negocioID);
      } else {
        console.warn("❌ No se encontró negocioID en el token");
      }
    };

    obtenerNegocioID();
  }, []);

  return null;
}
