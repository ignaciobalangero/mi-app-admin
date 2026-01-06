"use client";

import { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import Header from "@/app/Header";

export default function MigracionEstadisticasInventario() {
  const { rol } = useRol();
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultados, setResultados] = useState<any>(null);

  const ejecutarMigracion = async () => {
    if (!rol?.negocioID) {
      alert("No se detectó el negocio");
      return;
    }

    setProcesando(true);
    setProgreso("Iniciando migración de estadísticas de inventario...");
    setResultados(null);

    try {
      const negocioID = rol.negocioID;

 // ========================================
      // 1. CALCULAR ESTADÍSTICAS DE REPUESTOS
      // ========================================
      setProgreso("📦 Calculando estadísticas de repuestos...");
      const repuestosSnap = await getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`));
      
      let repuestosTotalUSD = 0;
      let repuestosTotalARS = 0;
      let repuestosCantidad = 0;

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

      console.log(`✅ ${repuestosCantidad} repuestos procesados - USD ${repuestosTotalUSD.toFixed(2)} | ARS ${repuestosTotalARS.toFixed(2)}`);

      // ========================================
      // 2. CALCULAR ESTADÍSTICAS DE ACCESORIOS
      // ========================================
      setProgreso("🎧 Calculando estadísticas de accesorios...");
      const accesoriosSnap = await getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`));
      
      let accesoriosTotalUSD = 0;
      let accesoriosTotalARS = 0;
      let accesoriosCantidad = 0;

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

      console.log(`✅ ${accesoriosCantidad} accesorios procesados - USD ${accesoriosTotalUSD.toFixed(2)} | ARS ${accesoriosTotalARS.toFixed(2)}`);

      // ========================================
      // 3. CALCULAR ESTADÍSTICAS DE TELÉFONOS
      // ========================================
      setProgreso("📱 Calculando estadísticas de teléfonos...");
      const telefonosSnap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      
      let telefonosTotalUSD = 0;
      let telefonosTotalARS = 0;
      let telefonosCantidad = 0;

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

      console.log(`✅ ${telefonosCantidad} teléfonos procesados - USD ${telefonosTotalUSD.toFixed(2)} | ARS ${telefonosTotalARS.toFixed(2)}`);

      // ========================================
      // 4. GUARDAR EN FIREBASE
      // ========================================
      setProgreso("💾 Guardando estadísticas en Firebase...");

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
        ultimaActualizacion: new Date(),
      };
      const docRef = doc(db, `negocios/${negocioID}/estadisticas/inventario`);
      await setDoc(docRef, estadisticasInventario);

      console.log("✅ Estadísticas guardadas:", estadisticasInventario);

      setResultados(estadisticasInventario);
      setProgreso("✅ Migración completada exitosamente");

    } catch (error) {
      console.error("Error en migración:", error);
      setProgreso(`❌ Error: ${error}`);
    } finally {
      setProcesando(false);
    }
  };

  const formatearPrecio = (valor: number) => {
    return `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#2c3e50]">Migración de Estadísticas de Inventario</h1>
                <p className="text-[#7f8c8d]">Calcula el capital total de tu inventario</p>
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
                    <li>Procesa TODOS los repuestos, accesorios y teléfonos</li>
                    <li>Calcula el valor total del inventario en USD y ARS</li>
                    <li>Genera un documento de estadísticas consolidado</li>
                    <li>Optimiza la Caja Mayor para mostrar capital en 1 lectura</li>
                    <li>Las estadísticas futuras se actualizan automáticamente</li>
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
              {procesando ? "⏳ Procesando..." : "🚀 Ejecutar Migración de Inventario"}
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

          {resultados && (
            <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] p-6">
              <h2 className="text-xl font-bold text-[#2c3e50] mb-4">📈 Resultados de la Migración</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Repuestos */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📦</span>
                    <h3 className="font-bold text-[#2c3e50]">Repuestos</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#7f8c8d]">Cantidad: <span className="font-bold text-[#2c3e50]">{resultados.repuestos.cantidad}</span></p>
                    <p className="text-green-700 font-bold">USD {formatearPrecio(resultados.repuestos.totalUSD)}</p>
                    <p className="text-green-600">ARS {formatearPrecio(resultados.repuestos.totalARS)}</p>
                  </div>
                </div>

                {/* Accesorios */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎧</span>
                    <h3 className="font-bold text-[#2c3e50]">Accesorios</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#7f8c8d]">Cantidad: <span className="font-bold text-[#2c3e50]">{resultados.accesorios.cantidad}</span></p>
                    <p className="text-blue-700 font-bold">USD {formatearPrecio(resultados.accesorios.totalUSD)}</p>
                    <p className="text-blue-600">ARS {formatearPrecio(resultados.accesorios.totalARS)}</p>
                  </div>
                </div>

                {/* Teléfonos */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📱</span>
                    <h3 className="font-bold text-[#2c3e50]">Teléfonos</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#7f8c8d]">Cantidad: <span className="font-bold text-[#2c3e50]">{resultados.telefonos.cantidad}</span></p>
                    <p className="text-purple-700 font-bold">USD {formatearPrecio(resultados.telefonos.totalUSD)}</p>
                    <p className="text-purple-600">ARS {formatearPrecio(resultados.telefonos.totalARS)}</p>
                  </div>
                </div>
              </div>

              {/* Total General */}
              <div className="mt-6 bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-xl p-6 text-white">
                <h3 className="text-xl font-bold mb-4">💰 Capital Total del Inventario</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-100 text-sm">Total en Dólares</p>
                    <p className="text-3xl font-bold">
                      USD {formatearPrecio(
                        resultados.repuestos.totalUSD + 
                        resultados.accesorios.totalUSD + 
                        resultados.telefonos.totalUSD
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Total en Pesos</p>
                    <p className="text-3xl font-bold">
                      ARS {formatearPrecio(
                        resultados.repuestos.totalARS + 
                        resultados.accesorios.totalARS + 
                        resultados.telefonos.totalARS
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-sm text-[#27ae60] font-medium text-center">
                  ✅ Ahora podés ir a Caja Mayor para ver las estadísticas consolidadas
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}