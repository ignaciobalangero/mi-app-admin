"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import GeneradorPDF from "./GeneradorPDF";
import { monedaLineaProducto, totalesVentasPorMoneda } from "./ventasMonedaHelpers";

/** Una sola línea para la tabla (no afecta cálculos de saldo). */
function resumenLineaProductos(v: any): string {
  const p = v.productos || [];
  if (p.length === 0) return "Sin productos";
  if (p.length === 1) {
    const x = p[0];
    const n = x.modelo || x.producto || x.descripcion || "Producto";
    return `${n} ×${x.cantidad ?? 1}`;
  }
  const x = p[0];
  const n = x.modelo || x.producto || x.descripcion || "Ítem";
  return `${n} ×${x.cantidad ?? 1} · +${p.length - 1} más`;
}

/** Totales por venta: misma regla que cuenta corriente (moneda por línea). */
function calcularMontosPorVentaFila(v: any): { totalARS: number; totalUSD: number } {
  return totalesVentasPorMoneda(v.productos);
}

export default function ClienteDetalle() {
  const params = useParams();
  const router = useRouter();
  const nombreCliente = decodeURIComponent((params?.nombreCliente || "").toString());

  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");
  const { rol } = useRol();
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [mostrarPagos, setMostrarPagos] = useState(false);
  const [mostrarVentas, setMostrarVentas] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<any | null>(null);

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);  

  useEffect(() => {
    const fetchData = async () => {
      if (!nombreCliente || !negocioID) {
        console.warn("⛔ nombreCliente o negocioID vacíos");
        return;
      }

      const trabajosQuery = query(
        collection(db, `negocios/${negocioID}/trabajos`),
        where("cliente", "==", nombreCliente)
      );
      const pagosQuery = query(
        collection(db, `negocios/${negocioID}/pagos`),
        where("cliente", "==", nombreCliente)
      );
      const ventasQuery = query(
        collection(db, `negocios/${negocioID}/ventasGeneral`),
        where("cliente", "==", nombreCliente)
      );

      const [trabajosSnap, pagosSnap, ventasSnap] = await Promise.all([
        getDocs(trabajosQuery),
        getDocs(pagosQuery),
        getDocs(ventasQuery),
      ]);

      const trabajosData = trabajosSnap.docs.map((doc) => doc.data());
      const pagosData = pagosSnap.docs.map((doc) => doc.data());
      const ventasData = ventasSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      })) as any[];

      // Ordenar por fecha
      trabajosData.sort((a, b) => {
        const [diaA, mesA, añoA] = a.fecha.split('/');
        const [diaB, mesB, añoB] = b.fecha.split('/');
        const fechaA = new Date(`${añoA}-${mesA}-${diaA}`);
        const fechaB = new Date(`${añoB}-${mesB}-${diaB}`);
        return fechaB.getTime() - fechaA.getTime();
      });

      pagosData.sort((a, b) => {
        const [diaA, mesA, añoA] = a.fecha.split('/');
        const [diaB, mesB, añoB] = b.fecha.split('/');
        const fechaA = new Date(`${añoA}-${mesA}-${diaA}`);
        const fechaB = new Date(`${añoB}-${mesB}-${diaB}`);
        return fechaB.getTime() - fechaA.getTime();
      });

      ventasData.sort((a, b) => {
        const [diaA, mesA, añoA] = a.fecha.split('/');
        const [diaB, mesB, añoB] = b.fecha.split('/');
        const fechaA = new Date(`${añoA}-${mesA}-${diaA}`);
        const fechaB = new Date(`${añoB}-${mesB}-${diaB}`);
        return fechaB.getTime() - fechaA.getTime();
      });

      setTrabajos(trabajosData);
      setPagos(pagosData);
      setVentas(ventasData);
    };

    fetchData();
  }, [nombreCliente, negocioID]);

  // Función para calcular totales - CORREGIDA
