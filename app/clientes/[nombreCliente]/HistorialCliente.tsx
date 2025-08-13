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
  const [ventas, setVentas] = useState<any[]>([]);
  const [mostrarPagos, setMostrarPagos] = useState(false);
  const [mostrarVentas, setMostrarVentas] = useState(false);
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

      console.log("🔎 Buscando trabajos, pagos y ventas de:", nombreCliente, "en negocio:", negocioID);

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
      const ventasData = ventasSnap.docs.map((doc) => doc.data());

      console.log("📋 Trabajos:", trabajosData);
      console.log("💰 Pagos:", pagosData);
      console.log("🛍️ Ventas:", ventasData);
      
      // 🔍 DEBUG ESPECÍFICO PARA PAGOS
      if (pagosData.length > 0) {
        console.log("🔍 Estructura de pagos:");
        pagosData.forEach((pago, index) => {
          console.log(`💳 Pago ${index + 1}:`, {
            moneda: pago.moneda,
            monto: pago.monto,
            montoUSD: pago.montoUSD,
            estructura: Object.keys(pago),
            datoCompleto: pago
          });
        });
      }
      
      if (ventasData.length > 0) {
        console.log("🔍 Estructura de primera venta:", JSON.stringify(ventasData[0], null, 2));
        ventasData.forEach((venta, index) => {
          console.log(`🛍️ Venta ${index + 1}:`, {
            total: venta.total,
            totalTipo: typeof venta.total,
            moneda: venta.moneda,
            productos: venta.productos,
            productosLength: venta.productos?.length || 0,
            fecha: venta.fecha,
            estado: venta.estado
          });
        });
      }

      setTrabajos(trabajosData);
      setPagos(pagosData);
      setVentas(ventasData);
    };

    fetchData();
  }, [nombreCliente, negocioID]);

  // 🔍 FUNCIÓN PARA CALCULAR TOTALES CORRECTAMENTE
  const calcularTotales = () => {
    let totalTrabajosARS = 0;
    let totalTrabajosUSD = 0;
    let totalVentasARS = 0;
    let totalVentasUSD = 0;
    let totalPagosARS = 0;
    let totalPagosUSD = 0;

    // Calcular totales de trabajos
    const trabajosParaDeuda = trabajos.filter(t => 
      t.estado === "ENTREGADO" || t.estado === "PAGADO"
    );
    
    trabajosParaDeuda.forEach(t => {
      const hayTelefonoEnTrabajo = t.productos?.some((p: any) => p.categoria === "Teléfono");
      
      if (hayTelefonoEnTrabajo || t.moneda === "USD") {
        totalTrabajosUSD += Number(t.precio || 0);
      } else {
        totalTrabajosARS += Number(t.precio || 0);
      }
    });

    // Calcular totales de ventas
    ventas.forEach(v => {
      const hayTelefonoEnVenta = v.productos?.some((p: any) => p.categoria === "Teléfono");
      
      if (hayTelefonoEnVenta) {
        // Con teléfono: sumar todos los productos en USD
        let totalUSDVenta = 0;
        v.productos?.forEach((p: any) => {
          totalUSDVenta += (p.precioUnitario * p.cantidad);
        });
        totalVentasUSD += totalUSDVenta;
      } else {
        // Sin teléfono: convertir a pesos
        let totalPesosVenta = 0;
        v.productos?.forEach((p: any) => {
          if (p.moneda?.toUpperCase() === "USD") {
            totalPesosVenta += ((p.precioUSD || p.precioUnitario) * p.cantidad * 1200);
          } else {
            totalPesosVenta += (p.precioUnitario * p.cantidad);
          }
        });
        totalVentasARS += totalPesosVenta;
      }
    });

    // Calcular totales de pagos
    pagos.forEach(p => {
      if (p.moneda === "USD") {
        totalPagosUSD += Number(p.montoUSD || 0);  // 👈 CORRECTO
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
  const saldo = saldoARS + saldoUSD;

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
// ✅ FUNCIÓN PARA OBTENER HISTORIAL DESDE ÚLTIMO SALDO CERO (para PDF)
const obtenerHistorialParaPDF = () => {
  const historial: any[] = [];

  // 🔧 Agregar trabajos
  trabajos.forEach(trabajo => {
    if (trabajo.estado === "ENTREGADO" || trabajo.estado === "PAGADO") {
      historial.push({
        ...trabajo,
        tipo: "trabajo",
        fechaOrden: new Date(trabajo.fecha || "1970-01-01"),
        descripcion: `${trabajo.modelo} - ${trabajo.trabajo}`,
        monto: Number(trabajo.precio || 0),
        monedaItem: trabajo.moneda || "ARS",
        esDeuda: true
      });
    }
  });

  // 🛍️ Agregar ventas usando lógica optimizada
  ventas.forEach(venta => {
    const monedaVenta = venta.moneda || "ARS";
    
    if (monedaVenta === "DUAL") {
      // Venta DUAL: agregar entradas separadas
      const montoARS = Number(venta.totalARS || 0);
      const montoUSD = Number(venta.totalUSD || 0);
      
      if (montoARS > 0) {
        historial.push({
          ...venta,
          tipo: "venta",
          fechaOrden: new Date(venta.fecha || "1970-01-01"),
          descripcion: venta.productos?.map((p: any) => p.modelo || p.producto).join(", ") || "Venta general",
          monto: montoARS,
          monedaItem: "ARS",
          esDeuda: true
        });
      }
      if (montoUSD > 0) {
        historial.push({
          ...venta,
          tipo: "venta",
          fechaOrden: new Date(venta.fecha || "1970-01-01"),
          descripcion: venta.productos?.map((p: any) => p.modelo || p.producto).join(", ") || "Venta general",
          monto: montoUSD,
          monedaItem: "USD",
          esDeuda: true
        });
      }
    } else {
      // Venta simple
      const monto = Number(venta.total || 0);
      if (monto > 0) {
        historial.push({
          ...venta,
          tipo: "venta",
          fechaOrden: new Date(venta.fecha || "1970-01-01"),
          descripcion: venta.productos?.map((p: any) => p.modelo || p.producto).join(", ") || "Venta general",
          monto: monto,
          monedaItem: monedaVenta,
          esDeuda: true
        });
      }
    }
  });

  // 💳 Agregar pagos
  pagos.forEach(pago => {
    const monto = pago.moneda === "USD" ? Number(pago.montoUSD || 0) : Number(pago.monto || 0);
    if (monto > 0) {
      historial.push({
        ...pago,
        tipo: "pago",
        fechaOrden: new Date(pago.fecha || "1970-01-01"),
        descripcion: `Pago recibido - ${pago.formaPago || pago.forma || "Efectivo"}`,
        monto: monto,
        monedaItem: pago.moneda || "ARS",
        esDeuda: false
      });
    }
  });

  // 📅 Ordenar por fecha
  historial.sort((a, b) => a.fechaOrden.getTime() - b.fechaOrden.getTime());

  // 🎯 ENCONTRAR DESDE EL ÚLTIMO SALDO CERO
  let saldoARS = 0;
  let saldoUSD = 0;
  let ultimoIndiceCero = -1;

  for (let i = 0; i < historial.length; i++) {
    const item = historial[i];
    
    if (item.monedaItem === "ARS") {
      saldoARS += item.esDeuda ? item.monto : -item.monto;
    } else {
      saldoUSD += item.esDeuda ? item.monto : -item.monto;
    }

    // Si ambos saldos llegaron a cero, marcar este punto
    if (Math.abs(saldoARS) < 0.01 && Math.abs(saldoUSD) < 0.01) {
      ultimoIndiceCero = i;
    }
  }

  // 🔄 Retornar solo desde el último punto de saldo cero
  const historialDesdeCero = historial.slice(ultimoIndiceCero + 1);
  
  // Agregar información de saldo acumulado
  let saldoAcumARS = 0;
  let saldoAcumUSD = 0;
  
  return historialDesdeCero.map(item => {
    if (item.monedaItem === "ARS") {
      saldoAcumARS += item.esDeuda ? item.monto : -item.monto;
    } else {
      saldoAcumUSD += item.esDeuda ? item.monto : -item.monto;
    }
    
    return {
      ...item,
      saldoAcumuladoARS: saldoAcumARS,
      saldoAcumuladoUSD: saldoAcumUSD
    };
  });
};
// ✅ FUNCIÓN MEJORADA PARA GENERAR PDF LEGIBLE
const generarPDF = async () => {
  setGenerandoPDF(true);
  
  try {
    const doc = new jsPDF();
    let yPosition = 50;
    
    // 🎨 HEADER LIMPIO SIN EMOJIS
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, 210, 45, "F");

    // Logo si existe
    const logoUrl = localStorage.getItem("logoUrl");
    try {
      if (logoUrl) {
        const base64 = await cargarImagenComoBase64(logoUrl);
        doc.addImage(base64, "PNG", 15, 8, 50, 28);
      }
    } catch (error) {
      console.warn("No se pudo cargar el logo:", error);
    }

    // Título principal SIN EMOJIS
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("HISTORIAL DESDE ULTIMO SALDO CERO", 210 - 15, 18, { align: "right" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${nombreCliente}`, 210 - 15, 28, { align: "right" });
    
    doc.setFontSize(11);
    doc.text(`Generado: ${new Date().toLocaleDateString("es-AR")}`, 210 - 15, 36, { align: "right" });

    // 📊 OBTENER HISTORIAL DESDE ÚLTIMO SALDO CERO
    const historialPDF = obtenerHistorialParaPDF();
    
    yPosition = 60;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("MOVIMIENTOS DESDE ULTIMO SALDO CERO", 15, yPosition);
    yPosition += 5;
    
    if (historialPDF.length === 0) {
      // Caso: Cuenta al día
      yPosition += 30;
      doc.setFontSize(18);
      doc.setTextColor(39, 174, 96);
      doc.setFont("helvetica", "bold");
      doc.text("CUENTA AL DIA", 105, yPosition, { align: "center" });
      
      yPosition += 15;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text("No hay movimientos pendientes desde el ultimo saldo en cero", 105, yPosition, { align: "center" });
      
      // Mostrar resumen de totales históricos
      yPosition += 25;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN HISTORICO TOTAL", 15, yPosition);
      
      const totalesHistoricos = calcularTotales();
      const resumenHistorico = [
        ["Concepto", "Total ARS", "Total USD"],
        [`Trabajos realizados (${trabajos.length})`, `$${totalesHistoricos.totalTrabajosARS.toLocaleString("es-AR")}`, `US$${totalesHistoricos.totalTrabajosUSD.toLocaleString("es-AR")}`],
        [`Ventas realizadas (${ventas.length})`, `$${totalesHistoricos.totalVentasARS.toLocaleString("es-AR")}`, `US$${totalesHistoricos.totalVentasUSD.toLocaleString("es-AR")}`],
        [`Pagos recibidos (${pagos.length})`, `$${totalesHistoricos.totalPagosARS.toLocaleString("es-AR")}`, `US$${totalesHistoricos.totalPagosUSD.toLocaleString("es-AR")}`]
      ];

      autoTable(doc, {
        startY: yPosition + 10,
        head: [resumenHistorico[0]],
        body: resumenHistorico.slice(1),
        styles: { 
          fontSize: 10, 
          cellPadding: 4
        },
        headStyles: { 
          fillColor: [39, 174, 96], 
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: { 
          fillColor: [248, 250, 252] 
        }
      });
      
    } else {
      // Tabla de movimientos desde último saldo cero
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Se encontraron ${historialPDF.length} movimientos desde el ultimo saldo en cero:`, 15, yPosition + 15);
      
      const historialData = historialPDF.map((item, index) => {
        const tipoTexto = item.tipo === "trabajo" ? "Trabajo" : 
                         item.tipo === "venta" ? "Venta" : "Pago";
        
        const montoTexto = item.esDeuda ? `+${item.monto.toLocaleString("es-AR")}` : 
                          `-${item.monto.toLocaleString("es-AR")}`;
        
        const saldoARS = item.saldoAcumuladoARS.toLocaleString("es-AR");
        const saldoUSD = item.saldoAcumuladoUSD.toLocaleString("es-AR");
        
        return [
          item.fecha,
          tipoTexto,
          item.descripcion.length > 35 ? item.descripcion.substring(0, 32) + "..." : item.descripcion,
          montoTexto,
          item.monedaItem,
          `${saldoARS} ARS`,
          `${saldoUSD} USD`
        ];
      });

      autoTable(doc, {
        startY: yPosition + 25,
        head: [["Fecha", "Tipo", "Descripcion", "Monto", "Moneda", "Saldo ARS", "Saldo USD"]],
        body: historialData,
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          textColor: [0, 0, 0]
        },
        headStyles: { 
          fillColor: [79, 70, 229], 
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: { 
          fillColor: [250, 252, 255] 
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 50 },
          3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' }
        },
        didParseCell: function(data) {
          // Colorear según tipo sin usar emojis problemáticos
          if (data.row.index >= 0 && data.column.index === 1) {
            const tipo = historialPDF[data.row.index]?.tipo;
            if (tipo === "pago") {
              data.cell.styles.textColor = [39, 174, 96]; // Verde
              data.cell.styles.fontStyle = 'bold';
            } else if (tipo === "trabajo") {
              data.cell.styles.textColor = [52, 152, 219]; // Azul
            } else if (tipo === "venta") {
              data.cell.styles.textColor = [155, 89, 182]; // Morado
            }
          }
        }
      });

      // 📊 RESUMEN FINAL DE MOVIMIENTOS
      const yFinal = (doc as any).lastAutoTable.finalY + 15;
      
      // Caja de resumen
      doc.setFillColor(248, 249, 250);
      doc.rect(15, yFinal, 180, 30, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, yFinal, 180, 30);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN DE MOVIMIENTOS:", 20, yFinal + 10);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total movimientos desde ultimo saldo cero: ${historialPDF.length}`, 20, yFinal + 18);
      
      // Saldo actual
      const saldoFinalARS = historialPDF.length > 0 ? historialPDF[historialPDF.length - 1].saldoAcumuladoARS : 0;
      const saldoFinalUSD = historialPDF.length > 0 ? historialPDF[historialPDF.length - 1].saldoAcumuladoUSD : 0;
      
      doc.setFont("helvetica", "bold");
      if (saldoFinalARS !== 0 || saldoFinalUSD !== 0) {
        doc.setTextColor(231, 76, 60);
        doc.text(`SALDO ACTUAL: $${Math.abs(saldoFinalARS).toLocaleString("es-AR")} ARS / US$${Math.abs(saldoFinalUSD).toLocaleString("es-AR")} USD`, 20, yFinal + 25);
      } else {
        doc.setTextColor(39, 174, 96);
        doc.text("SALDO ACTUAL: CLIENTE AL DIA", 20, yFinal + 25);
      }
    }

    // 📄 FOOTER SIMPLE Y LEGIBLE
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.line(15, 285, 195, 285);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Historial de ${nombreCliente} - Pagina ${i} de ${totalPages} - ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR")}`, 
        105, 290, 
        { align: "center" }
      );
    }

    doc.save(`Historial-Desde-Ultimo-Cero-${nombreCliente}.pdf`);
    
  } catch (error) {
    console.error("Error generando PDF:", error);
    alert("Error al generar el PDF. Por favor, intenta nuevamente.");
  } finally {
    setGenerandoPDF(false);
  }
};

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

          {/* TABLA DE VENTAS CORREGIDA */}
          {mostrarVentas && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1] mb-8">
              
              <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🛍️</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Ventas Realizadas</h3>
                    <p className="text-purple-100 mt-1">
                      {ventas.length} {ventas.length === 1 ? 'venta registrada' : 'ventas registradas'}
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
                          <span className="text-base">📦</span>
                          Productos
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🚦</span>
                          Estado
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center gap-2">
                          <span className="text-base">💱</span>
                          Moneda
                        </div>
                      </th>
                      <th className="p-3 text-right text-sm font-semibold text-[#2c3e50] border border-black">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-base">💰</span>
                          Total
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.length > 0 ? (
                      ventas.map((v, i) => {
                        const isEven = i % 2 === 0;
                        return (
                          <tr key={i} className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                            <td className="p-3 border border-black">
                              <span className="text-sm font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                                {v.fecha}
                              </span>
                            </td>
                            <td className="p-3 border border-black">
                              <div className="text-sm text-[#2c3e50]">
                                {v.productos && v.productos.length > 0 ? (
                                  <div className="space-y-1">
                                    {v.productos.map((producto: any, idx: number) => (
                                      <div key={idx} className="bg-[#f8f9fa] px-2 py-1 rounded text-xs flex justify-between items-center">
                                        <span className="font-medium">{producto.modelo || producto.nombre || "Producto"}</span>
                                        <span className="text-[#7f8c8d] ml-2">x{producto.cantidad || 1}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[#7f8c8d] italic">Sin detalles de productos</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 border border-black">
                              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${
                                v.estado === "PAGADO" ? "bg-[#27ae60] text-white" :
                                v.estado === "ENTREGADO" ? "bg-[#f39c12] text-white" :
                                "bg-[#e74c3c] text-white"
                              }`}>
                                {v.estado || "PENDIENTE"}
                              </span>
                            </td>
                            <td className="p-3 border border-black">
                              <span className="text-sm text-[#2c3e50] bg-[#3498db]/10 px-2 py-1 rounded font-mono">
                                {(() => {
                                  const hayTelefono = v.productos?.some((prod: any) => prod.categoria === "Teléfono");
                                  return hayTelefono ? "USD" : (v.moneda || "ARS");
                                })()}
                              </span>
                            </td>
                            <td className="p-3 border border-black text-right">
                              <span className="text-sm font-bold text-[#9b59b6] bg-purple-50 px-3 py-1 rounded-lg">
                                {(() => {
                                  // 🔥 LÓGICA CORRECTA: Si hay teléfono = TODO USD, si no = TODO PESOS
                                  const hayTelefono = v.productos?.some((prod: any) => prod.categoria === "Teléfono");
                                  
                                  if (hayTelefono) {
                                    // 📱 CON TELÉFONO: TODO EN USD - Sumar todos los productos en USD
                                    let totalUSD = 0;
                                    v.productos?.forEach((p: any) => {
                                      totalUSD += (p.precioUnitario * p.cantidad);
                                    });
                                    return `USD ${totalUSD.toLocaleString("es-AR")}`;
                                  } else {
                                    // 🛍️ SIN TELÉFONO: TODO EN PESOS - Convertir USD a pesos
                                    let totalPesos = 0;
                                    v.productos?.forEach((p: any) => {
                                      if (p.moneda?.toUpperCase() === "USD") {
                                        // Convertir USD a pesos con cotización
                                        totalPesos += ((p.precioUSD || p.precioUnitario) * p.cantidad * 1200);
                                      } else {
                                        // Ya está en pesos
                                        totalPesos += (p.precioUnitario * p.cantidad);
                                      }
                                    });
                                    return `$ ${totalPesos.toLocaleString("es-AR")}`;
                                  }
                                })()}
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
                              <span className="text-3xl">🛍️</span>
                            </div>
                            <p className="text-lg font-medium text-[#7f8c8d]">No hay ventas registradas</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                            <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg">
                                {p.moneda === "USD" 
                                 ? `US$ ${Number(p.montoUSD || 0).toLocaleString("es-AR")}`
                                 : `$ ${Number(p.monto || 0).toLocaleString("es-AR")}`
                                   }   
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
                              {t.moneda === "USD" ? `US${Number(t.precio || 0).toLocaleString("es-AR")}` : `${Number(t.precio || 0).toLocaleString("es-AR")}`}
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