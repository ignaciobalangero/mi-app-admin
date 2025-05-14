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
  const { rol } = useRol();

  const [usarDolarManual, setUsarDolarManual] = useState(false);
  const [dolarManual, setDolarManual] = useState<number | null>(null);
  const [cotizacion, setCotizacion] = useState<number>(1000);

  const cotizacionFinal = usarDolarManual && dolarManual ? dolarManual : cotizacion || 0;

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

    const nuevoProducto = {
      codigo,
      categoria,
      producto,
      cantidad,
      precio: precioUSDNum * cotizacionFinal,
      precioUSD: precioUSDNum,
      cotizacion: cotizacionFinal,
      precioCosto: costoNum,
      proveedor: proveedor.trim(),
      negocioID: String(rol?.negocioID || ""),
      mostrar: mostrar ? "si" : "no",
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
          precioUSD: precioUSDNum,
          cotizacion: cotizacionFinal,
          precioCosto: costoNum,
          proveedor: proveedor.trim(),
          negocioID: rol.negocioID,
          hoja,
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
