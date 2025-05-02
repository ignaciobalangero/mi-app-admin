"use client";

import { useEffect, useState } from "react";

export default function StockRepuestosSheet() {
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await fetch("/api/leer-stock");
        const json = await res.json();
        if (res.ok) {
          setDatos(json.datos);
        } else {
          throw new Error(json.error || "Error desconocido");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  if (cargando) return <p className="p-4">🔄 Cargando datos...</p>;
  if (error) return <p className="p-4 text-red-600">❌ {error}</p>;

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">📦 Stock desde Google Sheet</h1>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Código</th>
              <th className="p-2 border">Producto</th>
              <th className="p-2 border">Stock</th>
              <th className="p-2 border">Precio (ARS)</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-2 border text-center">{item.codigo}</td>
                <td className="p-2 border">{item.producto}</td>
                <td className="p-2 border text-center">{item.cantidad}</td>
                <td className="p-2 border text-right">${item.precioARS?.toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
