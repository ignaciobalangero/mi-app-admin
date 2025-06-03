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
  const [stock, setStock] = useState<any[]>([]);
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
    const cargarStock = async () => {
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
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">
          
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-10 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">📱</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Venta de Teléfonos
                </h1>
                <p className="text-blue-100 text-sm">
                  Gestiona las ventas de equipos móviles de tu negocio
                </p>
              </div>
            </div>
          </div>

          {negocioID && (
            <div className="space-y-8">
              
              {/* Sección del formulario - Estilo GestiOne */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-[#27ae60] rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm">➕</span>
                  </div>
                  <h2 className="text-1xl font-bold text-[#2c3e50]">
                    Nueva Venta
                  </h2>
                </div>
                
                <FormularioDatosVenta
                  negocioID={negocioID}
                  stock={stock}
                  setStock={setStock}
                  onGuardado={(nuevaVenta) => setVentas((prev) => [nuevaVenta, ...prev])}
                />
              </div>

              {/* Sección de la tabla - Estilo GestiOne */}
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1">
                  </div>
                  {ventas.length > 0 && (
                    <div className="bg-[#ecf0f1] px-4 py-2 rounded-lg">
                      <span className="text-[#2c3e50] font-semibold">
                        Total: {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
                      </span>
                    </div>
                  )}
                </div>
                
                <TablaVentas
                  negocioID={negocioID}
                  ventas={ventas}
                  setVentas={setVentas}
                  onEditar={() => {}}
                />
              </div>
            </div>
          )}

          {/* Estado de carga - Estilo GestiOne */}
          {!negocioID && (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-[#ecf0f1] text-center">
              <div className="w-16 h-16 bg-[#ecf0f1] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="text-xl font-semibold text-[#2c3e50] mb-2">
                Cargando información del negocio...
              </h3>
              <p className="text-[#7f8c8d]">
                Por favor espera mientras verificamos los permisos
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}