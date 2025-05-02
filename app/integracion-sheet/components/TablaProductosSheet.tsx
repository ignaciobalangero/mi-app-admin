"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";

export default function TablaProductosSheet({
    sheetID,
    hoja,
  }: {
    sheetID: string;
    hoja: string;
  }) {
  
    const [user] = useAuthState(auth);
    const [datos, setDatos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(false);
  
    useEffect(() => {
      const fetchData = async () => {
        if (!sheetID) return;
        setCargando(true);
        try {
            const res = await fetch("/api/leer-stock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sheetID, hoja }),
              });
              const json = await res.json();
              setDatos(json.datos || []);              
        } catch (err) {
          console.error("❌ Error cargando datos del sheet:", err);
        } finally {
          setCargando(false);
        }
      };
      fetchData();
    }, [sheetID]);
  
    return (
      <div className="overflow-x-auto mt-8">
        {cargando ? (
          <p className="text-center text-blue-600">Cargando datos desde Google Sheet...</p>
        ) : (
          <table className="min-w-full bg-white text-sm border rounded shadow">
            <thead className="bg-gray-300">
              <tr>
                <th className="p-2 border">Código</th>
                <th className="p-2 border">Categoría</th>
                <th className="p-2 border">Producto</th>
                <th className="p-2 border">Cantidad</th>
                <th className="p-2 border">Precio ARS</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((fila, i) => (
                <tr key={i} className="hover:bg-gray-100">
                  <td className="p-2 border">{fila.codigo}</td>
                  <td className="p-2 border">{fila.categoria}</td>
                  <td className="p-2 border">{fila.producto}</td>
                  <td className="p-2 border">{fila.cantidad}</td>
                  <td className="p-2 border">${fila.precioARS}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
  