"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "../Header";
import { useRol } from "../../lib/useRol";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as XLSX from "xlsx";

/** Líneas de venta que corresponden a stock extra (hoja / Google Sheets), no accesorios ni repuestos clásicos. */
function esLineaStockExtra(p: Record<string, unknown>): boolean {
  const origen = String(p?.origenStock ?? "");
  const tipo = String(p?.tipo ?? "");
  if (origen === "stockExtra" || tipo === "stockExtra") return true;
  if (tipo === "general" && (origen === "stockExtra" || origen === "")) return true;
  return false;
}

function agregarRepuestosDesdeVentas(productos: unknown[]): {
  unidades: number;
  gananciaARS: number;
  gananciaUSD: number;
} {
  let unidades = 0;
  let gananciaARS = 0;
  let gananciaUSD = 0;
  for (const raw of productos || []) {
    const p = raw as Record<string, unknown>;
    if (!esLineaStockExtra(p)) continue;
    const cant = Number(p.cantidad ?? 1) || 1;
    const g = Number(p.ganancia ?? 0) || 0;
    unidades += cant;
    const moneda = String(p.moneda ?? "ARS").toUpperCase();
    if (moneda === "USD") gananciaUSD += g;
    else gananciaARS += g;
  }
  return { unidades, gananciaARS, gananciaUSD };
}

/** Precio cobrado de la línea, sin restar el costo. */
function brutoLinea(p: Record<string, unknown>): number {
  const venta = Number(p.precioVenta);
  if (Number.isFinite(venta) && venta !== 0) return venta;
  const unit = Number(p.precioUnitario ?? 0) || 0;
  const cant = Number(p.cantidad ?? 1) || 1;
  return unit * cant;
}

