"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function DebugNegocio() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string | null>(null);

  useEffect(() => {
    const fetchNegocio = async () => {
      if (!user) return;
      console.log("🔍 Buscando usuario:", user.email);
  
      const snap = await getDocs(collection(db, "usuarios"));
      snap.forEach((docu) => {
        const data = docu.data();
        console.log("🧾 Documento encontrado:", data);
        if (data.email === user.email) {
          console.log("✅ Match encontrado:", data.negocioID);
          setNegocioID(data.negocioID || "No encontrado");
        }
      });
    };
    fetchNegocio();
  }, [user]);
  

  return (
    <main className="pt-24 px-4 text-black">
      <h1 className="text-2xl font-bold mb-4">🧩 Debug de NegocioID</h1>
      <p className="mb-2">Usuario: {user?.email}</p>
      <p>Negocio ID: {negocioID}</p>
    </main>
  );
}
