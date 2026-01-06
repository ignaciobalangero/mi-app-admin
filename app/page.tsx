"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import Header from "./Header";
import { useRol } from "../lib/useRol";
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

function Home() {
  const { rol } = useRol();
  const router = useRouter();

  const [trabajosReparados, setTrabajosReparados] = useState(0);
  const [accesoriosVendidos, setAccesoriosVendidos] = useState(0);
  const [telefonosVendidos, setTelefonosVendidos] = useState(0);
  const [totalCajaHoy, setTotalCajaHoy] = useState(0);
  const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const [user] = useAuthState(auth);

  // ==========================================
  // CARGAR ESTADÍSTICAS DEL MES ACTUAL
  // ==========================================
  useEffect(() => {
    const cargarEstadisticasDelMes = async () => {
      if (!rol?.negocioID) return;

      const hoy = new Date();
      const mesActual = String(hoy.getMonth() + 1).padStart(2, "0");
      const anioActual = hoy.getFullYear().toString();
      const mesAnioActual = `${mesActual}-${anioActual}`;
      const diaActual = hoy.toLocaleDateString("es-AR");

      const estadisticasRef = doc(db, `negocios/${rol.negocioID}/estadisticas/${mesAnioActual}`);
      const estadisticasSnap = await getDoc(estadisticasRef);

      if (estadisticasSnap.exists()) {
        const data = estadisticasSnap.data();
        setTrabajosReparados(data.trabajosReparados || 0);
        setAccesoriosVendidos(data.accesoriosVendidos || 0);
        setTelefonosVendidos(data.telefonosVendidos || 0);
        setTotalCajaHoy(data.cajaDelDia?.[diaActual] || 0);
      } else {
        // Si no existe, inicializar con 0
        setTrabajosReparados(0);
        setAccesoriosVendidos(0);
        setTelefonosVendidos(0);
        setTotalCajaHoy(0);
      }
    };

    cargarEstadisticasDelMes();
  }, [rol]);

  // ==========================================
  // CARGAR GRÁFICO DE ÚLTIMOS 6 MESES
  // ==========================================
  useEffect(() => {
    const cargarGraficoHistorico = async () => {
      if (!rol?.negocioID) return;

      setCargando(true);

      const hoy = new Date();
      const meses: any[] = [];

      // Generar últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mesKey = `${String(fecha.getMonth() + 1).padStart(2, "0")}-${fecha.getFullYear()}`;
        meses.push({
          mes: mesKey,
          trabajos: 0,
          accesorios: 0,
          telefonos: 0,
        });
      }

      // Cargar estadísticas de cada mes
      for (const mesData of meses) {
        const estadisticasRef = doc(db, `negocios/${rol.negocioID}/estadisticas/${mesData.mes}`);
        const estadisticasSnap = await getDoc(estadisticasRef);

        if (estadisticasSnap.exists()) {
          const data = estadisticasSnap.data();
          mesData.trabajos = data.trabajosReparados || 0;
          mesData.accesorios = data.accesoriosVendidos || 0;
          mesData.telefonos = data.telefonosVendidos || 0;
        }
      }

      setDatosGrafico(meses);
      setCargando(false);
    };

    cargarGraficoHistorico();
  }, [rol]);

  if (!rol || !rol.tipo) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] text-center">
          <div className="w-12 h-12 bg-[#ecf0f1] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-[#2c3e50] font-semibold">Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (rol.tipo !== "admin" && rol.tipo !== "empleado") {
    return null;
  }

  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        <main className="flex-1 pt-20 bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] text-black">
          <div className="w-full px-4 sm:px-6 max-w-[1400px] mx-auto space-y-6 py-6">
            
            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#2c3e50] via-[#34495e] to-[#3498db] rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#ecf0f1] transform hover:scale-[1.01] transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-4xl">🏠</span>
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Panel de Control
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base">
                    Resumen en tiempo real de tu negocio • {new Date().toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>
            </div>

            {/* TARJETAS DE ESTADÍSTICAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Trabajos Reparados */}
              <div className="bg-gradient-to-br from-[#d5f4e6] to-[#c3f0ca] rounded-2xl p-6 border-2 border-[#27ae60] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#229954] uppercase tracking-wide mb-1">
                      Trabajos Reparados
                    </p>
                    <p className="text-4xl font-black text-[#27ae60] mb-2">{trabajosReparados}</p>
                    <div className="flex items-center gap-2 text-xs text-[#27ae60]">
                      <span className="inline-block w-2 h-2 bg-[#27ae60] rounded-full animate-pulse"></span>
                      Este mes
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-[#27ae60]/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🛠️</span>
                  </div>
                </div>
              </div>

              {/* Accesorios Vendidos */}
              <div className="bg-gradient-to-br from-[#ebf3fd] to-[#d6eaff] rounded-2xl p-6 border-2 border-[#3498db] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#2980b9] uppercase tracking-wide mb-1">
                      Accesorios/Repuestos
                    </p>
                    <p className="text-4xl font-black text-[#3498db] mb-2">{accesoriosVendidos}</p>
                    <div className="flex items-center gap-2 text-xs text-[#3498db]">
                      <span className="inline-block w-2 h-2 bg-[#3498db] rounded-full animate-pulse"></span>
                      Este mes
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-[#3498db]/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🔌</span>
                  </div>
                </div>
              </div>

              {/* Teléfonos Vendidos */}
              <div className="bg-gradient-to-br from-[#fdebd0] to-[#fadbd8] rounded-2xl p-6 border-2 border-[#e67e22] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#d35400] uppercase tracking-wide mb-1">
                      Teléfonos Vendidos
                    </p>
                    <p className="text-4xl font-black text-[#e67e22] mb-2">{telefonosVendidos}</p>
                    <div className="flex items-center gap-2 text-xs text-[#e67e22]">
                      <span className="inline-block w-2 h-2 bg-[#e67e22] rounded-full animate-pulse"></span>
                      Este mes
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-[#e67e22]/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">📱</span>
                  </div>
                </div>
              </div>

              {/* Caja del Día */}
              <div className="bg-gradient-to-br from-[#fef3cd] to-[#fce0a6] rounded-2xl p-6 border-2 border-[#f39c12] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#d68910] uppercase tracking-wide mb-1">
                      Caja del Día
                    </p>
                    <p className="text-4xl font-black text-[#f39c12] mb-2">
                      ${totalCajaHoy.toLocaleString("es-AR", {maximumFractionDigits: 0})}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#f39c12]">
                      <span className="inline-block w-2 h-2 bg-[#f39c12] rounded-full animate-pulse"></span>
                      Hoy
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-[#f39c12]/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">💰</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GRÁFICO */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-[#ecf0f1]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-[#9b59b6] to-[#8e44ad] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">📊</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#2c3e50]">Actividad Mensual</h2>
                  <p className="text-[#7f8c8d] text-sm">Evolución de los últimos 6 meses</p>
                </div>
              </div>

              {cargando ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[#7f8c8d]">Cargando gráfico...</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={datosGrafico}>
                    <XAxis dataKey="mes" fontSize={12} stroke="#7f8c8d" />
                    <YAxis fontSize={12} stroke="#7f8c8d" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#2c3e50",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="trabajos" fill="#27ae60" name="Reparaciones" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="accesorios" fill="#3498db" name="Accesorios/Repuestos" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="telefonos" fill="#e67e22" name="Teléfonos" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
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
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] text-center">
          <div className="w-12 h-12 bg-[#ecf0f1] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-[#2c3e50] font-semibold">Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] text-center">
          <div className="w-12 h-12 bg-[#e74c3c] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-[#e74c3c] font-semibold">No se detectó ningún usuario autenticado.</p>
        </div>
      </div>
    );
  }

  return <Home />;
}