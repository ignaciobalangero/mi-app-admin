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

  // ✅ Trabajos entregados/pagados del mes
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

  // ✅ Ventas del mes (accesorios/repuestos y teléfonos)
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

  // ✅ Gráfico mensual y caja diaria
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

  // ✅ Seguridad por rol
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
              <h2 className="text-xl font-semibold">Teléfonos Reparados</h2>
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

          {/* Gráfico mensual */}
          <div className="bg-white rounded-xl shadow p-4 mt-10 mx-auto w-full max-w-4xl">
            <h2 className="text-xl font-bold mb-4 text-center">Resumen de ventas por mes</h2>
            <BarChart width={600} height={300} data={datosGrafico} className="mx-auto">
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="trabajos" fill="#34d399" name="Reparaciones" />
              <Bar dataKey="accesorios" fill="#60a5fa" name="Accesorios/Repuestos" />
              <Bar dataKey="telefonos" fill="#f97316" name="Teléfonos" />
            </BarChart>
          </div>

          {/* Caja diaria */}
          <div className="bg-white rounded-xl shadow p-4 mt-10 mx-auto text-center w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">💰 Caja del día</h2>
            <p className="text-4xl font-bold text-green-700">
              ${totalCajaHoy.toLocaleString("es-AR")}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

// 🔒 Wrapper para proteger por auth
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
