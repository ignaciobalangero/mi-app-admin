"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";
import Header from "@/app/Header";

interface ResultadoMigracion {
  cliente: string;
  saldoARS: number;
  saldoUSD: number;
  trabajos: number;
  ventas: number;
  pagos: number;
  estado: 'pendiente' | 'procesando' | 'completado' | 'error';
  error?: string;
}

export default function MigracionPage() {
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const router = useRouter();
  const [negocioID, setNegocioID] = useState<string>("");
  const [modoPrueba, setModoPrueba] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoMigracion[]>([]);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  useEffect(() => {
    if (rol?.tipo === "cliente") {
      router.push("/");
      return;
    }
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol, router]);

  const ejecutarMigracion = async () => {
    if (!negocioID) {
      alert("❌ No se detectó el ID del negocio");
      return;
    }
  
    setEjecutando(true);
    setResultados([]);
    
    try {
      console.log(`🚀 Iniciando migración (Modo: ${modoPrueba ? 'PRUEBA' : 'REAL'})`);
      
      const clientesSnap = await getDocs(
        collection(db, `negocios/${negocioID}/clientes`)
      );
  
      console.log(`📊 Total de clientes a procesar: ${clientesSnap.size}`);
      setProgreso({ actual: 0, total: clientesSnap.size });
  
      const resultadosTemp: ResultadoMigracion[] = [];
  
      for (let i = 0; i < clientesSnap.docs.length; i++) {
        const clienteDoc = clientesSnap.docs[i];
        const clienteID = clienteDoc.id;
        const datosCliente = clienteDoc.data();
        
        const nombreCliente = datosCliente.nombre || clienteID;
  
        console.log(`\n📝 [${i + 1}/${clientesSnap.size}]`);
        console.log(`   ID: ${clienteID}`);
        console.log(`   Nombre: ${nombreCliente}`);
        
        setProgreso({ actual: i + 1, total: clientesSnap.size });
  
        try {
          const [trabajosSnap, ventasSnap, pagosSnap] = await Promise.all([
            getDocs(
              query(
                collection(db, `negocios/${negocioID}/trabajos`),
                where("cliente", "==", nombreCliente),
                where("estado", "in", ["ENTREGADO", "PAGADO"])
              )
            ),
            getDocs(
              query(
                collection(db, `negocios/${negocioID}/ventasGeneral`),
                where("cliente", "==", nombreCliente)
              )
            ),
            getDocs(
              query(
                collection(db, `negocios/${negocioID}/pagos`),
                where("cliente", "==", nombreCliente)
              )
            )
          ]);
  
          console.log(`   Trabajos: ${trabajosSnap.size}`);
          console.log(`   Ventas: ${ventasSnap.size}`);
          console.log(`   Pagos: ${pagosSnap.size}`);
  
          let totalTrabajosARS = 0;
          let totalTrabajosUSD = 0;
          let totalVentasARS = 0;
          let totalVentasUSD = 0;
          let totalPagosARS = 0;
          let totalPagosUSD = 0;
  
          // Procesar trabajos
          trabajosSnap.forEach((doc) => {
            const t = doc.data();
            const precio = Number(t.precio || 0);
            const moneda = t.moneda || "ARS";
  
            if (moneda === "USD") {
              totalTrabajosUSD += precio;
            } else {
              totalTrabajosARS += precio;
            }
          });
  
          // Procesar ventas - LÓGICA CORREGIDA
          ventasSnap.forEach((doc) => {
            const v = doc.data();
            const productos = v.productos || [];
  
            const hayTelefono = productos.some((prod: any) => prod.categoria === "Teléfono");
  
            let totalVentaPesos = 0;
            let totalVentaUSD = 0;
  
            productos.forEach((p: any) => {
              if (hayTelefono) {
                if (p.categoria === "Teléfono") {
                  if (p.moneda?.toUpperCase() === "USD") {
                    totalVentaUSD += p.precioUnitario * p.cantidad;
                  } else {
                    totalVentaPesos += p.precioUnitario * p.cantidad;
                  }
                } else {
                  if (p.moneda?.toUpperCase() === "USD") {
                    totalVentaUSD += p.precioUnitario * p.cantidad;
                  } else {
                    totalVentaPesos += p.precioUnitario * p.cantidad;
                  }
                }
              } else {
                totalVentaPesos += p.precioUnitario * p.cantidad;
              }
            });
  
            totalVentasARS += totalVentaPesos;
            totalVentasUSD += totalVentaUSD;
          });
  
          // Procesar pagos
          pagosSnap.forEach((doc) => {
            const p = doc.data();
            const moneda = p.moneda || "ARS";
  
            if (moneda === "USD") {
              totalPagosUSD += Number(p.montoUSD || 0);
            } else {
              totalPagosARS += Number(p.monto || 0);
            }
          });
  
          const saldoARS = (totalTrabajosARS + totalVentasARS) - totalPagosARS;
          const saldoUSD = (totalTrabajosUSD + totalVentasUSD) - totalPagosUSD;
  
          console.log(`   Total Trabajos ARS: $${totalTrabajosARS}`);
          console.log(`   Total Trabajos USD: US$${totalTrabajosUSD}`);
          console.log(`   Total Ventas ARS: $${totalVentasARS}`);
          console.log(`   Total Ventas USD: US$${totalVentasUSD}`);
          console.log(`   Total Pagos ARS: $${totalPagosARS}`);
          console.log(`   Total Pagos USD: US$${totalPagosUSD}`);
          console.log(`   SALDO ARS: $${saldoARS}`);
          console.log(`   SALDO USD: US$${saldoUSD}`);
  
          const resultado: ResultadoMigracion = {
            cliente: nombreCliente,
            saldoARS: Math.round(saldoARS * 100) / 100,
            saldoUSD: Math.round(saldoUSD * 100) / 100,
            trabajos: trabajosSnap.size,
            ventas: ventasSnap.size,
            pagos: pagosSnap.size,
            estado: 'procesando'
          };
  
          if (!modoPrueba) {
            await updateDoc(clienteDoc.ref, {
              saldoARS: resultado.saldoARS,
              saldoUSD: resultado.saldoUSD,
              saldoAnteriorARS: datosCliente.saldoARS || null,
              saldoAnteriorUSD: datosCliente.saldoUSD || null,
              ultimaActualizacion: serverTimestamp(),
              migracionFecha: new Date().toISOString()
            });
            console.log(`✅ GUARDADO en Firebase`);
          } else {
            console.log(`🔍 SIMULADO (no se guardó)`);
          }
  
          resultado.estado = 'completado';
          resultadosTemp.push(resultado);
          setResultados([...resultadosTemp]);
  
        } catch (error) {
          console.error(`❌ Error procesando ${nombreCliente}:`, error);
          resultadosTemp.push({
            cliente: nombreCliente,
            saldoARS: 0,
            saldoUSD: 0,
            trabajos: 0,
            ventas: 0,
            pagos: 0,
            estado: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
          setResultados([...resultadosTemp]);
        }
      }
  
      console.log("\n📋 MIGRACIÓN COMPLETADA");
      console.log(`   Modo: ${modoPrueba ? '🔍 PRUEBA' : '✅ REAL'}`);
      console.log(`   Total procesados: ${resultadosTemp.length}`);
      console.log(`   Exitosos: ${resultadosTemp.filter(r => r.estado === 'completado').length}`);
      console.log(`   Con errores: ${resultadosTemp.filter(r => r.estado === 'error').length}`);
      console.log(`   Con saldo: ${resultadosTemp.filter(r => r.saldoARS !== 0 || r.saldoUSD !== 0).length}`);
  
      descargarReporte(resultadosTemp);
  
      alert(
        modoPrueba 
          ? `✅ Simulación completada: ${resultadosTemp.length} clientes procesados\n\n` +
            `Clientes con saldo: ${resultadosTemp.filter(r => r.saldoARS !== 0 || r.saldoUSD !== 0).length}\n\n` +
            `Revisa el reporte descargado antes de ejecutar en modo REAL.`
          : `✅ Migración REAL completada: ${resultadosTemp.length} clientes actualizados\n\n¡Los saldos ya están en Firebase!`
      );
  
    } catch (error) {
      console.error("❌ Error general en migración:", error);
      alert("❌ Error en la migración. Revisa la consola para más detalles.");
    } finally {
      setEjecutando(false);
    }
  };

  // Descargar reporte en JSON
  const descargarReporte = (resultados: ResultadoMigracion[]) => {
    const reporte = {
      fecha: new Date().toISOString(),
      negocioID: negocioID,
      modoPrueba: modoPrueba,
      totalClientes: resultados.length,
      exitosos: resultados.filter(r => r.estado === 'completado').length,
      errores: resultados.filter(r => r.estado === 'error').length,
      resultados: resultados
    };

    const reporteStr = JSON.stringify(reporte, null, 2);
    const dataBlob = new Blob([reporteStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-migracion-${modoPrueba ? 'prueba' : 'real'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (rol?.tipo === "cliente") return null;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-xl flex items-center justify-center">
                <span className="text-2xl text-white">🔄</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#2c3e50]">Migración de Saldos</h1>
                <p className="text-[#7f8c8d]">Crear campos saldoARS y saldoUSD en todos los clientes</p>
              </div>
            </div>
          </div>

          {/* Advertencia importante */}
          <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span>⚠️</span>
              IMPORTANTE - Lee antes de continuar
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1">1.</span>
                <span><strong>Haz backup ANTES</strong> de ejecutar la migración real</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">2.</span>
                <span><strong>Ejecuta primero en modo PRUEBA</strong> para verificar los cálculos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">3.</span>
                <span><strong>Revisa el reporte descargado</strong> antes de ejecutar en modo REAL</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">4.</span>
                <span><strong>Modo REAL modifica Firebase</strong> - no se puede deshacer fácilmente sin backup</span>
              </li>
            </ul>
          </div>

          {/* Selector de modo */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
            <h2 className="text-xl font-bold text-[#2c3e50] mb-4 flex items-center gap-2">
              <span>⚙️</span>
              Configuración
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={modoPrueba}
                    onChange={() => setModoPrueba(true)}
                    disabled={ejecutando}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-[#2c3e50]">🔍 Modo PRUEBA</span>
                    <p className="text-sm text-[#7f8c8d]">Simula la migración sin modificar Firebase (recomendado primero)</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={!modoPrueba}
                    onChange={() => setModoPrueba(false)}
                    disabled={ejecutando}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-[#e74c3c]">⚠️ Modo REAL</span>
                    <p className="text-sm text-[#7f8c8d]">Modifica Firebase - crea los campos saldoARS y saldoUSD (requiere backup)</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Botón de ejecución */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
            <button
              onClick={() => {
                if (!modoPrueba) {
                  setMostrarConfirmacion(true);
                } else {
                  ejecutarMigracion();
                }
              }}
              disabled={ejecutando || !negocioID}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                modoPrueba
                  ? 'bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white'
                  : 'bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white'
              }`}
            >
              {ejecutando ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Ejecutando migración... {progreso.actual}/{progreso.total}
                </>
              ) : (
                <>
                  <span className="text-2xl">{modoPrueba ? '🔍' : '⚠️'}</span>
                  {modoPrueba ? 'Ejecutar Simulación (PRUEBA)' : 'Ejecutar Migración REAL'}
                </>
              )}
            </button>
          </div>

          {/* Progreso */}
          {ejecutando && progreso.total > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
              <div className="mb-2 flex justify-between text-sm text-[#7f8c8d]">
                <span>Progreso</span>
                <span>{Math.round((progreso.actual / progreso.total) * 100)}%</span>
              </div>
              <div className="w-full bg-[#ecf0f1] rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#3498db] to-[#2980b9] h-full transition-all duration-300 flex items-center justify-center text-xs text-white font-bold"
                  style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
                >
                  {progreso.actual}/{progreso.total}
                </div>
              </div>
            </div>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] overflow-hidden">
              <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white p-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>📊</span>
                  Resultados ({resultados.length} clientes)
                </h3>
              </div>
              
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-[#ecf0f1] sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">Cliente</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">Saldo ARS</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">Saldo USD</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">Datos</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border-b-2 border-[#bdc3c7]">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((resultado, index) => (
                      <tr key={index} className="border-b border-[#ecf0f1] hover:bg-[#f8f9fa]">
                        <td className="p-3 text-sm text-[#2c3e50]">{resultado.cliente}</td>
                        <td className="p-3 text-center">
                          <span className={`text-sm font-bold ${
                            resultado.saldoARS > 0 ? 'text-[#e74c3c]' : 
                            resultado.saldoARS < 0 ? 'text-[#27ae60]' : 
                            'text-[#7f8c8d]'
                          }`}>
                            ${resultado.saldoARS.toLocaleString("es-AR")}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-sm font-bold ${
                            resultado.saldoUSD > 0 ? 'text-[#e74c3c]' : 
                            resultado.saldoUSD < 0 ? 'text-[#27ae60]' : 
                            'text-[#7f8c8d]'
                          }`}>
                            US${resultado.saldoUSD.toLocaleString("en-US")}
                          </span>
                        </td>
                        <td className="p-3 text-center text-xs text-[#7f8c8d]">
                          T:{resultado.trabajos} V:{resultado.ventas} P:{resultado.pagos}
                        </td>
                        <td className="p-3 text-center">
                          {resultado.estado === 'completado' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#27ae60] text-white">
                              ✓ OK
                            </span>
                          )}
                          {resultado.estado === 'error' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#e74c3c] text-white" title={resultado.error}>
                              ✗ Error
                            </span>
                          )}
                          {resultado.estado === 'procesando' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3498db] text-white">
                              ⟳ Procesando
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-[#f8f9fa] p-4 border-t border-[#bdc3c7]">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#7f8c8d]">
                    Exitosos: <strong className="text-[#27ae60]">{resultados.filter(r => r.estado === 'completado').length}</strong>
                    {' | '}
                    Errores: <strong className="text-[#e74c3c]">{resultados.filter(r => r.estado === 'error').length}</strong>
                  </span>
                  <span className="text-[#7f8c8d]">
                    {modoPrueba ? '🔍 Modo PRUEBA - No se guardó nada' : '✅ Modo REAL - Guardado en Firebase'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal de confirmación para modo REAL */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-4 border-[#e74c3c] max-w-lg w-full p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[#e74c3c] rounded-full flex items-center justify-center">
                <span className="text-3xl text-white">⚠️</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#2c3e50]">¡Confirmación Requerida!</h3>
                <p className="text-[#7f8c8d]">Esta acción modificará Firebase</p>
              </div>
            </div>

            <div className="bg-[#fef5e7] border-2 border-[#f39c12] rounded-lg p-4 mb-6">
              <p className="text-sm text-[#2c3e50] font-medium mb-3">
                Estás a punto de ejecutar la migración en <strong>MODO REAL</strong>. Esto creará los campos saldoARS y saldoUSD en todos los clientes.
              </p>
              <ul className="space-y-1 text-sm text-[#7f8c8d]">
                <li>✓ ¿Hiciste backup de los clientes?</li>
                <li>✓ ¿Ejecutaste y revisaste el modo PRUEBA?</li>
                <li>✓ ¿Verificaste que los saldos son correctos?</li>
              </ul>
            </div>

            <div className="flex gap-3">
  <button
    onClick={() => setMostrarConfirmacion(false)}
    className="flex-1 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-6 py-3 rounded-lg font-semibold transition-all"
  >
    Cancelar
  </button>
  <button
    onClick={() => {
      setMostrarConfirmacion(false);
      ejecutarMigracion();
    }}
    className="flex-1 bg-[#e74c3c] hover:bg-[#c0392b] text-white px-6 py-3 rounded-lg font-semibold transition-all"
  >
    Sí, Ejecutar REAL
  </button>
</div>
          </div>
        </div>
      )}
    </>
  );
}