const calcularTotales = () => {
  let totalTrabajosARS = 0;
  let totalTrabajosUSD = 0;
  let totalVentasARS = 0;
  let totalVentasUSD = 0;
  let totalPagosARS = 0;
  let totalPagosUSD = 0;

  // Trabajos que cuentan para la deuda
  const trabajosParaDeuda = trabajos.filter(t => 
    t.estado === "ENTREGADO" || t.estado === "PAGADO"
  );
  
  // ✅ CORREGIDO: Solo usar el campo "moneda" del trabajo
  trabajosParaDeuda.forEach(t => {
    const precio = Number(t.precio || 0);
    const moneda = (t.moneda ?? "ARS").toString().toUpperCase();
    
    if (moneda === "USD") {
      totalTrabajosUSD += precio;
    } else {
      totalTrabajosARS += precio;
    }
  });

  // ✅ VENTAS: todas las ventas; cada línea según p.moneda → ARS o USD (teléfono en ARS cuenta en ARS)
  ventas.forEach((v) => {
    const { totalARS, totalUSD } = totalesVentasPorMoneda(v.productos);
    totalVentasARS += totalARS;
    totalVentasUSD += totalUSD;
  });

  // Pagos
  pagos.forEach(p => {
    const monedaPago = (p.moneda ?? "").toString().toUpperCase();
    if (monedaPago === "USD") {
      totalPagosUSD += Number(p.montoUSD || 0);
    } else if (monedaPago === "DUAL") {
      totalPagosARS += Number(p.monto || 0);
      totalPagosUSD += Number(p.montoUSD || 0);
    } else {
      totalPagosARS += Number(p.monto || 0);
    }
  });

  return {
    totalTrabajosARS,
    totalTrabajosUSD,
    totalVentasARS,
    totalVentasUSD,
    totalPagosARS,
    totalPagosUSD,
    totalTrabajos: totalTrabajosARS + totalTrabajosUSD,
    totalVentas: totalVentasARS + totalVentasUSD,
    totalPagos: totalPagosARS + totalPagosUSD,
    saldoARS: (totalTrabajosARS + totalVentasARS) - totalPagosARS,
    saldoUSD: (totalTrabajosUSD + totalVentasUSD) - totalPagosUSD
  };
};

  const totales = calcularTotales();
  const { saldoARS, saldoUSD, totalTrabajos, totalVentas, totalPagos } = totales;

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">
          
          {/* Header de la página */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-8 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">👤</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Historial de {nombreCliente}
                </h1>
                <p className="text-blue-100 text-lg">
                  Resumen completo de trabajos, ventas y pagos del cliente
                </p>
              </div>
            </div>
          </div>

          {/* Controles y navegación */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <button
                onClick={() => router.push("/clientes")}
                className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                ← Volver a Clientes
              </button>

              <GeneradorPDF
                nombreCliente={nombreCliente}
                trabajos={trabajos}
                ventas={ventas}
                pagos={pagos}
                calcularTotales={calcularTotales}
              />
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">💰</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#2c3e50]">Resumen Financiero</h2>
                <p className="text-[#7f8c8d] mt-1">Estado actual de la cuenta del cliente</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-[#3498db]/10 to-[#2980b9]/10 border-2 border-[#3498db] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🔧</span>
                  </div>
                  <span className="text-sm font-medium text-[#2c3e50]">Total Trabajos</span>
                </div>
                <p className="text-2xl font-bold text-[#3498db]">
                  ${totalTrabajos.toLocaleString("es-AR")}
                </p>
              </div>

              <div className="bg-gradient-to-r from-[#9b59b6]/10 to-[#8e44ad]/10 border-2 border-[#9b59b6] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🛍️</span>
                  </div>
                  <span className="text-sm font-medium text-[#2c3e50]">Total Ventas</span>
                </div>
                <p className="text-2xl font-bold text-[#9b59b6]">
                  ${totalVentas.toLocaleString("es-AR")}
                </p>
              </div>

              <div className="bg-gradient-to-r from-[#27ae60]/10 to-[#2ecc71]/10 border-2 border-[#27ae60] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">💳</span>
                  </div>
                  <span className="text-sm font-medium text-[#2c3e50]">Total Pagos</span>
                </div>
                <p className="text-2xl font-bold text-[#27ae60]">
                  ${totalPagos.toLocaleString("es-AR")}
                </p>
              </div>

              <div className={`rounded-xl p-6 border-2 ${
                (saldoARS > 0 || saldoUSD > 0)
                  ? "bg-gradient-to-r from-[#e74c3c]/10 to-[#c0392b]/10 border-[#e74c3c]" 
                  : (saldoARS < 0 || saldoUSD < 0)
                    ? "bg-gradient-to-r from-[#f39c12]/10 to-[#e67e22]/10 border-[#f39c12]"
                    : "bg-gradient-to-r from-[#95a5a6]/10 to-[#7f8c8d]/10 border-[#95a5a6]"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    (saldoARS > 0 || saldoUSD > 0) ? "bg-[#e74c3c]" : 
                    (saldoARS < 0 || saldoUSD < 0) ? "bg-[#f39c12]" : "bg-[#95a5a6]"
                  }`}>
                    <span className="text-white text-sm">📊</span>
                  </div>
                  <span className="text-sm font-medium text-[#2c3e50]">Saldo</span>
                </div>
                
                <div className="space-y-1">
                  {saldoARS !== 0 && (
                    <p className={`text-lg font-bold ${
                      saldoARS > 0 ? "text-[#e74c3c]" : "text-[#f39c12]"
                    }`}>
                      ${Math.abs(saldoARS).toLocaleString("es-AR")} ARS
                    </p>
                  )}
                  {saldoUSD !== 0 && (
                    <p className={`text-lg font-bold ${
                      saldoUSD > 0 ? "text-[#e74c3c]" : "text-[#f39c12]"
                    }`}>
                      US${Math.abs(saldoUSD).toLocaleString("en-US")}
                    </p>
                  )}
                  {saldoARS === 0 && saldoUSD === 0 && (
                    <p className="text-lg font-bold text-[#95a5a6]">$0</p>
                  )}
                </div>
                
                <p className="text-xs mt-1 font-medium text-[#7f8c8d]">
                  {(saldoARS > 0 || saldoUSD > 0) ? "(Debe)" : 
                   (saldoARS < 0 || saldoUSD < 0) ? "(A favor)" : "(En cero)"}
                </p>
              </div>
            </div>
          </div>

          {/* Controles para mostrar/ocultar secciones */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setMostrarVentas(!mostrarVentas)}
                className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span>{mostrarVentas ? "👁️‍🗨️" : "👁️"}</span>
                {mostrarVentas ? "Ocultar Ventas" : "Mostrar Ventas"}
                {ventas.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                    {ventas.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setMostrarPagos(!mostrarPagos)}
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#2ecc71] hover:to-[#27ae60] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span>{mostrarPagos ? "👁️‍🗨️" : "👁️"}</span>
                {mostrarPagos ? "Ocultar Pagos" : "Mostrar Pagos"}
                {pagos.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                    {pagos.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* TABLA DE VENTAS — fila compacta + detalle en modal */}
          {mostrarVentas && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200/80 mb-8 ring-1 ring-slate-100">
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shadow-inner">
                    <span className="text-2xl">🛍️</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Ventas realizadas</h3>
                    <p className="text-violet-100 mt-1 text-sm">
                      {ventas.length} {ventas.length === 1 ? "venta registrada" : "ventas registradas"} · una fila por venta
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-4 py-3 w-[120px]">Fecha</th>
                      <th className="px-4 py-3 min-w-[200px]">Resumen</th>
                      <th className="px-4 py-3 w-[110px]">Estado</th>
                      <th className="px-4 py-3 w-[100px]">Moneda</th>
                      <th className="px-4 py-3 text-right w-[160px]">Total</th>
                      <th className="px-4 py-3 text-right w-[140px]"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ventas.length > 0 ? (
                      ventas.map((v, i) => {
                        const { totalARS, totalUSD } = calcularMontosPorVentaFila(v);
                        const monedasSet = new Set<string>();
                        v.productos?.forEach((p: any) => {
                          monedasSet.add(monedaLineaProducto(p));
                        });
                        const monedasTxt = monedasSet.size ? Array.from(monedasSet).join(" · ") : "—";
                        return (
                          <tr
                            key={v.id || i}
                            className="hover:bg-violet-50/40 transition-colors"
                          >
                            <td className="px-4 py-3 align-middle whitespace-nowrap">
                              <span className="inline-flex text-sm font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {v.fecha}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle max-w-md">
                              <p className="text-slate-800 font-medium truncate" title={resumenLineaProductos(v)}>
                                {resumenLineaProductos(v)}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {(v.productos?.length || 0)} {(v.productos?.length || 0) === 1 ? "ítem" : "ítems"}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-middle whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  v.estado === "PAGADO"
                                    ? "bg-emerald-100 text-emerald-900"
                                    : v.estado === "ENTREGADO"
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {v.estado || "PENDIENTE"}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle whitespace-nowrap">
                              <span className="text-xs font-mono text-slate-700 bg-sky-50 px-2 py-1 rounded-md border border-sky-100">
                                {monedasTxt}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                              <div className="inline-flex flex-col items-end gap-1">
                                {totalUSD > 0 && (
                                  <span className="text-sm font-bold text-violet-800 tabular-nums">
                                    USD {totalUSD.toLocaleString("es-AR")}
                                  </span>
                                )}
                                {totalARS > 0 && (
                                  <span className="text-sm font-bold text-violet-800 tabular-nums">
                                    $ {totalARS.toLocaleString("es-AR")}
                                  </span>
                                )}
                                {totalUSD <= 0 && totalARS <= 0 && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle text-right">
                              <button
                                type="button"
                                onClick={() => setVentaDetalle(v)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-800 shadow-sm hover:bg-violet-50 hover:border-violet-300 transition-colors"
                              >
                                Ver detalle
                                <span aria-hidden>→</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-500">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl">
                              🛍️
                            </div>
                            <p className="font-medium">No hay ventas registradas</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal detalle venta (solo UI; no toca saldos) */}
          {ventaDetalle && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="venta-detalle-titulo"
              onClick={() => setVentaDetalle(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[min(90vh,720px)] flex flex-col border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-t-2xl">
                  <div>
                    <h4 id="venta-detalle-titulo" className="text-lg font-bold">
                      Detalle de venta
                    </h4>
                    <p className="text-sm text-violet-100 mt-1">
                      {ventaDetalle.fecha}
                      {ventaDetalle.nroVenta != null && ventaDetalle.nroVenta !== "" && (
                        <span className="ml-2 inline-flex bg-white/20 px-2 py-0.5 rounded text-xs font-mono">
                          #{ventaDetalle.nroVenta}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVentaDetalle(null)}
                    className="shrink-0 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1">
                  {ventaDetalle.productos && ventaDetalle.productos.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Producto</th>
                            <th className="px-3 py-2">Marca</th>
                            <th className="px-3 py-2">Modelo</th>
                            <th className="px-3 py-2 text-center">Cant.</th>
                            <th className="px-3 py-2 text-right">P. unit.</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ventaDetalle.productos.map((producto: any, idx: number) => {
                            const sub = Number(producto.precioUnitario || 0) * Number(producto.cantidad || 1);
                            const esUsd =
                              producto.categoria === "Teléfono" || producto.moneda?.toUpperCase() === "USD";
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {producto.producto || producto.descripcion || "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-600">{producto.marca || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{producto.modelo || "—"}</td>
                                <td className="px-3 py-2 text-center tabular-nums">{producto.cantidad ?? 1}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                                  {esUsd
                                    ? `US$ ${Number(producto.precioUnitario || 0).toLocaleString("es-AR")}`
                                    : `$ ${Number(producto.precioUnitario || 0).toLocaleString("es-AR")}`}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-violet-900 tabular-nums">
                                  {esUsd
                                    ? `US$ ${sub.toLocaleString("es-AR")}`
                                    : `$ ${sub.toLocaleString("es-AR")}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Sin líneas de producto en esta venta.</p>
                  )}
                  {ventaDetalle.observaciones && (
                    <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <span className="font-semibold text-slate-700">Observaciones: </span>
                      {ventaDetalle.observaciones}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabla de pagos */}
          {mostrarPagos && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1] mb-8">
              
              <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Pagos Realizados</h3>
                    <p className="text-green-100 mt-1">
                      {pagos.length} {pagos.length === 1 ? 'pago registrado' : 'pagos registrados'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📅</span>
                          Fecha
                        </div>
                      </th>
                      <th className="p-3 text-right text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-base">💵</span>
                          Monto
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center gap-2">
                          <span className="text-base">💱</span>
                          Moneda
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center gap-2">
                          <span className="text-base">💳</span>
                          Forma
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎯</span>
                          Destino
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.length > 0 ? (
                      pagos.map((p, i) => {
                        const isEven = i % 2 === 0;
                        return (
                          <tr key={i} className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                            <td className="p-3 border border-black">
                              <span className="text-sm font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                                {p.fecha}
                              </span>
                            </td>
                            <td className="p-3 border border-black text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg">
                                  {String(p.moneda || "ARS").toUpperCase() === "USD"
                                    ? `US$ ${Number(p.montoUSD || 0).toLocaleString("es-AR")}`
                                    : `$ ${Number(p.monto || 0).toLocaleString("es-AR")}`}
                                </span>
                                {p?.detallesPago?.tipo === "ARS_a_USD" &&
                                  Number(p?.detallesPago?.montoARSOriginal || 0) > 0 &&
                                  Number(p?.detallesPago?.cotizacionPago || 0) > 0 && (
                                    <span className="text-[11px] text-[#7f8c8d]">
                                      Pagado en ARS ${Number(p.detallesPago.montoARSOriginal).toLocaleString("es-AR")} a cotización{" "}
                                      ${Number(p.detallesPago.cotizacionPago).toLocaleString("es-AR")}
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="p-3 border border-black">
                              <span className="text-sm text-[#2c3e50] bg-[#3498db]/10 px-2 py-1 rounded font-mono">
                                {p.moneda || "ARS"}
                              </span>
                            </td>
                            <td className="p-3 border border-black">
                              <span className="text-sm text-[#2c3e50]">{p.forma}</span>
                            </td>
                            <td className="p-3 border border-black">
                              <span className="text-sm text-[#7f8c8d]">{p.destino}</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-12 text-center border border-black">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
                              <span className="text-3xl">💳</span>
                            </div>
                            <p className="text-lg font-medium text-[#7f8c8d]">No hay pagos registrados</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de trabajos */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔧</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Trabajos Realizados</h3>
                  <p className="text-blue-100 mt-1">
                    {trabajos.length} {trabajos.length === 1 ? 'trabajo registrado' : 'trabajos registrados'}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse border-2 border-black">
                <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📅</span>
                        Fecha
                      </div>
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📱</span>
                        Modelo
                      </div>
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔧</span>
                        Trabajo
                      </div>
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚦</span>
                        Estado
                      </div>
                    </th>
                    <th className="p-3 text-right text-sm font-semibold text-[#2c3e50] border border-black">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-base">💰</span>
                        Precio
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trabajos.length > 0 ? (
                    trabajos.map((t, i) => {
                      const isEven = i % 2 === 0;
                      return (
                        <tr key={i} className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                              {t.fecha}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{t.modelo}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{t.trabajo}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${
                              t.estado === "PAGADO" ? "bg-[#9b59b6] text-white" :
                              t.estado === "ENTREGADO" ? "bg-[#27ae60] text-white" :
                              t.estado === "REPARADO" ? "bg-[#f39c12] text-white" :
                              "bg-[#e74c3c] text-white"
                            }`}>
                              {t.estado}
                            </span>
                          </td>
                          <td className="p-3 border border-black text-right">
                            <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg">
                              {t.moneda === "USD" ? `US$ ${Number(t.precio || 0).toLocaleString("es-AR")}` : `$ ${Number(t.precio || 0).toLocaleString("es-AR")}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center border border-black">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
                            <span className="text-3xl">🔧</span>
                          </div>
                          <p className="text-lg font-medium text-[#7f8c8d]">No hay trabajos registrados</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}