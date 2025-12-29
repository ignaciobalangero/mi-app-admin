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

  // Función CORREGIDA para obtener historial desde último saldo cero
  const obtenerHistorialDesdeSaldoCero = () => {
    const historial: any[] = [];

    // Agregar trabajos ENTREGADOS o PAGADOS
    trabajos.forEach((trabajo) => {
      if (trabajo.estado === "ENTREGADO" || trabajo.estado === "PAGADO") {
        historial.push({
          fecha: trabajo.fecha,
          fechaOrden: new Date(trabajo.fecha.split("/").reverse().join("-")),
          tipo: "trabajo",
          descripcion: `${trabajo.modelo} - ${trabajo.trabajo}`,
          monto: Number(trabajo.precio || 0),
          moneda: trabajo.moneda || "ARS",
          esDeuda: true,
        });
      }
    });

    // Agregar ventas - CORREGIDO para ventas mixtas
    ventas.forEach((venta) => {
      let totalARS = 0;
      let totalUSD = 0;

      // Calcular totales por moneda
      venta.productos?.forEach((p: any) => {
        if (p.categoria === "Teléfono" || p.moneda?.toUpperCase() === "USD") {
          totalUSD += (p.precioUnitario * p.cantidad);
        } else {
          totalARS += (p.precioUnitario * p.cantidad);
        }
      });

      const descripcion = venta.productos
        ?.map((p: any) => p.modelo || p.nombre || "Producto")
        .join(", ") || "Venta general";

      // Agregar entrada USD si hay monto
      if (totalUSD > 0) {
        historial.push({
          fecha: venta.fecha,
          fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
          tipo: "venta",
          descripcion: descripcion,
          monto: totalUSD,
          moneda: "USD",
          esDeuda: true,
        });
      }

      // Agregar entrada ARS si hay monto
      if (totalARS > 0) {
        historial.push({
          fecha: venta.fecha,
          fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
          tipo: "venta",
          descripcion: descripcion,
          monto: totalARS,
          moneda: "ARS",
          esDeuda: true,
        });
      }
    });

    // Agregar pagos
    pagos.forEach((pago) => {
      const monto = pago.moneda === "USD" 
        ? Number(pago.montoUSD || 0) 
        : Number(pago.monto || 0);
      
      if (monto > 0) {
        historial.push({
          fecha: pago.fecha,
          fechaOrden: new Date(pago.fecha.split("/").reverse().join("-")),
          tipo: "pago",
          descripcion: `Pago - ${pago.forma || "Efectivo"}`,
          monto: monto,
          moneda: pago.moneda || "ARS",
          esDeuda: false,
        });
      }
    });

    // Ordenar por fecha (más antiguo primero para calcular correctamente)
    historial.sort((a, b) => a.fechaOrden.getTime() - b.fechaOrden.getTime());

    // Encontrar el último punto donde ambos saldos fueron cero
    let saldoARS = 0;
    let saldoUSD = 0;
    let ultimoIndiceCero = -1;

    for (let i = 0; i < historial.length; i++) {
      const item = historial[i];

      if (item.moneda === "ARS") {
        saldoARS += item.esDeuda ? item.monto : -item.monto;
      } else {
        saldoUSD += item.esDeuda ? item.monto : -item.monto;
      }

      // Si ambos saldos están en cero (o muy cerca por redondeo)
      if (Math.abs(saldoARS) < 0.01 && Math.abs(saldoUSD) < 0.01) {
        ultimoIndiceCero = i;
        console.log(`✅ Saldo en cero encontrado en índice ${i}, fecha: ${item.fecha}`);
      }
    }

    console.log(`📊 Último índice con saldo cero: ${ultimoIndiceCero}`);
    console.log(`📊 Total de movimientos: ${historial.length}`);
    console.log(`📊 Movimientos desde último cero: ${historial.length - (ultimoIndiceCero + 1)}`);

    // Tomar solo los movimientos DESPUÉS del último saldo cero
    const historialDesdeCero = historial.slice(ultimoIndiceCero + 1);

    // Calcular saldos acumulados desde cero
    let saldoAcumARS = 0;
    let saldoAcumUSD = 0;

    return historialDesdeCero.map((item) => {
      if (item.moneda === "ARS") {
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

  // Generar PDF Saldo Actual - MEJORADO
  const generarPDFSaldoActual = async () => {
    setGenerandoPDF(true);

    try {
      const doc = new jsPDF();

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

      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("ESTADO DE CUENTA ACTUAL", 210 - 15, 18, { align: "right" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Cliente: ${nombreCliente}`, 210 - 15, 28, { align: "right" });

      doc.setFontSize(11);
      doc.text(
        `Generado: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}`,
        210 - 15,
        36,
        { align: "right" }
      );

      const historialDesdeCero = obtenerHistorialDesdeSaldoCero();
      let yPosition = 60;

      // CASO 1: Cuenta al día (sin movimientos desde último cero)
      if (historialDesdeCero.length === 0) {
        // Título
        doc.setTextColor(39, 174, 96);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("✓ CUENTA AL DÍA", 105, yPosition + 30, { align: "center" });

        // Mensaje
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(
          "No hay movimientos pendientes. El cliente ha saldado su cuenta.",
          105,
          yPosition + 50,
          { align: "center" }
        );

        // Cuadro de resumen
        doc.setFillColor(236, 240, 241);
        doc.roundedRect(30, yPosition + 70, 150, 30, 3, 3, "F");
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 62, 80);
        doc.text("SALDO ACTUAL", 105, yPosition + 85, { align: "center" });
        
        doc.setFontSize(18);
        doc.setTextColor(39, 174, 96);
        doc.text("$0 ARS  /  $0 USD", 105, yPosition + 95, { align: "center" });

      } else {
        // CASO 2: Hay movimientos pendientes
        
        // Calcular saldos finales
        const saldoFinalARS = historialDesdeCero[historialDesdeCero.length - 1].saldoAcumuladoARS;
        const saldoFinalUSD = historialDesdeCero[historialDesdeCero.length - 1].saldoAcumuladoUSD;

        // Título
        doc.setTextColor(231, 76, 60);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("MOVIMIENTOS DESDE ÚLTIMO SALDO EN CERO", 105, yPosition, { align: "center" });

        // Cuadro de saldo destacado
        yPosition += 15;
        doc.setFillColor(255, 235, 235);
        doc.roundedRect(30, yPosition, 150, 35, 3, 3, "F");
        doc.setDrawColor(231, 76, 60);
        doc.setLineWidth(2);
        doc.roundedRect(30, yPosition, 150, 35, 3, 3, "S");

        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.setFont("helvetica", "bold");
        doc.text("SALDO ACTUAL A PAGAR:", 105, yPosition + 12, { align: "center" });

        doc.setFontSize(20);
        doc.setTextColor(231, 76, 60);
        
        const textoSaldoARS = saldoFinalARS !== 0 ? `$${Math.abs(saldoFinalARS).toLocaleString("es-AR")} ARS` : "";
        const textoSaldoUSD = saldoFinalUSD !== 0 ? `US$${Math.abs(saldoFinalUSD).toLocaleString("es-AR")}` : "";
        
        let textoSaldo = "";
        if (textoSaldoARS && textoSaldoUSD) {
          textoSaldo = `${textoSaldoARS}  /  ${textoSaldoUSD}`;
        } else if (textoSaldoARS) {
          textoSaldo = textoSaldoARS;
        } else if (textoSaldoUSD) {
          textoSaldo = textoSaldoUSD;
        }

        doc.text(textoSaldo, 105, yPosition + 26, { align: "center" });

        // Resumen de movimientos
        yPosition += 50;
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Desde la última cancelación de cuenta, se registraron ${historialDesdeCero.length} movimiento${historialDesdeCero.length > 1 ? 's' : ''}:`,
          105,
          yPosition,
          { align: "center" }
        );

        // Tabla de movimientos
        yPosition += 10;

        const historialData = historialDesdeCero.map((item) => {
          // SIN EMOJIS - solo texto
          const tipoTexto = item.tipo === "trabajo" ? "Trabajo" : item.tipo === "venta" ? "Venta" : "Pago";
          
          // Mostrar el monto con signo y en la columna correcta según moneda
          const signo = item.esDeuda ? "+" : "-";
          const montoARS = item.moneda === "ARS" ? `${signo}${item.monto.toLocaleString("es-AR")}` : "";
          const montoUSD = item.moneda === "USD" ? `${signo}${item.monto.toLocaleString("es-AR")}` : "";

          const saldoARS = item.saldoAcumuladoARS.toLocaleString("es-AR");
          const saldoUSD = item.saldoAcumuladoUSD.toLocaleString("es-AR");

          return [
            item.fecha,
            tipoTexto,
            item.descripcion.length > 45 ? item.descripcion.substring(0, 42) + "..." : item.descripcion,
            montoARS,
            montoUSD,
            saldoARS,
            saldoUSD,
          ];
        }).reverse(); // INVERTIR para mostrar más reciente primero

        autoTable(doc, {
          startY: yPosition,
          head: [["Fecha", "Tipo", "Descripción", "ARS", "USD", "Saldo $", "Saldo U$"]],
          body: historialData,
          theme: 'grid',
          margin: { left: 5, right: 5 }, // Márgenes mínimos
          styles: {
            fontSize: 8.5,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [200, 200, 200],
            lineWidth: 0.5,
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 23, halign: "center", fontStyle: "bold" },
            1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
            2: { cellWidth: 76 },
            3: { cellWidth: 21, halign: "right", fontStyle: "bold" },
            4: { cellWidth: 21, halign: "right", fontStyle: "bold" },
            5: { cellWidth: 20.5, halign: "right", fontStyle: "bold" },
            6: { cellWidth: 20.5, halign: "right", fontStyle: "bold" },
          },
          didParseCell: function (data) {
            // Corregir índice porque invertimos el array
            const realIndex = historialDesdeCero.length - 1 - data.row.index;
            
            // Colorear según tipo
            if (data.row.index >= 0 && data.column.index === 1) {
              const item = historialDesdeCero[realIndex];
              if (item.tipo === "pago") {
                data.cell.styles.textColor = [39, 174, 96];
              } else if (item.tipo === "trabajo") {
                data.cell.styles.textColor = [52, 152, 219];
              } else if (item.tipo === "venta") {
                data.cell.styles.textColor = [155, 89, 182];
              }
            }

            // Colorear montos ARS (deudas en rojo, pagos en verde)
            if (data.row.index >= 0 && data.column.index === 3) {
              const item = historialDesdeCero[realIndex];
              if (item.moneda === "ARS") {
                data.cell.styles.textColor = item.esDeuda ? [231, 76, 60] : [39, 174, 96];
              }
            }

            // Colorear montos USD (deudas en rojo, pagos en verde)
            if (data.row.index >= 0 && data.column.index === 4) {
              const item = historialDesdeCero[realIndex];
              if (item.moneda === "USD") {
                data.cell.styles.textColor = item.esDeuda ? [231, 76, 60] : [39, 174, 96];
              }
            }

            // Colorear saldos finales (que ahora están en la PRIMERA fila) en negrita
            if (data.row.index === 0 && (data.column.index === 5 || data.column.index === 6)) {
              data.cell.styles.fillColor = [255, 243, 224];
              data.cell.styles.textColor = [231, 76, 60];
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
      }

      // Footer en todas las páginas
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(15, 285, 195, 285);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Estado de Cuenta - ${nombreCliente} - Página ${i} de ${totalPages}`,
          105,
          290,
          { align: "center" }
        );
      }

      doc.save(`Estado-Cuenta-${nombreCliente}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF. Por favor, intenta nuevamente.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  // Generar PDF Historial Completo - SIN CAMBIOS MAYORES
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
            fecha: trabajo.fecha,
            fechaOrden: new Date(trabajo.fecha.split("/").reverse().join("-")),
            tipo: "trabajo",
            descripcion: `${trabajo.modelo} - ${trabajo.trabajo}`,
            monto: Number(trabajo.precio || 0),
            moneda: trabajo.moneda || "ARS",
            esDeuda: true,
          });
        }
      });

      ventas.forEach((venta) => {
        let totalARS = 0;
        let totalUSD = 0;

        venta.productos?.forEach((p: any) => {
          if (p.categoria === "Teléfono" || p.moneda?.toUpperCase() === "USD") {
            totalUSD += (p.precioUnitario * p.cantidad);
          } else {
            totalARS += (p.precioUnitario * p.cantidad);
          }
        });

        const descripcion = venta.productos
          ?.map((p: any) => p.modelo || p.nombre || "Producto")
          .join(", ") || "Venta general";

        if (totalUSD > 0) {
          historial.push({
            fecha: venta.fecha,
            fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
            tipo: "venta",
            descripcion: descripcion,
            monto: totalUSD,
            moneda: "USD",
            esDeuda: true,
          });
        }

        if (totalARS > 0) {
          historial.push({
            fecha: venta.fecha,
            fechaOrden: new Date(venta.fecha.split("/").reverse().join("-")),
            tipo: "venta",
            descripcion: descripcion,
            monto: totalARS,
            moneda: "ARS",
            esDeuda: true,
          });
        }
      });

      pagos.forEach((pago) => {
        const monto = pago.moneda === "USD"
          ? Number(pago.montoUSD || 0)
          : Number(pago.monto || 0);
        
        if (monto > 0) {
          historial.push({
            fecha: pago.fecha,
            fechaOrden: new Date(pago.fecha.split("/").reverse().join("-")),
            tipo: "pago",
            descripcion: `Pago - ${pago.forma || "Efectivo"}`,
            monto: monto,
            moneda: pago.moneda || "ARS",
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
      historialFiltrado.sort((a, b) => a.fechaOrden.getTime() - b.fechaOrden.getTime());

      // Calcular saldos acumulados
      let saldoAcumARS = 0;
      let saldoAcumUSD = 0;

      const historialConSaldos = historialFiltrado.map((item) => {
        if (item.moneda === "ARS") {
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
          // SIN EMOJIS - solo texto
          const tipoTexto = item.tipo === "trabajo" ? "Trabajo" : item.tipo === "venta" ? "Venta" : "Pago";
          
          // Mostrar el monto con signo y en la columna correcta según moneda
          const signo = item.esDeuda ? "+" : "-";
          const montoARS = item.moneda === "ARS" ? `${signo}${item.monto.toLocaleString("es-AR")}` : "";
          const montoUSD = item.moneda === "USD" ? `${signo}${item.monto.toLocaleString("es-AR")}` : "";

          const saldoARS = item.saldoAcumuladoARS.toLocaleString("es-AR");
          const saldoUSD = item.saldoAcumuladoUSD.toLocaleString("es-AR");

          return [
            item.fecha,
            tipoTexto,
            item.descripcion.length > 45 ? item.descripcion.substring(0, 42) + "..." : item.descripcion,
            montoARS,
            montoUSD,
            saldoARS,
            saldoUSD,
          ];
        });

        autoTable(doc, {
          startY: yPosition + 10,
          head: [["Fecha", "Tipo", "Descripción", "ARS", "USD", "Saldo $", "Saldo U$"]],
          body: historialData,
          theme: 'grid',
          margin: { left: 5, right: 5 }, // Márgenes mínimos
          styles: {
            fontSize: 8.5,
            cellPadding: 3,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8.5,
          },
          alternateRowStyles: {
            fillColor: [250, 252, 255],
          },
          columnStyles: {
            0: { cellWidth: 23, halign: "center", fontStyle: "bold" },
            1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
            2: { cellWidth: 76 },
            3: { cellWidth: 21, halign: "right", fontStyle: "bold" },
            4: { cellWidth: 21, halign: "right", fontStyle: "bold" },
            5: { cellWidth: 20.5, halign: "right", fontStyle: "bold" },
            6: { cellWidth: 20.5, halign: "right", fontStyle: "bold" },
          },
          didParseCell: function (data) {
            // Colorear según tipo
            if (data.row.index >= 0 && data.column.index === 1) {
              const tipo = historialConSaldos[data.row.index]?.tipo;
              if (tipo === "pago") {
                data.cell.styles.textColor = [39, 174, 96];
              } else if (tipo === "trabajo") {
                data.cell.styles.textColor = [52, 152, 219];
              } else if (tipo === "venta") {
                data.cell.styles.textColor = [155, 89, 182];
              }
            }

            // Colorear montos ARS (deudas en rojo, pagos en verde)
            if (data.row.index >= 0 && data.column.index === 3) {
              const item = historialConSaldos[data.row.index];
              if (item.moneda === "ARS") {
                data.cell.styles.textColor = item.esDeuda ? [231, 76, 60] : [39, 174, 96];
              }
            }

            // Colorear montos USD (deudas en rojo, pagos en verde)
            if (data.row.index >= 0 && data.column.index === 4) {
              const item = historialConSaldos[data.row.index];
              if (item.moneda === "USD") {
                data.cell.styles.textColor = item.esDeuda ? [231, 76, 60] : [39, 174, 96];
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
          `Historial Completo - ${nombreCliente} - Página ${i} de ${totalPages}`,
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
            <>📄 PDF Estado de Cuenta</>
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