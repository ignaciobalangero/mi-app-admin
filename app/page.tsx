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
        const estadoCuentaCorriente = data.estadoCuentaCorriente || "";
      
        if (
          (estado === "REPARADO" || estado === "ENTREGADO" || estado === "PAGADO" || estadoCuentaCorriente === "PAGADO") &&

          fecha.endsWith(mesAnioActual)
        ) {
          contador++;
        }
      });

      setTrabajosReparados(contador);
    };

    cargarTrabajosDelMes();
  }, [rol]);

// Fragmento corregido para Home.tsx - Solo las funciones que cargan las ventas

useEffect(() => {
  const cargarVentasDelMes = async () => {
    if (!rol?.negocioID) return;

    console.log("🔄 Cargando ventas del mes desde ventasGeneral...");

    const ref = collection(db, `negocios/${rol.negocioID}/ventasGeneral`);
    const snap = await getDocs(ref);

    const hoy = new Date();
    const mesActual = String(hoy.getMonth() + 1).padStart(2, "0");
    const anioActual = hoy.getFullYear().toString();
    const mesAnioActual = `${mesActual}/${anioActual}`;

    console.log("📅 Buscando ventas del mes:", mesAnioActual);

    let accesoriosYRepuestos = 0;
    let telefonos = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      const fecha = data.fecha || "";
      
      console.log("📋 Procesando venta:", {
        id: doc.id,
        fecha,
        productos: data.productos?.length || 0
      });

      // ✅ VERIFICAR FORMATO DE FECHA - ARREGLADO
      // Extraer mes y año de fechas como "4/6/2025" o "10/6/2025"
      const parteFecha = fecha.split('/');
      if (parteFecha.length !== 3) {
        console.log("⏭️ Formato de fecha incorrecto:", fecha);
        return;
      }
      
      const diaVenta = parteFecha[0];
      const mesVenta = String(parteFecha[1]).padStart(2, "0"); // Convertir 6 → 06
      const anioVenta = parteFecha[2];
      const mesAnioVenta = `${mesVenta}/${anioVenta}`;
      
      if (mesAnioVenta !== mesAnioActual) {
        console.log("⏭️ Fecha no coincide:", mesAnioVenta, "vs", mesAnioActual);
        return;
      }
      
      console.log("✅ Fecha coincide:", mesAnioVenta);

      const productos = data.productos || [];
      
      productos.forEach((p: any) => {
        console.log("🏷️ Producto:", {
          categoria: p.categoria,
          cantidad: p.cantidad,
          producto: p.producto || p.descripcion
        });

        // 📱 TELÉFONOS - Exactamente como está en la tabla
        if (p.categoria === "Teléfono") {
          telefonos += 1; // Un teléfono por producto
          console.log("📱 Teléfono encontrado, total:", telefonos);
        } 
        // 🔌🔧 ACCESORIOS Y REPUESTOS - Por cantidad
        else if (p.categoria === "Accesorio" || p.categoria === "Repuesto") {
          const cantidad = Number(p.cantidad || 0);
          accesoriosYRepuestos += cantidad;
          console.log(`${p.categoria === "Accesorio" ? "🔌" : "🔧"} ${p.categoria} +${cantidad}, total:`, accesoriosYRepuestos);
        }
      });
    });

    console.log("✅ Resumen del mes:", {
      accesoriosYRepuestos,
      telefonos,
      totalVentas: snap.size
    });

    setAccesoriosVendidos(accesoriosYRepuestos);
    setTelefonosVendidos(telefonos);
  };

  cargarVentasDelMes();
}, [rol]);

useEffect(() => {
  const cargarResumenMensual = async () => {
    if (!rol?.negocioID) return;

    console.log("📊 Cargando resumen mensual...");

    // 🔄 SOLO USAR ventasGeneral AHORA
    const refVentas = collection(db, `negocios/${rol.negocioID}/ventasGeneral`);
    const refTrabajos = collection(db, `negocios/${rol.negocioID}/trabajos`);
    
    const [ventasSnap, trabajosSnap] = await Promise.all([
      getDocs(refVentas),
      getDocs(refTrabajos),
    ]);

    const hoy = new Date();
    const resumen: Record<string, any> = {};
    let cajaHoy = 0;

    // Inicializar últimos 6 meses
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${String(fecha.getMonth() + 1).padStart(2, "0")}/${fecha.getFullYear()}`;
      resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
    }

    // ✅ TRABAJOS - NO CAMBIAR (funciona bien)
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

    // 🔄 VENTAS - USAR ventasGeneral CON CATEGORÍAS CORRECTAS
    ventasSnap.forEach((doc) => {
      const d = doc.data();
      const fecha = d.fecha || "";
      const productos = d.productos || [];

      const hoyStr = new Date().toLocaleDateString("es-AR");

      productos.forEach((p: any) => {
        const total = Number(p.total || 0);

        Object.keys(resumen).forEach((key) => {
          // Extraer mes y año de la fecha de la venta
          const parteFecha = fecha.split('/');
          if (parteFecha.length === 3) {
            const mesVenta = String(parteFecha[1]).padStart(2, "0");
            const anioVenta = parteFecha[2]; 
            const mesAnioVenta = `${mesVenta}/${anioVenta}`;
            
            if (mesAnioVenta === key) {
              // 📱 TELÉFONOS
              if (p.categoria === "Teléfono") {
                resumen[key].telefonos += 1;
              } 
              // 🔌🔧 ACCESORIOS Y REPUESTOS
              else if (p.categoria === "Accesorio" || p.categoria === "Repuesto") {
                resumen[key].accesorios += Number(p.cantidad || 0);
              }
            }
          }
        });

        // 💰 CAJA DEL DÍA
        if (fecha === hoyStr) {
          cajaHoy += total;
        }
      });
    });

    const datosOrdenados = Object.values(resumen)
      .filter((item) => item.trabajos > 0 || item.accesorios > 0 || item.telefonos > 0)
      .reverse();
    
    console.log("📈 Datos del gráfico:", datosOrdenados);
    console.log("💰 Caja hoy:", cajaHoy);
    
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