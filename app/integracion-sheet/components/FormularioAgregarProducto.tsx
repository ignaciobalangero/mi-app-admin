"use client";

import { useState } from "react";

export default function FormularioAgregarProducto({
    sheetID,
    hoja,
    onProductoAgregado,
  }: {
    sheetID: string;
    hoja: string;
    onProductoAgregado?: () => void; 
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
    setMensaje("");
  
    // Validaciones
    if (!sheetID || !producto.trim() || !categoria.trim()) {
      setMensaje("⚠️ Completá categoría y producto.");
      return;
    }
  
    const cantidad = Number(stock);
    const costoNum = Number(costo);
    const gananciaNum = Number(ganancia);
  
    if (isNaN(cantidad) || cantidad < 0) {
      setMensaje("⚠️ El stock debe ser un número válido.");
      return;
    }
  
    if (isNaN(costoNum) || costoNum < 0) {
      setMensaje("⚠️ El costo debe ser un número válido.");
      return;
    }
  
    // Generar código
    const letra = categoria.trim().charAt(0).toUpperCase();
    const numero = Math.floor(1000 + Math.random() * 9000);
    const codigo = `${letra}-${numero}`;
  
    const nuevoProducto = {
      codigo,
      categoria,
      producto,
      cantidad,
      precio: costoNum,
      moneda,
      ganancia: isNaN(gananciaNum) ? 0 : gananciaNum,
      mostrar: mostrar ? "si" : "no",
    };
  
    try {
      const res = await fetch("/api/agregar-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, producto: nuevoProducto }),
      });
  
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error desconocido");
  
      setMensaje("✅ Producto agregado correctamente");
      if (onProductoAgregado) onProductoAgregado();
      // Limpiar campos
      setCategoria("");
      setProducto("");
      setStock("");
      setCosto("");
      setGanancia("");
      setMoneda("ARS");
      setMostrar(true);
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      setMensaje("❌ Error inesperado al guardar. Revisá consola.");
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
