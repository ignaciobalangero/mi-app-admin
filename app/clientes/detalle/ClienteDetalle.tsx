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
  
    // ... lo demás queda igual
  

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

  const totalTrabajos = trabajos.reduce((sum, t) => sum + (t.precio || 0), 0);
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
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-4">Historial de {nombreCliente}</h1>

        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:underline"
          >
            ← Volver al listado de clientes
          </button>

          <button
            onClick={exportarPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Descargar resumen en PDF
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
