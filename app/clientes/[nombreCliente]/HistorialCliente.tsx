"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ClienteDetalle() {
  const params = useParams();
  const nombreCliente = decodeURIComponent((params?.nombreCliente || "").toString());
  console.log("🟡 nombreCliente desde URL:", nombreCliente);

  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!nombreCliente) return;

      const trabajosQuery = query(
        collection(db, "trabajos"),
        where("cliente", "==", nombreCliente)
      );
      const pagosQuery = query(
        collection(db, "pagos"),
        where("cliente", "==", nombreCliente)
      );

      const [trabajosSnap, pagosSnap] = await Promise.all([
        getDocs(trabajosQuery),
        getDocs(pagosQuery),
      ]);

      setTrabajos(trabajosSnap.docs.map((doc) => doc.data()));
      setPagos(pagosSnap.docs.map((doc) => doc.data()));
    };

    fetchData();
  }, [nombreCliente]);

  const totalTrabajos = trabajos.reduce((sum, t) => sum + (t.precio || 0), 0);
  const totalPagos = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const saldo = totalTrabajos - totalPagos;

  const generarPDF = () => {
    const doc = new jsPDF();
    const colorEncabezado = "#60a5fa"; // azul más oscuro

    // Encabezado
    doc.setFillColor(colorEncabezado);
    doc.rect(0, 0, 210, 40, "F");

    const img = new Image();
    img.src = "/logo.png";

    img.onload = () => {
      // Logo más centrado y con margen izquierdo mayor
      doc.addImage(img, "PNG", 15, 8, 65, 25);

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
    };
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Historial de {nombreCliente}</h1>
          <button
            onClick={generarPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Generar PDF
          </button>
        </div>

        <div className="mb-6">
          <p className="font-semibold">Total trabajos: ${totalTrabajos.toLocaleString("es-AR")}</p>
          <p className="font-semibold">Total pagos: ${totalPagos.toLocaleString("es-AR")}</p>
          <p className="font-semibold">
            Saldo: ${saldo.toLocaleString("es-AR")} {saldo > 0 ? "(debe)" : saldo < 0 ? "(saldo a favor)" : "(saldo en cero)"}
          </p>
        </div>

        <h2 className="text-xl font-semibold mb-2">Trabajos</h2>
        <table className="w-full bg-white text-sm mb-8">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Modelo</th>
              <th className="p-2 border">Trabajo</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Precio</th>
            </tr>
          </thead>
          <tbody>
            {trabajos.map((t, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 border">{t.fecha}</td>
                <td className="p-2 border">{t.modelo}</td>
                <td className="p-2 border">{t.trabajo}</td>
                <td className="p-2 border">{t.estado}</td>
                <td className="p-2 border">${t.precio}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-xl font-semibold mb-2">Pagos realizados</h2>
        <table className="w-full bg-white text-sm">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Monto</th>
              <th className="p-2 border">Forma</th>
              <th className="p-2 border">Destino</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 border">{p.fecha}</td>
                <td className="p-2 border">${p.monto}</td>
                <td className="p-2 border">{p.forma}</td>
                <td className="p-2 border">{p.destino}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}

