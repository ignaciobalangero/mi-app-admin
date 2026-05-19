"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { db, storage } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { ref as refStorage, uploadBytes, getDownloadURL } from "firebase/storage";
import { Store, Package } from "lucide-react";

// 📦 Tabla de productos – Sección REPUESTOS OPTIMIZADA CON PAGINACIÓN

import { normalizarMoneda, pesosDesdeMoneda } from "@/lib/monedaRepuesto";

interface Producto {
  id: string;
  codigo: string;
  categoria: string;
  producto: string;
  marca: string;
  color: string;
  precioCosto: number;
  precioCostoPesos: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
  proveedor: string;
  precio1?: number;
  precio2?: number;
  precio3?: number;
  precio1Pesos?: number;
  precio2Pesos?: number;
  precio3Pesos?: number;
  /** URL pública de imagen (tienda / consulta-stock, campo fotoURL). */
  fotoURL?: string;
  /** Texto bajo el título en la tienda web. */
  observacion?: string;
  /** Tienda web /consulta-stock: solo entra si marcás publicar y tenés activado “solo marcados”. */
  publicarEnCatalogoWeb?: boolean;
}

interface Props {
  productos?: Producto[]; // ⚠️ DEPRECATED - Solo para compatibilidad, ahora carga desde Firebase
  editarProducto?: (producto: Producto) => void; // ⚠️ DEPRECATED - Usa modal interno
  eliminarProducto: (id: string) => void;
  actualizarProducto?: (producto: Producto) => Promise<void>;
  onProductoActualizado?: (producto: Producto) => void;
  cotizacion: number;
  onCotizacionChange: (nuevaCotizacion: number) => void;
  negocioID?: string;
  refrescar?: boolean;
}

