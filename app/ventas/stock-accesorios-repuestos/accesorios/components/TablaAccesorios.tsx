"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import ModalVerPrecios from "./ModalVerPrecios";
import ModalEditarAccesorio from "./ModalEditarAccesorios";

// 🎧 Tabla de productos – Sección ACCESORIOS COMPLETAMENTE OPTIMIZADA CON PAGINACIÓN Y FILTROS INTELIGENTES

interface Producto {
  id: string;
  codigo: string;
  categoria: string;
  producto: string;
  marca: string;
  modelo?: string;
  color: string;
  precioCosto: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precio1Pesos?: number;
  precio2Pesos?: number;
  precio3Pesos?: number;
  cantidad: number;
  moneda: "ARS" | "USD";
  stockBajo?: number;
  proveedor: string;
  stockIdeal?: number;
}

interface Props {
  productos?: Producto[]; // ⚠️ DEPRECATED - Solo para compatibilidad, ahora carga desde Firebase
  editarProducto?: (producto: Producto) => void; // ⚠️ DEPRECATED - Usa modal interno
  eliminarProducto: (id: string) => void;
  cotizacion: number;
  onCotizacionChange?: (nuevaCotizacion: number) => void;
  actualizarProducto?: (producto: Producto) => Promise<void>;
  onProductoActualizado?: (producto: Producto) => void;
  negocioID?: string;
  refrescar?: boolean;
}

