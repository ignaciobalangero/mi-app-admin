"use client";

import { useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DebugPage() {
  const nombreCliente = "rodrigo godoy (gremio)"; // ← Reemplazá esto por un nombre real
  const negocioID = "wHxaseUYO7H9SKWjCAGc";         // ← Reemplazá esto por tu negocioID real

  useEffect(() => {
    const buscarTrabajos = async () => {
      const q = query(
        collection(db, `negocios/${negocioID}/trabajos`),
        where("cliente", "==", nombreCliente)
      );
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map((doc) => doc.data());
      console.log("🔍 Trabajos encontrados:", datos);
    };

    buscarTrabajos();
  }, []);

  return <div className="p-4">Verificando datos en Firestore...</div>;
}
