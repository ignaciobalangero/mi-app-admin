"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";

export default function StockProductosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [codigo, setCodigo] = useState(uuidv4().slice(0, 8));
  const [proveedor, setProveedor] = useState("");
  const [producto, setProducto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [color, setColor] = useState("");
  const [precioCosto, setPrecioCosto] = useState(0);
  const [precioVenta, setPrecioVenta] = useState(0);
  const [precioVentaPesos, setPrecioVentaPesos] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [cotizacion, setCotizacion] = useState(1000);
  const [cantidad, setCantidad] = useState(1);
  const [stockIdeal, setStockIdeal] = useState(5);
  const [productos, setProductos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    if (user) {
      const obtenerNegocio = async () => {
        const snap = await getDocs(collection(db, "usuarios"));
        snap.forEach((docu) => {
          const data = docu.data();
          if (data.email === user.email && data.negocioID) {
            setNegocioID(data.negocioID);
          }
        });
      };
      obtenerNegocio();
    }
  }, [user]);

  useEffect(() => {
    if (negocioID) cargarProductos();
  }, [negocioID]);

  useEffect(() => {
    if (moneda === "USD") {
      setPrecioVentaPesos(precioVenta * cotizacion);
    } else {
      setPrecioVentaPesos(precioVenta);
    }
  }, [precioVenta, cotizacion, moneda]);

  const cargarProductos = async () => {
    const snap = await getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`));
    const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProductos(lista);
  };

  const guardarProducto = async () => {
    if (!producto || precioVenta <= 0 || cantidad <= 0) return;
    const data = {
      codigo,
      proveedor,
      producto,
      categoria,
      marca,
      color,
      precioCosto,
      precioVenta,
      precioVentaPesos: moneda === "USD" ? precioVenta * cotizacion : precioVenta,
      moneda,
      cotizacion,
      cantidad,
      stockIdeal
    };

    if (editandoId) {
      await updateDoc(doc(db, `negocios/${negocioID}/stockAccesorios`, editandoId), data);
      setEditandoId(null);
    } else {
      await addDoc(collection(db, `negocios/${negocioID}/stockAccesorios`), data);
    }

    setCodigo(uuidv4().slice(0, 8));
    setProveedor("");
    setProducto("");
    setCategoria("");
    setMarca("");
    setColor("");
    setPrecioCosto(0);
    setPrecioVenta(0);
    setPrecioVentaPesos(0);
    setCantidad(1);
    setStockIdeal(5);
    setMoneda("ARS");
    cargarProductos();
  };

  const eliminarProducto = async (id: string) => {
    await deleteDoc(doc(db, `negocios/${negocioID}/stockAccesorios`, id));
    cargarProductos();
  };

  const editarProducto = (prod: any) => {
    setCodigo(prod.codigo || uuidv4().slice(0, 8));
    setProveedor(prod.proveedor);
    setProducto(prod.producto);
    setCategoria(prod.categoria);
    setMarca(prod.marca);
    setColor(prod.color);
    setPrecioCosto(prod.precioCosto);
    setPrecioVenta(prod.precioVenta);
    setPrecioVentaPesos(prod.precioVentaPesos);
    setMoneda(prod.moneda);
    setCotizacion(prod.cotizacion);
    setCantidad(prod.cantidad);
    setStockIdeal(prod.stockIdeal);
    setEditandoId(prod.id);
    setMostrarFormulario(true);
  };

  const totalPesos = productos.reduce((acc, p) => acc + (p.moneda === "USD" ? p.precioVenta * p.cotizacion : p.precioVenta) * p.cantidad, 0);
  const totalUSD = totalPesos / cotizacion;
  const productosAPedir = productos.filter(p => p.cantidad < p.stockIdeal);

  const exportarExcel = () => {
    const data = productosAPedir.map(p => ({
      Producto: p.producto,
      Faltan: p.stockIdeal - p.cantidad,
      "Stock ideal": p.stockIdeal,
      Actual: p.cantidad
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos sugeridos");
    XLSX.writeFile(wb, "pedidos_sugeridos.xlsx");
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-6 text-center">Stock de Accesorios</h1>

        <div className="flex justify-between items-center mb-4 px-2">
          <div className="text-lg font-semibold">Capital en pesos: ${totalPesos.toLocaleString("es-AR")}</div>
          <div className="text-lg font-semibold">Capital en USD: ${totalUSD.toFixed(2)}</div>
        </div>

        <div className="flex gap-4 items-center mb-4">
          <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            📤 Exportar pedidos sugeridos
          </button>
          <button onClick={() => setMostrarSugerencias(!mostrarSugerencias)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded">
            {mostrarSugerencias ? "Ocultar pedidos" : "Mostrar pedidos"}
          </button>
          <button onClick={() => setMostrarFormulario(!mostrarFormulario)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            {mostrarFormulario ? "Ocultar formulario" : "Agregar productos"}
          </button>
        </div>

        {mostrarSugerencias && productosAPedir.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-200 border-l-4 border-yellow-600">
            <h2 className="text-lg font-bold mb-2">📦 Pedidos sugeridos:</h2>
            <ul className="list-disc pl-6">
              {productosAPedir.map(p => (
                <li key={p.id}>
                  {p.producto} → Faltan {p.stockIdeal - p.cantidad} unidades para alcanzar stock ideal ({p.stockIdeal})
                </li>
              ))}
            </ul>
          </div>
        )}

        {mostrarFormulario && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-semibold mb-1">Código</label>
              <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Proveedor</label>
              <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Producto</label>
              <input type="text" value={producto} onChange={(e) => setProducto(e.target.value)} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Categoría</label>
              <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Marca</label>
              <input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Color</label>
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Precio de costo</label>
              <input type="number" value={precioCosto} onChange={(e) => setPrecioCosto(Number(e.target.value))} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Precio de venta</label>
              <input type="number" value={precioVenta} onChange={(e) => setPrecioVenta(Number(e.target.value))} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Moneda</label>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")} className="p-2 border border-gray-400 rounded w-full">
                <option value="ARS">Pesos</option>
                <option value="USD">Dólares</option>
              </select>
            </div>
            {moneda === "USD" && (
              <div>
                <label className="block font-semibold mb-1">Cotización</label>
                <input type="number" value={cotizacion} onChange={(e) => setCotizacion(Number(e.target.value))} className="p-2 border border-gray-400 rounded w-full" />
              </div>
            )}
            <div>
              <label className="block font-semibold mb-1">Precio venta en pesos</label>
              <input type="number" value={precioVentaPesos} readOnly className="p-2 border border-gray-400 rounded w-full bg-gray-100" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Cantidad</label>
              <input type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="p-2 border border-gray-400 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Stock ideal</label>
              <input type="number" value={stockIdeal} onChange={(e) => setStockIdeal(Number(e.target.value))} className="p-2 border border-gray-400 rounded w-full" />
            </div>
          </div>
        )}

        {mostrarFormulario && (
          <div className="flex justify-center mb-6">
            <button onClick={guardarProducto} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
              {editandoId ? "Actualizar producto" : "Guardar producto"}
            </button>
          </div>
        )}

        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-300 text-left">
            <tr>
              <th className="p-2 border border-gray-400">Código</th>
              <th className="p-2 border border-gray-400">Producto</th>
              <th className="p-2 border border-gray-400">Categoría</th>
              <th className="p-2 border border-gray-400">Marca</th>
              <th className="p-2 border border-gray-400">Color</th>
              <th className="p-2 border border-gray-400">Costo</th>
              <th className="p-2 border border-gray-400">Precio</th>
              <th className="p-2 border border-gray-400">Venta en pesos</th>
              <th className="p-2 border border-gray-400">Cantidad</th>
              <th className="p-2 border border-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={`border-t border-gray-300 ${p.cantidad === 0 ? "bg-red-100" : p.cantidad <= 3 ? "bg-yellow-100" : "bg-green-100"}`}>
                <td className="p-2 border border-gray-300">{p.codigo}</td>
                <td className="p-2 border border-gray-300">{p.producto}</td>
                <td className="p-2 border border-gray-300">{p.categoria}</td>
                <td className="p-2 border border-gray-300">{p.marca}</td>
                <td className="p-2 border border-gray-300">{p.color}</td>
                <td className="p-2 border border-gray-300">{p.moneda} ${p.precioCosto}</td>
                <td className="p-2 border border-gray-300">{p.moneda} ${p.precioVenta}</td>
                <td className="p-2 border border-gray-300">${p.precioVentaPesos?.toLocaleString("es-AR")} pesos</td>
                <td className="p-2 border border-gray-300">{p.cantidad}</td>
                <td className="p-2 border border-gray-300">
                  <button onClick={() => editarProducto(p)} className="text-blue-600 hover:underline mr-2">Editar</button>
                  <button onClick={() => eliminarProducto(p.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}