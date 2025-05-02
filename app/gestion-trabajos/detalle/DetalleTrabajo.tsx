"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "../../Header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";

export default function DetalleTrabajo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [trabajo, setTrabajo] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const obtenerNegocio = async () => {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      if (snap.exists()) {
        setNegocioID(snap.data().negocioID);
      }
    };
    obtenerNegocio();
  }, [user]);

  useEffect(() => {
    const obtenerTrabajo = async () => {
      if (!id || !negocioID) return;
      const snap = await getDoc(doc(db, `negocios/${negocioID}/trabajos/${id}`));
      if (snap.exists()) {
        setTrabajo(snap.data());
      }
    };
    obtenerTrabajo();
  }, [id, negocioID]);

  if (!trabajo) {
    return (
      <>
        <Header />
        <main className="pt-24 px-4 text-black bg-gray-100 min-h-screen">
          <p className="text-center">Cargando detalle del trabajo...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Detalle del Trabajo</h1>

        <div className="space-y-3">
          <p><strong>Cliente:</strong> {trabajo.cliente}</p>
          <p><strong>Modelo:</strong> {trabajo.modelo}</p>
          <p><strong>Trabajo:</strong> {trabajo.trabajo}</p>
          <p><strong>Clave:</strong> {trabajo.clave}</p>
          <p><strong>IMEI:</strong> {trabajo.imei}</p>
          <p><strong>Precio:</strong> ${trabajo.precio}</p>
          <p><strong>Estado:</strong> {trabajo.estado}</p>
          <p><strong>Observaciones:</strong> {trabajo.observaciones}</p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
          >
            ⬅ Volver
          </button>
        </div>
      </main>
    </>
  );
}
