"use client";

import { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import Header from "@/app/Header";

export default function MigracionEstadisticasCompleta() {
  const { rol } = useRol();
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultadosInventario, setResultadosInventario] = useState<any>(null);
  const [resultadosVentas, setResultadosVentas] = useState<any>(null);

  const ejecutarMigracion = async () => {
    if (!rol?.negocioID) {
      alert("No se detectó el negocio");
      return;
    }

    setProcesando(true);
    setProgreso("Iniciando migración completa...");
    setResultadosInventario(null);
    setResultadosVentas(null);

    try {
      const negocioID = rol.negocioID;

      // ==========================================
      // PARTE 1: MIGRACIÓN DE INVENTARIO
      // ==========================================
      
      setProgreso("📦 [1/2] Calculando estadísticas de INVENTARIO...");

      // 1. Repuestos
      const repuestosSnap = await getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`));
      let repuestosTotalUSD = 0, repuestosTotalARS = 0, repuestosCantidad = 0;

      repuestosSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const precioCosto = Number(data.precioCosto || 0);
        const cantidad = Number(data.cantidad || 0);
        const moneda = data.moneda || "ARS";

        if (moneda === "USD") {
          repuestosTotalUSD += precioCosto * cantidad;
        } else {
          repuestosTotalARS += precioCosto * cantidad;
        }
        repuestosCantidad++;
      });

      // 2. Accesorios
      const accesoriosSnap = await getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`));
      let accesoriosTotalUSD = 0, accesoriosTotalARS = 0, accesoriosCantidad = 0;

      accesoriosSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const precioCosto = Number(data.precioCosto || 0);
        const cantidad = Number(data.cantidad || 0);
        const moneda = data.moneda || "ARS";

        if (moneda === "USD") {
          accesoriosTotalUSD += precioCosto * cantidad;
        } else {
          accesoriosTotalARS += precioCosto * cantidad;
        }
        accesoriosCantidad++;
      });

      // 3. Teléfonos
      const telefonosSnap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      let telefonosTotalUSD = 0, telefonosTotalARS = 0, telefonosCantidad = 0;

      telefonosSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const precioCompra = Number(data.precioCompra || 0);
        const moneda = data.moneda || "ARS";

        if (moneda === "USD") {
          telefonosTotalUSD += precioCompra;
        } else {
          telefonosTotalARS += precioCompra;
        }
        telefonosCantidad++;
      });

      // 4. Stock Extra
      const stockExtraSnap = await getDocs(collection(db, `negocios/${negocioID}/stockExtra`));
      let stockExtraTotalUSD = 0, stockExtraCantidad = 0;

      stockExtraSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const precioCosto = Number(data.precioCosto || 0);
        const cantidad = Number(data.cantidad || 0);
        stockExtraTotalUSD += precioCosto * cantidad;
        stockExtraCantidad++;
      });

      // Guardar estadísticas de inventario
      const estadisticasInventario = {
        repuestos: {
          totalUSD: Math.round(repuestosTotalUSD * 100) / 100,
          totalARS: Math.round(repuestosTotalARS * 100) / 100,
          cantidad: repuestosCantidad,
        },
        accesorios: {
          totalUSD: Math.round(accesoriosTotalUSD * 100) / 100,
          totalARS: Math.round(accesoriosTotalARS * 100) / 100,
          cantidad: accesoriosCantidad,
        },
        telefonos: {
          totalUSD: Math.round(telefonosTotalUSD * 100) / 100,
          totalARS: Math.round(telefonosTotalARS * 100) / 100,
          cantidad: telefonosCantidad,
        },
        stockExtra: {
          totalUSD: Math.round(stockExtraTotalUSD * 100) / 100,
          totalARS: 0,
          cantidad: stockExtraCantidad,
        },
        ultimaActualizacion: new Date(),
      };

      await setDoc(doc(db, `negocios/${negocioID}/estadisticas/inventario`), estadisticasInventario);
      setResultadosInventario(estadisticasInventario);

      console.log("✅ Inventario migrado:", estadisticasInventario);

      // ==========================================
      // PARTE 2: MIGRACIÓN DE VENTAS Y TRABAJOS
      // ==========================================

      setProgreso("🛒 [2/2] Calculando estadísticas de VENTAS Y TRABAJOS...");

      // Cargar todos los trabajos y ventas
      const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const ventasSnap = await getDocs(collection(db, `negocios/${negocioID}/ventasGeneral`));

      const estadisticasPorMes: any = {};

      // Procesar trabajos
      trabajosSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const estado = data.estado;
        const fechaModificacion = data.fechaModificacion || "";

        if (!["REPARADO", "ENTREGADO", "PAGADO"].includes(estado) || !fechaModificacion) return;

        const partes = fechaModificacion.split("/");
        if (partes.length !== 3) return;

        const mes = String(partes[1]).padStart(2, "0");
        const anio = partes[2];
        const mesAnio = `${mes}-${anio}`;

        if (!estadisticasPorMes[mesAnio]) {
          estadisticasPorMes[mesAnio] = {
            mes: mesAnio,
            trabajosReparados: 0,
            accesoriosVendidos: 0,
            telefonosVendidos: 0,
            gananciaTrabajos: 0,
            gananciaVentasARS: 0,
            gananciaVentasUSD: 0,
          };
        }

        const precio = Number(data.precio || 0);
        const costo = Number(data.costo || 0);
        const ganancia = precio - costo;

        estadisticasPorMes[mesAnio].trabajosReparados++;
        estadisticasPorMes[mesAnio].gananciaTrabajos += ganancia;
      });

      // Procesar ventas
      ventasSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const fecha = data.fecha || "";
        const productos = data.productos || [];

        const partes = fecha.split("/");
        if (partes.length !== 3) return;

        const mes = String(partes[1]).padStart(2, "0");
        const anio = partes[2];
        const mesAnio = `${mes}-${anio}`;

        if (!estadisticasPorMes[mesAnio]) {
          estadisticasPorMes[mesAnio] = {
            mes: mesAnio,
            trabajosReparados: 0,
            accesoriosVendidos: 0,
            telefonosVendidos: 0,
            gananciaTrabajos: 0,
            gananciaVentasARS: 0,
            gananciaVentasUSD: 0,
          };
        }

         productos.forEach((p: any) => {
          const ganancia = Number(p.ganancia || 0);
          const cantidad = Number(p.cantidad || 1);
          const categoria = (p.categoria || p.tipo || "").toLowerCase();
          const moneda = p.moneda?.toUpperCase();
          console.log(`🔍 Venta: ${fecha} | Categoria: "${categoria}" | Tipo: "${p.tipo}" | Ganancia: ${ganancia} ${moneda}`);

          if (categoria === "teléfono" || categoria === "telefono" || p.tipo === "telefono") {
            estadisticasPorMes[mesAnio].telefonosVendidos += cantidad;
          
            if (moneda === "USD") {
              estadisticasPorMes[mesAnio].gananciaVentasUSD += ganancia;
            } else {
              estadisticasPorMes[mesAnio].gananciaVentasARS += ganancia;
            }
          } else if (p.tipo === "accesorio" || categoria === "repuesto") {
            estadisticasPorMes[mesAnio].accesoriosVendidos += cantidad;

            if (moneda === "USD") {
              estadisticasPorMes[mesAnio].gananciaVentasUSD += ganancia;
            } else {
              estadisticasPorMes[mesAnio].gananciaVentasARS += ganancia;
            }
          }
        });
      });

      // Guardar estadísticas de ventas por mes
      const mesesProcesados = Object.keys(estadisticasPorMes);
      
      for (const mesAnio of mesesProcesados) {
        const stats = estadisticasPorMes[mesAnio];
        await setDoc(doc(db, `negocios/${negocioID}/estadisticas/${mesAnio}`), {
          ...stats,
          ultimaActualizacion: new Date(),
        }, { merge: true });
      }

      setResultadosVentas(estadisticasPorMes);
      console.log("✅ Ventas migradas:", estadisticasPorMes);

      setProgreso(`✅ Migración completada: Inventario + ${mesesProcesados.length} meses de ventas`);

    } catch (error) {
      console.error("Error en migración:", error);
      setProgreso(`❌ Error: ${error}`);
    } finally {
      setProcesando(false);
    }
  };

  const formatearPrecio = (valor: number) => {
    return `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">🔄</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#2c3e50]">Migración Completa de Estadísticas</h1>
                <p className="text-[#7f8c8d]">Recalcula inventario + ventas en un solo paso</p>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <p className="text-sm text-[#2c3e50] font-medium mb-2">
                    <strong>¿Qué hace esta migración?</strong>
                  </p>
                  <ul className="text-sm text-[#2c3e50] space-y-1 list-disc list-inside">
                    <li><strong>Inventario:</strong> Calcula el capital invertido (repuestos, accesorios, teléfonos, stock extra)</li>
                    <li><strong>Ventas y Trabajos:</strong> Recalcula las ganancias de todos los meses desde cero</li>
                    <li>Actualiza Caja Mayor, Resumen de Ganancias y Panel de Control</li>
                    <li>Corrige estadísticas incorrectas o desactualizadas</li>
                    <li>Las estadísticas futuras se actualizan automáticamente con Cloud Functions</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={ejecutarMigracion}
              disabled={procesando}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 ${
                procesando
                  ? "bg-[#95a5a6] cursor-not-allowed"
                  : "bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] transform hover:scale-105 shadow-lg"
              }`}
            >
              {procesando ? "⏳ Procesando..." : "🚀 Ejecutar Migración Completa"}
            </button>

            {progreso && (
              <div className={`mt-6 rounded-xl p-4 ${
                progreso.includes("❌") ? "bg-red-50 border-2 border-red-200" : 
                progreso.includes("✅") ? "bg-green-50 border-2 border-green-200" :
                "bg-[#ecf0f1]"
              }`}>
                <p className="text-[#2c3e50] font-medium">{progreso}</p>
              </div>
            )}
          </div>

          {/* Resultados de Inventario */}
          {resultadosInventario && (
            <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] p-6">
              <h2 className="text-xl font-bold text-[#2c3e50] mb-4">📦 Inventario Migrado</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📦</span>
                    <h3 className="font-bold text-[#2c3e50]">Repuestos</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#7f8c8d]">Cantidad: <span className="font-bold text-[#2c3e50]">{resultadosInventario.repuestos.cantidad}</span></p>
                    <p className="text-green-700 font-bold">USD {formatearPrecio(resultadosInventario.repuestos.totalUSD)}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎧</span>
                    <h3 className="font-bold text-[#2c3e50]">Accesorios</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#7f8c8d]">Cantidad: <span className="font-bold text-[#2c3e50]">{resultadosInventario.accesorios.cantidad}</span></p>
                    <p className="text-blue-700 font-bold">USD {formatearPrecio(resultadosInventario.accesorios.totalUSD)}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📱</span>
                    <h3 className="font-bold text-[#2c3e50]">Teléfonos</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#7f8c8d]">Cantidad: <span className="font-bold text-[#2c3e50]">{resultadosInventario.telefonos.cantidad}</span></p>
                    <p className="text-purple-700 font-bold">USD {formatearPrecio(resultadosInventario.telefonos.totalUSD)}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border-2 border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📊</span>
                    <h3 className="font-bold text-[#2c3e50]">Stock Extra</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#7f8c8d]">Cantidad: <span className="font-bold text-[#2c3e50]">{resultadosInventario.stockExtra.cantidad}</span></p>
                    <p className="text-orange-700 font-bold">USD {formatearPrecio(resultadosInventario.stockExtra.totalUSD)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultados de Ventas */}
          {resultadosVentas && (
            <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] p-6">
              <h2 className="text-xl font-bold text-[#2c3e50] mb-4">🛒 Ventas y Trabajos Migrados</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.keys(resultadosVentas).sort().reverse().map((mes) => {
                  const stats = resultadosVentas[mes];
                  return (
                    <div key={mes} className="bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]">
                      <h3 className="font-bold text-[#2c3e50] mb-2">📅 {mes}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-[#7f8c8d]">Trabajos:</span>
                          <span className="font-bold text-[#2c3e50] ml-2">{stats.trabajosReparados}</span>
                        </div>
                        <div>
                          <span className="text-[#7f8c8d]">Teléfonos:</span>
                          <span className="font-bold text-[#2c3e50] ml-2">{stats.telefonosVendidos}</span>
                        </div>
                        <div>
                          <span className="text-[#7f8c8d]">Accesorios:</span>
                          <span className="font-bold text-[#2c3e50] ml-2">{stats.accesoriosVendidos}</span>
                        </div>
                        <div>
                          <span className="text-[#7f8c8d]">Ganancia Trabajos:</span>
                          <span className="font-bold text-green-600 ml-2">{formatearPrecio(stats.gananciaTrabajos)}</span>
                        </div>
                        <div>
                          <span className="text-[#7f8c8d]">Ganancia ARS:</span>
                          <span className="font-bold text-blue-600 ml-2">{formatearPrecio(stats.gananciaVentasARS)}</span>
                        </div>
                        <div>
                          <span className="text-[#7f8c8d]">Ganancia USD:</span>
                          <span className="font-bold text-yellow-600 ml-2">{formatearPrecio(stats.gananciaVentasUSD)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(resultadosInventario || resultadosVentas) && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-sm text-[#27ae60] font-medium text-center">
                ✅ Migración completada. Revisá Caja Mayor, Resumen de Ganancias y Panel de Control.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}