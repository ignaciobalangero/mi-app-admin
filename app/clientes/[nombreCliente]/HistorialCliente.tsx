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

  terminarPDF();

  function terminarPDF() {
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
  }
};


  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Historial de {nombreCliente}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/clientes")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              ← Atrás
            </button>
            <button
              onClick={generarPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Generar PDF
            </button>
          </div>
        </div>

        <div className="mb-6">
          <p className="font-semibold">Total trabajos: ${totalTrabajos.toLocaleString("es-AR")}</p>
          <p className="font-semibold">Total pagos: ${totalPagos.toLocaleString("es-AR")}</p>
          <p className="font-semibold">
            Saldo: ${saldo.toLocaleString("es-AR")} {saldo > 0 ? "(debe)" : saldo < 0 ? "(saldo a favor)" : "(saldo en cero)"}
          </p>
        </div>

        <button
          onClick={() => setMostrarPagos(!mostrarPagos)}
          className="mb-4 text-blue-700 hover:underline"
        >
          {mostrarPagos ? "Ocultar pagos realizados" : "Mostrar pagos realizados"}
        </button>

        {mostrarPagos && (
          <>
            <h2 className="text-xl font-semibold mb-2">Pagos realizados</h2>
            <table className="w-full bg-white text-sm mb-8">
              <thead className="bg-gray-300">
                <tr>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Monto</th>
                  <th className="p-2 border">Moneda</th>
                  <th className="p-2 border">Forma</th>
                  <th className="p-2 border">Destino</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 border">{p.fecha}</td>
                    <td className="p-2 border">${p.monto}</td>
                    <td className="p-2 border">{p.moneda || "ARS"}</td>
                    <td className="p-2 border">{p.forma}</td>
                    <td className="p-2 border">{p.destino}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2 className="text-xl font-semibold mb-2">Trabajos</h2>
        <table className="w-full bg-white text-sm">
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
      </main>
    </>
  );
}

