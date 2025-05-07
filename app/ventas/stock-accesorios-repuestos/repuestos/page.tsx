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

export default function StockProductosPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [codigo, setCodigo] = useState(uuidv4().slice(0, 8));
  const [proveedor, setProveedor] = useState("");
  const [producto, setProducto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [calidad, setCalidad] = useState("");
  const [marca, setMarca] = useState("");
  const [color, setColor] = useState("");
  const [precioCosto, setPrecioCosto] = useState(0);
  const [precioVenta, setPrecioVenta] = useState(0);
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
    if (moneda === "USD" && cotizacion !== null) {
      setPrecioVentaPesos(precioVenta * cotizacion);
    } else {
      setPrecioVentaPesos(precioVenta);
    }
  }, [precioVenta, cotizacion, moneda]);

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
    const snap = await getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`));
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
      calidad,
      marca,
      color,
      precioCosto,
      precioVenta,
      precioVentaPesos: moneda === "USD" && cotizacion !== null ? precioVenta * cotizacion : precioVenta,
      moneda,
      cotizacion,
      cantidad,
      stockIdeal,
      stockBajo,
    };

    if (editandoId) {
      await updateDoc(doc(db, `negocios/${negocioID}/stockRepuestos`, editandoId), data);
      setEditandoId(null);
    } else {
      await addDoc(collection(db, `negocios/${negocioID}/stockRepuestos`), data);
    }

    setCodigo(uuidv4().slice(0, 8));
    setProveedor("");
    setProducto("");
    setCategoria("");
    setCalidad("");
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
    await deleteDoc(doc(db, `negocios/${negocioID}/stockRepuestos`, id));
    cargarProductos();
  };

  const editarProducto = (prod: any) => {
    setCodigo(prod.codigo || uuidv4().slice(0, 8));
    setProveedor(prod.proveedor);
    setProducto(prod.producto);
    setCategoria(prod.categoria);
    setCalidad(prod.calidad || "");
    setMarca(prod.marca);
    setColor(prod.color);
    setPrecioCosto(prod.precioCosto);
    setPrecioVenta(prod.precioVenta);
    setPrecioVentaPesos(prod.precioVentaPesos);
    setMoneda(prod.moneda);
    setCotizacion(prod.cotizacion);
    setCantidad(prod.cantidad);
    setStockIdeal(prod.stockIdeal);
    setStockBajo(prod.stockBajo || 3);
    setEditandoId(prod.id);
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
    XLSX.writeFile(wb, "pedidos_sugeridos_repuestos.xlsx");
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-4 text-center">Stock de Repuestos</h1>

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
            calidad={calidad}
            setCalidad={setCalidad}
            marca={marca}
            setMarca={setMarca}
            color={color}
            setColor={setColor}
            precioCosto={precioCosto}
            setPrecioCosto={setPrecioCosto}
            precioVenta={precioVenta}
            setPrecioVenta={setPrecioVenta}
            moneda={moneda}
            setMoneda={setMoneda}
            cotizacion={cotizacion}
            setCotizacion={setCotizacion}
            precioVentaPesos={precioVentaPesos}
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

        <TablaProductos
          productos={productos}
          editarProducto={editarProducto}
          eliminarProducto={eliminarProducto}
        />
      </main>
    </>
  );
}