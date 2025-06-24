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

// 🆕 IMPORTAR EL HOOK DE COTIZACIÓN CENTRALIZADO (igual que repuestos)
import useCotizacion from "@/lib/hooks/useCotizacion";
import { useRol } from "@/lib/useRol";

// Componentes
import ResumenCapital from "./components/ResumenCapital";
import Acciones from "./components/Acciones";
import PedidosSugeridos from "./components/PedidosSugeridos";
import FormularioProducto from "./components/FormularioProducto";
import TablaProductos from "./components/TablaAccesorios";

export default function StockProductosPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  
  // 🆕 USAR EL HOOK DE ROL (igual que en repuestos)
  const { rol } = useRol();
  
  // 🆕 USAR EL HOOK DE COTIZACIÓN CENTRALIZADO (igual que en repuestos)
  const { cotizacion, actualizarCotizacion } = useCotizacion(rol?.negocioID || "");
  
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
  const [cantidad, setCantidad] = useState(1);
  const [stockIdeal, setStockIdeal] = useState(5);
  const [stockBajo, setStockBajo] = useState(3);
  const [productos, setProductos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [precio1, setPrecio1] = useState(0);
  const [precio2, setPrecio2] = useState(0);
  const [precio3, setPrecio3] = useState(0);

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
      precio1Pesos: moneda === "USD" && cotizacion > 0 ? precio1 * cotizacion : precio1,
      precio2Pesos: moneda === "USD" && cotizacion > 0 ? precio2 * cotizacion : precio2,
      precio3Pesos: moneda === "USD" && cotizacion > 0 ? precio3 * cotizacion : precio3,
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

    // Reset
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
    setCantidad(prod.cantidad || 1);
    setStockIdeal(prod.stockIdeal || 5);
    setEditandoId(prod.id || "");
    setMostrarFormulario(true);
  };

  // 🔥 FUNCIÓN ACTUALIZADA: Usar la cotización centralizada (NUEVA FUNCIÓN AGREGADA)
  const actualizarProductoEnFirebase = async (producto: any) => {
    try {
      console.log("🔥 Actualizando producto en Firebase:", producto);
      
      // Actualizar en Firebase
      const productRef = doc(db, `negocios/${negocioID}/stockAccesorios`, producto.id);
      await updateDoc(productRef, {
        codigo: producto.codigo,
        categoria: producto.categoria,
        producto: producto.producto,
        marca: producto.marca,
        modelo: producto.modelo,
        color: producto.color,
        precioCosto: producto.precioCosto,
        precio1: producto.precio1,
        precio2: producto.precio2,
        precio3: producto.precio3,
        precio1Pesos: producto.precio1Pesos,
        precio2Pesos: producto.precio2Pesos,
        precio3Pesos: producto.precio3Pesos,
        cantidad: producto.cantidad,
        moneda: producto.moneda,
        stockBajo: producto.stockBajo || 3,
        stockIdeal: producto.stockIdeal || 5,
        proveedor: producto.proveedor,
        cotizacion: cotizacion, // 🔄 USAR LA COTIZACIÓN CENTRALIZADA
        ultimaActualizacion: new Date()
      });

      // Actualizar estado local inmediatamente
      setProductos(prevProductos => 
        prevProductos.map(p => 
          p.id === producto.id 
            ? { ...producto, ultimaActualizacion: new Date() } 
            : p
        )
      );

      console.log("✅ Producto actualizado correctamente en Firebase y estado local");
      
    } catch (error) {
      console.error("❌ Error al actualizar producto en Firebase:", error);
      throw error; // Para que el modal maneje el error
    }
  };

  // 🔄 ACTUALIZAR: Usar la cotización del hook centralizado
  const totalUSD = productos.reduce((acc, p) => {
    if (cotizacion <= 0) return acc;
    const costoUSD =
      p.moneda === "USD"
        ? p.precioCosto * p.cantidad
        : (p.precioCosto * p.cantidad) / cotizacion;
    return acc + costoUSD;
  }, 0);

  const totalPesos = cotizacion > 0 ? totalUSD * cotizacion : 0;

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
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-4 max-w-[1200px] mx-auto space-y-4">
          
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🎧</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Stock de Accesorios
                </h2>
                <p className="text-blue-100 text-sm">
                  Gestión completa de inventario de accesorios y productos
                </p>
              </div>
              
              <button
                onClick={() => router.push("/ventas")}
                className="ml-auto bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm border border-white/30"
              >
                ← Atrás
              </button>
            </div>
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
              cotizacion={cotizacion}                    // 🔄 USAR COTIZACIÓN CENTRALIZADA  
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

          {/* 🔥 TABLA ACTUALIZADA CON MODAL (IGUAL A REPUESTOS) */}
          <TablaProductos
            productos={productosFiltrados}
            editarProducto={editarProducto}
            eliminarProducto={eliminarProducto}
            actualizarProducto={actualizarProductoEnFirebase}
            onProductoActualizado={(producto) => {
              setProductos(prevProductos => 
                prevProductos.map(p => 
                  p.id === producto.id ? producto : p
                )
              );
            }}
            // 🆕 USANDO LA MISMA COTIZACIÓN QUE REPUESTOS
            cotizacion={cotizacion}
            onCotizacionChange={actualizarCotizacion}
            negocioID={rol?.negocioID || negocioID}
          />

          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Tip:</strong> Los códigos se generan automáticamente como ACC001, ACC002, etc. 
                  La cotización está sincronizada con el sistema de ventas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}