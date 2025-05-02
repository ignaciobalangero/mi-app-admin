// Archivo: app/pagos/page.tsx

"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import FormularioPago from "./componentes/FormularioPago";
import TablaPagos from "./componentes/TablaPagos";

export interface PagoConOrigen {
  id: string;
  fecha: any;
  cliente: string;
  monto?: number;
  montoUSD?: number;
  moneda: string;
  forma: string;
  destino?: string;
  cotizacion?: number;
  origen: "pagos" | "pagoClientes";
}

export default function PagosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [pagos, setPagos] = useState<PagoConOrigen[]>([]);

  useEffect(() => {
    if (user) {
      const fetchNegocioID = async () => {
        const snap = await getDocs(collection(db, "usuarios"));
        snap.forEach((docu) => {
          const data = docu.data();
          if (data.email === user.email && data.negocioID) {
            setNegocioID(data.negocioID);
          }
        });
      };
      fetchNegocioID();
    }
  }, [user]);

  return (
    <>
      <Header />
      <main className="pt-28 p-4 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-4 text-black">Pagos de clientes</h1>
        <FormularioPago negocioID={negocioID} setPagos={setPagos} />
        <TablaPagos negocioID={negocioID} pagos={pagos} setPagos={setPagos} />
      </main>
    </>
  );
}
