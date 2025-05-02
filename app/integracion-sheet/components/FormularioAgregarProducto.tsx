"use client";

import { useState } from "react";

export default function FormularioAgregarProducto({
    sheetID,
    hoja,
  }: {
    sheetID: string;
    hoja: string;
  }) {
  
  const [categoria, setCategoria] = useState("");
  const [producto, setProducto] = useState("");
  const [stock, setStock] = useState("");
  const [costo, setCosto] = useState("");
  const [ganancia, setGanancia] = useState("");
  const [moneda, setMoneda] = useState("ARS");
  const [mostrar, setMostrar] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetID || !producto.trim() || !categoria.trim()) {
      setMensaje("⚠️ Completá categoría y producto.");
      return;
    }

    try {
      if (categoria.toLowerCase() === "pantallas" || categoria.toLowerCase() === "telefonos") {
        const letra = categoria.trim().charAt(0).toUpperCase(); // M, B, etc.
const numero = Math.floor(1000 + Math.random() * 9000); // genera 4 cifras
const codigo = `${letra}-${numero}`; // ej: M-8412

const nuevoProducto = {
        codigo,
        producto,
        marca: categoria,
        modelo: producto,
        cantidad: Number(stock),
        precio: Number(costo),
        moneda,
      };


        await fetch("/api/insertar-producto", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ sheetID, producto: nuevoProducto }),
         });
  

        setMensaje("✅ Producto agregado y ordenado correctamente");
        } else {
        const fila = [
          "", // código se genera automático
          categoria,
          producto,
          stock,
          "", // precio ARS lo calcula la API
          moneda,
          costo,
          ganancia,
          mostrar ? "si" : "no",
        ];

        await fetch("/api/agregar-stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sheetID, hoja, fila }), // ✅ ahora mandamos también el nombre de la hoja
          });
          

        setMensaje("✅ Producto agregado correctamente");
      }

      setProducto("");
      setStock("");
      setCosto("");
      setGanancia("");
      setCategoria("");
    } catch (err) {
      console.error("❌ Error al agregar producto:", err);
      setMensaje("❌ Error al guardar. Revisá la consola.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow max-w-xl mx-auto mt-8">
      <h2 className="text-xl font-bold">➕ Agregar producto al stock</h2>

      <input
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        placeholder="Categoría (Ej: Modulos, Baterias...)"
        className="w-full p-2 border rounded"
        required
      />
      <input
        value={producto}
        onChange={(e) => setProducto(e.target.value)}
        placeholder="Nombre del producto"
        className="w-full p-2 border rounded"
        required
      />
      <input
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        type="number"
        placeholder="Stock"
        className="w-full p-2 border rounded"
      />
      <div className="flex gap-2">
        <input
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          type="number"
          placeholder="Costo"
          className="w-full p-2 border rounded"
        />
        <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="p-2 border rounded">
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <input
        value={ganancia}
        onChange={(e) => setGanancia(e.target.value)}
        type="number"
        placeholder="Ganancia"
        className="w-full p-2 border rounded"
      />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={mostrar} onChange={() => setMostrar(!mostrar)} />
        Mostrar al cliente
      </label>

      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
        Guardar producto
      </button>

      {mensaje && <p className="text-sm mt-2 text-center">{mensaje}</p>}
    </form>
  );
}
