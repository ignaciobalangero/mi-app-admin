"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import { useRol } from "../../lib/useRol";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

interface DatosMes {
  mes: string;
  trabajos: number;
  ventasARS: number;
  ventasUSD: number;
  totalTrabajos: number;
  totalVentas: number;
  generalesVendidos?: number;
  gananciaGeneralesARS?: number;
  gananciaGeneralesUSD?: number;
}

export default function ResumenSimplificado() {
  const { rol } = useRol();
  const [datos, setDatos] = useState<DatosMes[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!rol?.negocioID || rol?.tipo !== "admin") return;
      
      setLoading(true);
      
      try {
        // ✅ LEER SOLO LA COLECCIÓN DE ESTADÍSTICAS
        const estadisticasSnap = await getDocs(
          collection(db, `negocios/${rol.negocioID}/estadisticas`)
        );

        console.log(`📊 Estadísticas cargadas: ${estadisticasSnap.size} meses`);

        const resultado: DatosMes[] = [];

        estadisticasSnap.forEach((doc) => {
          const data = doc.data();
          
          resultado.push({
            mes: data.mes || doc.id,
            trabajos: data.gananciaTrabajos || 0,
            ventasARS: data.gananciaVentasARS || 0,
            ventasUSD: data.gananciaVentasUSD || 0,
            totalTrabajos: data.trabajosReparados || 0,
            totalVentas: (data.accesoriosVendidos || 0) + (data.telefonosVendidos || 0),
            generalesVendidos: data.generalesVendidos || 0,
            gananciaGeneralesARS: data.gananciaGeneralesARS || 0,
            gananciaGeneralesUSD: data.gananciaGeneralesUSD || 0,

          });
        });

        // Ordenar por mes (formato MM-YYYY)
        resultado.sort((a, b) => a.mes.localeCompare(b.mes));

        console.log("✅ Meses procesados:", resultado);

        setDatos(resultado);
        
        if (resultado.length > 0) {
          // Obtener mes actual en formato MM-YYYY
          const hoy = new Date();
          const mesActual = String(hoy.getMonth() + 1).padStart(2, "0");
          const anioActual = hoy.getFullYear();
          const mesActualFormato = `${mesActual}-${anioActual}`;
        
          // Si existe el mes actual en los datos, seleccionarlo
          const existeMesActual = resultado.find(m => m.mes === mesActualFormato);
          
          if (existeMesActual) {
            setMesSeleccionado(mesActualFormato);
          } else {
            // Si no existe el mes actual, seleccionar el más reciente
            setMesSeleccionado(resultado[resultado.length - 1].mes);
          }
        }
        
      } catch (error) {
        console.error("❌ Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [rol]);

  const exportarExcel = () => {
    const datosExcel = datos.map(item => ({
      "Mes": item.mes,
      "Ganancia Trabajos": item.trabajos,
      "Ganancia Ventas ARS": item.ventasARS,
      "Ganancia Ventas USD": item.ventasUSD,
      "Total Trabajos": item.totalTrabajos,
      "Total Ventas": item.totalVentas
    }));
    
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen");
    XLSX.writeFile(wb, "resumen_ganancias.xlsx");
  };

  const mesActual = datos.find(item => item.mes === mesSeleccionado);
  const totalARS = mesActual
  ? mesActual.trabajos
    + mesActual.ventasARS
    + (mesActual.gananciaGeneralesARS || 0)
  : 0;
  const totalUSD = mesActual ? mesActual.ventasUSD : 0;

  const datosGrafico = mesActual ? [{
    mes: mesActual.mes,
    "Trabajos": Math.round(mesActual.trabajos),
    "Ventas ARS": Math.round(mesActual.ventasARS),
    "Ventas USD": Math.round(mesActual.ventasUSD)
  }] : [];

  if (rol?.tipo !== "admin") {
    return (
      <>
        <Header />
        <main className="pt-20 bg-[#f8f9fa] min-h-screen">
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚫</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h3>
              <p className="text-gray-600">Solo los administradores pueden ver este reporte</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Resumen de Ganancias</h1>
                <p className="text-blue-100">Análisis simplificado de ingresos mensuales • Optimizado</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-2xl">⏳</span>
              </div>
              <p className="text-gray-600">Cargando datos...</p>
            </div>
          ) : datos.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin Datos</h3>
              <p className="text-gray-600">No hay estadísticas disponibles. Ejecutá la migración primero.</p>
            </div>
          ) : (
            <>
              {/* Controles */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-gray-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-3">
                      📅 Seleccionar mes:
                    </label>
                    <select
                      value={mesSeleccionado}
                      onChange={(e) => setMesSeleccionado(e.target.value)}
                      className="px-4 py-3 border-2 border-blue-400 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-600 bg-white text-gray-900 font-semibold text-base shadow-md transition-all"
                    >
                      {datos.map(item => (
                        <option key={item.mes} value={item.mes} className="font-semibold text-gray-900">
                          {item.mes}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={exportarExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 text-base"
                  >
                    📊 Exportar Excel
                  </button>
                </div>
              </div>

              {/* Resumen del mes seleccionado */}
              {mesActual && (
                <>
                  <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 border-2 border-gray-300">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      📊 Resumen de {mesSeleccionado}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-slate-100 p-4 rounded-lg border-2 border-slate-300 shadow-sm">
                        <span className="font-bold text-slate-900 text-base">Trabajos:</span>
                        <div className="font-bold text-slate-800 text-lg">{mesActual.totalTrabajos}</div>
                      </div>
                      <div className="bg-emerald-100 p-4 rounded-lg border-2 border-emerald-400 shadow-sm">
                        <span className="font-bold text-emerald-900 text-base">Ganancia Trabajos:</span>
                        <div className="font-bold text-emerald-800 text-lg">${mesActual.trabajos.toLocaleString()}</div>
                      </div>
                      <div className="bg-sky-100 p-4 rounded-lg border-2 border-sky-400 shadow-sm">
                        <span className="font-bold text-sky-900 text-base">Ventas ARS:</span>
                        <div className="font-bold text-sky-800 text-lg">${mesActual.ventasARS.toLocaleString()}</div>
                      </div>
                      <div className="bg-amber-100 p-4 rounded-lg border-2 border-amber-400 shadow-sm">
                        <span className="font-bold text-amber-900 text-base">Ventas USD:</span>
                        <div className="font-bold text-amber-800 text-lg">USD ${mesActual.ventasUSD.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Trabajos */}
                    <div className="bg-white rounded-2xl p-6 border-4 border-emerald-300 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-emerald-900 mb-2 uppercase tracking-wide">🔧 Trabajos</p>
                          <p className="text-3xl font-black text-emerald-800">
                            ${mesActual.trabajos.toLocaleString("es-AR")}
                          </p>
                          <p className="text-sm text-emerald-700 font-semibold mt-1">
                            {mesActual.totalTrabajos} trabajos terminados
                          </p>
                        </div>
                        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl">🔧</span>
                        </div>
                      </div>
                    </div>

                    {/* Ventas ARS */}
                    <div className="bg-white rounded-2xl p-6 border-4 border-sky-300 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-sky-900 mb-2 uppercase tracking-wide">💰 Ventas ARS</p>
                          <p className="text-3xl font-black text-sky-800">
                            ${mesActual.ventasARS.toLocaleString("es-AR")}
                          </p>
                          <p className="text-sm text-sky-700 font-semibold mt-1">
                            Productos en pesos
                          </p>
                        </div>
                        <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl">💰</span>
                        </div>
                      </div>
                    </div>

                    {/* Ventas USD */}
                    <div className="bg-white rounded-2xl p-6 border-4 border-amber-300 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-amber-900 mb-2 uppercase tracking-wide">💵 Ventas USD</p>
                          <p className="text-3xl font-black text-amber-800">
                            USD ${mesActual.ventasUSD.toLocaleString("es-AR")}
                          </p>
                          <p className="text-sm text-amber-700 font-semibold mt-1">
                            Teléfonos y productos en USD
                          </p>
                        </div>
                        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl">💵</span>
                        </div>
                      </div>
                    </div>

                    {mesActual.generalesVendidos > 0 && (
  <div className="bg-white rounded-2xl p-6 border-4 border-orange-300 shadow-xl mt-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-base font-bold text-orange-900 mb-2 uppercase tracking-wide">
          📦 Ventas Repuestos
        </p>

        <p className="text-3xl font-black text-orange-800">
          ${mesActual.gananciaGeneralesARS?.toLocaleString("es-AR")}
        </p>

        {mesActual.gananciaGeneralesUSD > 0 && (
          <p className="text-lg font-bold text-orange-700 mt-1">
            USD {mesActual.gananciaGeneralesUSD.toLocaleString("es-AR")}
          </p>
        )}

        <p className="text-sm text-orange-700 font-semibold mt-1">
          {mesActual.generalesVendidos} ventas desde stock extra
        </p>
      </div>

      <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
        <span className="text-2xl">📦</span>
      </div>
    </div>
  </div>
)}

                  </div>

                  {/* Totales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-6 border-4 border-slate-400 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-slate-900 mb-2 uppercase tracking-wide">🏦 Total en Pesos</p>
                          <p className="text-4xl font-black text-slate-800">
                            ${totalARS.toLocaleString("es-AR")}
                          </p>
                          <p className="text-sm text-slate-700 font-semibold mt-1">
                            Trabajos + Ventas ARS
                          </p>
                        </div>
                        <div className="w-16 h-16 bg-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl text-white">🏦</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border-4 border-yellow-400 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-yellow-900 mb-2 uppercase tracking-wide">🌟 Total en USD</p>
                          <p className="text-4xl font-black text-yellow-800">
                            USD ${totalUSD.toLocaleString("es-AR")}
                          </p>
                          <p className="text-sm text-yellow-700 font-semibold mt-1">
                            Solo ventas en dólares
                          </p>
                        </div>
                        <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl">🌟</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="text-xl">📈</span>
                      Ganancias de {mesSeleccionado}
                    </h3>
                    
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={datosGrafico}>
                        <XAxis 
                          dataKey="mes" 
                          tick={{ fill: '#374151' }}
                          axisLine={{ stroke: '#9CA3AF' }}
                        />
                        <YAxis 
                          tick={{ fill: '#374151' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          axisLine={{ stroke: '#9CA3AF' }}
                        />
                        <Tooltip 
                          formatter={(value) => [`$${Number(value).toLocaleString("es-AR")}`, ""]}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar dataKey="Trabajos" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Ventas ARS" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Ventas USD" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Banner optimización */}
                  <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-xl p-5 shadow-lg">
                    <div className="flex items-start gap-4 text-white">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">⚡</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1">Página Optimizada</p>
                        <p className="text-sm text-green-100">
                          Esta página consume solo 6-7 lecturas en lugar de 350+. Los datos se actualizan automáticamente con Cloud Functions.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}