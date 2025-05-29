"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, addDoc, getDocs, getDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";

// Componentes
import ResumenCapital from "./components/ResumenCapital";
import Acciones from "./components/Acciones";
import PedidosSugeridos from "./components/PedidosSugeridos";
import FormularioProducto from "./components/FormularioProducto";
import TablaProductos from "./components/TablaProductos";
import { set } from "date-fns";

export default function StockProductosPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [codigo, setCodigo] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [producto, setProducto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [precioCosto, setPrecioCosto] = useState(0);
  const [precioVentaPesos, setPrecioVentaPesos] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [cotizacion, setCotizacion] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [stockIdeal, setStockIdeal] = useState(5);
  const [stockBajo, setStockBajo] = useState(3);
  const [productos, setProductos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [precio1, setPrecio1] = useState(0);
  const [precio2, setPrecio2] = useState(0);
  const [precio3, setPrecio3] = useState(0);
  const [mostrarModalPrecios, setMostrarModalPrecios] = useState(false);
const [preciosConvertidos, setPreciosConvertidos] = useState({
  precio1: 0,
  precio2: 0,
  precio3: 0,
});

const verPreciosConvertidos = (p: any) => {
  if (p.moneda === "USD" && cotizacion) {
    setPreciosConvertidos({
      precio1: p.precio1 * cotizacion,
      precio2: p.precio2 * cotizacion,
      precio3: p.precio3 * cotizacion,
    });
    setMostrarModalPrecios(true);
  }
};

  useEffect(() => {
    if (user) {
      const obtenerNegocio = async () => {
        const ref = doc(db, `usuarios/${user.uid}`);
        const docu = await getDoc(ref);
        const data = docu.data();
        if (data?.negocioID) {
          setNegocioID(data.negocioID);
        }
      };
      obtenerNegocio();
    }
  }, [user]);
  

  useEffect(() => {
    if (negocioID) cargarProductos();
  }, [negocioID]);


  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then((res) => res.json())
      .then((data) => {
        setCotizacion(data.venta);
      })
      .catch((err) => {
        console.error("Error al obtener cotización:", err);
      });
  }, []);

  const cargarProductos = async () => {
    const snap = await getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`));
    const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProductos(lista);
  };

  const guardarProducto = async () => {
    if (!producto || (precio1 <= 0 && precio2 <= 0 && precio3 <= 0) || cantidad <= 0) return;

    const data = {
      codigo,
      proveedor,
      producto,
      categoria,
      marca,
      modelo, 
      color,
      precioCosto,
      precio1,
      precio2,
      precio3,
      precio1Pesos: moneda === "USD" && cotizacion !== null ? precio1 * cotizacion : precio1,
      precio2Pesos: moneda === "USD" && cotizacion !== null ? precio2 * cotizacion : precio2,
      precio3Pesos: moneda === "USD" && cotizacion !== null ? precio3 * cotizacion : precio3,
      moneda,
      cotizacion,
      cantidad,
      stockIdeal,
      stockBajo,
    };
    

    if (editandoId) {
      await updateDoc(doc(db, `negocios/${negocioID}/stockAccesorios`, editandoId), data);
      setEditandoId(null);
    } else {
      const snap = await getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`));
const nuevoCodigo = `ACC${String(snap.size + 1).padStart(3, "0")}`;

