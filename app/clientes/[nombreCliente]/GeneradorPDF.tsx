"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GeneradorPDFProps {
  nombreCliente: string;
  trabajos: any[];
  ventas: any[];
  pagos: any[];
  calcularTotales: () => any;
}

export default function GeneradorPDF({
  nombreCliente,
  trabajos,
  ventas,
  pagos,
  calcularTotales,
}: GeneradorPDFProps) {
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [mostrarFiltroFechas, setMostrarFiltroFechas] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

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

  // Función para obtener historial desde último saldo cero
  const obtenerHistorialParaPDF = () => {
    const historial: any[] = [];

    // Agregar trabajos
    trabajos.forEach((trabajo) => {
      if (trabajo.estado === "ENTREGADO" || trabajo.estado === "PAGADO") {
        historial.push({
          ...trabajo,
          tipo: "trabajo",
          fechaOrden: new Date(trabajo.fecha.split("/").reverse().join("-")),
          descripcion: `${trabajo.modelo} - ${trabajo.trabajo}`,
          monto: Number(trabajo.precio || 0),
          monedaItem: trabajo.moneda || "ARS",
          esDeuda: true,
        });
      }
    });

    // Agregar ventas
    ventas.forEach((venta) => {
      const monedaVenta = venta.moneda || "ARS";

      if (monedaVenta === "DUAL") {
        const montoARS = Number(venta.totalARS || 0);
        const montoUSD = Number(venta.totalUSD || 0);

        if (montoARS > 0) {
          historial.push({
            ...venta,
            tipo: "venta",
            fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
            descripcion:
              venta.productos
                ?.map((p: any) => p.modelo || p.producto)
                .join(", ") || "Venta general",
            monto: montoARS,
            monedaItem: "ARS",
            esDeuda: true,
          });
        }
        if (montoUSD > 0) {
          historial.push({
            ...venta,
            tipo: "venta",
            fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
            descripcion:
              venta.productos
                ?.map((p: any) => p.modelo || p.producto)
                .join(", ") || "Venta general",
            monto: montoUSD,
            monedaItem: "USD",
            esDeuda: true,
          });
        }
      } else {
        const monto = Number(venta.total || 0);
        if (monto > 0) {
          historial.push({
            ...venta,
            tipo: "venta",
            fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
            descripcion:
              venta.productos
                ?.map((p: any) => p.modelo || p.producto)
                .join(", ") || "Venta general",
            monto: monto,
            monedaItem: monedaVenta,
            esDeuda: true,
          });
        }
      }
    });

    // Agregar pagos
    pagos.forEach((pago) => {
      const monto =
        pago.moneda === "USD"
          ? Number(pago.montoUSD || 0)
          : Number(pago.monto || 0);
      if (monto > 0) {
        historial.push({
          ...pago,
          tipo: "pago",
          fechaOrden: new Date(pago.fecha.split("/").reverse().join("-")),
          descripcion: `Pago recibido - ${
            pago.formaPago || pago.forma || "Efectivo"
          }`,
          monto: monto,
          monedaItem: pago.moneda || "ARS",
          esDeuda: false,
        });
      }
    });


   // Ordenar por fecha (más reciente primero)
historial.sort((a, b) => b.fechaOrden.getTime() - a.fechaOrden.getTime());

    // Encontrar desde el último saldo cero
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

      if (Math.abs(saldoARS) < 0.01 && Math.abs(saldoUSD) < 0.01) {
        ultimoIndiceCero = i;
      }
    }

    const historialDesdeCero = historial.slice(ultimoIndiceCero + 1);

    let saldoAcumARS = 0;
    let saldoAcumUSD = 0;

    return historialDesdeCero.map((item) => {
      if (item.monedaItem === "ARS") {
        saldoAcumARS += item.esDeuda ? item.monto : -item.monto;
      } else {
        saldoAcumUSD += item.esDeuda ? item.monto : -item.monto;
      }

      return {
        ...item,
        saldoAcumuladoARS: saldoAcumARS,
        saldoAcumuladoUSD: saldoAcumUSD,
      };
    });
  };

  // Generar PDF Saldo Actual
  const generarPDFSaldoActual = async () => {
    setGenerandoPDF(true);

    try {
      const doc = new jsPDF();
      let yPosition = 50;

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 45, "F");

      const logoUrl = localStorage.getItem("logoUrl");
      try {
        if (logoUrl) {
          const base64 = await cargarImagenComoBase64(logoUrl);
          doc.addImage(base64, "PNG", 15, 8, 50, 28);
        }
      } catch (error) {
        console.warn("No se pudo cargar el logo:", error);
      }

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(
        "HISTORIAL DESDE ULTIMO SALDO CERO",
        210 - 15,
        18,
        { align: "right" }
      );

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Cliente: ${nombreCliente}`, 210 - 15, 28, { align: "right" });

      doc.setFontSize(11);
      doc.text(
        `Generado: ${new Date().toLocaleDateString("es-AR")}`,
        210 - 15,
        36,
        { align: "right" }
      );

      const historialPDF = obtenerHistorialParaPDF();

      yPosition = 60;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("MOVIMIENTOS DESDE ULTIMO SALDO CERO", 15, yPosition);
      yPosition += 5;

      if (historialPDF.length === 0) {
        yPosition += 30;
        doc.setFontSize(18);
        doc.setTextColor(39, 174, 96);
        doc.setFont("helvetica", "bold");
        doc.text("CUENTA AL DIA", 105, yPosition, { align: "center" });

        yPosition += 15;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(
          "No hay movimientos pendientes desde el ultimo saldo en cero",
          105,
          yPosition,
          { align: "center" }
        );

        yPosition += 25;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("RESUMEN HISTORICO TOTAL", 15, yPosition);

        const totalesHistoricos = calcularTotales();
        const resumenHistorico = [
          ["Concepto", "Total ARS", "Total USD"],
          [
            `Trabajos realizados (${trabajos.length})`,
            `$${totalesHistoricos.totalTrabajosARS.toLocaleString("es-AR")}`,
            `US$${totalesHistoricos.totalTrabajosUSD.toLocaleString("es-AR")}`,
          ],
          [
            `Ventas realizadas (${ventas.length})`,
            `$${totalesHistoricos.totalVentasARS.toLocaleString("es-AR")}`,
            `US$${totalesHistoricos.totalVentasUSD.toLocaleString("es-AR")}`,
          ],
          [
            `Pagos recibidos (${pagos.length})`,
            `$${totalesHistoricos.totalPagosARS.toLocaleString("es-AR")}`,
            `US$${totalesHistoricos.totalPagosUSD.toLocaleString("es-AR")}`,
          ],
        ];

        autoTable(doc, {
          startY: yPosition + 10,
          head: [resumenHistorico[0]],
          body: resumenHistorico.slice(1),
          styles: {
            fontSize: 10,
            cellPadding: 4,
          },
          headStyles: {
            fillColor: [39, 174, 96],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
        });
      } else {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Se encontraron ${historialPDF.length} movimientos desde el ultimo saldo en cero:`,
          15,
          yPosition + 15
        );

        const historialData = historialPDF.map((item) => {
          const tipoTexto =
            item.tipo === "trabajo"
              ? "Trabajo"
              : item.tipo === "venta"
              ? "Venta"
              : "Pago";

          const montoTexto = item.esDeuda
            ? `+${item.monto.toLocaleString("es-AR")}`
            : `-${item.monto.toLocaleString("es-AR")}`;

          const saldoARS = item.saldoAcumuladoARS.toLocaleString("es-AR");
          const saldoUSD = item.saldoAcumuladoUSD.toLocaleString("es-AR");

          return [
            item.fecha,
            tipoTexto,
            item.descripcion.length > 35
              ? item.descripcion.substring(0, 32) + "..."
              : item.descripcion,
            montoTexto,
            item.monedaItem,
            `${saldoARS} ARS`,
            `${saldoUSD} USD`,
          ];
        });

        autoTable(doc, {
          startY: yPosition + 25,
          head: [
            [
              "Fecha",
              "Tipo",
              "Descripcion",
              "Monto",
              "Moneda",
              "Saldo ARS",
              "Saldo USD",
            ],
          ],
          body: historialData,
          styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [250, 252, 255],
          },
          columnStyles: {
            0: { cellWidth: 25, halign: "center" },
            1: { cellWidth: 20, halign: "center", fontStyle: "bold" },
            2: { cellWidth: 50 },
            3: { cellWidth: 25, halign: "right", fontStyle: "bold" },
            4: { cellWidth: 15, halign: "center" },
            5: { cellWidth: 25, halign: "right" },
            6: { cellWidth: 25, halign: "right" },
          },
          didParseCell: function (data) {
            if (data.row.index >= 0 && data.column.index === 1) {
              const tipo = historialPDF[data.row.index]?.tipo;
              if (tipo === "pago") {
                data.cell.styles.textColor = [39, 174, 96];
                data.cell.styles.fontStyle = "bold";
              } else if (tipo === "trabajo") {
                data.cell.styles.textColor = [52, 152, 219];
              } else if (tipo === "venta") {
                data.cell.styles.textColor = [155, 89, 182];
              }
            }
          },
        });

        const yFinal = (doc as any).lastAutoTable.finalY + 15;

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
        doc.text(
          `Total movimientos desde ultimo saldo cero: ${historialPDF.length}`,
          20,
          yFinal + 18
        );

        const saldoFinalARS =
          historialPDF.length > 0
            ? historialPDF[historialPDF.length - 1].saldoAcumuladoARS
            : 0;
        const saldoFinalUSD =
          historialPDF.length > 0
            ? historialPDF[historialPDF.length - 1].saldoAcumuladoUSD
            : 0;

        doc.setFont("helvetica", "bold");
        if (saldoFinalARS !== 0 || saldoFinalUSD !== 0) {
          doc.setTextColor(231, 76, 60);
          doc.text(
            `SALDO ACTUAL: $${Math.abs(saldoFinalARS).toLocaleString(
              "es-AR"
            )} ARS / US$${Math.abs(saldoFinalUSD).toLocaleString("es-AR")} USD`,
            20,
            yFinal + 25
          );
        } else {
          doc.setTextColor(39, 174, 96);
          doc.text("SALDO ACTUAL: CLIENTE AL DIA", 20, yFinal + 25);
        }
      }

      // Footer
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
          `Historial de ${nombreCliente} - Pagina ${i} de ${totalPages} - ${new Date().toLocaleDateString(
            "es-AR"
          )} ${new Date().toLocaleTimeString("es-AR")}`,
          105,
          290,
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

  // Generar PDF Historial Completo
  const generarPDFHistorialCompleto = async () => {
    setGenerandoPDF(true);

    try {
      const doc = new jsPDF();
      let yPosition = 50;

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 45, "F");

      const logoUrl = localStorage.getItem("logoUrl");
      try {
        if (logoUrl) {
          const base64 = await cargarImagenComoBase64(logoUrl);
          doc.addImage(base64, "PNG", 15, 8, 50, 28);
        }
      } catch (error) {
        console.warn("No se pudo cargar el logo:", error);
      }

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("HISTORIAL COMPLETO", 210 - 15, 18, { align: "right" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Cliente: ${nombreCliente}`, 210 - 15, 28, { align: "right" });

      doc.setFontSize(11);
      const rangoTexto =
        fechaDesde || fechaHasta
          ? `Desde: ${fechaDesde || "Inicio"} - Hasta: ${fechaHasta || "Hoy"}`
          : "Todo el historial";
      doc.text(rangoTexto, 210 - 15, 36, { align: "right" });

      // Obtener y filtrar historial
      const historial: any[] = [];

      trabajos.forEach((trabajo) => {
        if (trabajo.estado === "ENTREGADO" || trabajo.estado === "PAGADO") {
          historial.push({
            ...trabajo,
            tipo: "trabajo",
            fechaOrden: new Date(trabajo.fecha.split("/").reverse().join("-")),
            descripcion: `${trabajo.modelo} - ${trabajo.trabajo}`,
            monto: Number(trabajo.precio || 0),
            monedaItem: trabajo.moneda || "ARS",
            esDeuda: true,
          });
        }
      });

      ventas.forEach((venta) => {
        const monedaVenta = venta.moneda || "ARS";

        if (monedaVenta === "DUAL") {
          const montoARS = Number(venta.totalARS || 0);
          const montoUSD = Number(venta.totalUSD || 0);

          if (montoARS > 0) {
            historial.push({
              ...venta,
              tipo: "venta",
              fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
              descripcion:
                venta.productos
                  ?.map((p: any) => p.modelo || p.producto)
                  .join(", ") || "Venta general",
              monto: montoARS,
              monedaItem: "ARS",
              esDeuda: true,
            });
          }
          if (montoUSD > 0) {
            historial.push({
              ...venta,
              tipo: "venta",
              fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
              descripcion:
                venta.productos
                  ?.map((p: any) => p.modelo || p.producto)
                  .join(", ") || "Venta general",
              monto: montoUSD,
              monedaItem: "USD",
              esDeuda: true,
            });
          }
        } else {
          const monto = Number(venta.total || 0);
          if (monto > 0) {
            historial.push({
              ...venta,
              tipo: "venta",
              fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
              descripcion:
                venta.productos
                  ?.map((p: any) => p.modelo || p.producto)
                  .join(", ") || "Venta general",
              monto: monto,
              monedaItem: monedaVenta,
              esDeuda: true,
            });
          }
        }
      });

      pagos.forEach((pago) => {
        const monto =
          pago.moneda === "USD"
            ? Number(pago.montoUSD || 0)
            : Number(pago.monto || 0);
        if (monto > 0) {
          historial.push({
            ...pago,
            tipo: "pago",
            fechaOrden: new Date(pago.fecha.split("/").reverse().join("-")),
            descripcion: `Pago recibido - ${
              pago.formaPago || pago.forma || "Efectivo"
            }`,
            monto: monto,
            monedaItem: pago.moneda || "ARS",
            esDeuda: false,
          });
        }
      });

      // Filtrar por fechas si se especificaron
      let historialFiltrado = historial;
      if (fechaDesde || fechaHasta) {
        const desde = fechaDesde ? new Date(fechaDesde) : new Date("1900-01-01");
        const hasta = fechaHasta ? new Date(fechaHasta) : new Date();

        historialFiltrado = historial.filter((item) => {
          return item.fechaOrden >= desde && item.fechaOrden <= hasta;
        });
      }

      // Ordenar por fecha
      historialFiltrado.sort(
        (a, b) => a.fechaOrden.getTime() - b.fechaOrden.getTime()
      );

      // Calcular saldos acumulados
      let saldoAcumARS = 0;
      let saldoAcumUSD = 0;

      const historialConSaldos = historialFiltrado.map((item) => {
        if (item.monedaItem === "ARS") {
          saldoAcumARS += item.esDeuda ? item.monto : -item.monto;
        } else {
          saldoAcumUSD += item.esDeuda ? item.monto : -item.monto;
        }

        return {
          ...item,
          saldoAcumuladoARS: saldoAcumARS,
          saldoAcumuladoUSD: saldoAcumUSD,
        };
      });

      // Crear tabla
      yPosition = 60;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("HISTORIAL COMPLETO DE MOVIMIENTOS", 15, yPosition);

      if (historialConSaldos.length > 0) {
        const historialData = historialConSaldos.map((item) => {
          const tipoTexto =
            item.tipo === "trabajo"
              ? "Trabajo"
              : item.tipo === "venta"
              ? "Venta"
              : "Pago";

          const montoTexto = item.esDeuda
            ? `+${item.monto.toLocaleString("es-AR")}`
            : `-${item.monto.toLocaleString("es-AR")}`;

          const saldoARS = item.saldoAcumuladoARS.toLocaleString("es-AR");
          const saldoUSD = item.saldoAcumuladoUSD.toLocaleString("es-AR");

          return [
            item.fecha,
            tipoTexto,
            item.descripcion.length > 35
              ? item.descripcion.substring(0, 32) + "..."
              : item.descripcion,
            montoTexto,
            item.monedaItem,
            `${saldoARS} ARS`,
            `${saldoUSD} USD`,
          ];
        });

        autoTable(doc, {
          startY: yPosition + 10,
          head: [
            [
              "Fecha",
              "Tipo",
              "Descripcion",
              "Monto",
              "Moneda",
              "Saldo ARS",
              "Saldo USD",
            ],
          ],
          body: historialData,
          styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [250, 252, 255],
          },
          columnStyles: {
            0: { cellWidth: 25, halign: "center" },
            1: { cellWidth: 20, halign: "center", fontStyle: "bold" },
            2: { cellWidth: 50 },
            3: { cellWidth: 25, halign: "right", fontStyle: "bold" },
            4: { cellWidth: 15, halign: "center" },
            5: { cellWidth: 25, halign: "right" },
            6: { cellWidth: 25, halign: "right" },
          },
          didParseCell: function (data) {
            if (data.row.index >= 0 && data.column.index === 1) {
              const tipo = historialConSaldos[data.row.index]?.tipo;
              if (tipo === "pago") {
                data.cell.styles.textColor = [39, 174, 96];
                data.cell.styles.fontStyle = "bold";
              } else if (tipo === "trabajo") {
                data.cell.styles.textColor = [52, 152, 219];
              } else if (tipo === "venta") {
                data.cell.styles.textColor = [155, 89, 182];
              }
            }
          },
        });
      }

      // Footer
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
          `Historial Completo - ${nombreCliente} - Pagina ${i} de ${totalPages}`,
          105,
          290,
          { align: "center" }
        );
      }

      doc.save(`Historial-Completo-${nombreCliente}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF. Por favor, intenta nuevamente.");
    } finally {
      setGenerandoPDF(false);
      setMostrarFiltroFechas(false);
      setFechaDesde("");
      setFechaHasta("");
    }
  };

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={generarPDFSaldoActual}
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
            <>📄 PDF Saldo Actual</>
          )}
        </button>

        <button
          onClick={() => setMostrarFiltroFechas(!mostrarFiltroFechas)}
          disabled={generandoPDF}
          className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
        >
          📊 PDF Historial Completo
        </button>
      </div>

      {/* Modal para seleccionar fechas */}
      {mostrarFiltroFechas && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1]">
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-t-2xl p-6">
              <h2 className="text-xl font-bold">Seleccionar Rango de Fechas</h2>
              <p className="text-blue-100 text-sm mt-1">
                Genera un PDF con el historial filtrado
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  Fecha Desde (opcional):
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  Fecha Hasta (opcional):
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setMostrarFiltroFechas(false);
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  className="flex-1 px-4 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={generarPDFHistorialCompleto}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg font-medium transition-all"
                >
                  Generar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}