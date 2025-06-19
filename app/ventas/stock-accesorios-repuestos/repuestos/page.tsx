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
  const [codigo, setCodigo] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [producto, setProducto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [calidad, setCalidad] = useState("");
  const [marca, setMarca] = useState("");
  const [color, setColor] = useState("");
  const [precioCosto, setPrecioCosto] = useState(0);
  const [precioCostoPesos, setPrecioCostoPesos] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [cotizacion, setCotizacion] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [stockIdeal, setStockIdeal] = useState(5);
  const [stockBajo, setStockBajo] = useState(3);
  const [productos, setProductos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");

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
      setPrecioCostoPesos(precioCosto * cotizacion);
    } else {
      setPrecioCostoPesos(precioCosto);
    }
  }, [precioCosto, cotizacion, moneda]);

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
    if (!producto || precioCosto <= 0 || cantidad <= 0) return;
  
    const data = {
      codigo,
      proveedor,
      producto,
      categoria,
      calidad,
      marca,
      color,
      precioCosto,
      precioCostoPesos: moneda === "USD" && cotizacion !== null ? precioCosto * cotizacion : precioCosto,
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
      const snap = await getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`));

      const categoriaPrefix = (categoria || "REP").slice(0, 3).toUpperCase();
      const existentes = snap.docs
       .map((doc) => doc.data().codigo)
       .filter((c) => c?.startsWith(categoriaPrefix));

      const siguienteNumero = existentes.length + 1;
      const nuevoCodigo = `${categoriaPrefix}${String(siguienteNumero).padStart(3, "0")}`;

      await addDoc(collection(db, `negocios/${negocioID}/stockRepuestos`), {
        ...data,
        codigo: nuevoCodigo,
      });
    }
  
    // Reset
    setCodigo("");
    setProveedor("");
    setProducto("");
    setCategoria("");
    setCalidad("");
    setMarca("");
    setColor("");
    setPrecioCosto(0);
    setPrecioCostoPesos(0);
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
    setPrecioCostoPesos(prod.precioVentaPesos);
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

  const productosFiltrados = productos.filter((p) => {
    const texto = `${p.categoria} ${p.producto} ${p.marca} ${p.modelo}`.toLowerCase();
    return filtroTexto
      .toLowerCase()
      .split(" ")
      .every((palabra) => texto.includes(palabra));
  });  
  
  return (
    <>
      <Header />
      <main className="pt-14 bg-[#f8f9fa] min-h-screen text-black w-full"> 
        <div className="w-full px-1/2 max-w-[1200px] mx-auto space-y-4"> 
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🔧</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1"> 
                  Stock de Repuestos
                </h2>
                <p className="text-blue-100 text-sm">
                  Gestión completa de inventario de repuestos y componentes
                </p>
              </div>
            </div>
               {/* Botón atrás */}
          <div className="flex justify-center"> 
            <button
              onClick={() => router.push("/ventas/stock-accesorios-repuestos/")}
              className="ml-auto bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm border border-white/30" 
            >
              ← Atrás
            </button>
          </div>
          </div>

       

          {/* Resumen de capital */}
          <ResumenCapital totalUSD={totalUSD} totalPesos={totalPesos} />

          {/* Acciones */}
          <Acciones
            exportarExcel={exportarExcel}
            mostrarSugerencias={mostrarSugerencias}
            setMostrarSugerencias={setMostrarSugerencias}
            mostrarFormulario={mostrarFormulario}
            setMostrarFormulario={setMostrarFormulario}
          />

          {/* Sugerencias de pedidos */}
          {mostrarSugerencias && <PedidosSugeridos productosAPedir={productosAPedir} />}

          {/* Formulario */}
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
              moneda={moneda}
              setMoneda={setMoneda}
              cotizacion={cotizacion}
              setCotizacion={setCotizacion}
              precioCostoPesos={precioCostoPesos}
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
          
          {/* Filtro de búsqueda */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]"> 
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🔍</span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Buscar por categoría, producto, marca o modelo..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full p-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-xs placeholder-[#7f8c8d]"
                />
              </div>
            </div>
          </div>

          {/* Tabla de productos */}
          <TablaProductos
            productos={productosFiltrados}
            editarProducto={editarProducto}
            eliminarProducto={eliminarProducto}
          />

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Tip:</strong> Los códigos se generan automáticamente basados en la categoría. 
                  Utiliza el filtro para encontrar productos específicos rápidamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}