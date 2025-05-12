"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";
import { headers } from "next/headers";


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
  const [precioARS, setPrecioARS] = useState("");
  const [precioUSD, setPrecioUSD] = useState("");
  const [costo, setCosto] = useState("");
  const [ganancia, setGanancia] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [mostrar, setMostrar] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!sheetID || !producto.trim() || !categoria.trim()) {
      setMensaje("⚠️ Completá categoría y producto.");
      return;
    }

    const cantidad = Number(stock);
    const precioARSNum = Number(precioARS);
    const precioUSDNum = Number(precioUSD);
    const costoNum = Number(costo);
    const gananciaNum = Number(ganancia);

    if (isNaN(cantidad) || cantidad < 0) {
      setMensaje("⚠️ El stock debe ser un número válido.");
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
      precio: precioARSNum,
      precioUSD: precioUSDNum,
      moneda: "ARS",
      costo: costoNum,
      ganancia: isNaN(gananciaNum) ? 0 : gananciaNum,
      proveedor,
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
    
      // 🔁 Guardar en Firebase los campos extra administrativos
      const extraData = {
        codigo,
        precioCosto: costoNum,
        ganancia: gananciaNum,
        proveedor: proveedor.trim(),
      };
    
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const token = await user.getIdToken();
      
        const firebaseRes = await fetch("/api/stock-extra", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(extraData),
        });
      
        const fbJson = await firebaseRes.json();
        if (!firebaseRes.ok) throw new Error(fbJson.error || "Error al guardar en Firebase");
      }
      
    
      setMensaje("✅ Producto agregado correctamente");
      if (onProductoAgregado) onProductoAgregado();
    
      // Limpiar campos
      setCategoria("");
      setProducto("");
      setStock("");
      setPrecioARS("");
      setPrecioUSD("");
      setCosto("");
      setGanancia("");
      setProveedor("");
      setMostrar(true);
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      setMensaje("❌ Error inesperado al guardar. Revisá consola.");
    }    
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-4 rounded shadow max-w-xl mx-auto mt-8"
    >
      <h2 className="text-xl font-bold">➕ Agregar producto al stock</h2>

      <input
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        placeholder="Categoría (Ej: Módulos, Baterías...)"
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
      <input
        value={precioARS}
        onChange={(e) => setPrecioARS(e.target.value)}
        type="number"
        placeholder="Precio ARS"
        className="w-full p-2 border rounded"
      />
      <input
        value={precioUSD}
        onChange={(e) => setPrecioUSD(e.target.value)}
        type="number"
        placeholder="Precio USD"
        className="w-full p-2 border rounded"
      />
      <input
        value={costo}
        onChange={(e) => setCosto(e.target.value)}
        type="number"
        placeholder="Precio de costo"
        className="w-full p-2 border rounded"
      />
      <input
        value={ganancia}
        onChange={(e) => setGanancia(e.target.value)}
        type="number"
        placeholder="Ganancia"
        className="w-full p-2 border rounded"
      />
      <input
        value={proveedor}
        onChange={(e) => setProveedor(e.target.value)}
        placeholder="Proveedor"
        className="w-full p-2 border rounded"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={mostrar}
          onChange={() => setMostrar(!mostrar)}
        />
        Mostrar al cliente
      </label>

      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
      >
        Guardar producto
      </button>

      {mensaje && <p className="text-sm mt-2 text-center">{mensaje}</p>}
    </form>
  );
}
