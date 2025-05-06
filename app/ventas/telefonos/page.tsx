"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRol } from "@/lib/useRol";

const FormularioDatosVenta = dynamic(() => import("./components/FormularioDatosVenta"), { ssr: false });
const TablaVentas = dynamic(() => import("./components/TablaVentas"), { ssr: false });

export default function VentaTelefonosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [ventas, setVentas] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]); // ✅ Paso 1
  const { rol } = useRol();

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);
  

  useEffect(() => {
    const cargarVentas = async () => {
      if (!negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${negocioID}/ventaTelefonos`));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVentas(lista);
    };
    cargarVentas();
  }, [negocioID]);

  useEffect(() => {
    const cargarStock = async () => {  // ✅ Paso 2
      if (!negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setStock(lista);
    };
    cargarStock();
  }, [negocioID]);

  return (
    <>
      <Header />
      <main className="pt-20 bg-gray-100 min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">


          <h1 className="text-3xl font-bold mb-6 text-center">Venta de Teléfonos</h1>

          {negocioID && (
            <>
              <FormularioDatosVenta
                negocioID={negocioID}
                stock={stock}          // ✅ Paso 3
                setStock={setStock}    // ✅ Paso 3
                onGuardado={(nuevaVenta) => setVentas((prev) => [nuevaVenta, ...prev])}
              />
              <TablaVentas
                negocioID={negocioID}
                ventas={ventas}
                setVentas={setVentas}
                onEditar={() => {}}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
