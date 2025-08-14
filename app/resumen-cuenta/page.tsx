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
}

export default function ResumenSimplificado() {
  const { rol } = useRol();
  const [datos, setDatos] = useState<DatosMes[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // ✅ FUNCIÓN CORREGIDA PARA DD/MM/AAAA CON MES SIN CEROS
  const obtenerMes = (fecha: any): string => {
    try {
      if (!fecha) return "";
      
      let fechaObj: Date;
      
      if (typeof fecha === "object" && "seconds" in fecha) {
        fechaObj = new Date(fecha.seconds * 1000);
      } else if (typeof fecha === "string") {
        const partes = fecha.split("/");
        if (partes.length === 3) {
          // ✅ FORMATO DD/MM/AAAA (tu formato en Firebase)
          const [dia, mes, anio] = partes;
          
          const diaNum = parseInt(dia);
          const mesNum = parseInt(mes); // ✅ Puede ser "8" o "08"
          const anioNum = parseInt(anio);
          
          // ✅ Validar rangos
          if (mesNum >= 1 && mesNum <= 12 && anioNum >= 2020 && anioNum <= 2030 && diaNum >= 1 && diaNum <= 31) {
            const mesFormateado = `${mesNum.toString().padStart(2, '0')}/${anioNum}`;
            return mesFormateado;
          } else {
            console.log(`❌ Fecha fuera de rango: día=${diaNum}, mes=${mesNum}, año=${anioNum}`);
            return "";
          }
        } else {
          fechaObj = new Date(fecha);
        }
      } else {
        fechaObj = new Date(fecha);
      }
      
      // ✅ Verificar que la fecha sea válida
      if (isNaN(fechaObj.getTime())) {
        return "";
      }
      
      const mes = fechaObj.getMonth() + 1;
      const anio = fechaObj.getFullYear();
      
      return `${mes.toString().padStart(2, '0')}/${anio}`;
    } catch (error) {
      return "";
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      if (!rol?.negocioID || rol?.tipo !== "admin") return;
      
      setLoading(true);
      
      try {
        // CARGAR TRABAJOS
        const trabajosSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/trabajos`));
        
        // CARGAR VENTAS
        const ventasSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/ventasGeneral`));
        
        const resumen: Record<string, DatosMes> = {};
        
        // ✅ DEBUG ESPECÍFICO PARA AGOSTO - SOLO MOSTRAR TRABAJOS DE AGOSTO
        console.log("\n🎯 === DEBUG ESPECÍFICO PARA AGOSTO ===");
        let trabajosAgostoEncontrados = 0;

        trabajosSnap.docs.forEach(doc => {
          const trabajo = doc.data();
          const fechaParaUsar = trabajo.fechaModificacion;
          
          // ✅ SOLO PROCESAR SI LA FECHA CONTIENE AGOSTO
          if (fechaParaUsar && (fechaParaUsar.toString().includes("/8/") || fechaParaUsar.toString().includes("/08/"))) {
            trabajosAgostoEncontrados++;
            console.log(`\n🗓️ TRABAJO DE AGOSTO #${trabajosAgostoEncontrados}:`);
            console.log(`   ID: ${doc.id}`);
            console.log(`   Cliente: ${trabajo.cliente}`);
            console.log(`   Estado: ${trabajo.estado}`);
            console.log(`   FechaModificacion: ${trabajo.fechaModificacion}`);
            console.log(`   Precio: ${trabajo.precio}`);
            console.log(`   Costo: ${trabajo.costo}`);
            
            const mes = obtenerMes(fechaParaUsar);
            console.log(`   → Mes calculado: "${mes}"`);
            
            if (trabajo.estado === "ENTREGADO" || trabajo.estado === "PAGADO") {
              const precio = Number(trabajo.precio) || 0;
              const costo = Number(trabajo.costo) || 0;
              const ganancia = precio - costo;
              console.log(`   ✅ VÁLIDO: ${trabajo.estado} - Ganancia: $${ganancia}`);
            } else {
              console.log(`   ❌ INVÁLIDO: Estado "${trabajo.estado}" no es ENTREGADO ni PAGADO`);
            }
          }
        });

        console.log(`\n📊 TOTAL TRABAJOS DE AGOSTO ENCONTRADOS: ${trabajosAgostoEncontrados}`);
        console.log("=== FIN DEBUG AGOSTO ===\n");

        // ✅ PROCESAMIENTO NORMAL
        trabajosSnap.docs.forEach(doc => {
          const trabajo = doc.data();
          const fechaParaUsar = trabajo.fechaModificacion;
          
          if (!fechaParaUsar) return;
          
          const mes = obtenerMes(fechaParaUsar);
          if (!mes) return;
          
          // Solo trabajos ENTREGADOS o PAGADOS
          if (trabajo.estado === "ENTREGADO" || trabajo.estado === "PAGADO") {
            if (!resumen[mes]) {
              resumen[mes] = {
                mes,
                trabajos: 0,
                ventasARS: 0,
                ventasUSD: 0,
                totalTrabajos: 0,
                totalVentas: 0
              };
            }
            
            const precio = Number(trabajo.precio) || 0;
            const costo = Number(trabajo.costo) || 0;
            const ganancia = precio - costo;
            
            resumen[mes].trabajos += ganancia;
            resumen[mes].totalTrabajos += 1;
          }
        });

        // ✅ RESUMEN ESPECÍFICO DE AGOSTO
        console.log("\n🎯 === RESUMEN FINAL DE AGOSTO ===");
        if (resumen["08/2025"]) {
          console.log(`✅ AGOSTO ENCONTRADO EN RESUMEN:`);
          console.log(`   - Total trabajos: ${resumen["08/2025"].totalTrabajos}`);
          console.log(`   - Ganancia total: $${resumen["08/2025"].trabajos}`);
        } else {
          console.log(`❌ AGOSTO NO ENCONTRADO EN RESUMEN`);
        }
        console.log("=== FIN RESUMEN AGOSTO ===\n");
        
        // ✅ PROCESAR VENTAS - CORREGIDO PARA LEER MONEDAS CORRECTAMENTE
        ventasSnap.docs.forEach(doc => {
          const venta = doc.data();
          const mes = obtenerMes(venta.fecha);
          
          if (!mes || !venta.productos || !Array.isArray(venta.productos)) return;
          
          if (!resumen[mes]) {
            resumen[mes] = {
              mes,
              trabajos: 0,
              ventasARS: 0,
              ventasUSD: 0,
              totalTrabajos: 0,
              totalVentas: 0
            };
          }
          
          // ✅ SISTEMA DUAL NUEVO - YA ESTÁ CORRECTO
          if (venta.moneda === "DUAL" && venta.totalARS !== undefined && venta.totalUSD !== undefined) {
            venta.productos.forEach((producto: any) => {
              const ganancia = Number(producto.ganancia) || 0;
              
              if (ganancia > 0) {
                if (producto.moneda === "USD") {
                  resumen[mes].ventasUSD += ganancia;
                } else {
                  resumen[mes].ventasARS += ganancia;
                }
              }
            });
          }
          // ✅ SISTEMA ANTERIOR - CORREGIDO PARA RESPETAR MONEDA DE TELÉFONOS
          else {
            venta.productos.forEach((producto: any) => {
              const ganancia = Number(producto.ganancia) || 0;
              
              if (ganancia > 0) {
                const hayTelefono = venta.productos.some((p: any) => p.categoria === "Teléfono");
                
                if (hayTelefono) {
                  // CON TELÉFONO: Respetar moneda original de cada producto
                  if (producto.categoria === "Teléfono") {
                    // ✅ VERIFICAR LA MONEDA DEL TELÉFONO, NO ASUMIR USD
                    if (producto.moneda?.toUpperCase() === "USD") {
                      resumen[mes].ventasUSD += ganancia;
                    } else {
                      resumen[mes].ventasARS += ganancia;
                    }
                  } else {
                    // Accesorio/Repuesto: Según su moneda original
                    if (producto.moneda?.toUpperCase() === "USD") {
                      resumen[mes].ventasUSD += ganancia;
                    } else {
                      resumen[mes].ventasARS += ganancia;
                    }
                  }
                } else {
                  // SIN TELÉFONO: TODO en pesos
                  resumen[mes].ventasARS += ganancia;
                }
              }
            });
          }
          
          resumen[mes].totalVentas += venta.productos.length;
        });
        
        // CONVERTIR A ARRAY Y ORDENAR
        const resultado = Object.values(resumen)
          .sort((a, b) => a.mes.localeCompare(b.mes))
          .filter(item => {
            const tieneGanancias = item.trabajos > 0 || item.ventasARS > 0 || item.ventasUSD > 0;
            const tieneTrabajos = item.totalTrabajos > 0;
            return tieneGanancias || tieneTrabajos;
          });
        
        console.log("\n✅ MESES INCLUIDOS EN EL SELECTOR:");
        resultado.forEach(item => {
          console.log(`${item.mes}: ${item.totalTrabajos} trabajos, Ganancia: $${item.trabajos}`);
        });
        
        setDatos(resultado);
        if (resultado.length > 0) {
          setMesSeleccionado(resultado[resultado.length - 1].mes);
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
  const totalARS = mesActual ? mesActual.trabajos + mesActual.ventasARS : 0;
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
                <p className="text-blue-100">Análisis simplificado de ingresos mensuales</p>
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
              <p className="text-gray-600">No hay información de ganancias disponible</p>
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
                          formatter={(value) => [`${Number(value).toLocaleString("es-AR")}`, ""]}
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
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}