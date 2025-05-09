"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import Header from "./Header";
import Sidebar from "./components/Sidebar";
import { useRol } from "../lib/useRol";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

function Home() {
  const { rol } = useRol();
  const router = useRouter();
  const [trabajosReparados, setTrabajosReparados] = useState(0);
  const [accesoriosVendidos, setAccesoriosVendidos] = useState(0);
  const [telefonosVendidos, setTelefonosVendidos] = useState(0);
  const [negocioID, setNegocioID] = useState("");

  const [user] = useAuthState(auth);
  const [sidebarAbierto, setSidebarAbierto] = useState(true); // ✅

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);
  

  useEffect(() => {
    if (rol?.tipo === "cliente") {
      router.push("/cliente");
    }
  }, [rol]);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!rol?.tipo || !negocioID || !user) return;
      try {
        if (!negocioID) return;

        const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
        const accesoriosSnap = await getDocs(collection(db, `negocios/${negocioID}/ventaAccesorios`));
        const telefonosSnap = await getDocs(collection(db, `negocios/${negocioID}/ventaTelefonos`));

        let trabajosCount = 0;
        trabajosSnap.forEach((doc) => {
          const d = doc.data();
          if (d.estado === "ENTREGADO") {
            trabajosCount++;
          }
        });

        let accesoriosCount = 0;
        accesoriosSnap.forEach((doc) => {
          const d = doc.data();
          if (d.cantidad) {
            accesoriosCount += Number(d.cantidad);
          }
        });

        let telefonosCount = 0;
        telefonosSnap.forEach((doc) => {
          telefonosCount++;
        });

        setTrabajosReparados(trabajosCount);
        setAccesoriosVendidos(accesoriosCount);
        setTelefonosVendidos(telefonosCount);
      } catch (error) {
        console.warn("⚠️ No se pudo cargar el dashboard:", error?.message || error);
      }
    };

    if ((rol?.tipo === "admin" || rol?.tipo === "empleado") && negocioID && user) {
      cargarDatos();
    }    
  }, [rol, negocioID]);

  // ✅ Cambio solo esta parte:
  if (!rol || !rol.tipo) {
    return <p className="text-center text-black mt-10">Cargando panel...</p>;
  }

  if (rol.tipo !== "admin" && rol.tipo !== "empleado") {
    return null;
  }

  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        <main className="flex-1 pt-24 px-4 bg-gray-100 text-black transition-all duration-300">
          <h1 className="text-3xl font-bold mb-6 text-center">Bienvenido a tu Panel</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-green-100 text-green-800 rounded-xl p-6 text-center shadow">
              <div className="text-4xl mb-2">🛠️</div>
              <h2 className="text-xl font-semibold">Telefonos Reparados</h2>
              <p className="text-2xl font-bold">{trabajosReparados}</p>
            </div>

            <div className="bg-blue-100 text-blue-800 rounded-xl p-6 text-center shadow">
              <div className="text-4xl mb-2">🎧</div>
              <h2 className="text-xl font-semibold">Accesorios Vendidos</h2>
              <p className="text-2xl font-bold">{accesoriosVendidos}</p>
            </div>

            <div className="bg-orange-100 text-orange-800 rounded-xl p-6 text-center shadow">
              <div className="text-4xl mb-2">📱</div>
              <h2 className="text-xl font-semibold">Teléfonos Vendidos</h2>
              <p className="text-2xl font-bold">{telefonosVendidos}</p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default function HomeWrapper() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading]);

  if (loading) {
    return <p className="text-center text-black mt-10">Cargando usuario...</p>;
  }

  if (!user) {
    return <p className="text-center text-red-600 mt-10">No se detectó ningún usuario autenticado.</p>;
  }

  return <Home />;
}
