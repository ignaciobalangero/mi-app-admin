"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
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
  writeBatch,
} from "firebase/firestore";
import { Store, Package, Tag } from "lucide-react";
import CampoFotoRepuesto from "./CampoFotoRepuesto";
import { fotosParaFirestore, normalizarFotosURLs } from "@/lib/fotosRepuestoHelpers";

// 📦 Tabla de productos – Sección REPUESTOS OPTIMIZADA CON PAGINACIÓN

import { normalizarMoneda, pesosDesdeMoneda } from "@/lib/monedaRepuesto";
import { margenDesdePrecio, precioDesdeMargen } from "@/lib/margenRepuesto";
import CalculadoraCostoUsd from "./CalculadoraCostoUsd";
import {
  type AlcanceAjustePrecio,
  type CampoPrecioAjuste,
  patchAjustePrecioARS,
  esRepuestoARS,
  ejemploAjuste,
} from "@/lib/ajustePrecioRepuesto";
import {
  type ModoEdicionProducto,
  aplicarTextoProducto,
  ejemploEdicionProducto,
} from "@/lib/edicionMasivaProducto";
import {
  fusionarCategoriasUnicas,
  fusionarValoresUnicos,
  mismoCategoria,
  normalizarCategoriaKey,
} from "@/lib/categoriaRepuesto";
import {
  codigoRepuestoOcupado,
  mensajeCodigoDuplicado,
  normalizarCodigoRepuesto,
} from "@/lib/codigoRepuestoUnico";
import {
  imprimirEtiquetaRepuesto,
  imprimirEtiquetasRepuestos,
} from "@/lib/imprimirEtiquetaRepuesto";

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
  /** URL portada (legacy; = fotosURLs[0]). */
  fotoURL?: string;
  /** Galería ordenada; la primera es la portada del catálogo. */
  fotosURLs?: string[];
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
  onProductoActualizado?: () => void;
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
  const [modalEliminarMasivo, setModalEliminarMasivo] = useState(false);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => new Set());
  const [eliminandoMasivo, setEliminandoMasivo] = useState(false);
  const [cargandoIdsTotales, setCargandoIdsTotales] = useState(false);
  const [modalAjustePrecios, setModalAjustePrecios] = useState(false);
  const [ajustePorcentaje, setAjustePorcentaje] = useState("10");
  const [ajusteAlcance, setAjusteAlcance] = useState<AlcanceAjustePrecio>("seleccionados");
  const [ajusteCampos, setAjusteCampos] = useState({
    precioCosto: false,
    precio1: true,
    precio2: false,
    precio3: false,
  });
  const [aplicandoAjuste, setAplicandoAjuste] = useState(false);
  const [previewAjuste, setPreviewAjuste] = useState<{ total: number; ejemplo: string | null }>({
    total: 0,
    ejemplo: null,
  });
  const [cargandoPreviewAjuste, setCargandoPreviewAjuste] = useState(false);
  const [modalEdicionProducto, setModalEdicionProducto] = useState(false);
  const [edicionProductoTexto, setEdicionProductoTexto] = useState("");
  const [edicionProductoModo, setEdicionProductoModo] = useState<ModoEdicionProducto>("prepend");
  const [aplicandoEdicionProducto, setAplicandoEdicionProducto] = useState(false);
  const [modalEdicionCategoria, setModalEdicionCategoria] = useState(false);
  const [edicionCategoriaTexto, setEdicionCategoriaTexto] = useState("");
  const [aplicandoEdicionCategoria, setAplicandoEdicionCategoria] = useState(false);
  const [modalEdicionProveedor, setModalEdicionProveedor] = useState(false);
  const [edicionProveedorTexto, setEdicionProveedorTexto] = useState("");
  const [aplicandoEdicionProveedor, setAplicandoEdicionProveedor] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [catalogoSoloMarcados, setCatalogoSoloMarcados] = useState(false);
  const [whatsappPedidosInput, setWhatsappPedidosInput] = useState("");
  const [guardandoWhatsapp, setGuardandoWhatsapp] = useState(false);
  const [guardandoOpcionCatalogo, setGuardandoOpcionCatalogo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  /** Evita hidratar portal en SSR y asegura que modales vivan bajo document.body (menos errores removeChild con React 19). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  // 🔍 ESTADOS PARA FILTROS
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroStock, setFiltroStock] = useState<"todos" | "disponible" | "bajo" | "agotado">("todos");
  const [filtroTiendaWeb, setFiltroTiendaWeb] = useState<"todos" | "en_web" | "no_web">("todos");
  const [filtroStockMax, setFiltroStockMax] = useState<"" | "0" | "1" | "2" | "3" | "5">("");
  const [categoriasUnicas, setCategoriasUnicas] = useState<string[]>([]);
  const [proveedoresUnicos, setProveedoresUnicos] = useState<string[]>([]);
  const listaFiltradaCategoriaRef = useRef<Producto[]>([]);
  
  // 🚀 ESTADOS PARA PAGINACIÓN OPTIMIZADA
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [hayMasPaginas, setHayMasPaginas] = useState(true);
  const [ultimoDoc, setUltimoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);
  
  // 🔥 CONFIGURACIÓN DE PAGINACIÓN
  const ITEMS_POR_PAGINA = 100;

  const cargarOpcionesFiltro = async () => {
    if (!rol?.negocioID) return;
    try {
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));
      const categoriasOrdenadas: string[] = [];
      const proveedores: string[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        categoriasOrdenadas.push(String(data.categoria ?? "").trim());
        proveedores.push(String(data.proveedor ?? "").trim());
      }
      setCategoriasUnicas(fusionarCategoriasUnicas(categoriasOrdenadas));
      setProveedoresUnicos(fusionarValoresUnicos(proveedores));
    } catch (e) {
      console.error("Error cargando opciones de filtro:", e);
    }
  };

  // 🚀 FUNCIÓN OPTIMIZADA PARA CARGAR PRODUCTOS CON PAGINACIÓN
  const esPublicadoEnWeb = (p: Producto) => {
    const v = p.publicarEnCatalogoWeb;
    return v === true || (v as unknown) === 1 || String(v).toLowerCase() === "true";
  };

  const cargarProductosPaginados = async (esNuevaCarga = false, filtros?: {
    proveedor?: string,
    categoria?: string,
    stock?: string,
    tiendaWeb?: "todos" | "en_web" | "no_web",
    stockMax?: string,
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

      const cargaCompleta =
        (filtros?.categoria && filtros.categoria !== "") ||
        (filtros?.tiendaWeb && filtros.tiendaWeb !== "todos") ||
        (filtros?.stockMax !== undefined && filtros.stockMax !== "");

      if (cargaCompleta) {
        const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));
        let filtrados = snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Producto);

        if (filtros?.categoria && filtros.categoria !== "") {
          filtrados = filtrados.filter((p) => mismoCategoria(p.categoria, filtros.categoria));
        }

        filtrados.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es"));

        listaFiltradaCategoriaRef.current = filtrados;
        const pagina = esNuevaCarga ? 1 : paginaActual + 1;
        const fin = pagina * ITEMS_POR_PAGINA;

        setProductos(filtrados.slice(0, fin));
        setPaginaActual(pagina);
        setHayMasPaginas(fin < filtrados.length);
        setUltimoDoc(null);
        setTotalProductos(filtrados.length);
        return;
      }

      listaFiltradaCategoriaRef.current = [];

      // Aplicar filtros si existen
      if (filtros?.proveedor && filtros.proveedor !== "") {
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockRepuestos`),
          where("proveedor", "==", filtros.proveedor),
          orderBy("codigo", "asc"),
          limit(ITEMS_POR_PAGINA)
        );
      }

      if (!esNuevaCarga && ultimoDoc) {
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockRepuestos`),
          orderBy("codigo", "asc"),
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
      stock: filtroStock,
      tiendaWeb: filtroTiendaWeb,
      stockMax: filtroStockMax,
    });
  };

  const aplicarPresetReposicion = (preset: "web0" | "web1" | "web_modulo") => {
    setFiltroTiendaWeb("en_web");
    setFiltroStockMax(preset === "web0" ? "0" : "1");
    if (preset === "web_modulo") {
      setFiltroBusqueda("modulo");
    }
  };

  const limpiarFiltrosReposicion = () => {
    setFiltroTiendaWeb("todos");
    setFiltroStockMax("");
    setFiltroBusqueda("");
  };

  const cargaCompletaActiva =
    !!filtroCategoria || filtroTiendaWeb !== "todos" || filtroStockMax !== "";

  const cargarMasProductos = () => {
    if (!hayMasPaginas || cargando) return;
    if (listaFiltradaCategoriaRef.current.length > 0 && cargaCompletaActiva) {
      const pagina = paginaActual + 1;
      const fin = pagina * ITEMS_POR_PAGINA;
      setProductos(listaFiltradaCategoriaRef.current.slice(0, fin));
      setPaginaActual(pagina);
      setHayMasPaginas(fin < listaFiltradaCategoriaRef.current.length);
      return;
    }
    cargarProductosPaginados(false);
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
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
      const matchCategoria = !filtroCategoria || mismoCategoria(p.categoria, filtroCategoria);
      
      // Filtro por stock
      const matchStock = filtroStock === "todos" || 
        (filtroStock === "disponible" && p.cantidad > (p.stockBajo ?? 3)) ||
        (filtroStock === "bajo" && p.cantidad > 0 && p.cantidad <= (p.stockBajo ?? 3)) ||
        (filtroStock === "agotado" && p.cantidad === 0);

      const matchWeb =
        filtroTiendaWeb === "todos" ||
        (filtroTiendaWeb === "en_web" && esPublicadoEnWeb(p)) ||
        (filtroTiendaWeb === "no_web" && !esPublicadoEnWeb(p));

      const stockMaxNum = filtroStockMax !== "" ? parseInt(filtroStockMax, 10) : null;
      const matchStockMax =
        stockMaxNum === null || (typeof p.cantidad === "number" && p.cantidad <= stockMaxNum);
      
      return matchBusqueda && matchProveedor && matchCategoria && matchStock && matchWeb && matchStockMax;
    });
  }, [productos, filtroBusqueda, filtroProveedor, filtroCategoria, filtroStock, filtroTiendaWeb, filtroStockMax]);

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
    fotosURLs: [],
    observacion: "",
  });
  const [porcentaje, setPorcentaje] = useState<number | "">("");
  const autoDesdePorcentaje = useRef(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [validandoCodigo, setValidandoCodigo] = useState(false);

  const validarCodigoEnStock = useCallback(async () => {
    const cod = normalizarCodigoRepuesto(formulario.codigo);
    if (!cod || !rol?.negocioID || !formulario.id) {
      setErrorCodigo(null);
      return;
    }

    setValidandoCodigo(true);
    try {
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));
      const items = snap.docs.map((d) => ({
        id: d.id,
        codigo: String(d.data().codigo ?? d.id).trim(),
      }));
      if (codigoRepuestoOcupado(items, cod, formulario.id)) {
        setErrorCodigo(mensajeCodigoDuplicado(cod));
      } else {
        setErrorCodigo(null);
      }
    } catch {
      setErrorCodigo(null);
    } finally {
      setValidandoCodigo(false);
    }
  }, [formulario.codigo, formulario.id, rol?.negocioID]);

  // FUNCIONES DEL MODAL
  const abrirModal = (producto: Producto) => {
    setProductoEditando(producto);
    const moneda = normalizarMoneda(producto.moneda);
    const costo = producto.precioCosto ?? 0;
    const p1 = producto.precio1 ?? 0;
    setFormulario({
      ...producto,
      moneda,
      precio1: p1,
      precio2: producto.precio2 ?? 0,
      precio3: producto.precio3 ?? 0,
      precio1Pesos: producto.precio1Pesos ?? 0,
      precio2Pesos: producto.precio2Pesos ?? 0,
      precio3Pesos: producto.precio3Pesos ?? 0,
      stockBajo: producto.stockBajo ?? 3,
      ...(() => {
        const fotos = normalizarFotosURLs(producto);
        return { fotosURLs: fotos, fotoURL: fotos[0] ?? "" };
      })(),
      observacion: producto.observacion ?? "",
    });
    if (costo > 0 && p1 > 0) {
      setPorcentaje(margenDesdePrecio(costo, p1) ?? "");
    } else {
      setPorcentaje("");
    }
    autoDesdePorcentaje.current = false;
    setErrorCodigo(null);
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
      fotosURLs: [],
      observacion: "",
    });
    setPorcentaje("");
    autoDesdePorcentaje.current = false;
    setErrorCodigo(null);
  };

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "codigo") {
      setErrorCodigo(null);
    }

    if (name === "porcentaje") {
      if (value === "") {
        setPorcentaje("");
        autoDesdePorcentaje.current = false;
        return;
      }
      const pct = parseFloat(value);
      if (Number.isNaN(pct)) return;
      setPorcentaje(pct);
      autoDesdePorcentaje.current = true;
      setFormulario((prev) => {
        const costo = Number(prev.precioCosto) || 0;
        if (costo <= 0) return prev;
        const p1 = precioDesdeMargen(costo, pct);
        return {
          ...prev,
          precio1: p1,
          precio1Pesos: pesosDesdeMoneda(p1, prev.moneda, cotizacionSegura),
        };
      });
      return;
    }

    const esNumero =
      name === "precioCosto" ||
      name === "precioCostoPesos" ||
      name === "cantidad" ||
      name === "stockBajo" ||
      name === "precio1" ||
      name === "precio2" ||
      name === "precio3" ||
      name === "precio1Pesos" ||
      name === "precio2Pesos" ||
      name === "precio3Pesos";

    if (name === "precioCosto") {
      const costo = parseFloat(value) || 0;
      setFormulario((prev) => {
        const next = { ...prev, precioCosto: costo };
        if (autoDesdePorcentaje.current && porcentaje !== "" && costo > 0) {
          const p1 = precioDesdeMargen(costo, Number(porcentaje));
          next.precio1 = p1;
          next.precio1Pesos = pesosDesdeMoneda(p1, prev.moneda, cotizacionSegura);
        }
        return next;
      });
      return;
    }

    if (name === "precio1") {
      const p1 = parseFloat(value) || 0;
      autoDesdePorcentaje.current = false;
      setFormulario((prev) => {
        const costo = Number(prev.precioCosto) || 0;
        if (costo > 0 && p1 > 0) {
          const m = margenDesdePrecio(costo, p1);
          if (m !== null) setPorcentaje(m);
        }
        return {
          ...prev,
          precio1: p1,
          precio1Pesos: pesosDesdeMoneda(p1, prev.moneda, cotizacionSegura),
        };
      });
      return;
    }

    setFormulario(prev => ({
      ...prev,
      [name]: esNumero ? parseFloat(value) || 0 : value,
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
  
      const cod = normalizarCodigoRepuesto(formulario.codigo);
      if (!cod) {
        alert("Ingresá un código para el producto.");
        setGuardando(false);
        return;
      }

      const snapCodigos = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));
      const itemsCodigo = snapCodigos.docs.map((d) => ({
        id: d.id,
        codigo: String(d.data().codigo ?? d.id).trim(),
      }));
      if (codigoRepuestoOcupado(itemsCodigo, cod, formulario.id)) {
        alert(mensajeCodigoDuplicado(cod));
        setGuardando(false);
        return;
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
        codigo: cod,
        categoria: formulario.categoria,
        categoriaKey: normalizarCategoriaKey(formulario.categoria),
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
        ...fotosParaFirestore(formulario.fotosURLs ?? normalizarFotosURLs(formulario)),
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
      setSeleccionados((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      refrescarProductos();
      onProductoActualizado?.();
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const imprimirEtiquetaProducto = async (p: Producto) => {
    if (!rol?.negocioID) return;
    try {
      await imprimirEtiquetaRepuesto(rol.negocioID, p.producto || p.codigo || "Repuesto");
    } catch (e) {
      console.error("[etiqueta repuesto]", e);
      alert(e instanceof Error ? e.message : "No se pudo imprimir la etiqueta.");
    }
  };

  const imprimirEtiquetasSeleccionadas = async () => {
    if (!rol?.negocioID || seleccionados.size === 0) return;
    const items = productosFiltrados.filter((p) => seleccionados.has(p.id));
    try {
      await imprimirEtiquetasRepuestos(rol.negocioID, items);
    } catch (e) {
      console.error("[etiquetas repuesto]", e);
      alert(e instanceof Error ? e.message : "No se pudieron imprimir las etiquetas.");
    }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodosVisibles = () => {
    setSeleccionados(new Set(productosFiltrados.map((p) => p.id)));
  };

  const limpiarSeleccion = () => setSeleccionados(new Set());

  const salirModoSeleccion = () => {
    setModoSeleccion(false);
    limpiarSeleccion();
    setModalEliminarMasivo(false);
    setModalAjustePrecios(false);
    setModalEdicionProducto(false);
  };

  const camposAjusteActivos = useMemo((): CampoPrecioAjuste[] => {
    const list: CampoPrecioAjuste[] = [];
    if (ajusteCampos.precioCosto) list.push("precioCosto");
    if (ajusteCampos.precio1) list.push("precio1");
    if (ajusteCampos.precio2) list.push("precio2");
    if (ajusteCampos.precio3) list.push("precio3");
    return list;
  }, [ajusteCampos]);

  const listarRepuestosParaAjuste = async (
    alcance: AlcanceAjustePrecio
  ): Promise<{ id: string; data: Record<string, unknown> }[]> => {
    if (!rol?.negocioID) return [];
    const colPath = `negocios/${rol.negocioID}/stockRepuestos`;

    if (alcance === "visiblesARS") {
      return productosFiltrados
        .filter((p) => normalizarMoneda(p.moneda) === "ARS")
        .map((p) => ({ id: p.id, data: p as unknown as Record<string, unknown> }));
    }

    if (alcance === "seleccionados") {
      const out: { id: string; data: Record<string, unknown> }[] = [];
      for (const id of Array.from(seleccionados)) {
        const snap = await getDoc(doc(db, colPath, id));
        if (snap.exists()) {
          const data = snap.data();
          if (esRepuestoARS(data)) out.push({ id: snap.id, data });
        }
      }
      return out;
    }

    const snap = await getDocs(collection(db, colPath));
    return snap.docs
      .filter((d) => esRepuestoARS(d.data()))
      .map((d) => ({ id: d.id, data: d.data() }));
  };

  const actualizarPreviewAjuste = async () => {
    setCargandoPreviewAjuste(true);
    try {
      const items = await listarRepuestosParaAjuste(ajusteAlcance);
      const pct = parseFloat(ajustePorcentaje);
      let ejemplo: string | null = null;

      if (camposAjusteActivos.length > 0 && Number.isFinite(pct)) {
        for (const item of items) {
          for (const campo of camposAjusteActivos) {
            const v = Number(item.data[campo]) || 0;
            if (v > 0) {
              const ex = ejemploAjuste(v, pct);
              if (ex) {
                const label =
                  campo === "precioCosto"
                    ? "Costo"
                    : campo === "precio1"
                      ? "Precio 1"
                      : campo === "precio2"
                        ? "Precio 2"
                        : "Precio 3";
                ejemplo = `${label}: $${ex.antes.toLocaleString("es-AR")} → $${ex.despues.toLocaleString("es-AR")}`;
                break;
              }
            }
          }
          if (ejemplo) break;
        }
      }

      setPreviewAjuste({ total: items.length, ejemplo });
    } catch (e) {
      console.error(e);
      setPreviewAjuste({ total: 0, ejemplo: null });
    } finally {
      setCargandoPreviewAjuste(false);
    }
  };

  const confirmarAjustePrecios = async () => {
    const pct = parseFloat(ajustePorcentaje);
    if (!Number.isFinite(pct) || pct === 0) {
      alert("Ingresá un porcentaje distinto de cero (ej: 10 o -5).");
      return;
    }
    if (camposAjusteActivos.length === 0) {
      alert("Elegí al menos un campo a ajustar.");
      return;
    }
    if (!rol?.negocioID) return;

    setAplicandoAjuste(true);
    try {
      const items = await listarRepuestosParaAjuste(ajusteAlcance);
      if (items.length === 0) {
        alert("No hay repuestos en ARS para ajustar con ese alcance.");
        return;
      }

      const CHUNK = 450;
      let actualizados = 0;

      for (let i = 0; i < items.length; i += CHUNK) {
        const batch = writeBatch(db);
        let ops = 0;
        for (const item of items.slice(i, i + CHUNK)) {
          const patch = patchAjustePrecioARS(item.data, pct, camposAjusteActivos);
          if (Object.keys(patch).length === 0) continue;
          batch.update(doc(db, `negocios/${rol.negocioID}/stockRepuestos`, item.id), patch);
          ops++;
        }
        if (ops > 0) {
          await batch.commit();
          actualizados += ops;
        }
      }

      setModalAjustePrecios(false);
      await refrescarProductos();
      onProductoActualizado?.();
      alert(
        actualizados > 0
          ? `✅ Precios actualizados en ${actualizados} repuesto(s) en ARS (${pct > 0 ? "+" : ""}${pct}%).`
          : "No había precios > 0 en los campos elegidos para actualizar."
      );
    } catch (error) {
      console.error("Error al ajustar precios:", error);
      alert("No se pudieron actualizar los precios. Revisá la consola e intentá de nuevo.");
    } finally {
      setAplicandoAjuste(false);
    }
  };

  useEffect(() => {
    if (!modalAjustePrecios) return;
    void actualizarPreviewAjuste();
  }, [
    modalAjustePrecios,
    ajusteAlcance,
    ajustePorcentaje,
    ajusteCampos,
    seleccionados,
    productosFiltrados,
  ]);

  const seleccionarTodoElStock = async () => {
    if (!rol?.negocioID) return;
    setCargandoIdsTotales(true);
    try {
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));
      setSeleccionados(new Set(snap.docs.map((d) => d.id)));
      if (!modoSeleccion) setModoSeleccion(true);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la lista completa del stock.");
    } finally {
      setCargandoIdsTotales(false);
    }
  };

  const confirmarEliminacionMasiva = async () => {
    const ids = Array.from(seleccionados);
    if (!rol?.negocioID || ids.length === 0) return;

    setEliminandoMasivo(true);
    try {
      const CHUNK = 450;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const batch = writeBatch(db);
        for (const id of ids.slice(i, i + CHUNK)) {
          batch.delete(doc(db, `negocios/${rol.negocioID}/stockRepuestos`, id));
        }
        await batch.commit();
      }
      setModalEliminarMasivo(false);
      salirModoSeleccion();
      await refrescarProductos();
      onProductoActualizado?.();
    } catch (error) {
      console.error("Error al eliminar en lote:", error);
      alert("No se pudieron eliminar todos los productos. Revisá la consola e intentá de nuevo.");
    } finally {
      setEliminandoMasivo(false);
    }
  };

  const productosSeleccionados = useMemo(
    () => productos.filter((p) => seleccionados.has(p.id)),
    [productos, seleccionados]
  );

  const previewEdicionProducto = useMemo(() => {
    const ejemplo = productosSeleccionados[0] ?? null;
    if (!ejemplo) return null;
    return ejemploEdicionProducto(ejemplo.producto, edicionProductoTexto, edicionProductoModo);
  }, [productosSeleccionados, edicionProductoTexto, edicionProductoModo]);

  const previewEdicionCategoria = useMemo(() => {
    const ejemplo = productosSeleccionados[0] ?? null;
    const nueva = edicionCategoriaTexto.trim();
    if (!ejemplo || !nueva) return null;
    return {
      antes: ejemplo.categoria?.trim() || "—",
      despues: nueva,
    };
  }, [productosSeleccionados, edicionCategoriaTexto]);

  const previewEdicionProveedor = useMemo(() => {
    const ejemplo = productosSeleccionados[0] ?? null;
    const nuevo = edicionProveedorTexto.trim();
    if (!ejemplo || !nuevo) return null;
    return {
      antes: ejemplo.proveedor?.trim() || "—",
      despues: nuevo,
    };
  }, [productosSeleccionados, edicionProveedorTexto]);

  const listarSeleccionadosParaEdicionProducto = async (): Promise<
    { id: string; producto: string }[]
  > => {
    if (!rol?.negocioID) return [];
    const colPath = `negocios/${rol.negocioID}/stockRepuestos`;
    const out: { id: string; producto: string }[] = [];
    for (const id of Array.from(seleccionados)) {
      const snap = await getDoc(doc(db, colPath, id));
      if (snap.exists()) {
        out.push({ id: snap.id, producto: String(snap.data().producto ?? "") });
      }
    }
    return out;
  };

  const confirmarEdicionProductoMasiva = async () => {
    const texto = edicionProductoTexto.trim();
    if (!texto) {
      alert("Escribí el texto que querés agregar.");
      return;
    }
    if (!rol?.negocioID || seleccionados.size === 0) return;

    setAplicandoEdicionProducto(true);
    try {
      const items = await listarSeleccionadosParaEdicionProducto();
      if (items.length === 0) {
        alert("No se encontraron los repuestos seleccionados.");
        return;
      }

      const CHUNK = 450;
      let actualizados = 0;

      for (let i = 0; i < items.length; i += CHUNK) {
        const batch = writeBatch(db);
        let ops = 0;
        for (const item of items.slice(i, i + CHUNK)) {
          const nuevo = aplicarTextoProducto(item.producto, texto, edicionProductoModo);
          if (nuevo === item.producto) continue;
          batch.update(doc(db, `negocios/${rol.negocioID}/stockRepuestos`, item.id), {
            producto: nuevo,
          });
          ops++;
        }
        if (ops > 0) {
          await batch.commit();
          actualizados += ops;
        }
      }

      setModalEdicionProducto(false);
      setEdicionProductoTexto("");
      await refrescarProductos();
      onProductoActualizado?.();
      alert(
        actualizados > 0
          ? `✅ Nombre actualizado en ${actualizados} repuesto(s).`
          : "No hubo cambios (el texto ya estaba aplicado o los nombres quedaron igual)."
      );
    } catch (error) {
      console.error("Error al editar productos en lote:", error);
      alert("No se pudieron actualizar los nombres. Revisá la consola e intentá de nuevo.");
    } finally {
      setAplicandoEdicionProducto(false);
    }
  };

  const confirmarEdicionCategoriaMasiva = async () => {
    const categoria = edicionCategoriaTexto.trim();
    if (!categoria) {
      alert("Escribí la categoría.");
      return;
    }
    if (!rol?.negocioID || seleccionados.size === 0) return;

    setAplicandoEdicionCategoria(true);
    try {
      const ids = Array.from(seleccionados);
      const categoriaKey = normalizarCategoriaKey(categoria);
      const CHUNK = 450;
      let actualizados = 0;

      for (let i = 0; i < ids.length; i += CHUNK) {
        const batch = writeBatch(db);
        let ops = 0;
        for (const id of ids.slice(i, i + CHUNK)) {
          batch.update(doc(db, `negocios/${rol.negocioID}/stockRepuestos`, id), {
            categoria,
            categoriaKey,
          });
          ops++;
        }
        if (ops > 0) {
          await batch.commit();
          actualizados += ops;
        }
      }

      setModalEdicionCategoria(false);
      setEdicionCategoriaTexto("");
      await refrescarProductos();
      void cargarOpcionesFiltro();
      onProductoActualizado?.();
      alert(`✅ Categoría actualizada en ${actualizados} repuesto(s).`);
    } catch (error) {
      console.error("Error al editar categorías en lote:", error);
      alert("No se pudieron actualizar las categorías. Revisá la consola e intentá de nuevo.");
    } finally {
      setAplicandoEdicionCategoria(false);
    }
  };

  const confirmarEdicionProveedorMasiva = async () => {
    const proveedor = edicionProveedorTexto.trim();
    if (!proveedor) {
      alert("Escribí el proveedor.");
      return;
    }
    if (!rol?.negocioID || seleccionados.size === 0) return;

    setAplicandoEdicionProveedor(true);
    try {
      const ids = Array.from(seleccionados);
      const CHUNK = 450;
      let actualizados = 0;

      for (let i = 0; i < ids.length; i += CHUNK) {
        const batch = writeBatch(db);
        let ops = 0;
        for (const id of ids.slice(i, i + CHUNK)) {
          batch.update(doc(db, `negocios/${rol.negocioID}/stockRepuestos`, id), {
            proveedor,
          });
          ops++;
        }
        if (ops > 0) {
          await batch.commit();
          actualizados += ops;
        }
      }

      setModalEdicionProveedor(false);
      setEdicionProveedorTexto("");
      await refrescarProductos();
      void cargarOpcionesFiltro();
      onProductoActualizado?.();
      alert(`✅ Proveedor actualizado en ${actualizados} repuesto(s).`);
    } catch (error) {
      console.error("Error al editar proveedores en lote:", error);
      alert("No se pudieron actualizar los proveedores. Revisá la consola e intentá de nuevo.");
    } finally {
      setAplicandoEdicionProveedor(false);
    }
  };

  const aplicarCostoDesdeCalculadora = (usd: number) => {
    setFormulario((prev) => {
      const next = { ...prev, precioCosto: usd };
      next.precioCostoPesos = pesosDesdeMoneda(usd, prev.moneda, cotizacionSegura);
      if (autoDesdePorcentaje.current && porcentaje !== "" && usd > 0) {
        const p1 = precioDesdeMargen(usd, Number(porcentaje));
        next.precio1 = p1;
        next.precio1Pesos = pesosDesdeMoneda(p1, prev.moneda, cotizacionSegura);
      }
      return next;
    });
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
      void cargarOpcionesFiltro();
    }
  }, [rol?.negocioID, refrescar]);

  useEffect(() => {
    if (rol?.negocioID) {
      const timer = setTimeout(() => {
        cargarProductosPaginados(true, {
          proveedor: filtroProveedor,
          categoria: filtroCategoria,
          stock: filtroStock,
          tiendaWeb: filtroTiendaWeb,
          stockMax: filtroStockMax,
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [filtroProveedor, filtroCategoria, filtroTiendaWeb, filtroStockMax]);

  return (
    <div className="space-y-6">
      {/* 🆕 HEADER CON FILTROS Y COTIZACIÓN MEJORADO */}
      <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-3 lg:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 mb-3">
          
          {/* Filtros principales */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              
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

              {/* Filtro Tienda Web */}
              <div>
                <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#8e44ad] rounded-full flex items-center justify-center text-white text-xs">🌐</span>
                  Tienda web:
                </label>
                <select
                  value={filtroTiendaWeb}
                  onChange={(e) => setFiltroTiendaWeb(e.target.value as "todos" | "en_web" | "no_web")}
                  className="w-full p-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#8e44ad] focus:border-[#8e44ad] transition-all text-[#2c3e50] text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="en_web">Publicados en web</option>
                  <option value="no_web">No publicados</option>
                </select>
              </div>

              {/* Filtro stock máximo (para saber qué pedir) */}
              <div>
                <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#e74c3c] rounded-full flex items-center justify-center text-white text-xs">📦</span>
                  Stock hasta:
                </label>
                <select
                  value={filtroStockMax}
                  onChange={(e) => setFiltroStockMax(e.target.value as "" | "0" | "1" | "2" | "3" | "5")}
                  className="w-full p-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-[#2c3e50] text-sm"
                >
                  <option value="">Sin límite</option>
                  <option value="0">0 (agotado)</option>
                  <option value="1">1 o menos</option>
                  <option value="2">2 o menos</option>
                  <option value="3">3 o menos</option>
                  <option value="5">5 o menos</option>
                </select>
              </div>
            </div>

            {/* Atajos para reposición */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#7f8c8d]">Qué pedir:</span>
              <button
                type="button"
                onClick={() => aplicarPresetReposicion("web0")}
                className="text-xs px-3 py-1.5 rounded-full bg-[#fdebd0] text-[#d68910] border border-[#f5cba7] hover:bg-[#fad7a0] font-medium"
              >
                🌐 Web + stock 0
              </button>
              <button
                type="button"
                onClick={() => aplicarPresetReposicion("web1")}
                className="text-xs px-3 py-1.5 rounded-full bg-[#fdebd0] text-[#d68910] border border-[#f5cba7] hover:bg-[#fad7a0] font-medium"
              >
                🌐 Web + stock ≤1
              </button>
              <button
                type="button"
                onClick={() => aplicarPresetReposicion("web_modulo")}
                className="text-xs px-3 py-1.5 rounded-full bg-[#e8f8f5] text-[#1e8449] border border-[#a9dfbf] hover:bg-[#d5f5e3] font-medium"
              >
                📱 Módulos web bajo stock
              </button>
              {(filtroTiendaWeb !== "todos" || filtroStockMax !== "" || filtroBusqueda) && (
                <button
                  type="button"
                  onClick={limpiarFiltrosReposicion}
                  className="text-xs px-3 py-1.5 rounded-full bg-[#ecf0f1] text-[#7f8c8d] hover:bg-[#d5dbdb] font-medium"
                >
                  Limpiar atajos
                </button>
              )}
              {(filtroTiendaWeb === "en_web" && filtroStockMax !== "") && (
                <span className="text-xs text-[#e74c3c] font-semibold ml-1">
                  {productosFiltrados.length} ítem{productosFiltrados.length !== 1 ? "s" : ""} a revisar
                </span>
              )}
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
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
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
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (modoSeleccion && seleccionados.size === 0) {
                    setAjusteAlcance("todosARS");
                  } else if (seleccionados.size > 0) {
                    setAjusteAlcance("seleccionados");
                  }
                  setModalAjustePrecios(true);
                }}
                className="rounded-lg bg-[#f39c12] px-3 py-2 text-xs font-bold text-white shadow hover:bg-[#e67e22] sm:text-sm"
              >
                📈 Ajustar %
              </button>
              <button
                type="button"
                onClick={() => (modoSeleccion ? salirModoSeleccion() : setModoSeleccion(true))}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm ${
                  modoSeleccion
                    ? "bg-white/20 text-white ring-2 ring-white/40"
                    : "bg-white text-[#2c3e50] hover:bg-blue-50"
                }`}
              >
                {modoSeleccion ? "✕ Salir selección" : "☑️ Seleccionar varios"}
              </button>
            </div>
          </div>
        </div>

        {modoSeleccion && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#3498db]/30 bg-[#ebf5fb] px-3 py-2.5 sm:px-4">
            <span className="text-sm font-semibold text-[#2c3e50]">
              {seleccionados.size} seleccionado{seleccionados.size === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={seleccionarTodosVisibles}
              disabled={productosFiltrados.length === 0}
              className="rounded-lg border border-[#3498db] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2980b9] hover:bg-[#ebf5fb] disabled:opacity-40"
            >
              Todos visibles ({productosFiltrados.length})
            </button>
            <button
              type="button"
              onClick={() => void seleccionarTodoElStock()}
              disabled={cargandoIdsTotales || totalProductos === 0}
              className="rounded-lg border border-[#9b59b6] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#8e44ad] hover:bg-purple-50 disabled:opacity-40"
            >
              {cargandoIdsTotales ? "Cargando…" : `Todo el stock (${totalProductos})`}
            </button>
            <button
              type="button"
              onClick={limpiarSeleccion}
              disabled={seleccionados.size === 0}
              className="rounded-lg border border-[#bdc3c7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#7f8c8d] hover:bg-neutral-50 disabled:opacity-40"
            >
              Ninguno
            </button>
            <button
              type="button"
              onClick={() => void imprimirEtiquetasSeleccionadas()}
              disabled={seleccionados.size === 0}
              className="rounded-lg border border-[#e67e22] bg-[#fdebd0] px-2.5 py-1.5 text-xs font-semibold text-[#d35400] hover:bg-[#fad7a0] disabled:opacity-40"
            >
              🏷️ Imprimir etiquetas
            </button>
            <button
              type="button"
              onClick={() => {
                setEdicionProductoModo("prepend");
                setEdicionProductoTexto("");
                setModalEdicionProducto(true);
              }}
              disabled={seleccionados.size === 0}
              className="rounded-lg border border-[#3498db] bg-[#ebf5fb] px-2.5 py-1.5 text-xs font-semibold text-[#2980b9] hover:bg-[#d6eaf8] disabled:opacity-40"
            >
              ✏️ Editar producto
            </button>
            <button
              type="button"
              onClick={() => {
                setEdicionCategoriaTexto("");
                setModalEdicionCategoria(true);
              }}
              disabled={seleccionados.size === 0}
              className="rounded-lg border border-[#27ae60] bg-[#d5f4e6] px-2.5 py-1.5 text-xs font-semibold text-[#229954] hover:bg-[#c3f0ca] disabled:opacity-40"
            >
              📂 Editar categoría
            </button>
            <button
              type="button"
              onClick={() => {
                setEdicionProveedorTexto("");
                setModalEdicionProveedor(true);
              }}
              disabled={seleccionados.size === 0}
              className="rounded-lg border border-[#9b59b6] bg-[#f4ecf7] px-2.5 py-1.5 text-xs font-semibold text-[#7d3c98] hover:bg-[#ebdef0] disabled:opacity-40"
            >
              🏢 Editar proveedor
            </button>
            <button
              type="button"
              onClick={() => {
                setAjusteAlcance("seleccionados");
                setModalAjustePrecios(true);
              }}
              disabled={seleccionados.size === 0}
              className="rounded-lg border border-[#f39c12] bg-[#fef5e7] px-2.5 py-1.5 text-xs font-semibold text-[#d68910] hover:bg-[#fdebd0] disabled:opacity-40"
            >
              📈 Ajustar % selección
            </button>
            <button
              type="button"
              onClick={() => setModalEliminarMasivo(true)}
              disabled={seleccionados.size === 0 || eliminandoMasivo}
              className="ml-auto rounded-lg bg-[#e74c3c] px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-[#c0392b] disabled:opacity-40 sm:text-sm"
            >
              🗑️ Eliminar seleccionados
            </button>
          </div>
        )}

        {/* Tabla responsive */}
        <div className="w-full">
          <table className="w-full border-collapse table-fixed text-xs">
            <thead className="bg-[#ecf0f1]">
              <tr>
                {modoSeleccion && (
                  <th className="w-9 p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    ☑️
                  </th>
                )}
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
                  <td colSpan={modoSeleccion ? 12 : 11} className="p-8 text-center text-[#7f8c8d] border border-[#bdc3c7]">
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
                  const marcado = seleccionados.has(p.id);
                  
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                        marcado
                          ? "bg-[#fdebd0] ring-1 ring-inset ring-[#f39c12]"
                          : (p.cantidad || 0) === 0
                          ? "bg-red-50"
                          : (p.cantidad || 0) <= (p.stockBajo ?? 3)
                          ? "bg-yellow-50"
                          : isEven ? "bg-white" : "bg-[#f8f9fa]"
                      }`}
                    >
                      {modoSeleccion && (
                        <td className="p-1 text-center align-middle border border-[#bdc3c7]">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => toggleSeleccion(p.id)}
                            aria-label={`Seleccionar ${p.producto || p.codigo}`}
                            className="h-4 w-4 rounded border-[#bdc3c7] text-[#3498db] focus:ring-[#3498db]"
                          />
                        </td>
                      )}
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

                      {/* Foto (portada = primera de la galería) */}
                      <td className="p-1 text-center align-middle border border-[#bdc3c7]">
                        {(() => {
                          const urlPortada = normalizarFotosURLs(p)[0];
                          return urlPortada ? (
                          <img
                            src={urlPortada}
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
                        );
                        })()}
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
                            type="button"
                            onClick={() => void imprimirEtiquetaProducto(p)}
                            className="inline-flex items-center justify-center rounded bg-[#e67e22] hover:bg-[#d35400] text-white p-1.5 transition-all duration-200"
                            title="Imprimir etiqueta"
                          >
                            <Tag className="h-4 w-4" aria-hidden />
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
                    onBlur={() => void validarCodigoEnStock()}
                    className={`w-full p-2 sm:p-3 border-2 rounded-xl focus:ring-4 transition-all duration-300 text-[#2c3e50] bg-white shadow-sm text-sm ${
                      errorCodigo
                        ? "border-[#e74c3c] focus:ring-[#e74c3c]/20 focus:border-[#e74c3c]"
                        : "border-[#bdc3c7] focus:ring-[#3498db]/20 focus:border-[#3498db]"
                    }`}
                  />
                  {validandoCodigo && (
                    <p className="text-xs text-[#7f8c8d]">Verificando código…</p>
                  )}
                  {errorCodigo && (
                    <p className="text-xs text-[#c0392b] font-medium">{errorCodigo}</p>
                  )}
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

                {/* Moneda + margen + calculadora USD */}
                <div className="space-y-2 md:col-span-2">
                  <div
                    className={`grid gap-2 ${
                      formulario.moneda === "USD"
                        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                        : "grid-cols-1 sm:grid-cols-2"
                    }`}
                  >
                    <div className="space-y-2 min-w-0">
                      <label className="block text-xs font-semibold text-[#2c3e50]">💱 Moneda</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => manejarCambioMoneda("ARS")}
                          className={`flex-1 rounded-lg border-2 px-2 py-2 text-xs font-semibold transition ${
                            formulario.moneda === "ARS"
                              ? "border-[#27ae60] bg-[#eafaf1] text-[#1e8449]"
                              : "border-[#bdc3c7] bg-white text-[#7f8c8d]"
                          }`}
                        >
                          ARS
                        </button>
                        <button
                          type="button"
                          onClick={() => manejarCambioMoneda("USD")}
                          className={`flex-1 rounded-lg border-2 px-2 py-2 text-xs font-semibold transition ${
                            formulario.moneda === "USD"
                              ? "border-[#3498db] bg-[#ebf5fb] text-[#2471a3]"
                              : "border-[#bdc3c7] bg-white text-[#7f8c8d]"
                          }`}
                        >
                          USD
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <label className="block text-xs font-semibold text-[#2c3e50] truncate">
                        📈 Margen %
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="porcentaje"
                          value={porcentaje}
                          onChange={manejarCambio}
                          step="0.1"
                          placeholder="50"
                          className="w-full p-2 pr-7 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm text-[#2c3e50] placeholder:text-[#7f8c8d] [color-scheme:light] focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#7f8c8d] font-semibold">
                          %
                        </span>
                      </div>
                    </div>
                    {formulario.moneda === "USD" && (
                      <CalculadoraCostoUsd
                        compact
                        cotizacionSistema={cotizacionSegura}
                        onAplicarCosto={aplicarCostoDesdeCalculadora}
                      />
                    )}
                  </div>
                  {formulario.moneda === "USD" ? (
                    <p className="text-[11px] text-[#7f8c8d]">
                      ARS ÷ cotización = costo USD. Botón → copia al precio de costo.
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#7f8c8d]">
                      Margen % sobre el costo → Precio 1.
                    </p>
                  )}
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

                {/* Fotos catálogo */}
                <div className="md:col-span-2">
                  {rol?.negocioID && formulario.id ? (
                    <CampoFotoRepuesto
                      negocioID={rol.negocioID}
                      productoId={formulario.id}
                      fotosURLs={formulario.fotosURLs ?? normalizarFotosURLs(formulario)}
                      onChange={(urls) =>
                        setFormulario((prev) => ({
                          ...prev,
                          fotosURLs: urls,
                          fotoURL: urls[0] ?? "",
                        }))
                      }
                    />
                  ) : (
                    <p className="rounded-xl border-2 border-[#9b59b6]/30 bg-white p-3 text-xs text-[#7f8c8d]">
                      Guardá el producto primero para poder subir fotos desde la tabla.
                    </p>
                  )}
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
              <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-[#ecf0f1]">
                {formulario.producto?.trim() ? (
                  <button
                    type="button"
                    onClick={() =>
                      void imprimirEtiquetaProducto({
                        ...formulario,
                        id: formulario.id || "",
                      } as Producto)
                    }
                    disabled={guardando}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-[#e67e22] hover:bg-[#d35400] text-white rounded-lg font-medium transition-all duration-200 shadow-md disabled:opacity-50 text-sm flex items-center gap-2"
                  >
                    <Tag className="h-4 w-4" aria-hidden />
                    Imprimir etiqueta
                  </button>
                ) : null}
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
                  disabled={guardando || !formulario.producto || formulario.precioCosto <= 0 || Boolean(errorCodigo) || validandoCodigo}
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
        modalAjustePrecios &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-ajuste-precios-titulo"
          >
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={() => !aplicandoAjuste && setModalAjustePrecios(false)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-lg rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl">
                <div className="rounded-t-2xl bg-gradient-to-r from-[#f39c12] to-[#e67e22] p-4 text-white sm:p-6">
                  <h2 id="modal-ajuste-precios-titulo" className="text-lg font-bold sm:text-xl">
                    Ajustar precios en ARS
                  </h2>
                  <p className="text-sm text-orange-100">
                    Subí o bajá un % sobre costo y listas (solo moneda ARS)
                  </p>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#2c3e50]">Alcance</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {(
                        [
                          ["seleccionados", `Seleccionados (${seleccionados.size})`],
                          ["visiblesARS", `Visibles ARS (${productosFiltrados.filter((p) => normalizarMoneda(p.moneda) === "ARS").length})`],
                          ["todosARS", "Todos en ARS del stock"],
                        ] as const
                      ).map(([valor, label]) => (
                        <label
                          key={valor}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium ${
                            ajusteAlcance === valor
                              ? "border-[#f39c12] bg-[#fef5e7] text-[#d68910]"
                              : "border-[#bdc3c7] bg-white text-[#7f8c8d]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="alcanceAjuste"
                            checked={ajusteAlcance === valor}
                            onChange={() => setAjusteAlcance(valor)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#2c3e50]">
                      Porcentaje (+ sube / − baja)
                    </label>
                    <div className="relative max-w-[140px]">
                      <input
                        type="number"
                        value={ajustePorcentaje}
                        onChange={(e) => setAjustePorcentaje(e.target.value)}
                        step="0.1"
                        placeholder="10"
                        className="w-full rounded-lg border-2 border-[#bdc3c7] p-2 pr-7 text-sm focus:border-[#f39c12] focus:ring-2 focus:ring-[#f39c12]/20"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#7f8c8d]">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-[#2c3e50]">
                      Campos a ajustar
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {(
                        [
                          ["precioCosto", "Precio costo"],
                          ["precio1", "Precio 1"],
                          ["precio2", "Precio 2"],
                          ["precio3", "Precio 3"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex cursor-pointer items-center gap-1.5 text-sm text-[#2c3e50]">
                          <input
                            type="checkbox"
                            checked={ajusteCampos[key]}
                            onChange={(e) =>
                              setAjusteCampos((prev) => ({ ...prev, [key]: e.target.checked }))
                            }
                            className="h-4 w-4 rounded border-[#bdc3c7] text-[#f39c12] focus:ring-[#f39c12]"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-[#7f8c8d]">
                      Ítems con precio 0 en ese campo se omiten.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#f39c12]/40 bg-[#fef9f0] p-3 text-sm text-[#2c3e50]">
                    {cargandoPreviewAjuste ? (
                      <span className="text-[#7f8c8d]">Calculando vista previa…</span>
                    ) : (
                      <>
                        <p>
                          Se actualizarán{" "}
                          <strong>{previewAjuste.total}</strong> repuesto
                          {previewAjuste.total === 1 ? "" : "s"} en <strong>ARS</strong>.
                        </p>
                        {previewAjuste.ejemplo && (
                          <p className="mt-1 text-xs text-[#7f8c8d]">
                            Ejemplo: {previewAjuste.ejemplo}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={aplicandoAjuste}
                      onClick={() => setModalAjustePrecios(false)}
                      className="rounded-lg bg-[#7f8c8d] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={aplicandoAjuste || cargandoPreviewAjuste || previewAjuste.total === 0}
                      onClick={() => void confirmarAjustePrecios()}
                      className="rounded-lg bg-[#f39c12] px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#e67e22] disabled:opacity-50"
                    >
                      {aplicandoAjuste ? "Aplicando…" : "Aplicar ajuste"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        modalEdicionProducto &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-edicion-producto-titulo"
          >
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={() => !aplicandoEdicionProducto && setModalEdicionProducto(false)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-lg rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl">
                <div className="rounded-t-2xl bg-gradient-to-r from-[#3498db] to-[#2980b9] p-4 text-white sm:p-6">
                  <h2 id="modal-edicion-producto-titulo" className="text-lg font-bold sm:text-xl">
                    Edición masiva — campo Producto
                  </h2>
                  <p className="text-sm text-blue-100">
                    {seleccionados.size} repuesto{seleccionados.size === 1 ? "" : "s"} seleccionado
                    {seleccionados.size === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#2c3e50]">
                      Texto a agregar
                    </label>
                    <input
                      type="text"
                      value={edicionProductoTexto}
                      onChange={(e) => setEdicionProductoTexto(e.target.value)}
                      placeholder="Ej: OLED, Premium, iPhone 14…"
                      autoFocus
                      className="w-full rounded-lg border-2 border-[#bdc3c7] p-2.5 text-sm focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-[#2c3e50]">
                      Dónde agregarlo
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {(
                        [
                          ["prepend", "Al inicio (antes del nombre actual)"],
                          ["append", "Al final (después del nombre actual)"],
                        ] as const
                      ).map(([valor, label]) => (
                        <label
                          key={valor}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium ${
                            edicionProductoModo === valor
                              ? "border-[#3498db] bg-[#ebf5fb] text-[#2980b9]"
                              : "border-[#bdc3c7] bg-white text-[#7f8c8d]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="modoEdicionProducto"
                            checked={edicionProductoModo === valor}
                            onChange={() => setEdicionProductoModo(valor)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-[#7f8c8d]">
                      No borra ni reemplaza el texto existente: solo agrega la palabra o frase que escribas.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#3498db]/40 bg-[#ebf5fb] p-3 text-sm text-[#2c3e50]">
                    {previewEdicionProducto ? (
                      <>
                        <p className="text-xs font-semibold text-[#2980b9]">Vista previa (1er seleccionado visible)</p>
                        <p className="mt-1 text-xs text-[#7f8c8d] line-through">{previewEdicionProducto.antes}</p>
                        <p className="mt-0.5 font-medium">{previewEdicionProducto.despues}</p>
                      </>
                    ) : (
                      <span className="text-[#7f8c8d]">
                        {edicionProductoTexto.trim()
                          ? "Seleccioná al menos un repuesto visible para ver la vista previa."
                          : "Escribí el texto para ver cómo quedaría."}
                      </span>
                    )}
                    {seleccionados.size > productosSeleccionados.length && (
                      <p className="mt-2 text-[11px] text-[#7f8c8d]">
                        Incluye {seleccionados.size - productosSeleccionados.length} seleccionado
                        {seleccionados.size - productosSeleccionados.length === 1 ? "" : "s"} que no están en pantalla.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={aplicandoEdicionProducto}
                      onClick={() => setModalEdicionProducto(false)}
                      className="rounded-lg bg-[#7f8c8d] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={aplicandoEdicionProducto || !edicionProductoTexto.trim()}
                      onClick={() => void confirmarEdicionProductoMasiva()}
                      className="rounded-lg bg-[#3498db] px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#2980b9] disabled:opacity-50"
                    >
                      {aplicandoEdicionProducto ? "Aplicando…" : `Aplicar a ${seleccionados.size}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        modalEdicionCategoria &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-edicion-categoria-titulo"
          >
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={() => !aplicandoEdicionCategoria && setModalEdicionCategoria(false)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-lg rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl">
                <div className="rounded-t-2xl bg-gradient-to-r from-[#27ae60] to-[#229954] p-4 text-white sm:p-6">
                  <h2 id="modal-edicion-categoria-titulo" className="text-lg font-bold sm:text-xl">
                    Edición masiva — Categoría
                  </h2>
                  <p className="text-sm text-green-100">
                    {seleccionados.size} repuesto{seleccionados.size === 1 ? "" : "s"} seleccionado
                    {seleccionados.size === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#2c3e50]">
                      Nueva categoría
                    </label>
                    <input
                      type="text"
                      list="categorias-masiva-repuestos"
                      value={edicionCategoriaTexto}
                      onChange={(e) => setEdicionCategoriaTexto(e.target.value)}
                      placeholder="Ej: Pantallas, Baterías, Flex…"
                      autoFocus
                      className="w-full rounded-lg border-2 border-[#bdc3c7] p-2.5 text-sm focus:border-[#27ae60] focus:ring-2 focus:ring-[#27ae60]/20"
                    />
                    <datalist id="categorias-masiva-repuestos">
                      {categoriasUnicas.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <p className="mt-2 text-[11px] text-[#7f8c8d]">
                      Reemplaza la categoría de todos los seleccionados. Podés elegir una existente o escribir una nueva.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#27ae60]/40 bg-[#d5f4e6] p-3 text-sm text-[#2c3e50]">
                    {previewEdicionCategoria ? (
                      <>
                        <p className="text-xs font-semibold text-[#229954]">
                          Vista previa (1er seleccionado visible)
                        </p>
                        <p className="mt-1 text-xs text-[#7f8c8d] line-through">
                          {previewEdicionCategoria.antes}
                        </p>
                        <p className="mt-0.5 font-medium">{previewEdicionCategoria.despues}</p>
                      </>
                    ) : (
                      <span className="text-[#7f8c8d]">
                        {edicionCategoriaTexto.trim()
                          ? "Seleccioná al menos un repuesto visible para ver la vista previa."
                          : "Escribí la categoría para ver cómo quedaría."}
                      </span>
                    )}
                    {seleccionados.size > productosSeleccionados.length && (
                      <p className="mt-2 text-[11px] text-[#7f8c8d]">
                        Incluye {seleccionados.size - productosSeleccionados.length} seleccionado
                        {seleccionados.size - productosSeleccionados.length === 1 ? "" : "s"} que no están en pantalla.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={aplicandoEdicionCategoria}
                      onClick={() => setModalEdicionCategoria(false)}
                      className="rounded-lg bg-[#7f8c8d] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={aplicandoEdicionCategoria || !edicionCategoriaTexto.trim()}
                      onClick={() => void confirmarEdicionCategoriaMasiva()}
                      className="rounded-lg bg-[#27ae60] px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#229954] disabled:opacity-50"
                    >
                      {aplicandoEdicionCategoria ? "Aplicando…" : `Aplicar a ${seleccionados.size}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        modalEdicionProveedor &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-edicion-proveedor-titulo"
          >
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={() => !aplicandoEdicionProveedor && setModalEdicionProveedor(false)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-lg rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl">
                <div className="rounded-t-2xl bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-4 text-white sm:p-6">
                  <h2 id="modal-edicion-proveedor-titulo" className="text-lg font-bold sm:text-xl">
                    Edición masiva — Proveedor
                  </h2>
                  <p className="text-sm text-purple-100">
                    {seleccionados.size} repuesto{seleccionados.size === 1 ? "" : "s"} seleccionado
                    {seleccionados.size === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#2c3e50]">
                      Nuevo proveedor
                    </label>
                    <input
                      type="text"
                      list="proveedores-masiva-repuestos"
                      value={edicionProveedorTexto}
                      onChange={(e) => setEdicionProveedorTexto(e.target.value)}
                      placeholder="Ej: Gremio, iPhoneTec, Importador…"
                      autoFocus
                      className="w-full rounded-lg border-2 border-[#bdc3c7] p-2.5 text-sm focus:border-[#9b59b6] focus:ring-2 focus:ring-[#9b59b6]/20"
                    />
                    <datalist id="proveedores-masiva-repuestos">
                      {proveedoresUnicos.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                    <p className="mt-2 text-[11px] text-[#7f8c8d]">
                      Reemplaza el proveedor de todos los seleccionados. Podés elegir uno existente o escribir uno nuevo.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#9b59b6]/40 bg-[#f4ecf7] p-3 text-sm text-[#2c3e50]">
                    {previewEdicionProveedor ? (
                      <>
                        <p className="text-xs font-semibold text-[#7d3c98]">
                          Vista previa (1er seleccionado visible)
                        </p>
                        <p className="mt-1 text-xs text-[#7f8c8d] line-through">
                          {previewEdicionProveedor.antes}
                        </p>
                        <p className="mt-0.5 font-medium">{previewEdicionProveedor.despues}</p>
                      </>
                    ) : (
                      <span className="text-[#7f8c8d]">
                        {edicionProveedorTexto.trim()
                          ? "Seleccioná al menos un repuesto visible para ver la vista previa."
                          : "Escribí el proveedor para ver cómo quedaría."}
                      </span>
                    )}
                    {seleccionados.size > productosSeleccionados.length && (
                      <p className="mt-2 text-[11px] text-[#7f8c8d]">
                        Incluye {seleccionados.size - productosSeleccionados.length} seleccionado
                        {seleccionados.size - productosSeleccionados.length === 1 ? "" : "s"} que no están en pantalla.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={aplicandoEdicionProveedor}
                      onClick={() => setModalEdicionProveedor(false)}
                      className="rounded-lg bg-[#7f8c8d] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={aplicandoEdicionProveedor || !edicionProveedorTexto.trim()}
                      onClick={() => void confirmarEdicionProveedorMasiva()}
                      className="rounded-lg bg-[#9b59b6] px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#8e44ad] disabled:opacity-50"
                    >
                      {aplicandoEdicionProveedor ? "Aplicando…" : `Aplicar a ${seleccionados.size}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        modalEliminarMasivo &&
        createPortal(
          <div className="fixed inset-0 z-[100]" role="alertdialog" aria-modal="true" aria-labelledby="modal-eliminar-masivo-titulo">
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/40"
              onClick={() => !eliminandoMasivo && setModalEliminarMasivo(false)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-lg rounded-2xl border-2 border-[#ecf0f1] bg-white shadow-2xl">
                <div className="rounded-t-2xl bg-gradient-to-r from-[#e74c3c] to-[#c0392b] p-4 text-white sm:p-6">
                  <h2 id="modal-eliminar-masivo-titulo" className="text-lg font-bold sm:text-xl">
                    Eliminar {seleccionados.size} producto{seleccionados.size === 1 ? "" : "s"}
                  </h2>
                  <p className="text-sm text-red-100">Esta acción no se puede deshacer</p>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div className="rounded-lg border-2 border-[#e74c3c] bg-red-50 p-3 sm:p-4">
                    <p className="text-sm font-medium text-[#e74c3c]">
                      ¿Eliminar {seleccionados.size} repuesto{seleccionados.size === 1 ? "" : "s"} del stock?
                    </p>
                    {productosSeleccionados.length > 0 && (
                      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-[#7f8c8d]">
                        {productosSeleccionados.slice(0, 12).map((p) => (
                          <li key={p.id}>
                            <strong>{p.codigo}</strong> — {p.producto}
                          </li>
                        ))}
                        {seleccionados.size > 12 && (
                          <li className="font-medium text-[#e74c3c]">
                            … y {seleccionados.size - 12} más
                          </li>
                        )}
                      </ul>
                    )}
                    {seleccionados.size > productosSeleccionados.length && (
                      <p className="mt-2 text-xs text-[#7f8c8d]">
                        Incluye productos que no están cargados en pantalla ({seleccionados.size - productosSeleccionados.length} adicionales).
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={eliminandoMasivo}
                      onClick={() => setModalEliminarMasivo(false)}
                      className="rounded-lg bg-[#7f8c8d] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={eliminandoMasivo}
                      onClick={() => void confirmarEliminacionMasiva()}
                      className="rounded-lg bg-[#e74c3c] px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#c0392b] disabled:opacity-50"
                    >
                      {eliminandoMasivo ? "Eliminando…" : `Sí, eliminar ${seleccionados.size}`}
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