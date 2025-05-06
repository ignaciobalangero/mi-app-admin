"use client";

import { useEffect, useState } from "react";
import Header from "../../Header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRol } from "@/lib/useRol";

const FormularioStock = dynamic(() => import("./components/FormularioStock"), { ssr: false });
const TablaStockTelefonos = dynamic(() => import("./components/TablaStockTelefonos"), { ssr: false });

export default function StockTelefonosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [telefonos, setTelefonos] = useState<any[]>([]);
  const [telefonoAEditar, setTelefonoAEditar] = useState<any | null>(null);
  const [resumen, setResumen] = useState({ usd: 0, ars: 0 });
  const { rol } = useRol();

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);
  

  useEffect(() => {
    const cargarStock = async () => {
      if (!negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTelefonos(lista);
    };
    cargarStock();
  }, [negocioID]);

  useEffect(() => {
    const calcularResumen = () => {
      let totalUSD = 0;
      let totalARS = 0;
      telefonos.forEach((d) => {
        const valor = Number(d.precioCompra) || 0;
        if (d.moneda === "USD") {
          totalUSD += valor;
        } else {
          // Si no es USD, sumamos a ARS
          totalARS += valor;
        }
      });
      setResumen({ usd: totalUSD, ars: totalARS });
    };
    
    calcularResumen();
  }, [telefonos]);

  return (
    <>
      <Header />
      <main className="pt-20 pb-10 bg-gray-100 min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-4">
          
            <div className="text-right text-sm">
              <p><strong>Total USD:</strong> ${resumen.usd}</p>
              <p><strong>Total ARS:</strong> ${resumen.ars}</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-6 text-center">Stock de Teléfonos</h1>

          {negocioID && (
            <>
              <div className="flex justify-center mb-6">
                <FormularioStock
                  negocioID={negocioID}
                  datosIniciales={telefonoAEditar}
                  onGuardado={(telefonoActualizado) => {
                    setTelefonoAEditar(null);
                    setTelefonos((prev) => {
                      const index = prev.findIndex((t) => t.id === telefonoActualizado.id);
                      if (index !== -1) {
                        const copia = [...prev];
                        copia[index] = telefonoActualizado;
                        return copia;
                      } else {
                        return [telefonoActualizado, ...prev];
                      }
                    });
                  }}
                />
              </div>

              <TablaStockTelefonos
                negocioID={negocioID}
                filtroProveedor
                telefonos={telefonos}
                setTelefonos={setTelefonos}
                onEditar={(telefono) => setTelefonoAEditar(telefono)}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