function rubroVenta(p: Record<string, unknown>): "telefono" | "extra" | "venta" {
  const tipo = String(p.tipo ?? "");
  const cat = String(p.categoria ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (tipo === "telefono" || cat === "telefono") return "telefono";
  if (esLineaStockExtra(p)) return "extra";
  return "venta";
}

function mesAnioFechaAR(fecha: string): string | null {
  const partes = String(fecha || "").trim().split("/");
  if (partes.length !== 3) return null;
  const mesNum = parseInt(partes[1], 10);
  if (!mesNum) return null;
  const mes = String(mesNum).padStart(2, "0");
  let anio = partes[2].trim();
  if (anio.length === 2) anio = `20${anio}`;
  if (!anio) return null;
  return `${mes}-${anio}`;
}

interface BrutosMes {
  reparacionARS: number;
  telefonosARS: number;
  telefonosUSD: number;
  ventasARS: number;
  ventasUSD: number;
  extraARS: number;
  extraUSD: number;
}

function brutosVacios(): BrutosMes {
  return {
    reparacionARS: 0,
    telefonosARS: 0,
    telefonosUSD: 0,
    ventasARS: 0,
    ventasUSD: 0,
    extraARS: 0,
    extraUSD: 0,
  };
}

function sumarBrutoVenta(destino: BrutosMes, productos: unknown[]) {
  for (const raw of productos || []) {
    const p = raw as Record<string, unknown>;
    const monto = brutoLinea(p);
    const usd = String(p.moneda ?? "ARS").toUpperCase() === "USD";
    const rubro = rubroVenta(p);
    if (rubro === "telefono") {
      if (usd) destino.telefonosUSD += monto;
      else destino.telefonosARS += monto;
    } else if (rubro === "extra") {
      if (usd) destino.extraUSD += monto;
      else destino.extraARS += monto;
    } else if (usd) {
      destino.ventasUSD += monto;
    } else {
      destino.ventasARS += monto;
    }
  }
}

interface DatosMes {
  mes: string;
  trabajos: number;
  ventasARS: number;
  ventasUSD: number;
  totalTrabajos: number;
  totalVentas: number;
  telefonosVendidos: number;
  accesoriosVendidos: number;
  generalesVendidos?: number;
  gananciaGeneralesARS?: number;
  gananciaGeneralesUSD?: number;
}

export default function ResumenSimplificado() {
  const { rol } = useRol();
  const [datos, setDatos] = useState<DatosMes[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [repuestosDesdeVentas, setRepuestosDesdeVentas] = useState<{
    unidades: number;
    gananciaARS: number;
    gananciaUSD: number;
  } | null>(null);
  const [cargandoFallbackRepuestos, setCargandoFallbackRepuestos] = useState(false);
  const [brutos, setBrutos] = useState<BrutosMes | null>(null);

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
            telefonosVendidos: data.telefonosVendidos || 0,
            accesoriosVendidos: data.accesoriosVendidos || 0,
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

  useEffect(() => {
    if (!rol?.negocioID || !mesSeleccionado) return;

    let cancelled = false;
    const run = async () => {
      const parts = mesSeleccionado.split("-");
      if (parts.length !== 2) return;
      const mesNum = parseInt(parts[0], 10);
      const anioNum = parseInt(parts[1], 10);
      if (!mesNum || !anioNum) return;

      setCargandoFallbackRepuestos(true);
      setRepuestosDesdeVentas(null);
      setBrutos(null);

      try {
        const start = Timestamp.fromDate(new Date(anioNum, mesNum - 1, 1, 0, 0, 0, 0));
        const end = Timestamp.fromDate(new Date(anioNum, mesNum, 0, 23, 59, 59, 999));
        const q = query(
          collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
          where("timestamp", ">=", start),
          where("timestamp", "<=", end),
          orderBy("timestamp")
        );
        const qTrabajos = query(
          collection(db, `negocios/${rol.negocioID}/trabajos`),
          where("estado", "in", ["REPARADO", "ENTREGADO", "PAGADO"])
        );
        const [ventasRes, trabajosRes] = await Promise.allSettled([getDocs(q), getDocs(qTrabajos)]);
        if (cancelled) return;

        let unidades = 0;
        let gananciaARS = 0;
        let gananciaUSD = 0;
        const bruto = brutosVacios();

        if (ventasRes.status === "fulfilled") {
          ventasRes.value.forEach((d) => {
            const data = d.data();
            const productos = data.productos || [];
            const a = agregarRepuestosDesdeVentas(productos);
            unidades += a.unidades;
            gananciaARS += a.gananciaARS;
            gananciaUSD += a.gananciaUSD;
            sumarBrutoVenta(bruto, productos);
          });
          setRepuestosDesdeVentas({ unidades, gananciaARS, gananciaUSD });
        } else {
          console.error("Resumen cuenta: ventas del mes:", ventasRes.reason);
          setRepuestosDesdeVentas(null);
        }

        if (trabajosRes.status === "fulfilled") {
          const estadosOk = new Set(["REPARADO", "ENTREGADO", "PAGADO"]);
          trabajosRes.value.forEach((d) => {
            const data = d.data();
            if (!estadosOk.has(String(data.estado || ""))) return;
            if (mesAnioFechaAR(String(data.fechaModificacion || "")) !== mesSeleccionado) return;
            bruto.reparacionARS += Number(data.precio || 0) || 0;
          });
        } else {
          console.error("Resumen cuenta: trabajos del mes:", trabajosRes.reason);
        }

        if (ventasRes.status === "rejected" && trabajosRes.status === "rejected") {
          setBrutos(null);
        } else {
          setBrutos(bruto);
        }
      } catch (e) {
        console.error("Resumen cuenta: fallback repuestos/stock extra:", e);
        if (!cancelled) {
          setRepuestosDesdeVentas(null);
          setBrutos(null);
        }
      } finally {
        if (!cancelled) setCargandoFallbackRepuestos(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [rol?.negocioID, mesSeleccionado]);

  const exportarExcel = () => {
    const datosExcel = datos.map((item) => ({
      Mes: item.mes,
      "Ganancia Trabajos": item.trabajos,
      "Ganancia Ventas ARS": item.ventasARS,
      "Ganancia Ventas USD": item.ventasUSD,
      "Ganancia Repuestos ARS (stock extra)": item.gananciaGeneralesARS || 0,
      "Ganancia Repuestos USD (stock extra)": item.gananciaGeneralesUSD || 0,
      "Total Trabajos": item.totalTrabajos,
      "Teléfonos Vendidos": item.telefonosVendidos,
      "Accesorios/Repuestos Vendidos": item.accesoriosVendidos,
      "Total Ventas": item.totalVentas,
      "Bruto reparaciones": item.mes === mesSeleccionado ? brutos?.reparacionARS ?? "" : "",
      "Bruto ventas ARS": item.mes === mesSeleccionado ? brutos?.ventasARS ?? "" : "",
      "Bruto ventas USD": item.mes === mesSeleccionado ? brutos?.ventasUSD ?? "" : "",
      "Bruto teléfonos ARS": item.mes === mesSeleccionado ? brutos?.telefonosARS ?? "" : "",
      "Bruto teléfonos USD": item.mes === mesSeleccionado ? brutos?.telefonosUSD ?? "" : "",
      "Bruto repuestos ARS": item.mes === mesSeleccionado ? brutos?.extraARS ?? "" : "",
      "Bruto repuestos USD": item.mes === mesSeleccionado ? brutos?.extraUSD ?? "" : "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen");
    XLSX.writeFile(wb, "resumen_ganancias.xlsx");
  };

  const mesActual = datos.find(item => item.mes === mesSeleccionado);

  const repuestosDisplay = useMemo(() => {
    if (!mesActual) return null;
    const statsU = mesActual.generalesVendidos || 0;
    const statsARS = mesActual.gananciaGeneralesARS || 0;
    const statsUSD = mesActual.gananciaGeneralesUSD || 0;
    const statsTiene =
      statsU > 0 || Math.abs(statsARS) > 0.005 || Math.abs(statsUSD) > 0.005;
    if (statsTiene) {
      return {
        unidades: statsU,
        gananciaARS: statsARS,
        gananciaUSD: statsUSD,
        fuente: "estadisticas" as const,
      };
    }
    if (
      repuestosDesdeVentas &&
      (repuestosDesdeVentas.unidades > 0 ||
        Math.abs(repuestosDesdeVentas.gananciaARS) > 0.005 ||
        Math.abs(repuestosDesdeVentas.gananciaUSD) > 0.005)
    ) {
      return {
        unidades: repuestosDesdeVentas.unidades,
        gananciaARS: repuestosDesdeVentas.gananciaARS,
        gananciaUSD: repuestosDesdeVentas.gananciaUSD,
        fuente: "ventas" as const,
      };
    }
    return null;
  }, [mesActual, repuestosDesdeVentas]);

  const totalARS = mesActual
    ? mesActual.trabajos +
      mesActual.ventasARS +
      (repuestosDisplay?.gananciaARS ?? mesActual.gananciaGeneralesARS ?? 0)
    : 0;
  const totalUSD = mesActual
    ? mesActual.ventasUSD +
      (repuestosDisplay?.gananciaUSD ?? mesActual.gananciaGeneralesUSD ?? 0)
    : 0;

  const datosGrafico = mesActual
    ? [
        {
          mes: mesActual.mes,
          Trabajos: Math.round(mesActual.trabajos),
          "Ventas ARS": Math.round(mesActual.ventasARS),
          "Ventas USD": Math.round(mesActual.ventasUSD),
          "Repuestos ARS": Math.round(repuestosDisplay?.gananciaARS ?? 0),
          "Repuestos USD": Math.round(repuestosDisplay?.gananciaUSD ?? 0),
        },
      ]
    : [];

  if (rol?.tipo !== "admin") {
    return (
      <>
        <Header />
        <main className="pt-16 bg-[#f8f9fa] overflow-x-hidden min-h-screen">
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
      <main className="pt-16 bg-[#f8f9fa] overflow-x-hidden min-h-screen">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
                      <div className="bg-slate-100 p-4 rounded-lg border-2 border-slate-300 shadow-sm">
                        <span className="font-bold text-slate-900 text-base">Trabajos:</span>
                        <div className="font-bold text-slate-800 text-lg">{mesActual.totalTrabajos}</div>
                      </div>
                      <div className="bg-orange-100 p-4 rounded-lg border-2 border-orange-400 shadow-sm">
                        <span className="font-bold text-orange-900 text-base">Teléfonos vendidos:</span>
                        <div className="font-bold text-orange-800 text-lg">{mesActual.telefonosVendidos}</div>
                      </div>
                      <div className="bg-violet-100 p-4 rounded-lg border-2 border-violet-400 shadow-sm">
                        <span className="font-bold text-violet-900 text-base">Accesorios/repuestos:</span>
                        <div className="font-bold text-violet-800 text-lg">{mesActual.accesoriosVendidos}</div>
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
                      <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-300 shadow-sm">
                        <span className="font-bold text-orange-900 text-base">Ganancia Repuestos (stock extra):</span>
                        <div className="font-bold text-orange-900 text-lg">
                          {cargandoFallbackRepuestos && !repuestosDisplay ? (
                            <span className="text-sm text-orange-700">…</span>
                          ) : repuestosDisplay ? (
                            <>
                              ${repuestosDisplay.gananciaARS.toLocaleString("es-AR")}
                              {repuestosDisplay.gananciaUSD > 0 && (
                                <span className="block text-sm font-semibold text-orange-800">
                                  USD {repuestosDisplay.gananciaUSD.toLocaleString("es-AR")}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-orange-700">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Teléfonos vendidos (unidades) */}
                    <div className="bg-white rounded-2xl p-6 border-4 border-orange-300 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-orange-900 mb-2 uppercase tracking-wide">📱 Teléfonos</p>
                          <p className="text-3xl font-black text-orange-800">
                            {mesActual.telefonosVendidos}
                          </p>
                          <p className="text-sm text-orange-700 font-semibold mt-1">
                            Unidades vendidas este mes
                          </p>
                        </div>
                        <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl">📱</span>
                        </div>
                      </div>
                    </div>

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

                    {(repuestosDisplay || cargandoFallbackRepuestos) && (
                      <div className="bg-white rounded-2xl p-6 border-4 border-orange-300 shadow-xl mt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold text-orange-900 mb-2 uppercase tracking-wide">
                              📦 Ventas Repuestos (stock extra)
                            </p>

                            {cargandoFallbackRepuestos && !repuestosDisplay ? (
                              <p className="text-sm text-orange-800">
                                Calculando ganancia desde ventas del mes…
                              </p>
                            ) : repuestosDisplay ? (
                              <>
                                <p className="text-3xl font-black text-orange-800">
                                  ${repuestosDisplay.gananciaARS.toLocaleString("es-AR")}
                                </p>
                                {repuestosDisplay.gananciaUSD > 0 && (
                                  <p className="text-lg font-bold text-orange-700 mt-1">
                                    USD {repuestosDisplay.gananciaUSD.toLocaleString("es-AR")}
                                  </p>
                                )}
                                <p className="text-sm text-orange-700 font-semibold mt-1">
                                  {repuestosDisplay.unidades} unidades (stock extra / hoja)
                                </p>
                                {repuestosDisplay.fuente === "ventas" && (
                                  <p className="text-xs text-orange-600 mt-2 max-w-xl">
                                    Detalle calculado desde tus ventas del mes (documentos{" "}
                                    <code className="bg-orange-100 px-1 rounded">ventasGeneral</code>
                                    ). Cuando las estadísticas mensuales en Firebase estén al día, se
                                    unifican con el mismo total.
                                  </p>
                                )}
                              </>
                            ) : null}
                          </div>

                          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                            <span className="text-2xl">📦</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      Ingresos brutos de {mesSeleccionado}
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Precio de venta, sin restar el costo. Pesos y dólares van separados.
                    </p>
                    {cargandoFallbackRepuestos && !brutos ? (
                      <p className="text-sm text-gray-600">Calculando ingresos del mes…</p>
                    ) : brutos ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                          <div className="rounded-2xl border-4 border-emerald-300 p-5">
                            <p className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Reparaciones</p>
                            <p className="text-2xl font-black text-emerald-800 mt-1">
                              ${brutos.reparacionARS.toLocaleString("es-AR")}
                            </p>
                            <p className="text-xs text-emerald-700 mt-1">Precio de los trabajos del mes</p>
                          </div>
                          <div className="rounded-2xl border-4 border-sky-300 p-5">
                            <p className="text-sm font-bold text-sky-900 uppercase tracking-wide">Ventas</p>
                            <p className="text-2xl font-black text-sky-800 mt-1">
                              ${brutos.ventasARS.toLocaleString("es-AR")}
                            </p>
                            {brutos.ventasUSD > 0 && (
                              <p className="text-base font-bold text-sky-700">
                                USD {brutos.ventasUSD.toLocaleString("es-AR")}
                              </p>
                            )}
                            <p className="text-xs text-sky-700 mt-1">Accesorios, repuestos y productos</p>
                          </div>
                          <div className="rounded-2xl border-4 border-orange-300 p-5">
                            <p className="text-sm font-bold text-orange-900 uppercase tracking-wide">Venta de teléfonos</p>
                            <p className="text-2xl font-black text-orange-800 mt-1">
                              {brutos.telefonosUSD > 0
                                ? `USD ${brutos.telefonosUSD.toLocaleString("es-AR")}`
                                : `$${brutos.telefonosARS.toLocaleString("es-AR")}`}
                            </p>
                            {brutos.telefonosUSD > 0 && brutos.telefonosARS > 0 && (
                              <p className="text-base font-bold text-orange-700">
                                ${brutos.telefonosARS.toLocaleString("es-AR")}
                              </p>
                            )}
                            <p className="text-xs text-orange-700 mt-1">Precio de los equipos vendidos</p>
                          </div>
                          <div className="rounded-2xl border-4 border-amber-300 p-5">
                            <p className="text-sm font-bold text-amber-900 uppercase tracking-wide">Repuestos (stock extra)</p>
                            <p className="text-2xl font-black text-amber-800 mt-1">
                              ${brutos.extraARS.toLocaleString("es-AR")}
                            </p>
                            {brutos.extraUSD > 0 && (
                              <p className="text-base font-bold text-amber-700">
                                USD {brutos.extraUSD.toLocaleString("es-AR")}
                              </p>
                            )}
                            <p className="text-xs text-amber-700 mt-1">Hoja / stock extra</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="rounded-2xl border-4 border-slate-400 p-5">
                            <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Total bruto en pesos</p>
                            <p className="text-3xl font-black text-slate-800 mt-1">
                              ${(
                                brutos.reparacionARS +
                                brutos.ventasARS +
                                brutos.telefonosARS +
                                brutos.extraARS
                              ).toLocaleString("es-AR")}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Reparaciones + ventas + teléfonos + stock extra
                            </p>
                          </div>
                          <div className="rounded-2xl border-4 border-yellow-400 p-5">
                            <p className="text-sm font-bold text-yellow-900 uppercase tracking-wide">Total bruto en USD</p>
                            <p className="text-3xl font-black text-yellow-800 mt-1">
                              USD {(
                                brutos.ventasUSD +
                                brutos.telefonosUSD +
                                brutos.extraUSD
                              ).toLocaleString("es-AR")}
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">Ventas + teléfonos + stock extra</p>
                          </div>
                        </div>
                        <div className="mt-6">
                          <h3 className="text-base font-bold text-gray-800 mb-3">Ingresos brutos del mes</h3>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                              data={[
                                {
                                  mes: mesSeleccionado,
                                  Reparaciones: Math.round(brutos.reparacionARS),
                                  "Ventas ARS": Math.round(brutos.ventasARS),
                                  "Ventas USD": Math.round(brutos.ventasUSD),
                                  "Teléfonos ARS": Math.round(brutos.telefonosARS),
                                  "Teléfonos USD": Math.round(brutos.telefonosUSD),
                                  "Stock extra ARS": Math.round(brutos.extraARS),
                                  "Stock extra USD": Math.round(brutos.extraUSD),
                                },
                              ]}
                            >
                              <XAxis dataKey="mes" tick={{ fill: "#374151" }} axisLine={{ stroke: "#9CA3AF" }} />
                              <YAxis
                                tick={{ fill: "#374151" }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                axisLine={{ stroke: "#9CA3AF" }}
                              />
                              <Tooltip
                                formatter={(value, name) => [
                                  String(name).includes("USD")
                                    ? `USD ${Number(value).toLocaleString("es-AR")}`
                                    : `$${Number(value).toLocaleString("es-AR")}`,
                                  name,
                                ]}
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #D1D5DB",
                                  borderRadius: "8px",
                                }}
                              />
                              <Legend />
                              <Bar dataKey="Reparaciones" fill="#10B981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Ventas ARS" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Ventas USD" fill="#0284C7" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Teléfonos ARS" fill="#F97316" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Teléfonos USD" fill="#EA580C" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Stock extra ARS" fill="#D97706" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Stock extra USD" fill="#B45309" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">No se pudieron calcular los ingresos de este mes.</p>
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
                            Trabajos + Ventas ARS + Repuestos ARS
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
                            Ventas USD + ganancia repuestos USD (stock extra)
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
                    
                    <ResponsiveContainer width="100%" height={320}>
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
                          formatter={(value, name) => [
                            name?.toString().includes("USD")
                              ? `USD ${Number(value).toLocaleString("es-AR")}`
                              : `$${Number(value).toLocaleString("es-AR")}`,
                            name,
                          ]}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Trabajos" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Ventas ARS" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Ventas USD" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Repuestos ARS" fill="#ea580c" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Repuestos USD" fill="#c2410c" radius={[4, 4, 0, 0]} />
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