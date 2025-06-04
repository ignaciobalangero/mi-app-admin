"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import Header from "./Header";
import Sidebar from "./components/Sidebar";
import { useRol } from "../lib/useRol";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

function Home() {
  const { rol } = useRol();
  const router = useRouter();

  const [trabajosReparados, setTrabajosReparados] = useState(0);
  const [accesoriosVendidos, setAccesoriosVendidos] = useState(0);
  const [telefonosVendidos, setTelefonosVendidos] = useState(0);

  const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
  const [totalCajaHoy, setTotalCajaHoy] = useState(0);

  const [user] = useAuthState(auth);
  const [sidebarAbierto, setSidebarAbierto] = useState(true);

  useEffect(() => {
    const cargarTrabajosDelMes = async () => {
      if (!rol?.negocioID) return;

      const ref = collection(db, `negocios/${rol.negocioID}/trabajos`);
      const snap = await getDocs(ref);

      const hoy = new Date();
      const mesActual = String(hoy.getMonth() + 1).padStart(2, "0");
      const anioActual = hoy.getFullYear().toString();
      const mesAnioActual = `${mesActual}/${anioActual}`;

      let contador = 0;

      snap.forEach((doc) => {
        const data = doc.data();
        const fecha = data.fecha || "";
        const estado = data.estado || "";

        if (
          (estado === "ENTREGADO" || estado === "PAGADO") &&
          fecha.endsWith(mesAnioActual)
        ) {
          contador++;
        }
      });

      setTrabajosReparados(contador);
    };

    cargarTrabajosDelMes();
  }, [rol]);

  useEffect(() => {
    const cargarVentasDelMes = async () => {
      if (!rol?.negocioID) return;

      const ref = collection(db, `negocios/${rol.negocioID}/ventasGeneral`);
      const snap = await getDocs(ref);

      const hoy = new Date();
      const mesActual = String(hoy.getMonth() + 1).padStart(2, "0");
      const anioActual = hoy.getFullYear().toString();
      const mesAnioActual = `${mesActual}/${anioActual}`;

      let accesoriosYRepuestos = 0;
      let telefonos = 0;

      snap.forEach((doc) => {
        const data = doc.data();
        const fecha = data.fecha || "";
        if (!fecha.endsWith(mesAnioActual)) return;

        const productos = data.productos || [];
        productos.forEach((p: any) => {
          if (p.categoria === "Teléfono") {
            telefonos += 1;
          } else {
            accesoriosYRepuestos += Number(p.cantidad || 0);
          }
        });
      });

      setAccesoriosVendidos(accesoriosYRepuestos);
      setTelefonosVendidos(telefonos);
    };

    cargarVentasDelMes();
  }, [rol]);

  useEffect(() => {
    const cargarResumenMensual = async () => {
      if (!rol?.negocioID) return;

      const refTrabajos = collection(db, `negocios/${rol.negocioID}/trabajos`);
      const refVentas = collection(db, `negocios/${rol.negocioID}/ventasGeneral`);
      const [trabajosSnap, ventasSnap] = await Promise.all([
        getDocs(refTrabajos),
        getDocs(refVentas),
      ]);

      const hoy = new Date();
      const resumen: Record<string, any> = {};
      let cajaHoy = 0;

      for (let i = 0; i < 6; i++) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = `${String(fecha.getMonth() + 1).padStart(2, "0")}/${fecha.getFullYear()}`;
        resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
      }

      trabajosSnap.forEach((doc) => {
        const d = doc.data();
        const fecha = d.fecha || "";
        const estado = d.estado || "";
        Object.keys(resumen).forEach((key) => {
          if ((estado === "ENTREGADO" || estado === "PAGADO") && fecha.endsWith(key)) {
            resumen[key].trabajos += 1;
          }
        });
      });

      ventasSnap.forEach((doc) => {
        const d = doc.data();
        const fecha = d.fecha || "";
        const productos = d.productos || [];

        const hoyStr = new Date().toLocaleDateString("es-AR");

        productos.forEach((p: any) => {
          const total = Number(p.total || 0);

          Object.keys(resumen).forEach((key) => {
            if (fecha.endsWith(key)) {
              if (p.categoria === "Teléfono") {
                resumen[key].telefonos += 1;
              } else {
                resumen[key].accesorios += Number(p.cantidad || 0);
              }
            }
          });

          if (fecha === hoyStr) {
            cajaHoy += total;
          }
        });
      });

      const datosOrdenados = Object.values(resumen)
      .filter((item) => item.trabajos > 0 || item.accesorios > 0 || item.telefonos > 0)
      .reverse();
      setDatosGrafico(datosOrdenados);
      setTotalCajaHoy(cajaHoy);
    };

    cargarResumenMensual();
  }, [rol]);

  if (!rol || !rol.tipo) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] text-center">
          <div className="w-12 h-12 bg-[#ecf0f1] rounded-2xl flex items-center justify-center mx-auto mb-4">
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
        <main className="flex-1 pt-20 bg-[#f8f9fa] text-black transition-all duration-300">
          <div className="w-full px-4 max-w-[1200px] mx-auto space-y-6">
            
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🏠</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    Panel de Control
                  </h1>
                  <p className="text-blue-100 text-sm">
                    Resumen general de actividad y rendimiento
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] rounded-2xl p-4 border-2 border-[#27ae60] shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#27ae60]">Teléfonos Reparados</p>
                    <p className="text-xl font-bold text-[#27ae60]">{trabajosReparados}</p>
                    <p className="text-xs text-[#27ae60] mt-1">Este mes</p>
                  </div>
                  <div className="w-12 h-12 bg-[#27ae60]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🛠️</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] rounded-2xl p-4 border-2 border-[#3498db] shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#3498db]">Accesorios Vendidos</p>
                    <p className="text-xl font-bold text-[#3498db]">{accesoriosVendidos}</p>
                    <p className="text-xs text-[#3498db] mt-1">Este mes</p>
                  </div>
                  <div className="w-12 h-12 bg-[#3498db]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎧</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#fdebd0] to-[#fadbd8] rounded-2xl p-4 border-2 border-[#e67e22] shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#e67e22]">Teléfonos Vendidos</p>
                    <p className="text-xl font-bold text-[#e67e22]">{telefonosVendidos}</p>
                    <p className="text-xs text-[#e67e22] mt-1">Este mes</p>
                  </div>
                  <div className="w-12 h-12 bg-[#e67e22]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#9b59b6] rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2c3e50]">Actividad Mensual</h2>
                  <p className="text-[#7f8c8d] text-xs">Últimos 6 meses de actividad</p>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <BarChart width={800} height={300} data={datosGrafico} className="mx-auto">
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="trabajos" fill="#27ae60" name="Reparaciones" />
                  <Bar dataKey="accesorios" fill="#3498db" name="Accesorios/Repuestos" />
                  <Bar dataKey="telefonos" fill="#e67e22" name="Teléfonos" />
                </BarChart>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">💰</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2c3e50]">Caja del Día</h2>
                  <p className="text-[#7f8c8d] text-xs">Ingresos acumulados hoy</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] rounded-xl p-6 border-2 border-[#27ae60] text-center">
                <p className="text-3xl font-bold text-[#27ae60]">
                  ${totalCajaHoy.toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-[#27ae60] mt-2">Total de ventas del día</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
              <div className="flex items-center gap-3 text-[#2c3e50]">
                <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💡</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    <strong>Bienvenido al panel:</strong> Aquí puedes ver un resumen de la actividad de tu negocio. Los datos se actualizan automáticamente.
                  </p>
                </div>
              </div>
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
          <div className="w-12 h-12 bg-[#ecf0f1] rounded-2xl flex items-center justify-center mx-auto mb-4">
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