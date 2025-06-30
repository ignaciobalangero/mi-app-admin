"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";

interface Pago {
  fecha: string;
  monto?: number;
  montoUSD?: number;
  moneda: string;
  forma: string;
  destino: string;
  [key: string]: any;
}

export default function PagosClientes() {
  const params = useParams();
  const router = useRouter();
  const nombreCliente = decodeURIComponent((params?.nombreCliente || "").toString());

  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");
  const { rol } = useRol();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  useEffect(() => {
    const fetchPagos = async () => {
      if (!nombreCliente || !negocioID) {
        console.warn("⛔ nombreCliente o negocioID vacíos");
        return;
      }

      console.log("🔎 Buscando pagos de:", nombreCliente, "en negocio:", negocioID);

      try {
        const pagosQuery = query(
          collection(db, `negocios/${negocioID}/pagos`),
          where("cliente", "==", nombreCliente)
        );

        const pagosSnap = await getDocs(pagosQuery);
        const pagosData = pagosSnap.docs.map((doc) => doc.data() as Pago);

        console.log("💰 Pagos encontrados:", pagosData);

        // 🔍 DEBUG ESPECÍFICO PARA PAGOS
        if (pagosData.length > 0) {
          console.log("🔍 Estructura de pagos:");
          pagosData.forEach((pago, index) => {
            console.log(`💳 Pago ${index + 1}:`, {
              moneda: pago.moneda,
              monto: pago.monto,
              montoUSD: pago.montoUSD,
              estructura: Object.keys(pago),
              datoCompleto: pago
            });
          });
        }

        setPagos(pagosData);
      } catch (error) {
        console.error("❌ Error al cargar pagos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchPagos();
  }, [nombreCliente, negocioID]);

  // Calcular totales de pagos
  const calcularTotalesPagos = () => {
    let totalARS = 0;
    let totalUSD = 0;

    pagos.forEach(p => {
      if (p.moneda === "USD") {
        totalUSD += Number(p.montoUSD || p.monto || 0);
      } else {
        totalARS += Number(p.monto || 0);
      }
    });

    return { totalARS, totalUSD, total: totalARS + totalUSD };
  };

  const { totalARS, totalUSD, total } = calcularTotalesPagos();

  if (cargando) {
    return (
      <>
        <Header />
        <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
          <div className="w-full px-6 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg text-[#7f8c8d]">Cargando pagos...</p>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">
          
          {/* Header de la página */}
          <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-2xl p-8 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">💳</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Pagos de {nombreCliente}
                </h1>
                <p className="text-green-100 text-lg">
                  {pagos.length} {pagos.length === 1 ? 'pago registrado' : 'pagos registrados'}
                </p>
              </div>
            </div>
          </div>

          {/* Controles y navegación */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <button
                onClick={() => router.push(`/clientes/${encodeURIComponent(nombreCliente)}`)}
                className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                ← Volver al Cliente
              </button>

              <button
                onClick={() => router.push("/clientes")}
                className="bg-[#34495e] hover:bg-[#2c3e50] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                👥 Ver Todos los Clientes
              </button>
            </div>
          </div>

          {/* Resumen de pagos */}
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#27ae60] rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">💰</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#2c3e50]">Resumen de Pagos</h2>
                <p className="text-[#7f8c8d] mt-1">Total de pagos recibidos del cliente</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {totalARS > 0 && (
                <div className="bg-gradient-to-r from-[#27ae60]/10 to-[#2ecc71]/10 border-2 border-[#27ae60] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">💵</span>
                    </div>
                    <span className="text-sm font-medium text-[#2c3e50]">Total ARS</span>
                  </div>
                  <p className="text-2xl font-bold text-[#27ae60]">
                    ${totalARS.toLocaleString("es-AR")}
                  </p>
                </div>
              )}

              {totalUSD > 0 && (
                <div className="bg-gradient-to-r from-[#3498db]/10 to-[#2980b9]/10 border-2 border-[#3498db] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">💵</span>
                    </div>
                    <span className="text-sm font-medium text-[#2c3e50]">Total USD</span>
                  </div>
                  <p className="text-2xl font-bold text-[#3498db]">
                    US${totalUSD.toLocaleString("en-US")}
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-r from-[#9b59b6]/10 to-[#8e44ad]/10 border-2 border-[#9b59b6] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📊</span>
                  </div>
                  <span className="text-sm font-medium text-[#2c3e50]">Total Pagos</span>
                </div>
                <div className="space-y-1">
                  {totalARS > 0 && (
                    <p className="text-lg font-bold text-[#9b59b6]">
                      ${totalARS.toLocaleString("es-AR")} ARS
                    </p>
                  )}
                  {totalUSD > 0 && (
                    <p className="text-lg font-bold text-[#9b59b6]">
                      US${totalUSD.toLocaleString("en-US")}
                    </p>
                  )}
                  {totalARS === 0 && totalUSD === 0 && (
                    <p className="text-lg font-bold text-[#95a5a6]">$0</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TABLA DE PAGOS CORREGIDA */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1] mb-8">
            
            {/* Header de pagos */}
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💳</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Historial de Pagos</h3>
                  <p className="text-green-100 mt-1">
                    Detalle completo de todos los pagos registrados
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse border-2 border-black">
                <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📅</span>
                        Fecha
                      </div>
                    </th>
                    <th className="p-3 text-right text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-base">💵</span>
                        Monto
                      </div>
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💱</span>
                        Moneda
                      </div>
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💳</span>
                        Forma
                      </div>
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎯</span>
                        Destino
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.length > 0 ? (
                    pagos.map((pago, i) => {
                      const isEven = i % 2 === 0;
                      return (
                        <tr key={i} className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                              {pago.fecha}
                            </span>
                          </td>
                          <td className="p-3 border border-black text-right">
                            <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg">
                              {(() => {
                                // 🎯 LÓGICA CORREGIDA PARA MOSTRAR PAGOS USD
                                if (pago.moneda === "USD") {
                                  // Para USD: usar montoUSD primero, fallback a monto
                                  const valor = pago.montoUSD || pago.monto || 0;
                                  return `US$${Number(valor).toLocaleString("es-AR")}`;
                                } else {
                                  // Para ARS: usar monto directamente
                                  const valor = pago.monto || 0;
                                  return `$${Number(valor).toLocaleString("es-AR")}`;
                                }
                              })()}
                            </span>
                            
                            {/* 🔍 DEBUG TEMPORAL - QUITAR DESPUÉS DE VERIFICAR */}
                            <div className="text-xs text-gray-500 mt-1 font-mono">
                              {pago.moneda}: ${pago.monto} | USD: ${pago.montoUSD}
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50] bg-[#3498db]/10 px-2 py-1 rounded font-mono">
                              {pago.moneda || "ARS"}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{pago.forma}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#7f8c8d]">{pago.destino}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center border border-black">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
                            <span className="text-3xl">💳</span>
                          </div>
                          <p className="text-lg font-medium text-[#7f8c8d]">No hay pagos registrados para este cliente</p>
                          <p className="text-sm text-[#95a5a6]">Los pagos aparecerán aquí cuando se registren</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}