export default function TablaAccesorios({ 
  productos: productosLegacy, // ⚠️ DEPRECATED - Ya no se usa, carga desde Firebase
  editarProducto, // ⚠️ DEPRECATED - Ya no se usa, tiene modal interno
  eliminarProducto,
  cotizacion, // 💰 Viene de useCotizacion
  onCotizacionChange,
  actualizarProducto,
  onProductoActualizado,
  negocioID,
  refrescar
}: Props) {
  
  const { rol } = useRol();
  
  // 💰 Usar cotización de useCotizacion o valor por defecto temporal
  const cotizacionSegura = (typeof cotizacion === 'number' && cotizacion > 0) ? cotizacion : 1200;
  
  // 🆕 ESTADOS PARA LOS MODALES
  const [modalVerPrecios, setModalVerPrecios] = useState<Producto | null>(null);
  const [modalEditar, setModalEditar] = useState<Producto | null>(null);
  const [modalEliminar, setModalEliminar] = useState<string | null>(null);
  
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
  const ITEMS_POR_PAGINA = 50;

  // 🚀 FUNCIÓN OPTIMIZADA PARA CARGAR PRODUCTOS CON PAGINACIÓN
  const cargarProductosPaginados = async (esNuevaCarga = false, filtros?: {
    proveedor?: string,
    categoria?: string,
    stock?: string
  }) => {
    if (!rol?.negocioID || cargando) return;
    
    setCargando(true);
    
    try {
      console.log('🔄 Cargando accesorios paginados...', {
        paginaActual: esNuevaCarga ? 1 : paginaActual,
        filtros
      });

      let queryProductos = query(
        collection(db, `negocios/${rol.negocioID}/stockAccesorios`),
        orderBy("codigo", "asc"),
        limit(ITEMS_POR_PAGINA)
      );

      // Aplicar filtros si existen
      if (filtros?.categoria && filtros.categoria !== "") {
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockAccesorios`),
          where("categoria", "==", filtros.categoria),
          orderBy("codigo", "asc"),
          limit(ITEMS_POR_PAGINA)
        );
      }

      if (filtros?.proveedor && filtros.proveedor !== "") {
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockAccesorios`),
          where("proveedor", "==", filtros.proveedor),
          orderBy("codigo", "asc"),
          limit(ITEMS_POR_PAGINA)
        );
      }

      if (!esNuevaCarga && ultimoDoc) {
        const ordenActual = filtros?.categoria || filtros?.proveedor ? "codigo" : "codigo";
        queryProductos = query(
          collection(db, `negocios/${rol.negocioID}/stockAccesorios`),
          orderBy(ordenActual, "asc"),
          startAfter(ultimoDoc),
          limit(ITEMS_POR_PAGINA)
        );
      }

      const snapshot = await getDocs(queryProductos);
      const nuevosProductos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Producto[];

      console.log(`✅ Cargados ${nuevosProductos.length} accesorios`);

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
          query(collection(db, `negocios/${rol.negocioID}/stockAccesorios`))
        );
        setTotalProductos(totalSnapshot.size);
      }

    } catch (error) {
      console.error("❌ Error cargando accesorios:", error);
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

  // 🆕 FILTROS OPTIMIZADOS CON BÚSQUEDA INTELIGENTE MEJORADA
  const { proveedoresUnicos, categoriasUnicas, productosFiltrados } = useMemo(() => {
    const proveedores = Array.from(new Set(productos.map(p => p.proveedor).filter(Boolean)));
    const categorias = Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)));
    
    const filtrados = productos.filter(p => {
      // 🆕 FILTRO DE BÚSQUEDA INTELIGENTE - Busca en TODOS los campos relevantes incluyendo MODELO
      const matchBusqueda = !filtroBusqueda || (() => {
        // Crear un texto combinado con todos los campos searchables (incluye modelo)
        const textoCompleto = [
          p.producto || '',
          p.codigo || '',
          p.marca || '',
          p.modelo || '', // 🆕 AGREGADO MODELO
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

  // 💰 FUNCIÓN PARA CALCULAR PRECIO DINÁMICO
  const calcularPrecioDinamico = (producto: Producto, tipoPrecio: 'precio1' | 'precio2' | 'precio3' | 'precioCosto') => {
    if (!producto || typeof producto[tipoPrecio] !== 'number' || producto[tipoPrecio] < 0) return 0;
    
    if (producto.moneda === "USD" && typeof cotizacionSegura === 'number') {
      return producto[tipoPrecio] * cotizacionSegura;
    }
    return producto[tipoPrecio];
  };

  // 🗑️ FUNCIÓN PARA CONFIRMAR ELIMINACIÓN
  const confirmarEliminacion = async (id: string) => {
    try {
      await eliminarProducto(id);
      setModalEliminar(null);
      refrescarProductos();
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  // 📊 ESTADÍSTICAS OPTIMIZADAS
  const estadisticas = useMemo(() => {
    const totalFiltrados = productosFiltrados.length;
    const stockTotal = productosFiltrados.reduce((sum, p) => sum + (typeof p.cantidad === 'number' ? p.cantidad : 0), 0);
    const valorTotal = productosFiltrados.reduce((acc, p) => {
      const precio = calcularPrecioDinamico(p, 'precioCosto');
      const cantidad = typeof p.cantidad === 'number' ? p.cantidad : 0;
      return acc + (precio * cantidad);
    }, 0);
    
    return { totalFiltrados, stockTotal, valorTotal };
  }, [productosFiltrados, cotizacionSegura]);

  // ⚡ EFECTOS OPTIMIZADOS
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

              {/* 🆕 BUSCADOR MEJORADO CON PLACEHOLDER ESPECÍFICO PARA ACCESORIOS */}
              <div>
                <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#9b59b6] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
                  Buscar:
                </label>
                <input
                  type="text"
                  placeholder="Buscar en todo: producto, código, marca, modelo, categoría, proveedor... (ej: funda iphone 13 negro)"
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

      {/* Indicador de carga */}
      {cargando && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-blue-700 font-medium">Cargando accesorios...</span>
        </div>
      )}

      {/* 🆕 TABLA MEJORADA CON ESTÉTICA GESTIONE */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-2 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-sm sm:text-2xl">🎧</span>
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold">Stock de Accesorios</h3>
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
                <th className="w-[25%] lg:w-[20%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📦 Producto
                </th>
                <th className="w-0 lg:w-[10%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  🏢 Marca
                </th>
                <th className="w-0 lg:w-[10%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  📱 Modelo
                </th>
                <th className="w-0 lg:w-[8%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  🎨 Color
                </th>
                <th className="w-[12%] lg:w-[10%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  💰 Costo
                </th>
                <th className="w-[8%] lg:w-[6%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📊 Stock
                </th>
                <th className="w-0 lg:w-[10%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  🏪 Prov
                </th>
                <th className="w-[15%] lg:w-[12%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  ⚙️ Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                        <span className="text-2xl">🎧</span>
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
                      
                      {/* Producto */}
                      <td className="p-1 text-left border border-[#bdc3c7]">
                        <div className="text-xs font-medium text-[#2c3e50]">
                          <div className="font-semibold">
                            {(p.producto || "").length > 25 ? (p.producto || "").substring(0, 25) + "..." : (p.producto || "—")}
                          </div>
                          <div className="text-xs text-[#7f8c8d] lg:hidden">
                            <div>{p.marca || "—"} {p.modelo || ""}</div>
                            <div>{p.color || "—"}</div>
                            <div>{p.proveedor || "—"}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Marca */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">{p.marca || "—"}</span>
                      </td>
                      
                      {/* Modelo */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">{p.modelo || "—"}</span>
                      </td>
                      
                      {/* Color */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">{p.color || "—"}</span>
                      </td>
                      
                      {/* 🆕 COSTO MEJORADO - SIN MOSTRAR COTIZACIÓN ABAJO */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="text-xs">
                          <div className={`font-medium ${
                            p.moneda === "USD" ? "text-[#3498db]" : "text-[#27ae60]"
                          }`}>
                            {p.moneda} ${p.precioCosto?.toLocaleString("es-AR") || 0}
                          </div>
                          {/* ✅ REMOVIDO: Ya no muestra la cotización abajo del precio */}
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
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => setModalVerPrecios(p)}
                            className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-1 py-1 rounded text-xs transition-all duration-200"
                            title="Ver precios"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => setModalEditar(p)}
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

      {/* 👁️ MODAL VER PRECIOS */}
      {modalVerPrecios && (
        <ModalVerPrecios
          producto={modalVerPrecios}
          cotizacion={cotizacion}
          calcularPrecioDinamico={calcularPrecioDinamico}
          onClose={() => setModalVerPrecios(null)}
        />
      )}

      {/* ✏️ MODAL EDITAR ACCESORIO */}
      {modalEditar && (
        <ModalEditarAccesorio
          producto={modalEditar}
          cotizacion={cotizacion}
          actualizarProducto={actualizarProducto}
          onProductoActualizado={(producto) => {
            if (onProductoActualizado) {
              onProductoActualizado(producto);
            }
            refrescarProductos();
          }}
          onClose={() => setModalEditar(null)}
        />
      )}

      {/* 🗑️ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-t-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-red-50 border-2 border-[#e74c3c] rounded-lg p-3 sm:p-4">
                <p className="text-[#e74c3c] font-medium text-sm sm:text-base">
                  ¿Estás seguro que querés eliminar este producto?
                </p>
                <div className="mt-2 text-xs sm:text-sm text-[#7f8c8d]">
                  <strong>Producto:</strong> {productos.find(p => p.id === modalEliminar)?.producto}<br/>
                  <strong>Stock:</strong> {productos.find(p => p.id === modalEliminar)?.cantidad} unidades<br/>
                  <strong>Valor:</strong> ${modalEliminar ? (calcularPrecioDinamico(productos.find(p => p.id === modalEliminar)!, 'precioCosto') || 0).toLocaleString("es-AR") : '0'}
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setModalEliminar(null)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmarEliminacion(modalEliminar)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg text-sm"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}