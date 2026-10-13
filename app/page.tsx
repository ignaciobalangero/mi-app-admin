"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import Header from "./Header";
import { useRol } from "../lib/useRol";
import { calcularResumenCajaDia } from "@/lib/caja/calcularResumenDia";
import { fechaCajaHoy } from "@/lib/caja/fechaCaja";
import { obtenerSesionAbierta, obtenerSesionDelDia } from "@/lib/caja/sesionCaja";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import RecordatoriosInicio from "./components/RecordatoriosInicio";
import BuscadorStockInicio from "./components/BuscadorStockInicio";
import BotonEscanerStock from "@/components/BotonEscanerStock";

type RangoActividad = 6 | 12 | 18 | 24 | "historico";

const RANGOS_ACTIVIDAD: { id: RangoActividad; label: string }[] = [
  { id: 6, label: "6" },
  { id: 12, label: "12" },
  { id: 18, label: "18" },
  { id: 24, label: "24" },
  { id: "historico", label: "Histórico" },
];

function claveMes(fecha: Date) {
  return `${String(fecha.getMonth() + 1).padStart(2, "0")}-${fecha.getFullYear()}`;
}

function fechaDesdeClaveMes(clave: string): Date | null {
  const partes = String(clave || "").match(/^(\d{2})-(\d{4})$/);
  if (!partes) return null;
  const mes = Number(partes[1]);
  const anio = Number(partes[2]);
  if (mes < 1 || mes > 12 || anio < 2000) return null;
  return new Date(anio, mes - 1, 1);
}

