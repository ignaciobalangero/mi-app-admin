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
        
        // PROCESAR VENTAS
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
          
          // SISTEMA DUAL NUEVO
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
          // SISTEMA ANTERIOR
          else {
            venta.productos.forEach((producto: any) => {
              const ganancia = Number(producto.ganancia) || 0;
              
              if (ganancia > 0) {
                const hayTelefono = venta.productos.some((p: any) => p.categoria === "Teléfono");
                let monedaProducto = "ARS";
                
                if (producto.categoria === "Teléfono") {
                  monedaProducto = "USD";
                } else if (hayTelefono) {
                  monedaProducto = producto.moneda || "USD";
                } else {
                  monedaProducto = venta.moneda || producto.moneda || "ARS";
                }
                
                if (monedaProducto === "USD") {
                  resumen[mes].ventasUSD += ganancia;
                } else {
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
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Seleccionar mes:
                    </label>
                    <select
                      value={mesSeleccionado}
                      onChange={(e) => setMesSeleccionado(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {datos.map(item => (
                        <option key={item.mes} value={item.mes}>
                          {item.mes}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={exportarExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    📊 Exportar Excel
                  </button>
                </div>
              </div>

              {/* Resumen del mes seleccionado */}
              {mesActual && (
                <>
                  <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                      📊 Resumen de {mesSeleccionado}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold">Trabajos:</span> {mesActual.totalTrabajos}
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold">Ganancia Trabajos:</span> ${mesActual.trabajos.toLocaleString()}
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold">Ventas ARS:</span> ${mesActual.ventasARS.toLocaleString()}
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold">Ventas USD:</span> USD ${mesActual.ventasUSD.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Trabajos */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-600 mb-1">🔧 Trabajos</p>
                          <p className="text-2xl font-bold text-green-700">
                            ${mesActual.trabajos.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-green-600">
                            {mesActual.totalTrabajos} trabajos terminados
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                          <span className="text-xl">🔧</span>
                        </div>
                      </div>
                    </div>

                    {/* Ventas ARS */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-600 mb-1">💰 Ventas ARS</p>
                          <p className="text-2xl font-bold text-blue-700">
                            ${mesActual.ventasARS.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-blue-600">
                            Productos en pesos
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                          <span className="text-xl">💰</span>
                        </div>
                      </div>
                    </div>

                    {/* Ventas USD */}
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 border-2 border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-orange-600 mb-1">💵 Ventas USD</p>
                          <p className="text-2xl font-bold text-orange-700">
                            USD ${mesActual.ventasUSD.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-orange-600">
                            Teléfonos y productos en USD
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                          <span className="text-xl">💵</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-600 mb-1">🏦 Total en Pesos</p>
                          <p className="text-3xl font-bold text-gray-800">
                            ${totalARS.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-gray-600">
                            Trabajos + Ventas ARS
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xl">🏦</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl p-6 border-2 border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-yellow-600 mb-1">🌟 Total en USD</p>
                          <p className="text-3xl font-bold text-yellow-700">
                            USD ${totalUSD.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-yellow-600">
                            Solo ventas en dólares
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                          <span className="text-xl">🌟</span>
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