export default function TablaProductos({ 
  productos: productosLegacy, // ⚠️ DEPRECATED - Ya no se usa, carga desde Firebase
  editarProducto, // ⚠️ DEPRECATED - Ya no se usa, tiene modal interno
  eliminarProducto,
  actualizarProducto,
  onProductoActualizado,
  cotizacion, // 💰 Viene de useCotizacion
  onCotizacionChange,
  negocioID,
  refrescar
}: Props) {
  
  const { rol } = useRol();
  
  // 💰 Usar cotización de useCotizacion o valor por defecto temporal
  const cotizacionSegura = (typeof cotizacion === 'number' && cotizacion > 0) ? cotizacion : 1200;
  
  // 🆕 ESTADOS PARA LOS MODALES
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<string | null>(null);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [catalogoSoloMarcados, setCatalogoSoloMarcados] = useState(false);
  const [whatsappPedidosInput, setWhatsappPedidosInput] = useState("");
  const [guardandoWhatsapp, setGuardandoWhatsapp] = useState(false);
  const [guardandoOpcionCatalogo, setGuardandoOpcionCatalogo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  /** Evita hidratar portal en SSR y asegura que modales vivan bajo document.body (menos errores removeChild con React 19). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  // 🔍 ESTADOS PARA FILTROS
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroStock, setFiltroStock] = useState<"todos" | "disponible" | "bajo" | "agotado">("todos");
  
  // 🚀 ESTADOS PARA PAGINACIÓN OPTIMIZADA
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [hayMasPaginas, setHayMasPaginas] = useState(true);
  const [ultimoDoc, setUltimoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);
  
  // 🔥 CONFIGURACIÓN DE PAGINACIÓN
  const ITEMS_POR_PAGINA = 100;

  // 🚀 FUNCIÓN OPTIMIZADA PARA CARGAR PRODUCTOS CON PAGINACIÓN
  const cargarProductosPaginados = async (esNuevaCarga = false, filtros?: {
    proveedor?: string,
    categoria?: string,
    stock?: string
  }) => {
    if (!rol?.negocioID || cargando) return;
    
    setCargando(true);
    
    try {
      console.log('🔄 Cargando repuestos paginados...', {
        paginaActual: esNuevaCarga ? 1 : paginaActual,
        filtros
      });

      let queryProductos = query(
        collection(db, `negocios/${rol.negocioID}/stockRepuestos`),
        orderBy("codigo", "asc"),
        limit(ITEMS_POR_PAGINA)
      );

      // Aplicar filtros si existen
      if (filtros?.categoria && filtros.categoria !== "") {
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockRepuestos`),
          where("categoria", "==", filtros.categoria),
          orderBy("codigo", "asc"),
          limit(ITEMS_POR_PAGINA)
        );
      }

      if (filtros?.proveedor && filtros.proveedor !== "") {
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockRepuestos`),
          where("proveedor", "==", filtros.proveedor),
          orderBy("codigo", "asc"),
          limit(ITEMS_POR_PAGINA)
        );
      }

      if (!esNuevaCarga && ultimoDoc) {
        const ordenActual = filtros?.categoria || filtros?.proveedor ? "codigo" : "codigo";
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockRepuestos`),
          orderBy(ordenActual, "asc"),
          startAfter(ultimoDoc),
          limit(ITEMS_POR_PAGINA)
        );
      }

      const snapshot = await getDocs(queryProductos);
      const nuevosProductos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Producto[];

      console.log(`✅ Cargados ${nuevosProductos.length} repuestos`);

      if (esNuevaCarga) {
        setProductos(nuevosProductos);
        setPaginaActual(1);
      } else {
        setProductos(prev => [...prev, ...nuevosProductos]);
        setPaginaActual(prev => prev + 1);
      }

      setHayMasPaginas(nuevosProductos.length === ITEMS_POR_PAGINA);
      if (snapshot.docs.length > 0) {
        setUltimoDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

      // Contar total solo en la primera carga
      if (esNuevaCarga) {
        const totalSnapshot = await getDocs(
          query(collection(db, `negocios/${rol.negocioID}/stockRepuestos`))
        );
        setTotalProductos(totalSnapshot.size);
      }

    } catch (error) {
      console.error("❌ Error cargando repuestos:", error);
    } finally {
      setCargando(false);
    }
  };

  const refrescarProductos = async () => {
    await cargarProductosPaginados(true, {
      proveedor: filtroProveedor,
      categoria: filtroCategoria,
      stock: filtroStock
    });
  };

  const cargarMasProductos = () => {
    if (hayMasPaginas && !cargando) {
      cargarProductosPaginados(false);
    }
  };

  const { proveedoresUnicos, categoriasUnicas, productosFiltrados } = useMemo(() => {
    const proveedores = Array.from(new Set(productos.map(p => p.proveedor).filter(Boolean)));
    const categorias = Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)));
    
    const filtrados = productos.filter(p => {
      // 🆕 FILTRO DE BÚSQUEDA MEJORADO - Busca en todos los campos relevantes
      const matchBusqueda = !filtroBusqueda || (() => {
        // Crear un texto combinado con todos los campos searchables
        const textoCompleto = [
          p.producto || '',
          p.codigo || '',
          p.marca || '',
          p.color || '',
          p.categoria || '',
          p.proveedor || ''
        ].join(' ').toLowerCase();
        
        // Dividir la búsqueda en palabras y verificar que todas estén presentes
        const palabrasBusqueda = filtroBusqueda.toLowerCase().trim().split(/\s+/);
        
        return palabrasBusqueda.every(palabra => 
          palabra.length > 0 && textoCompleto.includes(palabra)
        );
      })();
      
      // Filtros específicos (solo si están seleccionados)
      const matchProveedor = !filtroProveedor || p.proveedor === filtroProveedor;
      const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;
      
      // Filtro por stock
      const matchStock = filtroStock === "todos" || 
        (filtroStock === "disponible" && p.cantidad > (p.stockBajo ?? 3)) ||
        (filtroStock === "bajo" && p.cantidad > 0 && p.cantidad <= (p.stockBajo ?? 3)) ||
        (filtroStock === "agotado" && p.cantidad === 0);
      
      return matchBusqueda && matchProveedor && matchCategoria && matchStock;
    });
    
    return {
      proveedoresUnicos: proveedores,
      categoriasUnicas: categorias,
      productosFiltrados: filtrados
    };
  }, [productos, filtroBusqueda, filtroProveedor, filtroCategoria, filtroStock]);

  // 🆕 FUNCIÓN PARA CALCULAR PRECIO DINÁMICO
  const calcularPrecioDinamico = (producto: Producto) => {
    if (!producto || typeof producto.precioCosto !== 'number' || producto.precioCosto < 0) return 0;
    
    if (producto.moneda === "USD" && typeof cotizacionSegura === 'number') {
      return producto.precioCosto * cotizacionSegura;
    }
    return producto.precioCosto;
  };

  // 📊 ESTADÍSTICAS OPTIMIZADAS
  const estadisticas = useMemo(() => {
    const totalFiltrados = productosFiltrados.length;
    const stockTotal = productosFiltrados.reduce((sum, p) => sum + (typeof p.cantidad === 'number' ? p.cantidad : 0), 0);
    const valorTotal = productosFiltrados.reduce((acc, p) => {
      const precio = calcularPrecioDinamico(p);
      const cantidad = typeof p.cantidad === 'number' ? p.cantidad : 0;
      return acc + (precio * cantidad);
    }, 0);
    
    return { totalFiltrados, stockTotal, valorTotal };
  }, [productosFiltrados, cotizacionSegura]);

  // ESTADOS DEL FORMULARIO
  const [formulario, setFormulario] = useState<Producto>({
    id: "",
    codigo: "",
    categoria: "",
    producto: "",
    marca: "",
    color: "",
    precioCosto: 0,
    precioCostoPesos: 0,
    cantidad: 0,
    moneda: "ARS",
    stockBajo: 3,
    proveedor: "",
    precio1: 0,
    precio2: 0,
    precio3: 0,
    precio1Pesos: 0,
    precio2Pesos: 0,
    precio3Pesos: 0,
    fotoURL: "",
    observacion: "",
  });

  // FUNCIONES DEL MODAL
  const abrirModal = (producto: Producto) => {
    setProductoEditando(producto);
    const moneda = normalizarMoneda(producto.moneda);
    setFormulario({
      ...producto,
      moneda,
      precio1: producto.precio1 ?? 0,
      precio2: producto.precio2 ?? 0,
      precio3: producto.precio3 ?? 0,
      precio1Pesos: producto.precio1Pesos ?? 0,
      precio2Pesos: producto.precio2Pesos ?? 0,
      precio3Pesos: producto.precio3Pesos ?? 0,
      stockBajo: producto.stockBajo ?? 3,
      fotoURL: producto.fotoURL ?? "",
      observacion: producto.observacion ?? "",
    });
    setModalAbierto(true);
  };
  

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoEditando(null);
    setGuardando(false);
    setFormulario({
      id: "",
      codigo: "",
      categoria: "",
      producto: "",
      marca: "",
      color: "",
      precioCosto: 0,
      precioCostoPesos: 0,
      cantidad: 0,
      moneda: "ARS",
      stockBajo: 3,
      proveedor: "",
      precio1: 0,
      precio2: 0,
      precio3: 0,
      precio1Pesos: 0,
      precio2Pesos: 0,
      precio3Pesos: 0,
      fotoURL: "",
      observacion: "",
    });
  };

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]:
        name === "precioCosto" ||
        name === "precioCostoPesos" ||
        name === "cantidad" ||
        name === "stockBajo" ||
        name === "precio1" ||
        name === "precio2" ||
        name === "precio3" ||
        name === "precio1Pesos" ||
        name === "precio2Pesos" ||
        name === "precio3Pesos"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const manejarCambioMoneda = (nuevaMoneda: "ARS" | "USD") => {
    const cot = cotizacionSegura;
    setFormulario((prev) => {
      const precioCosto = Number(prev.precioCosto) || 0;
      const p1 = Number(prev.precio1) || 0;
      const p2 = Number(prev.precio2) || 0;
      const p3 = Number(prev.precio3) || 0;
      return {
        ...prev,
        moneda: nuevaMoneda,
        precioCostoPesos: pesosDesdeMoneda(precioCosto, nuevaMoneda, cot),
        precio1Pesos: pesosDesdeMoneda(p1, nuevaMoneda, cot),
        precio2Pesos: pesosDesdeMoneda(p2, nuevaMoneda, cot),
        precio3Pesos: pesosDesdeMoneda(p3, nuevaMoneda, cot),
      };
    });
  };

  const guardarCambios = async () => {
    setGuardando(true);
  
    try {
      if (!rol?.negocioID || !formulario.id) {
        throw new Error("Falta negocioID o id del producto");
      }
  
      const ref = doc(
        db,
        `negocios/${rol.negocioID}/stockRepuestos/${formulario.id}`
      );

      const p1 = Number(formulario.precio1 || 0);
      const p2 = Number(formulario.precio2 || 0);
      const p3 = Number(formulario.precio3 || 0);
      const cot = cotizacionSegura;
      const moneda = normalizarMoneda(formulario.moneda);
      const precioCosto = Number(formulario.precioCosto || 0);
      const precioCostoPesos = pesosDesdeMoneda(precioCosto, moneda, cot);
      const precio1Pesos = pesosDesdeMoneda(p1, moneda, cot);
      const precio2Pesos = pesosDesdeMoneda(p2, moneda, cot);
      const precio3Pesos = pesosDesdeMoneda(p3, moneda, cot);
  
      await updateDoc(ref, {
        codigo: formulario.codigo,
        categoria: formulario.categoria,
        producto: formulario.producto,
        marca: formulario.marca,
        color: formulario.color,
        proveedor: formulario.proveedor,
  
        cantidad: Number(formulario.cantidad || 0),
        stockBajo: Number(formulario.stockBajo || 0),
  
        precioCosto,
        precioCostoPesos,
        moneda,
  
        precio1: p1,
        precio2: p2,
        precio3: p3,
        precio1Pesos,
        precio2Pesos,
        precio3Pesos,
        fotoURL: String(formulario.fotoURL ?? "").trim(),
        observacion: String(formulario.observacion ?? "").trim(),
      });
  
      cerrarModal();
      await refrescarProductos();
  
      console.log("✅ Producto actualizado correctamente");
  
    } catch (error) {
      console.error("❌ Error al actualizar producto:", error);
      setGuardando(false);
      alert("❌ Error al guardar el producto");
    }
  };
  

  const confirmarEliminacion = async (id: string) => {
    try {
      await eliminarProducto(id);
      setModalEliminar(null);
      refrescarProductos();
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const persistirWhatsappPedidos = async () => {
    if (!rol?.negocioID) return;
    setGuardandoWhatsapp(true);
    try {
      const datosRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
      const digits = whatsappPedidosInput.replace(/\D/g, "");
      await setDoc(datosRef, { whatsappPedidos: digits || "" }, { merge: true });
      setWhatsappPedidosInput(digits);
      alert(
        digits.length >= 10
          ? "WhatsApp guardado. Los pedidos desde la tienda irán a este número."
          : "Guardado. Si dejás vacío o pocas cifras, la tienda puede usar la variable NEXT_PUBLIC_WHATSAPP_PEDIDOS."
      );
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el WhatsApp.");
    } finally {
      setGuardandoWhatsapp(false);
    }
  };

  const handleSeleccionarFotoRepuesto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !rol?.negocioID || !formulario.id) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      alert("Usá JPG, PNG, WEBP o GIF.");
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      alert("La imagen debe pesar menos de 2,5 MB.");
      return;
    }
    setSubiendoFoto(true);
    try {
      const path = `negocios/${rol.negocioID}/repuestos/${formulario.id}/${Date.now()}.${ext}`;
      const r = refStorage(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setFormulario((prev) => ({ ...prev, fotoURL: url }));
    } catch (err) {
      console.error(err);
      alert(
        "No se pudo subir la imagen. Revisá que estés logueado y las reglas de Firebase Storage permitan escritura."
      );
    } finally {
      setSubiendoFoto(false);
    }
  };

  const persistirOpcionCatalogo = async (valor: boolean) => {
    if (!rol?.negocioID) return;
    setGuardandoOpcionCatalogo(true);
    try {
      const datosRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
      const snap = await getDoc(datosRef);
      const prevCat =
        snap.exists() && snap.data()?.catalogoPublico && typeof snap.data()!.catalogoPublico === "object"
          ? { ...(snap.data()!.catalogoPublico as Record<string, unknown>) }
          : {};
      await updateDoc(datosRef, {
        catalogoPublico: { ...prevCat, catalogoSoloRepuestosMarcados: valor },
      });
      setCatalogoSoloMarcados(valor);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar la opción del catálogo.");
    } finally {
      setGuardandoOpcionCatalogo(false);
    }
  };

  const togglePublicarRepuesto = async (p: Producto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!rol?.negocioID) return;
    const siguiente = !p.publicarEnCatalogoWeb;
    try {
      await updateDoc(doc(db, `negocios/${rol.negocioID}/stockRepuestos/${p.id}`), {
        publicarEnCatalogoWeb: siguiente,
      });
      setProductos((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, publicarEnCatalogoWeb: siguiente } : x))
      );
      if (siguiente && !catalogoSoloMarcados) {
        await persistirOpcionCatalogo(true);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar la publicación en catálogo.");
    }
  };

  // ⚡ EFECTOS OPTIMIZADOS
  useEffect(() => {
    if (!rol?.negocioID) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, `negocios/${rol.negocioID}/configuracion/datos`));
        const raw = snap.data();
        const cp = raw?.catalogoPublico as { catalogoSoloRepuestosMarcados?: boolean } | undefined;
        setCatalogoSoloMarcados(cp?.catalogoSoloRepuestosMarcados === true);
        const wa = String(raw?.whatsappPedidos ?? raw?.whatsappPedido ?? "").replace(/\D/g, "");
        setWhatsappPedidosInput(wa.length >= 10 ? wa : "");
      } catch {
        /* noop */
      }
    })();
  }, [rol?.negocioID, refrescar]);

  useEffect(() => {
    if (rol?.negocioID) {
      cargarProductosPaginados(true);
    }
  }, [rol?.negocioID, refrescar]);

  useEffect(() => {
    if (rol?.negocioID) {
      const timer = setTimeout(() => {
        cargarProductosPaginados(true, {
          proveedor: filtroProveedor,
          categoria: filtroCategoria,
          stock: filtroStock
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [filtroProveedor, filtroCategoria]);

  return (
    <div className="space-y-6">
      {/* 🆕 HEADER CON FILTROS Y COTIZACIÓN MEJORADO */}
      <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-3 lg:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 mb-3">
          
          {/* Filtros principales */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Filtro Proveedor */}
              <div>
                <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🏪</span>
                  Proveedor:
                </label>
                <select
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                  className="w-full p-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-sm"
                >
                  <option value="">Todos</option>
                  {proveedoresUnicos.map(proveedor => (
                    <option key={proveedor} value={proveedor}>{proveedor}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Categoría */}
              <div>
                <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">📂</span>
                  Categoría:
                </label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full p-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
                >
                  <option value="">Todas</option>
                  {categoriasUnicas.map(categoria => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Stock */}
              <div>
                <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">📊</span>
                  Estado Stock:
                </label>
                <select
                  value={filtroStock}
                  onChange={(e) => setFiltroStock(e.target.value as any)}
                  className="w-full p-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="bajo">Stock Bajo</option>
                  <option value="agotado">Agotado</option>
                </select>
              </div>

              {/* Buscador */}
              <div>
                <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#9b59b6] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
                  Buscar:
                </label>
                <input
                  type="text"
                  placeholder="Buscar en todo: producto, código, marca, categoría, proveedor."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="w-full p-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Cotización USD */}
          <div className="flex flex-col gap-2 ml-auto">
            <label className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
              <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
              Cotización USD:
            </label>
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] px-3 py-2 rounded-lg border-2 border-[#95a5a6] min-w-[180px]">
              <span className="text-sm font-medium text-[#2c3e50]">$</span>
              <div className="flex-1 text-center font-bold text-sm text-[#2c3e50]">
                {typeof cotizacionSegura === 'number' ? cotizacionSegura.toLocaleString("es-AR") : '1,200'}
              </div>
              <div className="text-xs text-[#f39c12]">
                ARS
              </div>
            </div>
            <div className="text-xs text-[#7f8c8d] text-center">
              📌 Solo lectura
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-[#1abc9c]/30 bg-[#e8f8f5] px-4 py-3 text-sm text-[#2c3e50] shadow-sm">
        <label className="flex cursor-pointer flex-wrap items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#bdc3c7] text-[#16a085] focus:ring-[#1abc9c]"
            checked={catalogoSoloMarcados}
            disabled={guardandoOpcionCatalogo}
            onChange={(e) => void persistirOpcionCatalogo(e.target.checked)}
          />
          <span>
            <strong className="font-semibold text-[#117864]">Tienda web (consulta-stock):</strong> si está activado,
            solo se publican los repuestos con el ícono{" "}
            <Store className="inline h-4 w-4 align-text-bottom text-[#16a085]" aria-hidden />{" "}
            <strong>verde</strong> en Acciones. Si está desactivado, el catálogo muestra{" "}
            <strong>todos</strong> los repuestos (como antes).
            <span className="mt-1 block text-[13px] font-normal text-[#1e8449]">
              Al marcar un repuesto en verde por primera vez activamos esta opción automáticamente; podés volver a mostrar todo
              desmarcando el cuadrado de arriba.
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-xl border-2 border-[#3498db]/25 bg-white px-4 py-3 text-sm text-[#2c3e50] shadow-sm">
        <p className="mb-2 font-semibold text-[#2c3e50]">WhatsApp para pedidos desde la tienda</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Ej: 5491123456789 (código país, sin +)"
            value={whatsappPedidosInput}
            onChange={(e) => setWhatsappPedidosInput(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border-2 border-[#bdc3c7] p-2 text-sm focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20"
          />
          <button
            type="button"
            disabled={guardandoWhatsapp}
            onClick={() => void persistirWhatsappPedidos()}
            className="shrink-0 rounded-lg bg-[#3498db] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#2980b9] disabled:opacity-50"
          >
            {guardandoWhatsapp ? "Guardando…" : "Guardar número"}
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[#7f8c8d]">
          Se guarda en <code className="rounded bg-[#ecf0f1] px-1">negocios/…/configuracion/datos</code> como{" "}
          <code className="rounded bg-[#ecf0f1] px-1">whatsappPedidos</code>. Alternativa en servidor: variable{" "}
          <code className="rounded bg-[#ecf0f1] px-1">NEXT_PUBLIC_WHATSAPP_PEDIDOS</code>.
        </p>
      </div>

      {/* Indicador de carga */}
      {cargando && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-blue-700 font-medium">Cargando repuestos...</span>
        </div>
      )}

      {/* 🆕 TABLA MEJORADA CON ESTÉTICA GESTIONE */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-2 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-sm sm:text-2xl">📦</span>
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold">Stock de Repuestos</h3>
              <p className="text-blue-100 text-xs sm:text-sm">
                Mostrando {estadisticas.totalFiltrados} productos
                {totalProductos > 0 && (
                  <span className="ml-2">
                    • Página {paginaActual} • Total: {totalProductos}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla responsive */}
        <div className="w-full">
          <table className="w-full border-collapse table-fixed text-xs">
            <thead className="bg-[#ecf0f1]">
              <tr>
                <th className="w-[8%] lg:w-[6%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  🏷️ Código
                </th>
                <th className="w-[10%] lg:w-[8%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📂 Cat
                </th>
                <th className="w-[44px] lg:w-[52px] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📷
                </th>
                  <th className="w-[32%] lg:w-[26%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    📦 Producto
                 </th>
                <th className="w-0 lg:w-[8%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  🏢 Marca
                </th>
                <th className="w-0 lg:w-[8%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  🎨 Color
                </th>
                <th className="w-[12%] lg:w-[9%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  💰 Costo Orig
                </th>
                <th className="w-[12%] lg:w-[9%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  💵 Costo ARS
                </th>
                <th className="w-[8%] lg:w-[6%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📊 Stock
                </th>
                <th className="w-0 lg:w-[9%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  🏪 Prov
                </th>
                <th className="w-[18%] lg:w-[14%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  ⚙️ Acciones /{" "}
                  <Store className="inline h-3.5 w-3.5 align-text-bottom text-[#16a085]" aria-hidden />{" "}
                  web
                </th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#7f8c8d]">
                          {productos.length === 0 ? "No hay productos registrados" : "No se encontraron resultados"}
                        </p>
                        <p className="text-xs text-[#bdc3c7]">
                          {productos.length === 0 
                            ? "Los productos aparecerán aquí una vez que agregues algunos"
                            : "Intenta ajustar los filtros de búsqueda"
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => {
                  const isEven = productosFiltrados.indexOf(p) % 2 === 0;
                  
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                        (p.cantidad || 0) === 0
                          ? "bg-red-50"
                          : (p.cantidad || 0) <= (p.stockBajo ?? 3)
                          ? "bg-yellow-50"
                          : isEven ? "bg-white" : "bg-[#f8f9fa]"
                      }`}
                    >
                      {/* Código */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <span className="inline-flex items-center px-1 py-1 rounded text-xs font-bold bg-[#3498db] text-white">
                          {p.codigo || "—"}
                        </span>
                      </td>
                      
                      {/* Categoría */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <span className="inline-flex items-center px-1 py-1 rounded text-xs font-medium bg-[#27ae60] text-white">
                          {(p.categoria || "").substring(0, 6)}
                        </span>
                      </td>

                      {/* Foto (misma URL que usa la tienda web) */}
                      <td className="p-1 text-center align-middle border border-[#bdc3c7]">
                        {typeof p.fotoURL === "string" && p.fotoURL.trim().startsWith("http") ? (
                          <img
                            src={p.fotoURL.trim()}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="mx-auto h-10 w-10 rounded-md border border-[#ecf0f1] bg-white object-contain"
                          />
                        ) : (
                          <div
                            className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-[#dcdfe2] bg-[#f4f6f7]"
                            title="Sin foto — cargala en Editar"
                          >
                            <Package className="h-4 w-4 text-[#bdc3c7]" aria-hidden />
                          </div>
                        )}
                      </td>
                      
                    {/* Producto */}
                      <td className="w-[32%] lg:w-[26%] p-2 text-left border border-[#bdc3c7]">
                        <div className="relative group">
                          <div className="text-xs font-medium text-[#2c3e50]">
                            {/* ✅ TEXTO COMPLETO CON WORD-WRAP */}
                            <div className="font-semibold break-words whitespace-normal leading-tight">
                              {p.producto || "—"}
                            </div>
                            <div className="text-[10px] text-[#7f8c8d] lg:hidden mt-1">
                              <div>{p.marca || "—"} • {p.color || ""}</div>
                              <div>{p.proveedor || "—"}</div>
                            </div>
                          </div>
                          
                          {/* Tooltip con código al hacer hover */}
                          <div className="absolute left-0 top-full mt-1 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                            <div className="font-semibold">📦 {p.producto}</div>
                            <div className="text-gray-300 text-[10px] mt-1">
                              Código: {p.codigo || "N/A"}
                            </div>
                            <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Marca */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">{p.marca || "—"}</span>
                      </td>
                      
                      {/* Color */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">{p.color || "—"}</span>
                      </td>
                      
                      {/* Costo Original */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="text-xs">
                          <div className={`font-medium ${
                            p.moneda === "USD" ? "text-[#3498db]" : "text-[#27ae60]"
                          }`}>
                            {p.moneda} ${(p.precioCosto || 0).toLocaleString("es-AR")}
                          </div>
                        </div>
                      </td>
                      
                      {/* Costo ARS */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="text-xs">
                          <div className="font-bold text-[#27ae60]">
                            ${(calcularPrecioDinamico(p) || 0).toLocaleString("es-AR")}
                          </div>
                        </div>
                      </td>
                      
                      {/* Stock */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white ${
                          (p.cantidad || 0) === 0
                            ? "bg-[#e74c3c]"
                            : (p.cantidad || 0) <= (p.stockBajo ?? 3)
                            ? "bg-[#f39c12]"
                            : "bg-[#27ae60]"
                        }`}>
                          {p.cantidad || 0}
                        </span>
                      </td>
                      
                      {/* Proveedor */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">{p.proveedor || "—"}</span>
                      </td>
                      
                      {/* Acciones */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="flex flex-wrap gap-1 justify-center items-center">
                          <button
                            type="button"
                            onClick={(ev) => void togglePublicarRepuesto(p, ev)}
                            title={
                              catalogoSoloMarcados
                                ? p.publicarEnCatalogoWeb
                                  ? "Visible en tienda web"
                                  : "No visible en tienda (activá modo solo marcados arriba)"
                                : p.publicarEnCatalogoWeb
                                  ? "Marcado para cuando uses solo publicados"
                                  : "Marcar para incluir cuando filtres solo publicados"
                            }
                            className={`inline-flex items-center justify-center rounded p-1.5 transition ${
                              p.publicarEnCatalogoWeb
                                ? "bg-[#1abc9c] text-white shadow"
                                : "bg-[#ecf0f1] text-[#95a5a6] hover:bg-[#d5dbdb]"
                            }`}
                          >
                            <Store className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            onClick={() => abrirModal(p)}
                            className="bg-[#3498db] hover:bg-[#2980b9] text-white px-1 py-1 rounded text-xs transition-all duration-200"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setModalEliminar(p.id)}
                            className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-1 py-1 rounded text-xs transition-all duration-200"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y estadísticas */}
        <div className="bg-[#f8f9fa] px-2 sm:px-6 py-2 sm:py-4 border-t border-[#bdc3c7]">
          <div className="flex flex-col gap-4">
            
            {/* Estadísticas */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
              <span>
                Mostrando {estadisticas.totalFiltrados} de {totalProductos} productos
              </span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                <span>
                  Stock Total: <strong className="text-[#3498db]">
                    {typeof estadisticas.stockTotal === 'number' ? estadisticas.stockTotal.toLocaleString("es-AR") : '0'} unidades
                  </strong>
                </span>
                <span>
                  Valor Total: <strong className="text-[#27ae60]">
                    ${typeof estadisticas.valorTotal === 'number' ? estadisticas.valorTotal.toLocaleString("es-AR") : '0'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Controles de paginación */}
            {hayMasPaginas && (
              <div className="flex justify-center">
                <button
                  onClick={cargarMasProductos}
                  disabled={cargando}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 transform ${
                    cargando
                      ? "bg-[#bdc3c7] cursor-not-allowed text-white"
                      : "bg-[#3498db] hover:bg-[#2980b9] text-white hover:scale-105 shadow-lg"
                  }`}
                >
                  {cargando ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Cargando...
                    </div>
                  ) : (
                    `Cargar más productos (Página ${paginaActual + 1})`
                  )}
                </button>
              </div>
            )}

            {/* Indicador de final */}
            {!hayMasPaginas && productos.length > 0 && (
              <div className="text-center text-xs text-[#7f8c8d] py-2">
                <span className="bg-[#ecf0f1] px-3 py-1 rounded-full">
                  📄 No hay más productos para mostrar
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔧 MODAL DE EDICIÓN — portal a body para evitar conflictos DOM al editar inputs (React 19 / contenedores con scroll) */}
      {mounted &&
        modalAbierto &&
        createPortal(
          <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="modal-editar-repuesto-titulo">
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={cerrarModal}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
          <div
            key={formulario.id}
            className="pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-t-2xl p-4 sm:p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">📦</span>
                  </div>
                  <div>
                    <h2 id="modal-editar-repuesto-titulo" className="text-lg sm:text-xl font-bold">
                      Editar Producto
                    </h2>
                    <p className="text-blue-100 text-sm">{formulario.producto}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="text-blue-100 hover:text-white text-xl sm:text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa]">
              
              {/* 🆕 INFO DE COTIZACIÓN */}
              <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl sm:text-2xl">💰</span>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">Cotización Actual</h3>
                    <p className="text-xs sm:text-sm opacity-90">1 USD = ${typeof cotizacionSegura === 'number' ? cotizacionSegura.toLocaleString("es-AR") : '1,200'} ARS</p>
                  </div>
                </div>
              </div>

              {/* Formulario de edición */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                
                {/* Código */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    🏷️ Código
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formulario.codigo}
                    onChange={manejarCambio}
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    📂 Categoría
                  </label>
                  <input
                    type="text"
                    name="categoria"
                    value={formulario.categoria}
                    onChange={manejarCambio}
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                </div>

                {/* Producto */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    📦 Producto
                  </label>
                  <input
                    type="text"
                    name="producto"
                    value={formulario.producto}
                    onChange={manejarCambio}
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                </div>

                {/* Observación tienda */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    📝 Observación (tienda web)
                  </label>
                  <input
                    type="text"
                    name="observacion"
                    value={formulario.observacion ?? ""}
                    onChange={manejarCambio}
                    placeholder="Ej: Premium · OLED · Con marco"
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                  <p className="text-[11px] text-[#7f8c8d]">
                    Aparece en letra chica bajo el título en el catálogo. Opcional.
                  </p>
                </div>

                {/* Marca */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    🏢 Marca
                  </label>
                  <input
                    type="text"
                    name="marca"
                    value={formulario.marca}
                    onChange={manejarCambio}
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    🎨 Color
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formulario.color}
                    onChange={manejarCambio}
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                </div>

                {/* Moneda */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    💱 Moneda del producto
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => manejarCambioMoneda("ARS")}
                      className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition ${
                        formulario.moneda === "ARS"
                          ? "border-[#27ae60] bg-[#eafaf1] text-[#1e8449]"
                          : "border-[#bdc3c7] bg-white text-[#7f8c8d] hover:border-[#27ae60]/50"
                      }`}
                    >
                      🇦🇷 ARS
                    </button>
                    <button
                      type="button"
                      onClick={() => manejarCambioMoneda("USD")}
                      className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition ${
                        formulario.moneda === "USD"
                          ? "border-[#3498db] bg-[#ebf5fb] text-[#2471a3]"
                          : "border-[#bdc3c7] bg-white text-[#7f8c8d] hover:border-[#3498db]/50"
                      }`}
                    >
                      🇺🇸 USD
                    </button>
                  </div>
                  <p className="text-[11px] text-[#7f8c8d]">
                    Los precios de costo y venta se interpretan en esta moneda.
                  </p>
                </div>

                {/* Precio Costo */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#e74c3c]">
                    💰 Precio Costo ({formulario.moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#e74c3c] font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      name="precioCosto"
                      value={formulario.precioCosto}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-6 sm:pl-8 pr-4 py-2 sm:py-3 border-2 border-[#e74c3c] rounded-xl focus:ring-4 focus:ring-[#e74c3c]/20 focus:border-[#e74c3c] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#fdf2f2] shadow-sm text-sm"
                    />
                  </div>
                  {formulario.moneda === "USD" && (
                    <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
                      💵 Equivale a: <strong>${typeof formulario.precioCosto === 'number' && typeof cotizacionSegura === 'number' ? (formulario.precioCosto * cotizacionSegura).toLocaleString("es-AR") : '0'} ARS</strong>
                    </div>
                  )}
                </div>

                {/* Precio Costo en Pesos */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#27ae60]">
                    💵 Precio en Pesos (ARS)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#27ae60] font-bold">$</span>
                    <input
                      type="number"
                      name="precioCostoPesos"
                      value={formulario.precioCostoPesos}
                      onChange={manejarCambio}
                      step="0.01"
                      min="0"
                      className="w-full pl-6 sm:pl-8 pr-4 py-2 sm:py-3 border-2 border-[#27ae60] rounded-xl focus:ring-4 focus:ring-[#27ae60]/20 focus:border-[#27ae60] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#f0f9f4] shadow-sm text-sm"
                    />
                  </div>
                  <div className="text-xs text-[#7f8c8d]">
                    ℹ️ Campo opcional para precio fijo en pesos
                  </div>
                </div>
{/* ✅ NUEVOS CAMPOS DE PRECIOS DE VENTA */}
<div className="md:col-span-2 space-y-2">
  <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-xl p-3">
    <h4 className="font-bold flex items-center gap-2">
      <span>💵</span> Precios de Venta
    </h4>
    <p className="text-xs opacity-90">Configurá los 3 niveles de precio para este repuesto</p>
  </div>
</div>

{/* Precio 1 */}
<div className="space-y-2">
  <label className="block text-xs sm:text-sm font-semibold text-[#3498db]">
    💰 Precio 1 ({formulario.moneda})
  </label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3498db] font-bold">
      $
    </span>
    <input
      type="number"
      name="precio1"
      value={formulario.precio1 || 0}
      onChange={manejarCambio}
      step="0.01"
      min="0"
      className="w-full pl-6 sm:pl-8 pr-4 py-2 sm:py-3 border-2 border-[#3498db] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
      placeholder="Precio nivel 1"
    />
  </div>
  {formulario.moneda === "USD" && formulario.precio1 > 0 && (
    <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
      💵 Equivale a: <strong>${(formulario.precio1 * cotizacionSegura).toLocaleString("es-AR")} ARS</strong>
    </div>
  )}
</div>

{/* Precio 2 */}
<div className="space-y-2">
  <label className="block text-xs sm:text-sm font-semibold text-[#27ae60]">
    💰 Precio 2 ({formulario.moneda})
  </label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#27ae60] font-bold">
      $
    </span>
    <input
      type="number"
      name="precio2"
      value={formulario.precio2 || 0}
      onChange={manejarCambio}
      step="0.01"
      min="0"
      className="w-full pl-6 sm:pl-8 pr-4 py-2 sm:py-3 border-2 border-[#27ae60] rounded-xl focus:ring-4 focus:ring-[#27ae60]/20 focus:border-[#27ae60] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
      placeholder="Precio nivel 2"
    />
  </div>
  {formulario.moneda === "USD" && formulario.precio2 > 0 && (
    <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
      💵 Equivale a: <strong>${(formulario.precio2 * cotizacionSegura).toLocaleString("es-AR")} ARS</strong>
    </div>
  )}
</div>

{/* Precio 3 */}
<div className="space-y-2">
  <label className="block text-xs sm:text-sm font-semibold text-[#f39c12]">
    💰 Precio 3 ({formulario.moneda})
  </label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#f39c12] font-bold">
      $
    </span>
    <input
      type="number"
      name="precio3"
      value={formulario.precio3 || 0}
      onChange={manejarCambio}
      step="0.01"
      min="0"
      className="w-full pl-6 sm:pl-8 pr-4 py-2 sm:py-3 border-2 border-[#f39c12] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
      placeholder="Precio nivel 3"
    />
  </div>
  {formulario.moneda === "USD" && formulario.precio3 > 0 && (
    <div className="text-xs text-[#7f8c8d] bg-[#ecf0f1] p-2 rounded">
      💵 Equivale a: <strong>${(formulario.precio3 * cotizacionSegura).toLocaleString("es-AR")} ARS</strong>
    </div>
  )}
</div>

{/* Info sobre márgenes */}
{formulario.precioCosto > 0 && (formulario.precio1 > 0 || formulario.precio2 > 0 || formulario.precio3 > 0) && (
  <div className="md:col-span-2 bg-white border-2 border-[#3498db] rounded-xl p-3 space-y-2">
    <h4 className="font-bold text-[#2c3e50] flex items-center gap-2 text-sm">
      <span>📊</span> Márgenes de Ganancia
    </h4>
    <div className="grid grid-cols-3 gap-2 text-xs">
      {formulario.precio1 > 0 && (
        <div className="bg-[#ecf0f1] p-2 rounded">
          <span className="text-[#7f8c8d]">Precio 1:</span>
          <div className="font-bold text-[#3498db]">
            +{(((formulario.precio1 - formulario.precioCosto) / formulario.precioCosto) * 100).toFixed(1)}%
          </div>
        </div>
      )}
      {formulario.precio2 > 0 && (
        <div className="bg-[#d5f4e6] p-2 rounded">
          <span className="text-[#27ae60]">Precio 2:</span>
          <div className="font-bold text-[#27ae60]">
            +{(((formulario.precio2 - formulario.precioCosto) / formulario.precioCosto) * 100).toFixed(1)}%
          </div>
        </div>
      )}
      {formulario.precio3 > 0 && (
        <div className="bg-[#fef5e7] p-2 rounded">
          <span className="text-[#f39c12]">Precio 3:</span>
          <div className="font-bold text-[#f39c12]">
            +{(((formulario.precio3 - formulario.precioCosto) / formulario.precioCosto) * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  </div>
)}
                {/* Cantidad */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#9b59b6]">
                    📊 Stock Actual
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    value={formulario.cantidad}
                    onChange={manejarCambio}
                    min="0"
                    className="w-full p-2 sm:p-3 border-2 border-[#9b59b6] rounded-xl focus:ring-4 focus:ring-[#9b59b6]/20 focus:border-[#9b59b6] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                </div>

                {/* Stock Bajo */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#f39c12]">
                    ⚠️ Alerta Stock Bajo
                  </label>
                  <input
                    type="number"
                    name="stockBajo"
                    value={formulario.stockBajo || 3}
                    onChange={manejarCambio}
                    min="0"
                    className="w-full p-2 sm:p-3 border-2 border-[#f39c12] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] bg-gradient-to-r from-white to-[#fef9e7] shadow-sm text-sm"
                  />
                </div>

                {/* Proveedor */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[#2c3e50]">
                    🏪 Proveedor
                  </label>
                  <input
                    type="text"
                    name="proveedor"
                    value={formulario.proveedor}
                    onChange={manejarCambio}
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm"
                  />
                </div>

                {/* Foto catálogo (URL en Firestore; archivo en Storage) */}
                <div className="space-y-2 md:col-span-2 rounded-xl border-2 border-[#9b59b6]/30 bg-white p-3 sm:p-4">
                  <label className="block text-xs font-semibold text-[#2c3e50]">
                    🖼️ Foto del producto (tienda web)
                  </label>
                  <input
                    type="text"
                    name="fotoURL"
                    value={formulario.fotoURL ?? ""}
                    onChange={manejarCambio}
                    placeholder="https://… o subí una imagen abajo"
                    className="w-full rounded-xl border-2 border-[#bdc3c7] p-2 sm:p-3 text-sm text-[#2c3e50] shadow-sm focus:border-[#9b59b6] focus:ring-4 focus:ring-[#9b59b6]/15"
                  />
                  <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => void handleSeleccionarFotoRepuesto(e)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={subiendoFoto || guardando || !formulario.id}
                      onClick={() => inputFotoRef.current?.click()}
                      className="rounded-lg bg-[#9b59b6] px-3 py-2 text-xs font-semibold text-white shadow hover:bg-[#8e44ad] disabled:opacity-50"
                    >
                      {subiendoFoto ? "Subiendo…" : "Subir imagen"}
                    </button>
                    <span className="text-[11px] text-[#7f8c8d]">
                      JPG/PNG/WebP/GIF · máx. 2,5 MB · en Firebase solo se guarda la URL; el peso es de Storage.
                    </span>
                  </div>
                  {formulario.fotoURL?.startsWith("http") ? (
                    <img
                      src={formulario.fotoURL}
                      alt=""
                      className="mt-2 h-24 w-24 rounded-lg border border-[#ecf0f1] bg-white object-contain"
                    />
                  ) : null}
                </div>

              </div>
              
              {/* 🆕 PREVIEW DE PRECIOS */}
              {formulario.precioCosto > 0 && (
                <div className="bg-white border-2 border-[#3498db] rounded-xl p-3 sm:p-4 space-y-2">
                  <h4 className="font-bold text-[#2c3e50] flex items-center gap-2 text-sm sm:text-base">
                    <span>📊</span> Preview de Precios
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="bg-[#ecf0f1] p-3 rounded-lg">
                      <span className="text-[#7f8c8d] text-xs sm:text-sm">Precio Original:</span>
                      <div className="font-bold text-[#2c3e50] text-sm sm:text-base">
                        {formulario.moneda} ${(formulario.precioCosto || 0).toLocaleString("es-AR")}
                      </div>
                    </div>
                    <div className="bg-[#d5f4e6] p-3 rounded-lg">
                      <span className="text-[#27ae60] text-xs sm:text-sm">Equivalente ARS:</span>
                      <div className="font-bold text-[#27ae60] text-sm sm:text-base">
                        ${(calcularPrecioDinamico(formulario) || 0).toLocaleString("es-AR")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botones */}
              <div className="flex gap-3 justify-end pt-4 border-t border-[#ecf0f1]">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarCambios}
                  disabled={guardando || !formulario.producto || formulario.precioCosto <= 0}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#27ae60] to-[#229954] hover:from-[#229954] hover:to-[#1e8449] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {guardando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      💾 Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        modalEliminar &&
        createPortal(
          <div className="fixed inset-0 z-[100]" role="alertdialog" aria-modal="true" aria-labelledby="modal-eliminar-repuesto-titulo">
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={() => setModalEliminar(null)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl transition-all duration-300">
              {/* Header del modal */}
              <div className="rounded-t-2xl bg-gradient-to-r from-[#e74c3c] to-[#c0392b] p-4 text-white sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 sm:h-12 sm:w-12">
                    <span className="text-xl sm:text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h2 id="modal-eliminar-repuesto-titulo" className="text-lg font-bold sm:text-xl">
                      Confirmar Eliminación
                    </h2>
                    <p className="text-sm text-red-100">Esta acción no se puede deshacer</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                <div className="rounded-lg border-2 border-[#e74c3c] bg-red-50 p-3 sm:p-4">
                  <p className="text-sm font-medium text-[#e74c3c] sm:text-base">
                    ¿Estás seguro que querés eliminar este producto?
                  </p>
                  <div className="mt-2 text-xs text-[#7f8c8d] sm:text-sm">
                    <strong>Producto:</strong> {productos.find((p) => p.id === modalEliminar)?.producto}
                    <br />
                    <strong>Stock:</strong> {productos.find((p) => p.id === modalEliminar)?.cantidad}{" "}
                    unidades
                    <br />
                    <strong>Valor:</strong> $
                    {modalEliminar
                      ? (
                          calcularPrecioDinamico(
                            productos.find((p) => p.id === modalEliminar)!
                          ) || 0
                        ).toLocaleString("es-AR")
                      : "0"}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalEliminar(null)}
                    className="rounded-lg bg-[#7f8c8d] px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-[#6c7b7f] hover:scale-105 sm:px-6 sm:py-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmarEliminacion(modalEliminar)}
                    className="rounded-lg bg-[#e74c3c] px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-[#c0392b] hover:scale-105 sm:px-6 sm:py-3"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}