await addDoc(collection(db, `negocios/${negocioID}/stockAccesorios`), {
  ...data,
  codigo: nuevoCodigo,
});

    }

    setCodigo("");
    setProveedor("");
    setProducto("");
    setCategoria("");
    setMarca("");
    setModelo("");
    setColor("");
    setPrecioCosto(0);
    setPrecio1(0);
    setPrecio2(0);
    setPrecio3(0);
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
    setProveedor(prod.proveedor || "");
    setProducto(prod.producto || "");
    setCategoria(prod.categoria || "");
    setMarca(prod.marca || "");
    setModelo(prod.modelo || "");
    setColor(prod.color || "");
    setPrecioCosto(prod.precioCosto || 0);
    setPrecio1(prod.precio1 || 0);
    setPrecio2(prod.precio2 || 0);
    setPrecio3(prod.precio3 || 0);
    setMoneda(prod.moneda || "");
    setCotizacion(prod.cotizacion || null);
    setCantidad(prod.cantidad || 1);
    setStockIdeal(prod.stockIdeal || 5);
    setEditandoId(prod.id || "");
    setMostrarFormulario(true);
  };

  const totalUSD = productos.reduce((acc, p) => {
    if (cotizacion === null) return acc;
    const costoUSD =
      p.moneda === "USD"
        ? p.precioCosto * p.cantidad
        : (p.precioCosto * p.cantidad) / cotizacion;
    return acc + costoUSD;
  }, 0);

  const totalPesos = cotizacion !== null ? totalUSD * cotizacion : 0;

  const productosAPedir = productos.filter((p) => p.cantidad < p.stockIdeal);
  const productosFiltrados = productos.filter((p) => {
    const texto = `${p.categoria} ${p.producto} ${p.marca} ${p.modelo}`.toLowerCase();
    return filtroTexto
      .toLowerCase()
      .split(" ")
      .every((palabra) => texto.includes(palabra));
  });
  
  const exportarExcel = () => {
    const data = productosAPedir.map((p) => ({
      Producto: p.producto,
      Faltan: p.stockIdeal - p.cantidad,
      "Stock ideal": p.stockIdeal,
      Actual: p.cantidad,
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
        <h1 className="text-2xl font-bold mb-4 text-center">Stock de Accesorios</h1>

        <div className="mb-6 text-center">
          <button
            onClick={() => router.push("/ventas")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            ← Atrás
          </button>
        </div>

        <ResumenCapital totalUSD={totalUSD} totalPesos={totalPesos} />

        <Acciones
          exportarExcel={exportarExcel}
          mostrarSugerencias={mostrarSugerencias}
          setMostrarSugerencias={setMostrarSugerencias}
          mostrarFormulario={mostrarFormulario}
          setMostrarFormulario={setMostrarFormulario}
        />

        {mostrarSugerencias && <PedidosSugeridos productosAPedir={productosAPedir} />}

        {mostrarFormulario && (
          <FormularioProducto
            codigo={codigo}
            setCodigo={setCodigo}
            proveedor={proveedor}
            setProveedor={setProveedor}
            producto={producto}
            setProducto={setProducto}
            categoria={categoria}
            setCategoria={setCategoria}
            marca={marca}
            setMarca={setMarca}
            modelo={modelo}
            setModelo={setModelo}
            color={color}
            setColor={setColor}
            precioCosto={precioCosto}
            setPrecioCosto={setPrecioCosto}
            precio1={precio1}
            setPrecio1={setPrecio1}
            precio2={precio2}
            setPrecio2={setPrecio2}
            precio3={precio3}
            setPrecio3={setPrecio3}
            moneda={moneda}
            setMoneda={setMoneda}
            cotizacion={cotizacion}
            setCotizacion={setCotizacion}
            cantidad={cantidad}
            setCantidad={setCantidad}
            stockIdeal={stockIdeal}
            setStockIdeal={setStockIdeal}
            stockBajo={stockBajo}
            setStockBajo={setStockBajo}
            guardarProducto={guardarProducto}
            editandoId={editandoId}
          />
        )}

<div className="mb-4 text-center">
  <input
    type="text"
    placeholder="Buscar por categoría, producto, marca o modelo"
    value={filtroTexto}
    onChange={(e) => setFiltroTexto(e.target.value)}
    className="p-2 border rounded w-full max-w-md"
  />
</div>

<TablaProductos
  productos={productosFiltrados}
  editarProducto={editarProducto}
  eliminarProducto={eliminarProducto}
  verPreciosConvertidos={verPreciosConvertidos}
  cotizacion={cotizacion}
/>
{mostrarModalPrecios && (
  <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-center border-2 border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Precios en pesos 🇦🇷</h2>
      <p className="mb-2 text-gray-700 text-lg">💰 <strong>Precio 1:</strong> ${preciosConvertidos.precio1.toLocaleString("es-AR")}</p>
      <p className="mb-2 text-gray-700 text-lg">💰 <strong>Precio 2:</strong> ${preciosConvertidos.precio2.toLocaleString("es-AR")}</p>
      <p className="mb-4 text-gray-700 text-lg">💰 <strong>Precio 3:</strong> ${preciosConvertidos.precio3.toLocaleString("es-AR")}</p>
      <button
        onClick={() => setMostrarModalPrecios(false)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Cerrar
      </button>
    </div>
  </div>
)}

      </main>
    </>
  );
}
