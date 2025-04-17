"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";

// Componentes
import ResumenCapital from "./components/ResumenCapital";
import Acciones from "./components/Acciones";
import PedidosSugeridos from "./components/PedidosSugeridos";
import FormularioProducto from "./components/FormularioProducto";
import TablaProductos from "./components/TablaProductos";

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
  const [stockBajo, setStockBajo] = useState(3);
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
      stockIdeal,
      stockBajo
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

// Capital en USD = (costos en USD * cantidad) + (costos en PESOS * cantidad / cotización)
const totalUSD = productos.reduce((acc, p) => {
    const costoUSD =
      p.moneda === "USD"
        ? p.precioCosto * p.cantidad
        : (p.precioCosto * p.cantidad) / cotizacion;
    return acc + costoUSD;
  }, 0);
  
  // Capital en pesos = totalUSD * cotización actual
  const totalPesos = totalUSD * cotizacion;
  
  
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

        <ResumenCapital totalUSD={totalUSD} totalPesos={totalPesos} />

        <Acciones
          exportarExcel={exportarExcel}
          mostrarSugerencias={mostrarSugerencias}
          setMostrarSugerencias={setMostrarSugerencias}
          mostrarFormulario={mostrarFormulario}
          setMostrarFormulario={setMostrarFormulario}
        />

        {mostrarSugerencias && (
          <PedidosSugeridos productosAPedir={productosAPedir} />
        )}

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
        stockBajo={stockBajo}                  // ✅ nueva prop
        setStockBajo={setStockBajo}            // ✅ nueva prop
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