function Home() {
  const { rol } = useRol();
  const router = useRouter();

  const [trabajosReparados, setTrabajosReparados] = useState(0);
  const [accesoriosVendidos, setAccesoriosVendidos] = useState(0);
  const [telefonosVendidos, setTelefonosVendidos] = useState(0);
  const [totalCajaHoy, setTotalCajaHoy] = useState(0);
  const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rangoActividad, setRangoActividad] = useState<RangoActividad>(6);

  const [user] = useAuthState(auth);

  // ==========================================
  // ESTADÍSTICAS DEL MES ACTUAL (live)
  // ==========================================
  useEffect(() => {
    if (!rol?.negocioID) return;

    const hoy = new Date();
    const mesActual = String(hoy.getMonth() + 1).padStart(2, "0");
    const anioActual = hoy.getFullYear().toString();
    const mesAnioActual = `${mesActual}-${anioActual}`;

    const estadisticasRef = doc(
      db,
      `negocios/${rol.negocioID}/estadisticas/${mesAnioActual}`
    );

    const unsub = onSnapshot(estadisticasRef, (estadisticasSnap) => {
      if (estadisticasSnap.exists()) {
        const data = estadisticasSnap.data();
        setTrabajosReparados(data.trabajosReparados || 0);
        setAccesoriosVendidos(data.accesoriosVendidos || 0);
        setTelefonosVendidos(data.telefonosVendidos || 0);
      } else {
        setTrabajosReparados(0);
        setAccesoriosVendidos(0);
        setTelefonosVendidos(0);
      }
    });

    const cargarCajaHoy = async () => {
      const hoyCaja = fechaCajaHoy();
      let sesion = await obtenerSesionAbierta(rol.negocioID);
      if (!sesion) sesion = await obtenerSesionDelDia(rol.negocioID, hoyCaja);

      const resumen = await calcularResumenCajaDia({
        negocioId: rol.negocioID,
        fecha: hoyCaja,
        sesionId: sesion?.id,
        saldoInicialARS: sesion?.saldoInicialARS,
        saldoInicialUSD: sesion?.saldoInicialUSD,
      });
      setTotalCajaHoy(resumen.ingresos.total);
    };

    void cargarCajaHoy();

    return () => unsub();
  }, [rol]);

  // ==========================================
  // GRÁFICO: 6, 12, 18, 24 MESES O HISTÓRICO
  // ==========================================
  useEffect(() => {
    if (!rol?.negocioID) return;
    let cancelado = false;

    const cargarGraficoHistorico = async () => {
      setCargando(true);

      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/estadisticas`));
      const porMes = new Map<string, { trabajos: number; accesorios: number; telefonos: number }>();
      snap.forEach((item) => {
        const fechaDoc = fechaDesdeClaveMes(item.id) || fechaDesdeClaveMes(String(item.data().mes || ""));
        if (!fechaDoc) return;
        const data = item.data();
        porMes.set(claveMes(fechaDoc), {
          trabajos: data.trabajosReparados || 0,
          accesorios: data.accesoriosVendidos || 0,
          telefonos: data.telefonosVendidos || 0,
        });
      });

      const hoy = new Date();
      const actual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      let desde = new Date(actual.getFullYear(), actual.getMonth() - 5, 1);

      if (rangoActividad === "historico") {
        const fechas = Array.from(porMes.keys())
          .map((clave) => fechaDesdeClaveMes(clave))
          .filter((fecha): fecha is Date => Boolean(fecha));
        if (fechas.length > 0) {
          desde = fechas.reduce((min, fecha) => (fecha < min ? fecha : min), fechas[0]);
        }
      } else {
        desde = new Date(actual.getFullYear(), actual.getMonth() - (rangoActividad - 1), 1);
      }

      const meses: { mes: string; trabajos: number; accesorios: number; telefonos: number }[] = [];
      for (
        let cursor = new Date(desde);
        cursor <= actual;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      ) {
        const clave = claveMes(cursor);
        const stats = porMes.get(clave);
        meses.push({
          mes: clave,
          trabajos: stats?.trabajos ?? 0,
          accesorios: stats?.accesorios ?? 0,
          telefonos: stats?.telefonos ?? 0,
        });
      }

      if (cancelado) return;
      setDatosGrafico(meses);
      setCargando(false);
    };

    void cargarGraficoHistorico();
    return () => {
      cancelado = true;
    };
  }, [rol, rangoActividad]);

  useEffect(() => {
    if (rol?.tipo === "cliente") {
      router.replace("/cliente");
    }
  }, [rol, router]);

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
    if (rol.tipo === "cliente") {
      return (
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] text-center">
            <p className="text-[#2c3e50] font-semibold">Redirigiendo a tu cuenta...</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-x-hidden bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] pt-16 text-black">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 px-2 py-4 sm:px-6 sm:py-6">
            
            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#2c3e50] via-[#34495e] to-[#3498db] rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#ecf0f1] transform hover:scale-[1.01] transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <BotonEscanerStock label="Leer código stock" variante="inicio" />
                  <Link
                    href="/buscador-precios"
                    className="flex-shrink-0 inline-flex items-center gap-2 bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white font-semibold px-5 py-3 rounded-xl shadow-lg border border-white/30 transition-all duration-200 hover:scale-105 hover:shadow-xl"
                  >
                    <span>🔍</span>
                    <span>Buscador de precios</span>
                  </Link>
                  <RecordatoriosInicio />
                </div>
              </div>
            </div>

            <BuscadorStockInicio />

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
                      Cobrado hoy (sin permuta)
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
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#9b59b6] to-[#8e44ad] rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📊</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2c3e50]">Actividad Mensual</h2>
                    <p className="text-[#7f8c8d] text-sm">
                      {rangoActividad === "historico"
                        ? cargando
                          ? "Histórico"
                          : `Histórico · ${datosGrafico.length} meses`
                        : `Evolución de los últimos ${rangoActividad} meses`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Cantidad de meses">
                  {RANGOS_ACTIVIDAD.map((opcion) => {
                    const activo = rangoActividad === opcion.id;
                    return (
                      <button
                        key={String(opcion.id)}
                        type="button"
                        onClick={() => setRangoActividad(opcion.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                          activo
                            ? "bg-[#2c3e50] text-white"
                            : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb]"
                        }`}
                      >
                        {opcion.label}
                      </button>
                    );
                  })}
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
                <div className="w-full overflow-x-auto">
                <div style={{ width: datosGrafico.length > 12 ? Math.max(datosGrafico.length * 52, 640) : "100%", height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafico}>
                    <XAxis
                      dataKey="mes"
                      fontSize={11}
                      stroke="#7f8c8d"
                      interval={0}
                      angle={datosGrafico.length > 8 ? -40 : 0}
                      textAnchor={datosGrafico.length > 8 ? "end" : "middle"}
                      height={datosGrafico.length > 8 ? 70 : 30}
                    />
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
                </div>
                </div>
              )}
            </div>
          </div>
        </main>
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