"use client";

import { useState } from "react";
import { collection, getDocs, doc, writeBatch, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";
import Header from "@/app/Header";

interface ClienteSaldo {
  id: string;
  nombre: string;
  saldoActualARS: number;
  saldoActualUSD: number;
  saldoCalculadoARS: number;
  saldoCalculadoUSD: number;
  deudaTrabajosARS: number;
  deudaTrabajosUSD: number;
  deudaVentasARS: number;
  deudaVentasUSD: number;
  pagosARS: number;
  pagosUSD: number;
  diferencia: boolean;
}

export default function RecalcularSaldosPage() {
  const { rol } = useRol();
  const router = useRouter();
  const [calculando, setCalculando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [clientes, setClientes] = useState<ClienteSaldo[]>([]);
  const [mostrarSoloConDiferencia, setMostrarSoloConDiferencia] = useState(false);

  // ⭐ VALIDACIÓN CORREGIDA: Solo verificar que tenga negocioID
  if (!rol || !rol.negocioID) {
    return (
      <>
        <Header />
        <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-100 border-2 border-red-500 rounded-xl p-6 text-center">
              <h1 className="text-2xl font-bold text-red-800 mb-2">⛔ Acceso Denegado</h1>
              <p className="text-red-700">Debes estar autenticado para acceder a esta página.</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const calcularSaldos = async () => {
    if (!rol?.negocioID) return;
    
    setCalculando(true);
    try {
      console.log("🔄 Iniciando cálculo de saldos...");
      
      // ⚡ OPTIMIZACIÓN: Leer todas las colecciones UNA SOLA VEZ en paralelo
      const [clientesSnap, trabajosSnap, ventasSnap, pagosSnap] = await Promise.all([
        getDocs(collection(db, `negocios/${rol.negocioID}/clientes`)),
        getDocs(collection(db, `negocios/${rol.negocioID}/trabajos`)),
        getDocs(collection(db, `negocios/${rol.negocioID}/ventasGeneral`)),
        getDocs(collection(db, `negocios/${rol.negocioID}/pagos`))
      ]);

      console.log(`✅ Datos cargados: ${clientesSnap.size} clientes, ${trabajosSnap.size} trabajos, ${ventasSnap.size} ventas, ${pagosSnap.size} pagos`);

      const resultados: ClienteSaldo[] = [];

      // ⚡ Iterar sobre clientes y filtrar en memoria
      for (const clienteDoc of clientesSnap.docs) {
        const datosCliente = clienteDoc.data();
        const nombreCliente = datosCliente.nombre;

        const saldoActualARS = datosCliente.saldoARS || 0;
        const saldoActualUSD = datosCliente.saldoUSD || 0;

        // ⚡ Filtrar trabajos en memoria
        let deudaTrabajosARS = 0;
        let deudaTrabajosUSD = 0;

        trabajosSnap.docs.forEach(doc => {
          const trabajo = doc.data();
          if (trabajo.cliente === nombreCliente && 
              (trabajo.estado === "ENTREGADO" || trabajo.estado === "PAGADO") &&
              trabajo.precio) {
            const precio = Number(trabajo.precio);
            const moneda = trabajo.moneda || "ARS";
            
            if (moneda === "USD") {
              deudaTrabajosUSD += precio;
            } else {
              deudaTrabajosARS += precio;
            }
          }
        });

       // ⚡ Filtrar ventas en memoria - ⭐ CON LOGS
// ⚡ Filtrar ventas en memoria - ⭐ SIEMPRE CALCULAR DESDE PRODUCTOS
let deudaVentasARS = 0;
let deudaVentasUSD = 0;

ventasSnap.docs.forEach(doc => {
  const venta = doc.data();
  if (venta.cliente === nombreCliente) {
    console.log(`🛍️ Venta: tipo=${venta.tipo}, fecha=${venta.fecha}`);
    
    // ⭐ SIEMPRE calcular desde productos si existen
    if (venta.productos && Array.isArray(venta.productos) && venta.productos.length > 0) {
      console.log(`  → Calculando desde productos (${venta.productos.length})`);
      
      venta.productos.forEach((producto: any) => {
        const precio = Number(producto.precioUnitario || producto.precioVenta || 0);
        const cantidad = producto.cantidad || 1;
        const monedaProd = producto.moneda || "ARS";
        
        console.log(`    - ${producto.modelo}: ${precio} ${monedaProd} x${cantidad}`);
        
        if (monedaProd === "USD") {
          deudaVentasUSD += precio * cantidad;
        } else {
          deudaVentasARS += precio * cantidad;
        }
      });
    }
    // Si no tiene productos, usar total (ventas muy viejas)
    else {
      const totalVenta = venta.total || 0;
      const monedaVenta = venta.moneda || "ARS";
      console.log(`  → Sin productos, usando total: ${totalVenta} ${monedaVenta}`);
      
      if (totalVenta > 0) {
        if (monedaVenta === "USD") {
          deudaVentasUSD += totalVenta;
        } else {
          deudaVentasARS += totalVenta;
        }
      }
    }
  }
});

console.log(`✅ ${nombreCliente}: Total ventas ARS=${deudaVentasARS}, USD=${deudaVentasUSD}`);

        // ⚡ Filtrar pagos en memoria - ⭐ CORREGIDO
      // ⚡ Filtrar pagos en memoria - ⭐ CON LOGS
let pagosARS = 0;
let pagosUSD = 0;

pagosSnap.docs.forEach(doc => {
  const pago = doc.data();
  if (pago.cliente === nombreCliente) {
    console.log(`💳 Pago: moneda=${pago.moneda}, monto=${pago.monto}, montoUSD=${pago.montoUSD}`);
    
    // Si tiene montoUSD, es un pago USD
    if (pago.montoUSD && pago.montoUSD > 0) {
      console.log(`  → Sumando USD: ${pago.montoUSD}`);
      pagosUSD += Number(pago.montoUSD);
    } 
    // Si tiene monto, es un pago ARS
    else if (pago.monto && pago.monto > 0) {
      console.log(`  → Sumando ARS: ${pago.monto}`);
      pagosARS += Number(pago.monto);
    }
  }
});

console.log(`✅ ${nombreCliente}: Total pagos ARS=${pagosARS}, USD=${pagosUSD}`);

        // Calcular saldo correcto
        const saldoCalculadoARS = Math.round((deudaTrabajosARS + deudaVentasARS - pagosARS) * 100) / 100;
        const saldoCalculadoUSD = Math.round((deudaTrabajosUSD + deudaVentasUSD - pagosUSD) * 100) / 100;

        // Verificar diferencias (tolerancia: 1 ARS, 0.01 USD)
        const diferencia = 
          Math.abs(saldoActualARS - saldoCalculadoARS) > 1 ||
          Math.abs(saldoActualUSD - saldoCalculadoUSD) > 0.01;

        resultados.push({
          id: clienteDoc.id,
          nombre: nombreCliente,
          saldoActualARS,
          saldoActualUSD,
          saldoCalculadoARS,
          saldoCalculadoUSD,
          deudaTrabajosARS,
          deudaTrabajosUSD,
          deudaVentasARS,
          deudaVentasUSD,
          pagosARS,
          pagosUSD,
          diferencia
        });
      }

      // Ordenar: primero los que tienen diferencias
      resultados.sort((a, b) => {
        if (a.diferencia && !b.diferencia) return -1;
        if (!a.diferencia && b.diferencia) return 1;
        return a.nombre.localeCompare(b.nombre);
      });

      console.log(`✅ Cálculo completado: ${resultados.filter(r => r.diferencia).length} clientes con diferencias`);
      setClientes(resultados);
      
    } catch (error) {
      console.error("❌ Error calculando saldos:", error);
      alert("Error al calcular saldos");
    } finally {
      setCalculando(false);
    }
  };

  const aplicarCorrecciones = async () => {
    if (!rol?.negocioID) return;
    
    const clientesConDiferencia = clientes.filter(c => c.diferencia);
    
    if (clientesConDiferencia.length === 0) {
      alert("No hay diferencias para corregir");
      return;
    }

    const confirmacion = window.confirm(
      `¿Estás seguro que querés corregir los saldos de ${clientesConDiferencia.length} cliente(s)?\n\nEsta acción NO se puede deshacer.`
    );

    if (!confirmacion) return;

    setAplicando(true);
    try {
      console.log(`🔄 Aplicando correcciones a ${clientesConDiferencia.length} clientes...`);
      
      const batch = writeBatch(db);
      let contador = 0;

      for (const cliente of clientesConDiferencia) {
        const clienteRef = doc(db, `negocios/${rol.negocioID}/clientes/${cliente.id}`);
        
        batch.update(clienteRef, {
          saldoARS: cliente.saldoCalculadoARS,
          saldoUSD: cliente.saldoCalculadoUSD,
          ultimaActualizacion: new Date(),
          recalculadoEn: new Date().toISOString()
        });

        contador++;

        // Firestore tiene límite de 500 operaciones por batch
        if (contador % 500 === 0) {
          await batch.commit();
          console.log(`✅ Batch ${Math.floor(contador / 500)} completado`);
        }
      }

      // Commit final
      await batch.commit();
      console.log("✅ Todas las correcciones aplicadas");

      // ⭐ Marcar que este negocio ya usó el recálculo
      const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
      await setDoc(configRef, {
        recalculoUsado: true,
        fechaRecalculo: new Date().toISOString()
      }, { merge: true });

      console.log("✅ Marcado como usado en configuración");

      alert(`✅ Saldos corregidos exitosamente para ${clientesConDiferencia.length} cliente(s)\n\n⚠️ Esta herramienta ya no estará disponible para este negocio.`);
      
      // Redirigir a cuenta corriente después de 2 segundos
      setTimeout(() => {
        router.push("/cuenta-corriente");
      }, 2000);

    } catch (error) {
      console.error("❌ Error aplicando correcciones:", error);
      alert("Error al aplicar correcciones");
    } finally {
      setAplicando(false);
    }
  };

  const clientesFiltrados = mostrarSoloConDiferencia 
    ? clientes.filter(c => c.diferencia)
    : clientes;

  const totalConDiferencia = clientes.filter(c => c.diferencia).length;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl text-white">🔄</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#2c3e50]">Recalcular Saldos</h1>
                  <p className="text-sm sm:text-base text-[#7f8c8d]">Herramienta de emergencia para corregir inconsistencias</p>
                </div>
              </div>
              
              <button
                onClick={() => router.push("/cuenta-corriente")}
                className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200"
              >
                ← Volver
              </button>
            </div>
          </div>

          {/* Advertencia */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-500 rounded-xl p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-800 mb-2">ADVERTENCIA - Solo usar en emergencias</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Esta herramienta recalcula TODOS los saldos desde cero</li>
                  <li>• Revisar siempre el PREVIEW antes de aplicar cambios</li>
                  <li>• Los cambios NO se pueden deshacer</li>
                  <li>• Usar solo si hay inconsistencias evidentes</li>
                  <li>• ⭐ Después de usarla, NO podrás volver a acceder</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={calcularSaldos}
                disabled={calculando || aplicando}
                className={`flex-1 py-3 px-6 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 ${
                  calculando || aplicando
                    ? "bg-[#bdc3c7] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c]"
                }`}
              >
                {calculando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Calculando...
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    Calcular Diferencias
                  </>
                )}
              </button>

              {clientes.length > 0 && (
                <button
                  onClick={aplicarCorrecciones}
                  disabled={calculando || aplicando || totalConDiferencia === 0}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 ${
                    calculando || aplicando || totalConDiferencia === 0
                      ? "bg-[#bdc3c7] cursor-not-allowed"
                      : "bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226]"
                  }`}
                >
                  {aplicando ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <span>✅</span>
                      Aplicar Correcciones ({totalConDiferencia})
                    </>
                  )}
                </button>
              )}
            </div>

            {clientes.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="soloConDiferencia"
                  checked={mostrarSoloConDiferencia}
                  onChange={(e) => setMostrarSoloConDiferencia(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="soloConDiferencia" className="text-sm text-[#7f8c8d]">
                  Mostrar solo clientes con diferencias ({totalConDiferencia})
                </label>
              </div>
            )}
          </div>

          {/* Resultados */}
          {clientes.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
              <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4">
                <h3 className="text-lg font-bold">
                  Resultados: {clientesFiltrados.length} cliente(s)
                  {totalConDiferencia > 0 && ` - ${totalConDiferencia} con diferencias`}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#ecf0f1]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold border border-[#bdc3c7] min-w-[200px] bg-[#ecf0f1] text-[#2c3e50]">
                        Cliente
                      </th>
                      <th className="p-3 text-center text-sm font-semibold border border-[#bdc3c7] min-w-[120px] bg-[#ecf0f1] text-[#2c3e50]">
                        Estado
                      </th>
                      <th className="p-3 text-center text-sm font-semibold border border-[#bdc3c7] min-w-[140px] bg-[#ecf0f1] text-[#2c3e50]">
                        Saldo Actual ARS
                      </th>
                      <th className="p-3 text-center text-sm font-semibold border border-[#bdc3c7] min-w-[160px] bg-[#ecf0f1] text-[#2c3e50]">
                        Saldo Calculado ARS
                      </th>
                      <th className="p-3 text-center text-sm font-semibold border border-[#bdc3c7] min-w-[140px] bg-[#ecf0f1] text-[#2c3e50]">
                        Saldo Actual USD
                      </th>
                      <th className="p-3 text-center text-sm font-semibold border border-[#bdc3c7] min-w-[160px] bg-[#ecf0f1] text-[#2c3e50]">
                        Saldo Calculado USD
                      </th>
                      <th className="p-3 text-center text-sm font-semibold border border-[#bdc3c7] min-w-[250px] bg-[#ecf0f1] text-[#2c3e50]">
                        Detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((cliente) => (
                      <tr 
                        key={cliente.id}
                        className={cliente.diferencia ? "bg-red-50" : "bg-white"}
                      >
                        <td className="p-3 border border-[#bdc3c7] font-semibold text-[#2c3e50]">
                          {cliente.nombre}
                        </td>
                        <td className="p-3 border border-[#bdc3c7] text-center">
                          {cliente.diferencia ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                              ❌ Diferencia
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                              ✅ Correcto
                            </span>
                          )}
                        </td>
                        <td className="p-3 border border-[#bdc3c7] text-center font-bold text-[#e74c3c]">
                          ${cliente.saldoActualARS.toLocaleString()}
                        </td>
                        <td className="p-3 border border-[#bdc3c7] text-center font-bold text-[#27ae60]">
                          ${cliente.saldoCalculadoARS.toLocaleString()}
                        </td>
                        <td className="p-3 border border-[#bdc3c7] text-center font-bold text-[#e74c3c]">
                          USD ${cliente.saldoActualUSD.toLocaleString()}
                        </td>
                        <td className="p-3 border border-[#bdc3c7] text-center font-bold text-[#27ae60]">
                          USD ${cliente.saldoCalculadoUSD.toLocaleString()}
                        </td>
                        <td className="p-3 border border-[#bdc3c7] text-xs text-[#2c3e50]">
                          <div className="space-y-1">
                            <div><strong>Trabajos:</strong> ${cliente.deudaTrabajosARS.toLocaleString()} ARS / ${cliente.deudaTrabajosUSD.toLocaleString()} USD</div>
                            <div><strong>Ventas:</strong> ${cliente.deudaVentasARS.toLocaleString()} ARS / ${cliente.deudaVentasUSD.toLocaleString()} USD</div>
                            <div><strong>Pagos:</strong> ${cliente.pagosARS.toLocaleString()} ARS / ${cliente.pagosUSD.toLocaleString()} USD</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}