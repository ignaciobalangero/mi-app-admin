"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import { useRol } from "../../lib/useRol";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

interface ResumenMensual {
  mes: string;
  trabajos: number;
  accesorios: number;
  telefonos: number;
}

export default function ResumenCuenta() {
  const { rol } = useRol();
  const [resumenMensual, setResumenMensual] = useState<ResumenMensual[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");

  const obtenerMesAnio = (fecha: any): string | null => {
    if (!fecha) return null;

    let fechaObj: Date;

    if (typeof fecha === "object" && "seconds" in fecha) {
      fechaObj = new Date(fecha.seconds * 1000);
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else if (typeof fecha === "string") {
      const partes = fecha.split("/");
      if (partes.length === 3) {
        const [dia, mes, anio] = partes;
        fechaObj = new Date(`${anio}-${mes}-${dia}`);
      } else {
        fechaObj = new Date(fecha);
      }
    } else {
      return null;
    }

    if (isNaN(fechaObj.getTime())) return null;

    const mes = fechaObj.getMonth() + 1;
    const anio = fechaObj.getFullYear();
    return `${mes < 10 ? "0" + mes : mes}/${anio}`;
  };

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);  

  useEffect(() => {
    const fetchDatos = async () => {
      if (!negocioID || rol?.tipo !== "admin") return;

      const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const accesoriosSnap = await getDocs(collection(db, `negocios/${negocioID}/ventaAccesorios`));
      const telefonosSnap = await getDocs(collection(db, `negocios/${negocioID}/ventaTelefonos`));

      const resumen: Record<string, ResumenMensual> = {};

      trabajosSnap.forEach((doc) => {
        const d = doc.data();
        const key = obtenerMesAnio(d.fecha);
      
        if (
          (d.estado === "ENTREGADO" || d.estado === "PAGADO") &&
          d.precio != null &&
          key
        ) {
          if (!resumen[key]) resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
        
          resumen[key].trabajos += Number(d.precio) - Number(d.costo || 0);
        }
      });

      accesoriosSnap.forEach((doc) => {
        const d = doc.data();
        const key = obtenerMesAnio(d.fecha);
        if (d.total && d.precioUnitario && d.cantidad && d.cotizacion && key) {
          if (!resumen[key]) resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
          const costoTotal = d.precioUnitario * d.cantidad * (d.moneda === "USD" ? d.cotizacion : 1);
          resumen[key].accesorios += d.total - costoTotal;
        }
      });

      telefonosSnap.forEach((doc) => {
        const d = doc.data();
        const key = obtenerMesAnio(d.fecha);
        if (d.precioVenta && d.precioCosto && key) {
          if (!resumen[key]) resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
          resumen[key].telefonos += Number(d.precioVenta) - Number(d.precioCosto);
        }
      });

      const resultado = Object.values(resumen).sort((a, b) => a.mes.localeCompare(b.mes));
      setResumenMensual(resultado);
      if (!mesSeleccionado && resultado.length) setMesSeleccionado(resultado[resultado.length - 1].mes);
    };

    fetchDatos();
  }, [negocioID, rol]);

  const exportarExcel = () => {
    const datos = resumenMensual.map((r) => ({
      Mes: r.mes,
      "Ganancia Trabajos": r.trabajos,
      "Ganancia Accesorios": r.accesorios,
      "Ganancia Teléfonos": r.telefonos,
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ganancias");
    XLSX.writeFile(wb, "resumen_ganancias.xlsx");
  };

  const seleccionado = resumenMensual.find((r) => r.mes === mesSeleccionado);
  const totalMes = seleccionado ? seleccionado.trabajos + seleccionado.accesorios + seleccionado.telefonos : 0;

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-4 max-w-[1200px] mx-auto space-y-4">
          
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📈</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Resumen de Ganancias
                </h1>
                <p className="text-blue-100 text-sm">
                  Análisis mensual de rentabilidad por categoría
                </p>
              </div>
            </div>
          </div>

          {rol?.tipo === "admin" && resumenMensual.length > 0 ? (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#27ae60] rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#2c3e50]">Control Mensual</h2>
                      <p className="text-[#7f8c8d] text-xs">Selecciona el período a analizar</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={exportarExcel} 
                    className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
                  >
                    📊 Exportar Excel
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#2c3e50] mb-2">📅 Mes a analizar</label>
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(e.target.value)}
                    className="p-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-sm w-48"
                  >
                    {resumenMensual.map((r) => (
                      <option key={r.mes} value={r.mes}>{r.mes}</option>
                    ))}
                  </select>
                </div>
              </div>

              {seleccionado && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] rounded-2xl p-4 border-2 border-[#27ae60] shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#27ae60]">Trabajos</p>
                        <p className="text-lg font-bold text-[#27ae60]">
                          ${seleccionado.trabajos.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-[#27ae60]/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">🔧</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] rounded-2xl p-4 border-2 border-[#3498db] shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#3498db]">Accesorios</p>
                        <p className="text-lg font-bold text-[#3498db]">
                          ${seleccionado.accesorios.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-[#3498db]/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">🎧</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#fdebd0] to-[#fadbd8] rounded-2xl p-4 border-2 border-[#e67e22] shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#e67e22]">Teléfonos</p>
                        <p className="text-lg font-bold text-[#e67e22]">
                          ${seleccionado.telefonos.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-[#e67e22]/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">📱</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] rounded-2xl p-4 border-2 border-[#7f8c8d] shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#7f8c8d]">TOTAL MES</p>
                        <p className="text-lg font-bold text-[#2c3e50]">
                          ${totalMes.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-[#7f8c8d]/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">💰</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#9b59b6] rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">📈</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#2c3e50]">Gráfico Comparativo</h3>
                    <p className="text-[#7f8c8d] text-xs">Distribución de ganancias por categoría</p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={resumenMensual.filter((r) => r.mes === mesSeleccionado)}>
                    <XAxis dataKey="mes" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trabajos" name="Trabajos" fill="#27ae60" />
                    <Bar dataKey="accesorios" name="Accesorios" fill="#3498db" />
                    <Bar dataKey="telefonos" name="Teléfonos" fill="#e67e22" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
                <div className="flex items-center gap-3 text-[#2c3e50]">
                  <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">💡</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      <strong>Tip:</strong> Las ganancias se calculan restando el costo del precio de venta. Solo se incluyen trabajos entregados o pagados.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] text-center">
              <div className="w-12 h-12 bg-[#ecf0f1] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-[#2c3e50] mb-2">
                {rol?.tipo !== "admin" ? "Acceso Restringido" : "Sin Datos Disponibles"}
              </h3>
              <p className="text-[#7f8c8d] text-sm">
                {rol?.tipo !== "admin" 
                  ? "Solo los administradores pueden acceder a los reportes de ganancias"
                  : "No hay información de ganancias para mostrar en este momento"
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}