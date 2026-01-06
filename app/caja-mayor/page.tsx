"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";
import Header from "@/app/Header";

interface EstadisticasInventario {
  repuestos: {
    totalUSD: number;
    totalARS: number;
    cantidad: number;
  };
  accesorios: {
    totalUSD: number;
    totalARS: number;
    cantidad: number;
  };
  telefonos: {
    totalUSD: number;
    totalARS: number;
    cantidad: number;
  };
  ultimaActualizacion: any;
}

export default function CajaMayorPage() {
  const { rol } = useRol();
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [inventario, setInventario] = useState<EstadisticasInventario | null>(null);
  const [efectivoEnCaja, setEfectivoEnCaja] = useState({
    ARS: 0,
    USD: 0,
  });
  const [editandoEfectivo, setEditandoEfectivo] = useState(false);
  const [nuevoEfectivoARS, setNuevoEfectivoARS] = useState("");
  const [nuevoEfectivoUSD, setNuevoEfectivoUSD] = useState("");
  const [cuentasCorrientes, setCuentasCorrientes] = useState({
    totalARS: 0,
    totalUSD: 0,
  });
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cierresRecientes, setCierresRecientes] = useState<any[]>([]);

  useEffect(() => {
    // ⏳ Esperar a que el rol esté cargado
    if (!rol) return;
  
    // ✅ Verificar que sea admin
    if (rol.tipo !== "admin") {
      router.push("/");
      return;
    }
  
    // ✅ Cargar datos
    if (rol.negocioID) {
      cargarDatos();
    }
  }, [rol, router]);

  const cargarDatos = async () => {
    if (!rol?.negocioID) return;

    setCargando(true);

    try {
      // 1. Cargar estadísticas de inventario
      const inventarioDoc = await getDoc(
        doc(db, `negocios/${rol.negocioID}/estadisticas/inventario`)
      );

      if (inventarioDoc.exists()) {
        setInventario(inventarioDoc.data() as EstadisticasInventario);
      }

      // 2. Cargar efectivo en caja (configuración manual)
      const cajaDoc = await getDoc(
        doc(db, `negocios/${rol.negocioID}/configuracion/caja`)
      );

      if (cajaDoc.exists()) {
        const data = cajaDoc.data();
        setEfectivoEnCaja({
          ARS: data.efectivoARS || 0,
          USD: data.efectivoUSD || 0,
        });
      }

      // 3. Calcular total de cuentas corrientes
      const clientesSnap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/clientes`)
      );

      let totalARS = 0;
      let totalUSD = 0;

      clientesSnap.forEach((doc) => {
        const data = doc.data();
        totalARS += data.saldoARS || 0;
        totalUSD += data.saldoUSD || 0;
      });

      setCuentasCorrientes({ totalARS, totalUSD });

      // 4. Cargar últimos 5 cierres de caja
      const cierresSnap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/cierresCaja`)
      );

      const cierres = cierresSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const fechaA = a.fechaCierre?.toDate?.() || new Date(0);
          const fechaB = b.fechaCierre?.toDate?.() || new Date(0);
          return fechaB.getTime() - fechaA.getTime();
        })
        .slice(0, 5);

      setCierresRecientes(cierres);

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const guardarEfectivo = async () => {
    if (!rol?.negocioID) return;

    try {
      await setDoc(
        doc(db, `negocios/${rol.negocioID}/configuracion/caja`),
        {
          efectivoARS: Number(nuevoEfectivoARS) || 0,
          efectivoUSD: Number(nuevoEfectivoUSD) || 0,
          ultimaActualizacion: new Date(),
        },
        { merge: true }
      );

      setEfectivoEnCaja({
        ARS: Number(nuevoEfectivoARS) || 0,
        USD: Number(nuevoEfectivoUSD) || 0,
      });

      setEditandoEfectivo(false);

      // Toast de éxito
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 18px;
        font-weight: 600;
      `;
      toast.innerHTML = `
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
          ✓
        </div>
        <span>Efectivo actualizado correctamente</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);

    } catch (error) {
      console.error("Error guardando efectivo:", error);
      alert("❌ Error al guardar el efectivo");
    }
  };

  const iniciarEdicionEfectivo = () => {
    setNuevoEfectivoARS(efectivoEnCaja.ARS.toString());
    setNuevoEfectivoUSD(efectivoEnCaja.USD.toString());
    setEditandoEfectivo(true);
  };

  const formatearPrecio = (valor: number) => {
    return `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

// Calcular totales separados por moneda
const capitalInventarioUSD = inventario
  ? (inventario.repuestos.totalUSD || 0) +
    (inventario.accesorios.totalUSD || 0) +
    (inventario.telefonos.totalUSD || 0)
  : 0;

const capitalInventarioARS = inventario
  ? (inventario.repuestos.totalARS || 0) +
    (inventario.accesorios.totalARS || 0) +
    (inventario.telefonos.totalARS || 0)
  : 0;

const capitalTotalUSD = capitalInventarioUSD + efectivoEnCaja.USD + cuentasCorrientes.totalUSD;
const capitalTotalARS = capitalInventarioARS + efectivoEnCaja.ARS + cuentasCorrientes.totalARS;

  if (cargando) {
    return (
      <>
        <Header />
        <main className="pt-20 min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#9b59b6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#7f8c8d]">Cargando Caja Mayor...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-[#f8f9fa] p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">💎</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Caja Mayor</h1>
                  <p className="text-purple-100 text-sm">Vista financiera completa del negocio</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/caja-diaria")}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                📦 Caja Diaria
              </button>
            </div>
          </div>

          {/* Alerta si no hay inventario migrado */}
          {!inventario && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-[#2c3e50] mb-1">Inventario no migrado</p>
                  <p className="text-sm text-[#7f8c8d] mb-3">
                    Para ver el capital de inventario, ejecutá la migración de estadísticas.
                  </p>
                  <button
                    onClick={() => router.push("/migracion-estadisticas-inventario")}
                    className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    🚀 Ejecutar Migración
                  </button>
                </div>
              </div>
            </div>
          )}

         {/* Capital Total */}
<div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-2xl p-8 shadow-lg text-white">
  <p className="text-green-100 text-sm mb-2">💰 CAPITAL TOTAL</p>
  <p className="text-5xl font-bold mb-2">USD {formatearPrecio(capitalTotalUSD)}</p>
  <p className="text-2xl text-green-100">ARS {formatearPrecio(capitalTotalARS)}</p>
</div>

          {/* Desglose del Capital */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Capital de Inventario */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="font-bold text-[#2c3e50]">Capital de Inventario</h3>
              </div>

              {inventario ? (
                <>
                 <p className="text-3xl font-bold text-[#3498db] mb-2">
  USD {formatearPrecio(capitalInventarioUSD)}
</p>
<p className="text-2xl font-bold text-[#2980b9] mb-4">
  ARS {formatearPrecio(capitalInventarioARS)}
</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7f8c8d]">📦 Repuestos ({inventario.repuestos.cantidad}):</span>
                      <span className="font-bold text-[#2c3e50]">
                        USD {formatearPrecio(inventario.repuestos.totalUSD)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#7f8c8d]">🎧 Accesorios ({inventario.accesorios.cantidad}):</span>
                      <span className="font-bold text-[#2c3e50]">
                        USD {formatearPrecio(inventario.accesorios.totalUSD)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#7f8c8d]">📱 Teléfonos ({inventario.telefonos.cantidad}):</span>
                      <span className="font-bold text-[#2c3e50]">
                        USD {formatearPrecio(inventario.telefonos.totalUSD)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#95a5a6] mt-4">
                    Última actualización: {inventario.ultimaActualizacion?.toDate?.()?.toLocaleString("es-AR") || "N/A"}
                  </p>
                </>
              ) : (
                <p className="text-[#7f8c8d] text-sm">Sin datos disponibles</p>
              )}
            </div>

            {/* Efectivo en Caja */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💵</span>
                  </div>
                  <h3 className="font-bold text-[#2c3e50]">Efectivo en Caja</h3>
                </div>
                {!editandoEfectivo && (
                  <button
                    onClick={iniciarEdicionEfectivo}
                    className="text-[#3498db] hover:text-[#2980b9] transition-all"
                    title="Editar efectivo"
                  >
                    ✏️
                  </button>
                )}
              </div>

              {!editandoEfectivo ? (
                <>
                  <p className="text-3xl font-bold text-[#27ae60] mb-2">
                    USD {formatearPrecio(efectivoEnCaja.USD)}
                  </p>
                  <p className="text-xl font-bold text-[#27ae60]">
                    ARS {formatearPrecio(efectivoEnCaja.ARS)}
                  </p>
                  <p className="text-xs text-[#95a5a6] mt-4">
                    Actualizado manualmente
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      Efectivo USD
                    </label>
                    <input
                      type="number"
                      value={nuevoEfectivoUSD}
                      onChange={(e) => setNuevoEfectivoUSD(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                      Efectivo ARS
                    </label>
                    <input
                      type="number"
                      value={nuevoEfectivoARS}
                      onChange={(e) => setNuevoEfectivoARS(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditandoEfectivo(false)}
                      className="flex-1 px-3 py-2 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarEfectivo}
                      className="flex-1 px-3 py-2 bg-[#27ae60] hover:bg-[#229954] text-white rounded-lg font-medium transition-all text-sm"
                    >
                      ✓ Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cuentas Corrientes */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📒</span>
                </div>
                <h3 className="font-bold text-[#2c3e50]">Cuentas Corrientes</h3>
              </div>

              <p className="text-3xl font-bold text-[#e67e22] mb-2">
                USD {formatearPrecio(cuentasCorrientes.totalUSD)}
              </p>
              <p className="text-xl font-bold text-[#e67e22]">
                ARS {formatearPrecio(cuentasCorrientes.totalARS)}
              </p>
              <p className="text-xs text-[#95a5a6] mt-4">
                Suma de saldos de clientes
              </p>
            </div>
          </div>

          {/* Historial de Cierres Recientes */}
          {cierresRecientes.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#2c3e50] text-lg">📋 Últimos Cierres de Caja</h3>
                <button
                  onClick={() => setMostrarHistorial(!mostrarHistorial)}
                  className="text-[#3498db] hover:text-[#2980b9] font-medium text-sm transition-all"
                >
                  {mostrarHistorial ? "Ocultar" : "Ver historial"}
                </button>
              </div>

              {mostrarHistorial && (
                <div className="space-y-3">
                  {cierresRecientes.map((cierre: any) => (
                    <div
                      key={cierre.id}
                      className="bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-[#2c3e50]">{cierre.fecha}</p>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          cierre.diferenciaARS === 0 ? "bg-blue-100 text-blue-700" :
                          cierre.diferenciaARS > 0 ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {cierre.diferenciaARS === 0 ? "✓ Exacto" :
                           cierre.diferenciaARS > 0 ? `+${formatearPrecio(cierre.diferenciaARS)}` :
                           formatearPrecio(cierre.diferenciaARS)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-[#7f8c8d]">
                        <span>Efectivo: {formatearPrecio(cierre.efectivoRealARS)}</span>
                        <span>Transferencias: {formatearPrecio(cierre.transferenciasARS)}</span>
                        <span>Tarjetas: {formatearPrecio(cierre.tarjetasARS)}</span>
                        <span>Cta. Cte: {formatearPrecio(cierre.cuentaCorrienteARS)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </>
  );
}