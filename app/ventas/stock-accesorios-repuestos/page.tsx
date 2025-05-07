"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";

export default function StockAccesoriosRepuestos() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [accesorios, setAccesorios] = useState<any[]>([]);
  const [repuestos, setRepuestos] = useState<any[]>([]);

  // ✅ Obtener negocio sin leer toda la colección de usuarios
  useEffect(() => {
    const obtenerNegocio = async () => {
      if (user) {
        const ref = doc(db, `usuarios/${user.uid}`);
        const docu = await getDoc(ref);
        const data = docu.data();
        if (data?.negocioID) {
          setNegocioID(data.negocioID);
        }
      }
    };
    obtenerNegocio();
  }, [user]);

  // ✅ Cargar datos solo cuando hay negocioID
  useEffect(() => {
    if (!negocioID) return;
    const obtenerDatos = async () => {
      const accSnap = await getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`));
      const repSnap = await getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`));
      setAccesorios(accSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setRepuestos(repSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    obtenerDatos();
  }, [negocioID]);

  const calcularCapital = (lista: any[]) => {
    let totalARS = 0;
    let totalUSD = 0;
    lista.forEach((item) => {
      if (item.moneda === "USD") totalUSD += item.precio * item.cantidad;
      else totalARS += item.precio * item.cantidad;
    });
    return { totalARS, totalUSD };
  };

  const resumenAccesorios = calcularCapital(accesorios);
  const resumenRepuestos = calcularCapital(repuestos);
  const totalARS = resumenAccesorios.totalARS + resumenRepuestos.totalARS;
  const totalUSD = resumenAccesorios.totalUSD + resumenRepuestos.totalUSD;

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-3xl font-bold mb-6 text-center">Stock de Accesorios y Repuestos</h1>

        <div className="flex justify-end gap-6 text-right mb-8 mr-4">
          <div>
            <p className="text-sm text-gray-500">Capital en pesos:</p>
            <p className="text-xl font-semibold text-green-700">
              ${totalARS.toLocaleString("es-AR")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Capital en USD:</p>
            <p className="text-xl font-semibold text-blue-700">
              USD {totalUSD.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/ventas/stock-accesorios-repuestos/accesorios"
            className="bg-white rounded-xl p-4 shadow hover:bg-gray-100 transition"
          >
            <h2 className="text-xl font-semibold mb-4">Stock Accesorios</h2>
            <p className="text-sm text-gray-500">Ir a gestión de accesorios</p>
          </Link>

          <Link
            href="/ventas/stock-accesorios-repuestos/repuestos"
            className="bg-white rounded-xl p-4 shadow hover:bg-gray-100 transition"
          >
            <h2 className="text-xl font-semibold mb-4">Stock Repuestos</h2>
            <p className="text-sm text-gray-500">Ir a gestión de repuestos</p>
          </Link>
        </div>
      </main>
    </>
  );
}

