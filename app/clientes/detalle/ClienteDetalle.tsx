"use client";

import jsPDF from "jspdf";
import "jspdf-autotable";
import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useNegocioID } from "@/lib/useNegocioID";

export default function ClienteDetalle() {
  const params = useParams();
  const nombreCliente = decodeURIComponent(params?.nombreCliente as string || "").trim();
  const [user] = useAuthState(auth);
  const negocioID = useNegocioID();
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  useEffect(() => {
    console.log("🟨 nombreCliente:", nombreCliente);
    console.log("🟨 negocioID:", negocioID);
  
    if (!nombreCliente || !negocioID) {
      console.warn("⚠️ Faltan datos para buscar:", { nombreCliente, negocioID });
      return;
    }
  
    console.log("🔍 Ejecutando consultas...");
    console.log("🔍 Buscando datos de:", nombreCliente);

    const trabajosQuery = query(
      collection(db, `negocios/${negocioID}/trabajos`),
      where("cliente", "==", nombreCliente)
    );

    const pagosQuery = query(
      collection(db, `negocios/${negocioID}/pagos`),
      where("cliente", "==", nombreCliente)
    );

    const unsubscribeTrabajos = onSnapshot(trabajosQuery, (trabajosSnap) => {
      const datos = trabajosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log("📋 Trabajos:", datos);
      setTrabajos(datos);
    });

    const unsubscribePagos = onSnapshot(pagosQuery, (pagosSnap) => {
      const datos = pagosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log("💰 Pagos:", datos);
      setPagos(datos);
    });

    return () => {
      unsubscribeTrabajos();
      unsubscribePagos();
    };
  }, [nombreCliente, negocioID]);

  const totalTrabajos = trabajos
  .filter(t => t.estado === "ENTREGADO" || t.estado === "PAGADO")
  .reduce((sum, t) => sum + (t.precio || 0), 0);
  const totalPagos = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const saldo = totalTrabajos - totalPagos;

  const exportarPDF = async () => {
    const doc = new jsPDF();
    const logo = await fetch("/logo.png").then((res) => res.blob());
    const reader = new FileReader();
    reader.onloadend = () => {
      const imgData = reader.result as string;
      doc.addImage(imgData, "PNG", 10, 10, 40, 20);
      doc.setFontSize(16);
      doc.text(`Resumen de cuenta: ${nombreCliente}`, 60, 20);
      const filas = trabajos.map((t) => [
        t.fecha,
        t.modelo,
        t.trabajo,
        t.estado,
        `$${t.precio.toLocaleString("es-AR")}`,
      ]);
      // @ts-ignore
      doc.autoTable({
        startY: 35,
        head: [["Fecha", "Modelo", "Trabajo", "Estado", "Precio"]],
        body: filas,
      });
      // @ts-ignore
      doc.text(`Total Adeudado: $${saldo.toLocaleString("es-AR")}`, 10, doc.lastAutoTable.finalY + 10);
      doc.save(`Resumen-${nombreCliente}.pdf`);
    };
    reader.readAsDataURL(logo);
  };

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">
          
          {/* Header de la página - Estilo GestiOne */}
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
                  Resumen completo de trabajos y pagos del cliente
                </p>
              </div>
            </div>
          </div>

          {/* Controles y navegación - Estilo GestiOne */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <button
                onClick={() => window.history.back()}
                className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                ← Volver al Listado
              </button>

              <button
                onClick={exportarPDF}
                className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                📄 Descargar PDF
              </button>
            </div>
          </div>

          {/* Resumen financiero - Estilo GestiOne */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-[#3498db]/10 to-[#2980b9]/10 border-2 border-[#3498db] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📋</span>
                  </div>
                  <span className="text-sm font-medium text-[#2c3e50]">Total Trabajos</span>
                </div>
                <p className="text-2xl font-bold text-[#3498db]">
                  ${totalTrabajos.toLocaleString("es-AR")}
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
                saldo > 0 
                  ? "bg-gradient-to-r from-[#e74c3c]/10 to-[#c0392b]/10 border-[#e74c3c]" 
                  : saldo < 0 
                    ? "bg-gradient-to-r from-[#f39c12]/10 to-[#e67e22]/10 border-[#f39c12]"
                    : "bg-gradient-to-r from-[#95a5a6]/10 to-[#7f8c8d]/10 border-[#95a5a6]"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    saldo > 0 ? "bg-[#e74c3c]" : saldo < 0 ? "bg-[#f39c12]" : "bg-[#95a5a6]"
                  }`}>
                    <span className="text-white text-sm">📊</span>
                  </div>
                  <span className="text-sm font-medium text-[#2c3e50]">Saldo</span>
                </div>
                <p className={`text-2xl font-bold ${
                  saldo > 0 ? "text-[#e74c3c]" : saldo < 0 ? "text-[#f39c12]" : "text-[#95a5a6]"
                }`}>
                  ${Math.abs(saldo).toLocaleString("es-AR")}
                </p>
                <p className="text-xs mt-1 font-medium text-[#7f8c8d]">
                  {saldo > 0 ? "(Debe)" : saldo < 0 ? "(A favor)" : "(En cero)"}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de trabajos - Estilo GestiOne */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1] mb-8">
            
            {/* Header de trabajos */}
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

            {/* Tabla trabajos */}
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
                              ${t.precio}
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

          {/* Tabla de pagos - Estilo GestiOne */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
            {/* Header de pagos */}
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

            {/* Tabla pagos */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse border-2 border-black">
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
                            <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg">
                              ${p.monto}
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
                      <td colSpan={4} className="p-12 text-center border border-black">
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
        </div>
      </main>
    </>
  );
}