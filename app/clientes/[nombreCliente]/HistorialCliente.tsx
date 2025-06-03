"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";

export default function ClienteDetalle() {
  const params = useParams();
  const router = useRouter();
  const nombreCliente = decodeURIComponent((params?.nombreCliente || "").toString());
  console.log("🟡 nombreCliente desde URL:", nombreCliente);

  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");
  const { rol } = useRol();
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [mostrarPagos, setMostrarPagos] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

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

      console.log("🔎 Buscando trabajos y pagos de:", nombreCliente, "en negocio:", negocioID);

      const trabajosQuery = query(
        collection(db, `negocios/${negocioID}/trabajos`),
        where("cliente", "==", nombreCliente)
      );
      const pagosQuery = query(
        collection(db, `negocios/${negocioID}/pagos`),
        where("cliente", "==", nombreCliente)
      );

      const [trabajosSnap, pagosSnap] = await Promise.all([
        getDocs(trabajosQuery),
        getDocs(pagosQuery),
      ]);

      const trabajosData = trabajosSnap.docs.map((doc) => doc.data());
      const pagosData = pagosSnap.docs.map((doc) => doc.data());

      console.log("📋 Trabajos:", trabajosData);
      console.log("💰 Pagos:", pagosData);

      setTrabajos(trabajosData);
      setPagos(pagosData);
    };

    fetchData();
  }, [nombreCliente, negocioID]);

  const totalTrabajos = trabajos.reduce((sum, t) => sum + (t.precio || 0), 0);
  const totalPagos = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const saldo = totalTrabajos - totalPagos;

  // ✅ FUNCIÓN AUXILIAR para convertir imagen a base64
  const cargarImagenComoBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };

      img.onerror = () => reject("No se pudo cargar el logo");
    });
  };

  const generarPDF = async () => {
    setGenerandoPDF(true);
    
    try {
      const doc = new jsPDF();
      const colorEncabezado = "#60a5fa";

      doc.setFillColor(colorEncabezado);
      doc.rect(0, 0, 210, 40, "F");

      const logoUrl = localStorage.getItem("logoUrl");

      try {
        if (logoUrl) {
          const base64 = await cargarImagenComoBase64(logoUrl);

          // Tamaño proporcional
          const maxAncho = 65;
          const maxAlto = 25;

          const img = new Image();
          img.src = base64;
          await new Promise((res) => (img.onload = res));

          const proporción = img.width / img.height;
          let ancho = maxAncho;
          let alto = maxAncho / proporción;

          if (alto > maxAlto) {
            alto = maxAlto;
            ancho = maxAlto * proporción;
          }

          doc.addImage(base64, "PNG", 15, 8, ancho, alto);
        }
      } catch (error) {
        console.warn("⚠️ No se pudo cargar el logo:", error);
      }

      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(`Historial de ${nombreCliente}`, 200, 18, { align: "right" });

      doc.setFontSize(12);
      doc.text(`Saldo: $${saldo.toLocaleString("es-AR")}`, 200, 26, { align: "right" });

      const trabajosAdeudados = trabajos.filter(
        (t) => t.precio && (t.estado === "PENDIENTE" || t.estado === "ENTREGADO")
      );

      autoTable(doc, {
        startY: 50,
        head: [["Fecha", "Modelo", "Trabajo", "Estado", "Precio"]],
        body: trabajosAdeudados.map((t) => [
          t.fecha,
          t.modelo,
          t.trabajo,
          t.estado,
          `$${t.precio}`,
        ]),
        styles: {
          halign: "left",
        },
        headStyles: {
          fillColor: colorEncabezado,
          textColor: "#000",
        },
      });

      doc.save(`Historial-${nombreCliente}.pdf`);
      
    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setGenerandoPDF(false);
    }
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
                onClick={() => router.push("/clientes")}
                className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                ← Volver a Clientes
              </button>

              <button
                onClick={generarPDF}
                disabled={generandoPDF}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                  generandoPDF
                    ? "bg-[#bdc3c7] text-[#7f8c8d] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white"
                }`}
              >
                {generandoPDF ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    📄 Generar PDF
                  </>
                )}
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

          {/* Control para mostrar/ocultar pagos */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-[#ecf0f1]">
            <button
              onClick={() => setMostrarPagos(!mostrarPagos)}
              className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
            >
              <span>{mostrarPagos ? "👁️‍🗨️" : "👁️"}</span>
              {mostrarPagos ? "Ocultar Pagos Realizados" : "Mostrar Pagos Realizados"}
            </button>
          </div>

          {/* Tabla de pagos - Solo si está activada */}
          {mostrarPagos && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1] mb-8">
              
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
                              <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg">
                                ${p.monto}
                              </span>
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

          {/* Tabla de trabajos - Estilo GestiOne */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
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
        </div>
      </main>
    </>
  );
}
