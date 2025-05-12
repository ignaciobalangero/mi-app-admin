"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";

export default function TablaProductosSheet({
  sheetID,
  hoja,
  recarga,
}: {
  sheetID: string;
  hoja: string;
  recarga: number;
}) {
  const [user] = useAuthState(auth);
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarUSD, setMostrarUSD] = useState(false);
  const [mostrarExtras, setMostrarExtras] = useState(false);
  const [cotizacion, setCotizacion] = useState<number | null>(null);

  useEffect(() => {
    const obtenerCotizacion = async () => {
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares/blue");
        const json = await res.json();
        const valor = json?.venta;
        if (valor) setCotizacion(Number(valor));
      } catch (error) {
        console.error("❌ Error obteniendo cotización del dólar:", error);
        setCotizacion(1000);
      }
    };
    obtenerCotizacion();
  }, []);

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
  }, [sheetID, hoja, recarga]);

  return (
    <div className="overflow-x-auto mt-8">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm">
          <label className="mr-4">
            <input
              type="checkbox"
              checked={mostrarUSD}
              onChange={() => setMostrarUSD(!mostrarUSD)}
              className="mr-1"
            />
            Mostrar precio USD
          </label>
          <label className="mr-4">
            <input
              type="checkbox"
              checked={mostrarExtras}
              onChange={() => setMostrarExtras(!mostrarExtras)}
              className="mr-1"
            />
            Mostrar columnas extra
          </label>
        </div>
        {cotizacion && (
          <span className="text-gray-500 text-sm">Dólar: ${cotizacion}</span>
        )}
      </div>

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
              {mostrarUSD && <th className="p-2 border">Precio USD</th>}
              {mostrarExtras && <th className="p-2 border">Precio Costo</th>}
              {mostrarExtras && <th className="p-2 border">Proveedor</th>}
              {mostrarExtras && <th className="p-2 border">Ganancia</th>}
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
                {mostrarUSD && <td className="p-2 border">${fila.precioUSD}</td>}
                {mostrarExtras && <td className="p-2 border">${fila.precioCosto}</td>}
                {mostrarExtras && <td className="p-2 border">{fila.proveedor}</td>}
                {mostrarExtras && <td className="p-2 border">${fila.ganancia}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
