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

// 📦 Tabla de productos – Sección REPUESTOS OPTIMIZADA CON PAGINACIÓN

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
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [modalEliminar, setModalEliminar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  
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
        ...doc.data()
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
    proveedor: ""
  });

  // FUNCIONES DEL MODAL
  const abrirModal = (producto: Producto) => {
    setProductoEditando(producto);
    setFormulario(producto);
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
      proveedor: ""
    });
  };

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: name === 'precioCosto' || name === 'precioCostoPesos' || name === 'cantidad' || name === 'stockBajo'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      if (actualizarProducto) {
        await actualizarProducto(formulario);
      } else {
        console.log("🔥 Datos para guardar en Firebase:", formulario);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (onProductoActualizado) {
          onProductoActualizado(formulario);
        }
      }
      
      cerrarModal();
      refrescarProductos();
      console.log("✅ Producto actualizado correctamente");
      
    } catch (error) {
      console.error("❌ Error al actualizar producto:", error);
      setGuardando(false);
      alert("❌ Error al guardar el producto. Intenta nuevamente.");
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
                <th className="w-[20%] lg:w-[15%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
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
                <th className="w-[18%] lg:w-[12%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
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
                      
                      {/* Producto */}
                      <td className="p-1 text-left border border-[#bdc3c7]">
                        <div className="text-xs font-medium text-[#2c3e50]">
                          <div className="font-semibold">
                            {(p.producto || "").length > 20 ? (p.producto || "").substring(0, 20) + "..." : (p.producto || "—")}
                          </div>
                          <div className="text-xs text-[#7f8c8d] lg:hidden">
                            <div>{p.marca || "—"} {p.color || ""}</div>
                            <div>{p.proveedor || "—"}</div>
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
                        <div className="flex gap-1 justify-center">
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

      {/* 🔧 MODAL DE EDICIÓN - Mejorado con cotización */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-[#ecf0f1] transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-t-2xl p-4 sm:p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">📦</span>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">Editar Producto</h2>
                    <p className="text-blue-100 text-sm">{formulario.producto}</p>
                  </div>
                </div>
                <button
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
                    💱 Moneda
                  </label>
                  <select
                    name="moneda"
                    value={formulario.moneda}
                    onChange={manejarCambio}
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] bg-white shadow-sm appearance-none cursor-pointer text-sm"
                  >
                    <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
                    <option value="USD">🇺🇸 USD - Dólar</option>
                  </select>
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
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Cancelar
                </button>
                <button
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
                  <strong>Valor:</strong> ${modalEliminar ? (calcularPrecioDinamico(productos.find(p => p.id === modalEliminar)!) || 0).toLocaleString("es-AR") : '0'}
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