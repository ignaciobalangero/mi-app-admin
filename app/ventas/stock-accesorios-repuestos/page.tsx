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
import BotonEscanerStock from "@/components/BotonEscanerStock";

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
    let consignacionARS = 0;
    let consignacionUSD = 0;
    lista.forEach((item) => {
      const costo = Number(item.precioCosto ?? item.precio ?? 0);
      const cantidad = Number(item.cantidad || 0);
      const total = costo * cantidad;
      const esConsignacion = item.consignacion === true;
      if (item.moneda === "USD") {
        if (esConsignacion) consignacionUSD += total;
        else totalUSD += total;
      } else if (esConsignacion) consignacionARS += total;
      else totalARS += total;
    });
    return { totalARS, totalUSD, consignacionARS, consignacionUSD };
  };

  const resumenAccesorios = calcularCapital(accesorios);
  const resumenRepuestos = calcularCapital(repuestos);
  const totalARS = resumenAccesorios.totalARS + resumenRepuestos.totalARS;
  const totalUSD = resumenAccesorios.totalUSD + resumenRepuestos.totalUSD;
  const consignacionARS = resumenAccesorios.consignacionARS + resumenRepuestos.consignacionARS;
  const consignacionUSD = resumenAccesorios.consignacionUSD + resumenRepuestos.consignacionUSD;

  return (
    <>
      <Header />
      <main className="pt-16 bg-[#f8f9fa] min-h-screen text-black w-full"> {/* pt-24 → pt-16, bg-gray-100 → bg-[#f8f9fa] */}
        <div className="w-full px-1 max-w-[1200px] mx-auto"> {/* Contenedor centrado y padding reducido */}
          
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 mb-6 shadow-lg border border-[#ecf0f1]"> {/* p-8 → p-6, mb-8 → mb-6 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4"> {/* gap-6 → gap-4 */}
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"> {/* w-16 h-16 → w-12 h-12 */}
                  <span className="text-3xl">📦</span> {/* text-4xl → text-3xl */}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1"> {/* text-4xl → text-2xl, mb-2 → mb-1 */}
                    Stock de Accesorios y Repuestos
                  </h2>
                  <p className="text-blue-100 text-sm"> {/* text-lg → text-sm */}
                    Gestión completa de inventario de accesorios y repuestos
                  </p>
                </div>
              </div>
              <BotonEscanerStock
                label="Leer código / QR"
                variante="inicio"
                className="self-start sm:self-center"
              />
            </div>
          </div>

          {/* Tarjetas de resumen financiero */}
          {(consignacionARS > 0 || consignacionUSD > 0) && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-950">Capital de consignación</p>
              <p className="text-sm text-amber-900 mt-1">
                {consignacionARS > 0 ? `$${consignacionARS.toLocaleString("es-AR")} ARS` : ""}
                {consignacionARS > 0 && consignacionUSD > 0 ? " · " : ""}
                {consignacionUSD > 0 ? `USD ${consignacionUSD.toLocaleString("en-US")}` : ""}
              </p>
              <p className="text-xs text-amber-800 mt-1">No entra en el capital propio.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Pesos */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1] transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#7f8c8d]">Capital ARS</p> {/* Colores GestiOne */}
                  <p className="text-lg font-bold text-[#27ae60]"> {/* text-xl → text-lg */}
                    ${totalARS.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#27ae60]/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">🇦🇷</span>
                </div>
              </div>
            </div>

            {/* Total Dólares */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1] transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#7f8c8d]">Capital USD</p>
                  <p className="text-lg font-bold text-[#3498db]">
                    USD {totalUSD.toLocaleString("en-US")}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#3498db]/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">🇺🇸</span>
                </div>
              </div>
            </div>

            {/* Total Accesorios */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1] transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#7f8c8d]">Accesorios</p>
                  <p className="text-lg font-bold text-[#9b59b6]">
                    {accesorios.length} items
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#9b59b6]/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">🎧</span>
                </div>
              </div>
            </div>

            {/* Total Repuestos */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1] transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#7f8c8d]">Repuestos</p>
                  <p className="text-lg font-bold text-[#e67e22]">
                    {repuestos.length} items
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#e67e22]/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">🔧</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas de navegación */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"> {/* gap-6 → gap-4 */}
            <Link
              href="/ventas/stock-accesorios-repuestos/accesorios"
              className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1] hover:bg-gradient-to-br hover:from-[#f8f9fa] hover:to-[#ecf0f1] transition-all duration-300 transform hover:scale-105 group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl">🎧</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2c3e50]">Stock Accesorios</h2> {/* text-xl → text-lg */}
                  <p className="text-xs text-[#7f8c8d]">Gestión de accesorios</p> {/* text-sm → text-xs */}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7f8c8d]">Total items:</span>
                  <span className="text-sm font-semibold text-[#9b59b6]">{accesorios.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7f8c8d]">Valor ARS:</span>
                  <span className="text-sm font-semibold text-[#27ae60]">${resumenAccesorios.totalARS.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7f8c8d]">Valor USD:</span>
                  <span className="text-sm font-semibold text-[#3498db]">USD {resumenAccesorios.totalUSD.toLocaleString("en-US")}</span>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-end text-[#3498db] group-hover:text-[#2980b9]">
                <span className="text-xs font-medium">Ir a gestión</span>
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>

            <Link
              href="/ventas/stock-accesorios-repuestos/repuestos"
              className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1] hover:bg-gradient-to-br hover:from-[#f8f9fa] hover:to-[#ecf0f1] transition-all duration-300 transform hover:scale-105 group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#e67e22] to-[#d35400] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl">🔧</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2c3e50]">Stock Repuestos</h2> {/* text-xl → text-lg */}
                  <p className="text-xs text-[#7f8c8d]">Gestión de repuestos</p> {/* text-sm → text-xs */}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7f8c8d]">Total items:</span>
                  <span className="text-sm font-semibold text-[#e67e22]">{repuestos.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7f8c8d]">Valor ARS:</span>
                  <span className="text-sm font-semibold text-[#27ae60]">${resumenRepuestos.totalARS.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7f8c8d]">Valor USD:</span>
                  <span className="text-sm font-semibold text-[#3498db]">USD {resumenRepuestos.totalUSD.toLocaleString("en-US")}</span>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-end text-[#3498db] group-hover:text-[#2980b9]">
                <span className="text-xs font-medium">Ir a gestión</span>
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>

            <Link
              href="/ventas/stock-accesorios-repuestos/precargas"
              className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1] hover:bg-gradient-to-br hover:from-[#f8f9fa] hover:to-[#ecf0f1] transition-all duration-300 transform hover:scale-105 group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#16a085] to-[#1abc9c] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl">📥</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2c3e50]">Pre cargas</h2>
                  <p className="text-xs text-[#7f8c8d]">Pedido que todavía no llegó</p>
                </div>
              </div>
              <p className="text-sm text-[#7f8c8d]">
                Cargá el pedido antes. Cuando llega, lo pasás al stock y recién ahí suma al inventario.
              </p>
              <div className="mt-4 flex items-center justify-end text-[#16a085]">
                <span className="text-xs font-medium">Ir a pre cargas</span>
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          </div>

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7] mt-6"> {/* Agregar mt-6 */}
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Tip:</strong> Gestiona tu inventario de accesorios y repuestos desde estas secciones. El capital se calcula automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}