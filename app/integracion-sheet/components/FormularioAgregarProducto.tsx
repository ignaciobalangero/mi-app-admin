"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { useRol } from "@/lib/useRol";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  const [precioUSD, setPrecioUSD] = useState("");
  const [costo, setCosto] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [mostrar, setMostrar] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [stockIdeal, setStockIdeal] = useState<number>(0);
  const { rol } = useRol();
  const [usarDolarManual, setUsarDolarManual] = useState(false);
  const [dolarManual, setDolarManual] = useState<number | null>(null);
  const [cotizacion, setCotizacion] = useState<number>(1000);
  const [precio1, setPrecio1] = useState("");
  const [precio2, setPrecio2] = useState("");
  const [precio3, setPrecio3] = useState("");
  

  useEffect(() => {
    const obtenerConfiguracion = async () => {
      if (!rol?.negocioID) return;
      try {
        const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/moneda`);
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          const data = snap.data();
          setUsarDolarManual(data.usarDolarManual ?? false);
          setDolarManual(data.dolarManual ?? null);
        }
      } catch (err) {
        console.error("❌ Error leyendo configuración de moneda:", err);
      }
    };
    obtenerConfiguracion();
  }, [rol?.negocioID]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!sheetID || !producto.trim() || !categoria.trim()) {
      setMensaje("⚠️ Completá categoría y producto.");
      return;
    }

    const cantidad = Number(stock);
    const precioUSDNum = Number(precioUSD);
    const costoNum = Number(costo);

    if (isNaN(cantidad) || cantidad < 0) {
      setMensaje("⚠️ El stock debe ser un número válido.");
      return;
    }

    const letra = categoria.trim().charAt(0).toUpperCase();
    const numero = Math.floor(1000 + Math.random() * 9000);
    const codigo = `${letra}-${numero}`;
    const cotizacionFinal =
    usarDolarManual && dolarManual ? dolarManual : cotizacion || 0;
  
  const precio1Num = Number(precio1);
  const precio2Num = Number(precio2);
  const precio3Num = Number(precio3);
  
  const precio1Pesos = Math.round(precio1Num * cotizacionFinal);
  const precio2Pesos = Math.round(precio2Num * cotizacionFinal);
  const precio3Pesos = Math.round(precio3Num * cotizacionFinal);
    
  const nuevoProducto = {
      codigo,
      categoria,
      producto,
      cantidad,
      precio: Number(precio1) * cotizacionFinal, // compatible con lo anterior
      precioUSD: Number(precio1),
      cotizacion: cotizacionFinal,
      precioCosto: costoNum,
      proveedor: proveedor.trim(),
      negocioID: String(rol?.negocioID || ""),
      mostrar: mostrar ? "si" : "no",
      stockMinimo,
      stockIdeal,
      precio1: precio1Num,
      precio2: precio2Num,
      precio3: precio3Num,
      precio1Pesos,
      precio2Pesos,
      precio3Pesos,
    };    

    try {
      const res = await fetch("/api/agregar-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetID,
          hoja,
          producto: nuevoProducto,
          negocioID: rol?.negocioID, // ✅ necesario para que no falle
        }),
      });      

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error desconocido");

      const extraData = {
        codigo,
        precioCosto: costoNum,
        proveedor: proveedor.trim(),
        negocioID: String(rol?.negocioID || ""),
        precio1: precio1Num,
        precio2: precio2Num,
        precio3: precio3Num,
        precio1Pesos,
        precio2Pesos,
        precio3Pesos,
        
      };      

      console.log("📦 Enviando a /api/stock-extra:", extraData);

      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const token = await user.getIdToken();
        await setDoc(doc(db, `negocios/${rol.negocioID}/stockExtra/${codigo}`), {
          codigo,
          categoria,
          producto,
          cantidad,
          precioUSD: Number(precio1),
          cotizacion: cotizacionFinal,
          precioCosto: costoNum,
          proveedor: proveedor.trim(),
          negocioID: rol.negocioID,
          hoja,
          precio1: precio1Num,
          precio2: precio2Num,
          precio3: precio3Num,
          precio1Pesos,
          precio2Pesos,
          precio3Pesos,
          
        });        
        
      }

      setMensaje("✅ Producto agregado correctamente");
      if (onProductoAgregado) onProductoAgregado();

      setCategoria("");
      setProducto("");
      setStock("");
      setPrecioUSD("");
      setCosto("");
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
        type="number"
       value={stockMinimo === 0 ? "" : stockMinimo}
        onChange={(e) => setStockMinimo(Number(e.target.value))}
       placeholder="Stock mínimo"
       className="w-full p-2 border rounded"
      />

      <input
       type="number"
       value={stockIdeal === 0 ? "" : stockIdeal}
       onChange={(e) => setStockIdeal(Number(e.target.value))}
       placeholder="Stock ideal"
       className="w-full p-2 border rounded"
        />

<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
<input
        value={costo}
        onChange={(e) => setCosto(e.target.value)}
        type="number"
        placeholder="Precio de costo"
        className="w-full p-2 border rounded"
      />
  
  <input
    value={precio1}
    onChange={(e) => setPrecio1(e.target.value)}
    type="number"
    placeholder="Precio 1 (USD)"
    className="w-full p-2 border rounded"
  />

  <input
    value={precio2}
    onChange={(e) => setPrecio2(e.target.value)}
    type="number"
    placeholder="Precio 2 (USD)"
    className="w-full p-2 border rounded"
  />

  <input
    value={precio3}
    onChange={(e) => setPrecio3(e.target.value)}
    type="number"
    placeholder="Precio 3 (USD)"
    className="w-full p-2 border rounded"
  />

</div>
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
