"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { reponerAccesoriosAlStock } from "./reponerAccesorioEnStock";
import { reponerRepuestosAlStock } from "./reponerRepuestosAlStock";
import React from "react";
import useCotizacion from "@/lib/hooks/useCotizacion";
import ModalRemitoImpresion from "./ModalRemitoImpresion";
import ModalEditarVenta from "./ModalEditarVenta";

interface Props {
  refrescar: boolean;
}

export default function TablaVentas({ refrescar }: Props) {
  const { rol } = useRol();
  const [ventas, setVentas] = useState<any[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [ventaAEliminar, setVentaAEliminar] = useState<any | null>(null);
  const [mostrarConfirmarEliminar, setMostrarConfirmarEliminar] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendiente" | "pagado">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | "telefono" | "accesorio" | "repuesto">("todas");
  const [filtroMoneda, setFiltroMoneda] = useState<"todas" | "USD" | "ARS">("todas");
  const { cotizacion, actualizarCotizacion } = useCotizacion(rol?.negocioID || "");
  const [ventaParaRemito, setVentaParaRemito] = useState<any | null>(null);
  const [mostrarRemito, setMostrarRemito] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<{venta: any, producto: any, index: number} | null>(null);
  const [mostrarConfirmarEliminarProducto, setMostrarConfirmarEliminarProducto] = useState(false);
  const [mostrarMigracion, setMostrarMigracion] = useState(false);

  // 🚀 ESTADOS PARA PAGINACIÓN OPTIMIZADA
  const [cargando, setCargando] = useState(false);
  const [hayMasPaginas, setHayMasPaginas] = useState(true);
  const [ultimoDoc, setUltimoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalVentas, setTotalVentas] = useState(0);
  
  // 🔥 CONFIGURACIÓN DE PAGINACIÓN
  const ITEMS_POR_PAGINA = 75;

  // 🚀 FUNCIÓN OPTIMIZADA PARA CARGAR VENTAS CON PAGINACIÓN
  const cargarVentasPaginadas = async (esNuevaCarga = false, filtros?: {
    estado?: string,
    categoria?: string,
    moneda?: string,
    cliente?: string
  }) => {
    if (!rol?.negocioID || cargando) return;
    
    setCargando(true);
    
    try {
      console.log('🔄 Cargando ventas paginadas...', {
        paginaActual: esNuevaCarga ? 1 : paginaActual,
        filtros
      });

      let queryVentas = query(
        collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
        orderBy("timestamp", "desc"),
        limit(ITEMS_POR_PAGINA)
      );

      if (filtros?.estado && filtros.estado !== "todos") {
        queryVentas = query(
          collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
          where("estado", "==", filtros.estado),
          orderBy("timestamp", "desc"),
          limit(ITEMS_POR_PAGINA)
        );
      }

      if (!esNuevaCarga && ultimoDoc) {
        queryVentas = query(
          collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
          orderBy("timestamp", "desc"),
          startAfter(ultimoDoc),
          limit(ITEMS_POR_PAGINA)
        );
      }

      const snapshot = await getDocs(queryVentas);
      const nuevasVentas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Cargadas ${nuevasVentas.length} ventas`);

      if (esNuevaCarga) {
        setVentas(nuevasVentas);
        setPaginaActual(1);
      } else {
        setVentas(prev => [...prev, ...nuevasVentas]);
        setPaginaActual(prev => prev + 1);
      }

      setHayMasPaginas(nuevasVentas.length === ITEMS_POR_PAGINA);
      if (snapshot.docs.length > 0) {
        setUltimoDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

      if (esNuevaCarga) {
        const totalSnapshot = await getDocs(
          query(collection(db, `negocios/${rol.negocioID}/ventasGeneral`))
        );
        setTotalVentas(totalSnapshot.size);
      }

    } catch (error) {
      console.error("❌ Error cargando ventas:", error);
    } finally {
      setCargando(false);
    }
  };

  const refrescarVentas = async () => {
    await cargarVentasPaginadas(true, {
      estado: filtroEstado,
      categoria: filtroCategoria,
      moneda: filtroMoneda,
      cliente: filtroCliente
    });
  };

  const cargarMasVentas = () => {
    if (hayMasPaginas && !cargando) {
      cargarVentasPaginadas(false);
    }
  };

  const ventasFiltradas = ventas.filter((v) => {
    if (filtroCliente && !v.cliente.toLowerCase().includes(filtroCliente.toLowerCase())) {
      return false;
    }
    
    if (filtroEstado !== "todos" && (v.estado || "pendiente") !== filtroEstado) {
      return false;
    }
    
    if (filtroCategoria !== "todas") {
      const tieneCategoria = v.productos.some((p: any) => {
        if (filtroCategoria === "telefono") return p.categoria === "Teléfono";
        if (filtroCategoria === "accesorio") return p.categoria === "Accesorio";
        if (filtroCategoria === "repuesto") return p.categoria === "Repuesto";
        return false;
      });
      if (!tieneCategoria) return false;
    }
    
    if (filtroMoneda !== "todas") {
      const hayTelefono = v.productos.some((p: any) => p.categoria === "Teléfono");
      
      if (filtroMoneda === "USD") {
        if (!(hayTelefono || v.productos.some((p: any) => p.moneda?.toUpperCase() === "USD"))) {
          return false;
        }
      } else if (filtroMoneda === "ARS") {
        if (!(!hayTelefono && v.productos.some((p: any) => p.moneda?.toUpperCase() !== "USD"))) {
          return false;
        }
      }
    }
    
    return true;
  });

  const editarVenta = (venta: any) => {
    setVentaSeleccionada(venta);
    setMostrarModal(true);
  };

  const pedirConfirmacionEliminar = (venta: any) => {
    setVentaAEliminar(venta);
    setMostrarConfirmarEliminar(true);
  };

  const confirmarEliminarProducto = () => {
    if (productoAEliminar) {
      eliminarProducto(productoAEliminar.venta.id, productoAEliminar.index);
      setMostrarConfirmarEliminarProducto(false);
      setProductoAEliminar(null);
    }
  };

  const pedirConfirmacionEliminarProducto = (venta: any, producto: any, index: number) => {
    setProductoAEliminar({ venta, producto, index });
    setMostrarConfirmarEliminarProducto(true);
  };

  const eliminarProducto = async (ventaId: string, productoIndex: number) => {
    if (!rol?.negocioID) return;

    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;

    const productoEliminado = venta.productos[productoIndex];
    const nuevosProductos = venta.productos.filter((_: any, idx: number) => idx !== productoIndex);

    if (productoEliminado.codigo) {
      if (productoEliminado.tipo === "accesorio" || productoEliminado.categoria === "Accesorio") {
        await reponerAccesoriosAlStock({
          productos: [productoEliminado],
          negocioID: rol.negocioID,
        });
      } else if (
        productoEliminado.tipo === "repuesto" || 
        productoEliminado.tipo === "general" ||
        productoEliminado.categoria === "Repuesto" ||
        productoEliminado.hoja
      ) {
        await reponerRepuestosAlStock({
          productos: [productoEliminado],
          negocioID: rol.negocioID,
        });
      }
    }

    if (nuevosProductos.length === 0) {
      await eliminarVentaCompleta(venta);
      return;
    }

    const nuevoTotal = nuevosProductos.reduce(
      (acc: number, p: any) => acc + (p.precioUnitario * p.cantidad),
      0
    );

    await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${ventaId}`), {
      productos: nuevosProductos,
      total: nuevoTotal,
    });

    await refrescarVentas();
  };

  const eliminarVentaCompleta = async (venta: any) => {
    if (!rol?.negocioID) return;

    // 🔥 PASO 1: PRIMERO ELIMINAR DE ventaTelefonos Y REPONER TELÉFONO
    const telefono = venta.productos.find((p: any) => p.categoria === "Teléfono");

    if (telefono) {
      console.log('📱 Eliminando teléfono de ventaTelefonos:', venta.id);
      const refTelefono = doc(db, `negocios/${rol.negocioID}/ventaTelefonos/${venta.id}`);
      const snap = await getDoc(refTelefono);

      if (snap.exists()) {
        const data = snap.data();
        console.log('📱 Datos del teléfono encontrados:', data);

        // Verificar si ya existe en stock
        const stockSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockTelefonos`));
        const yaExiste = stockSnap.docs.some((d) => {
          const tel = d.data();
          return tel.modelo === data.modelo && tel.imei === data.imei;
        });

        if (!yaExiste) {
          console.log('📱 Reponiendo teléfono al stock...');
          await addDoc(collection(db, `negocios/${rol.negocioID}/stockTelefonos`), {
            fechaIngreso: data.fechaIngreso,
            proveedor: data.proveedor || "—",
            modelo: data.modelo,
            marca: data.marca || "—",
            estado: data.estado,
            bateria: data.bateria || "",
            gb: data.gb || "",
            color: data.color || "—",
            imei: data.imei || "",
            serial: data.serie || "",
            precioCompra: data.precioCosto,
            precioVenta: data.precioVenta,
            moneda: data.moneda || "ARS",
            observaciones: data.observaciones || "",
          });
          console.log('✅ Teléfono repuesto al stock');
        } else {
          console.log('⚠️ Teléfono ya existe en stock, no se repone');
        }

        // 🔥 ELIMINAR DE ventaTelefonos
        await deleteDoc(refTelefono);
        console.log('✅ Teléfono eliminado de ventaTelefonos');
      } else {
        console.log('❌ No se encontró el teléfono en ventaTelefonos');
      }
    }

    // 🔥 PASO 2: LUEGO REPONER ACCESORIOS Y REPUESTOS
    const accesorios = venta.productos.filter(
      (p: any) => (p.tipo === "accesorio" || p.categoria === "Accesorio") && p.codigo
    );
    
    const repuestos = venta.productos.filter(
      (p: any) => (
        p.tipo === "repuesto" || 
        p.tipo === "general" ||
        p.categoria === "Repuesto" ||
        p.hoja
      ) && p.codigo
    );
    
    if (accesorios.length > 0) {
      console.log('🔌 Reponiendo accesorios al stock:', accesorios.length);
      await reponerAccesoriosAlStock({
        productos: accesorios,
        negocioID: rol.negocioID,
      });
      console.log('✅ Accesorios repuestos al stock');
    }

    if (repuestos.length > 0) {
      console.log('🔧 Reponiendo repuestos al stock:', repuestos.length);
      await reponerRepuestosAlStock({
        productos: repuestos,
        negocioID: rol.negocioID,
      });
      console.log('✅ Repuestos repuestos al stock');
    }

    // 🔥 PASO 3: FINALMENTE ELIMINAR DE ventasGeneral
    await deleteDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${venta.id}`));
    console.log('✅ Venta eliminada de ventasGeneral');

    // Refrescar estado
    await refrescarVentas();
  };

  const eliminarVenta = async () => {
    if (ventaAEliminar) {
      await eliminarVentaCompleta(ventaAEliminar);
      setMostrarConfirmarEliminar(false);
    }
  };

  useEffect(() => {
    if (rol?.negocioID) {
      cargarVentasPaginadas(true);
    }
  }, [rol?.negocioID, refrescar]);

  useEffect(() => {
    if (rol?.negocioID) {
      const timer = setTimeout(() => {
        cargarVentasPaginadas(true, {
          estado: filtroEstado,
          categoria: filtroCategoria,
          moneda: filtroMoneda,
          cliente: filtroCliente
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [filtroEstado, filtroCategoria, filtroMoneda]);

  return (
    <div className="space-y-6">
  
      {/* Header de filtros */}
      <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-3 lg:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 mb-3">
          
          {/* Estados */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
              <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">📊</span>
              Estado:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroEstado("todos")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroEstado === "todos" 
                    ? "bg-[#3498db] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroEstado("pendiente")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroEstado === "pendiente" 
                    ? "bg-[#f39c12] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                Pendiente
              </button>
              <button
                onClick={() => setFiltroEstado("pagado")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroEstado === "pagado" 
                    ? "bg-[#27ae60] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                Pagado
              </button>
            </div>
          </div>

          {/* Categorías */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
              <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">🏷️</span>
              Categoría:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroCategoria("todas")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroCategoria === "todas" 
                    ? "bg-[#2c3e50] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                📊 Todas
              </button>
              <button
                onClick={() => setFiltroCategoria("telefono")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroCategoria === "telefono" 
                    ? "bg-[#27ae60] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                📱 Tel
              </button>
              <button
                onClick={() => setFiltroCategoria("accesorio")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroCategoria === "accesorio" 
                    ? "bg-[#3498db] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                🔌 Acc
              </button>
              <button
                onClick={() => setFiltroCategoria("repuesto")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroCategoria === "repuesto" 
                    ? "bg-[#f39c12] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                🔧 Rep
              </button>
            </div>
          </div>

          {/* Monedas */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
              <span className="w-4 h-4 bg-[#9b59b6] rounded-full flex items-center justify-center text-white text-xs">💱</span>
              Moneda:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroMoneda("todas")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroMoneda === "todas" 
                    ? "bg-[#9b59b6] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroMoneda("USD")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroMoneda === "USD" 
                    ? "bg-[#16a085] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                💵 USD
              </button>
              <button
                onClick={() => setFiltroMoneda("ARS")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  filtroMoneda === "ARS" 
                    ? "bg-[#e67e22] text-white shadow-md" 
                    : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                💰 ARS
              </button>
            </div>
          </div>

          {/* Cotización USD */}
          <div className="flex flex-col gap-2 ml-auto">
            <span className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
              <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
              Cotización USD:
            </span>
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] px-4 py-2 rounded-lg border-2 border-[#f39c12] min-w-[180px]">
              <span className="text-sm font-medium text-[#2c3e50]">$</span>
              <input
                type="number"
                value={cotizacion}
                onChange={async (e) => {
                  const nuevaCotizacion = Number(e.target.value);
                  actualizarCotizacion(nuevaCotizacion);

                  const ventasPendientes = ventas.filter(v => (v.estado || "pendiente") === "pendiente");
                  
                  const updates = ventasPendientes.map(async (venta) => {
                    const productosActualizados = venta.productos.map((p: any) => {
                      const total =
                        p.moneda?.toUpperCase() === "USD"
                          ? p.precioUnitario * p.cantidad * nuevaCotizacion
                          : p.precioUnitario * p.cantidad;

                      return {
                        ...p,
                        total,
                      };
                    });

                    const totalVenta = productosActualizados.reduce(
                      (acc: number, p: any) => acc + p.total,
                      0
                    );

                    await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${venta.id}`), {
                      productos: productosActualizados,
                      total: totalVenta,
                    });
                  });

                  await Promise.all(updates);
                }}
                className="flex-1 px-3 py-2 border-2 border-[#f39c12] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] text-center font-medium text-sm text-[#2c3e50] min-w-0"
              />
              <div className="text-sm text-[#f39c12] font-medium">
                ARS
              </div>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="flex">
          <div className="flex-1 max-w-md">
            <label className="text-sm font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
              Buscar cliente:
            </label>
            <input
              type="text"
              placeholder="🔍 Filtrar por cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {cargando && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-blue-700 font-medium">Cargando ventas...</span>
        </div>
      )}

      {/* Tabla principal */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-2 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-sm sm:text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold">Ventas Registradas</h3>
              <p className="text-blue-100 text-xs sm:text-sm">
                Mostrando {ventasFiltradas.length} ventas
                {totalVentas > 0 && (
                  <span className="ml-2">
                    • Página {paginaActual} • Total: {totalVentas}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla responsiva */}
        <div className="w-full">
          <table className="w-full border-collapse table-fixed text-xs">
            <thead className="bg-[#ecf0f1]">
              <tr>
                <th className="w-[8%] lg:w-[5%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  Nro
                </th>
                <th className="w-0 md:w-[10%] lg:w-[7%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden md:table-cell">
                  Fecha
                </th>
                <th className="w-[18%] md:w-[15%] lg:w-[12%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  Cliente
                </th>
                <th className="w-[6%] lg:w-[5%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  Cat
                </th>
                <th className="w-[22%] md:w-[18%] lg:w-[15%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  Producto
                </th>
                <th className="w-0 lg:w-[10%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  Marca
                </th>
                <th className="w-0 lg:w-[11%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  Modelo
                </th>
                <th className="w-0 lg:w-[7%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  Color
                </th>
                <th className="w-[6%] lg:w-[4%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  Q
                </th>
                <th className="w-0 lg:w-[8%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  Precio
                </th>
                <th className="w-[10%] md:w-[8%] lg:w-[7%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  Total
                </th>
                <th className="w-[10%] md:w-[8%] lg:w-[7%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  💰 Ganancia
                </th>
                <th className="w-[10%] md:w-[8%] lg:w-[8%] p-1 text-center text-xs font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  Acc
                </th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#7f8c8d]">
                          {ventas.length === 0 ? "No hay ventas registradas" : "No se encontraron resultados"}
                        </p>
                        <p className="text-xs text-[#bdc3c7]">
                          {ventas.length === 0 
                            ? "Las ventas aparecerán aquí una vez que registres algunas"
                            : "Intenta ajustar los filtros de búsqueda"
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((venta) => (
                  <React.Fragment key={venta.id}>
                    {venta.productos.map((p: any, i: number) => {
                      const esProductoPrincipal = i === 0;
                      const tieneMultiplesProductos = venta.productos.length > 1;
                      const isEven = ventasFiltradas.indexOf(venta) % 2 === 0;
                      
                      return (
                        <tr
                          key={`${venta.id}-${i}`}
                          className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                            (venta.estado || "pendiente") === "pagado"
                              ? "bg-green-50"
                              : (venta.estado || "pendiente") === "pendiente"
                              ? "bg-yellow-50"
                              : isEven ? "bg-white" : "bg-[#f8f9fa]"
                          } ${
                            tieneMultiplesProductos 
                              ? esProductoPrincipal 
                                ? 'border-l-4 border-l-[#3498db]' 
                                : 'border-l-4 border-l-[#bdc3c7]' 
                              : ''
                          }`}
                        >
                          {/* Nro Venta */}
                          <td className="p-1 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <span className="inline-flex items-center justify-center px-1 py-1 rounded text-xs font-bold bg-[#3498db] text-white">
                                #{venta.nroVenta || venta.id.slice(-4)}
                              </span>
                            ) : (
                              <span className="text-[#bdc3c7] text-xs">↳</span>
                            )}
                          </td>
                          
                          {/* Fecha */}
                          <td className="p-1 text-center border border-[#bdc3c7] hidden md:table-cell">
                            {esProductoPrincipal ? (
                              <span className="text-xs text-[#2c3e50]">
                                {venta.fecha}
                              </span>
                            ) : ""}
                          </td>
                          
                          {/* Cliente */}
                          <td className="p-1 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <div className="text-xs text-[#2c3e50]">
                                <div className="font-medium">
                                  {venta.cliente}
                                </div>
                                <div className="text-xs text-[#7f8c8d] md:hidden">
                                  {venta.fecha}
                                </div>
                              </div>
                            ) : ""}
                          </td>
                          
                          {/* Categoría */}
                          <td className="p-1 text-center border border-[#bdc3c7]">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                              p.categoria === "Teléfono" 
                                ? 'bg-[#27ae60] text-white'
                                : p.categoria === "Accesorio"
                                ? 'bg-[#3498db] text-white'
                                : p.categoria === "Repuesto"
                                ? 'bg-[#f39c12] text-white'
                                : 'bg-[#7f8c8d] text-white'
                            }`}>
                              {p.categoria === "Teléfono" ? "📱" : p.categoria === "Accesorio" ? "🔌" : "🔧"}
                            </span>
                          </td>
                          
                          {/* Producto */}
                          <td className="p-1 text-center border border-[#bdc3c7]">
                            <div className="text-xs text-[#2c3e50]">
                              <div className="font-semibold">
                                {p.producto || p.descripcion || "—"}
                              </div>
                              <div className="text-xs text-[#7f8c8d] lg:hidden">
                                <div>{p.marca} {p.modelo}</div>
                                <div>{p.color}</div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Marca */}
                          <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                            <span className="text-xs text-[#7f8c8d]">
                              {p.marca || "—"}
                            </span>
                          </td>
                          
                          {/* Modelo */}
                          <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                            <span className="text-xs text-[#7f8c8d]">
                              {p.modelo || "—"}
                            </span>
                          </td>
                          
                          {/* Color */}
                          <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                            <span className="text-xs text-[#7f8c8d]">
                              {p.color || "—"}
                            </span>
                          </td>
                          
                          {/* Cantidad */}
                          <td className="p-1 text-center border border-[#bdc3c7]">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-[#3498db] text-white">
                              {p.cantidad}
                            </span>
                          </td>
                          
                          {/* Precio */}
                         {/* Precio - SIMPLIFICADO: Siempre mostrar en moneda nativa */}
<td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
  <span className="text-xs text-[#2c3e50]">
    {p.moneda?.toUpperCase() === "USD" 
      ? `USD $${p.precioUnitario.toLocaleString("es-AR")}`
      : `$${p.precioUnitario.toLocaleString("es-AR")} ARS`
    }
  </span>
</td>

                          {/* Total */}
                         {/* Total - SIMPLIFICADO: Siempre mostrar en moneda nativa */}
<td className="p-1 text-center border border-[#bdc3c7]">
  <div className="text-xs font-bold text-[#27ae60]">
    {(() => {
      const total = p.precioUnitario * p.cantidad;
      return p.moneda?.toUpperCase() === "USD" 
        ? `USD $${total.toLocaleString("es-AR")}`
        : `$${total.toLocaleString("es-AR")} ARS`;
    })()}
    
    {/* Precio unitario en vista móvil */}
    <div className="text-xs text-[#7f8c8d] lg:hidden">
      @ {p.moneda?.toUpperCase() === "USD" 
        ? `USD $${p.precioUnitario.toLocaleString("es-AR")}`
        : `$${p.precioUnitario.toLocaleString("es-AR")} ARS`
      }
    </div>
  </div>
</td>

                          {/* Ganancia */}
                          {/* Ganancia - SIMPLIFICADO: Mostrar en moneda nativa */}
<td className="p-1 text-center border border-[#bdc3c7]">
  <div className="text-xs font-bold">
    {(() => {
      const ganancia = p.ganancia || 0;
      const colorClass = ganancia > 0 ? 'text-[#27ae60]' : 
                       ganancia < 0 ? 'text-[#e74c3c]' : 
                       'text-[#7f8c8d]';
      
      const montoFormateado = p.moneda?.toUpperCase() === "USD" 
        ? `USD $${ganancia.toLocaleString("es-AR")}`
        : `$${ganancia.toLocaleString("es-AR")} ARS`;
      
      return <span className={colorClass}>{montoFormateado}</span>;
    })()}
  </div>
</td>

                          {/* Acciones */}
                          <td className="p-1 text-center border border-[#bdc3c7]">
                            <div className="flex flex-col items-center gap-1">
                              {esProductoPrincipal && (
                                <select
                                  value={venta.estado || "pendiente"}
                                  onChange={async (e) => {
                                    const nuevoEstado = e.target.value;
                                    await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${venta.id}`), {
                                      estado: nuevoEstado,
                                    });
                                    await refrescarVentas();
                                  }}
                                  className={`text-xs px-1 py-1 border rounded text-center w-full ${
                                    (venta.estado || "pendiente") === "pagado"
                                      ? "bg-[#27ae60] text-white border-[#27ae60]"
                                      : "bg-[#f39c12] text-white border-[#f39c12]"
                                  }`}
                                >
                                  <option value="pendiente">Pend</option>
                                  <option value="pagado">Pago</option>
                                </select>
                              )}

                              <div className="flex gap-1 w-full">
                                {esProductoPrincipal && (
                                  <>
                                    <button
                                      onClick={() => editarVenta(venta)}
                                      className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-1 py-1 rounded text-xs flex-1 transition-all duration-200"
                                      title="Editar"
                                    >
                                      ✏️
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setVentaParaRemito(venta);
                                        setMostrarRemito(true);
                                      }}
                                      className="bg-[#3498db] hover:bg-[#2980b9] text-white px-1 py-1 rounded text-xs flex-1 transition-all duration-200 hidden lg:inline-block"
                                      title="Remito"
                                    >
                                      🖨️
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => pedirConfirmacionEliminarProducto(venta, p, i)}
                                  className={`hover:bg-[#c0392b] text-white px-1 py-1 rounded text-xs flex-1 transition-all duration-200 ${
                                    venta.productos.length > 1 
                                      ? "bg-[#e74c3c]" 
                                      : "bg-[#c0392b]"
                                  }`}
                                  title={venta.productos.length > 1 ? "Eliminar producto" : "Eliminar venta"}
                                >
                                  {venta.productos.length > 1 ? "🗑️" : "❌"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
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
                Mostrando {ventasFiltradas.length} ventas
                {totalVentas > 0 && (
                  <span className="ml-2">de {totalVentas} totales</span>
                )}
              </span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                <span>
                  Productos: <strong className="text-[#3498db]">
                    {ventasFiltradas.reduce((sum, v) => sum + v.productos.length, 0)}
                  </strong>
                </span>
                <span>
                  Total: <strong className="text-[#27ae60]">
                    ${ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0).toLocaleString("es-AR")}
                  </strong>
                </span>
                <span>
                  Ganancia: <strong className={`${
                    ventasFiltradas.reduce((sum, venta) => {
                      return sum + venta.productos.reduce((prodSum: number, producto: any) => {
                        return prodSum + (producto.ganancia || 0);
                      }, 0);
                    }, 0) > 0 ? 'text-[#27ae60]' : 'text-[#e74c3c]'
                  }`}>
                    ${ventasFiltradas.reduce((sum, venta) => {
                      return sum + venta.productos.reduce((prodSum: number, producto: any) => {
                        return prodSum + (producto.ganancia || 0);
                      }, 0);
                    }, 0).toLocaleString("es-AR")}
                  </strong>
                </span>
              </div>
            </div>

            {/* Controles de paginación */}
            {hayMasPaginas && (
              <div className="flex justify-center">
                <button
                  onClick={cargarMasVentas}
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
                    `Cargar más ventas (Página ${paginaActual + 1})`
                  )}
                </button>
              </div>
            )}

            {/* Indicador de final */}
            {!hayMasPaginas && ventas.length > 0 && (
              <div className="text-center text-xs text-[#7f8c8d] py-2">
                <span className="bg-[#ecf0f1] px-3 py-1 rounded-full">
                  📄 No hay más ventas para mostrar
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {mostrarConfirmarEliminar && ventaAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
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
                  ¿Estás seguro que querés eliminar esta venta?
                </p>
                <div className="mt-2 text-xs sm:text-sm text-[#7f8c8d]">
                  <strong>Cliente:</strong> {ventaAEliminar.cliente}<br/>
                  <strong>Productos:</strong> {ventaAEliminar.productos.length}
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setMostrarConfirmarEliminar(false)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarVenta}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg text-sm"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarConfirmarEliminarProducto && productoAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            <div className={`text-white rounded-t-2xl p-4 sm:p-6 ${
              productoAEliminar.venta.productos.length > 1 
                ? "bg-gradient-to-r from-[#f39c12] to-[#e67e22]" 
                : "bg-gradient-to-r from-[#e74c3c] to-[#c0392b]"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">
                    {productoAEliminar.venta.productos.length > 1 ? "🗑️" : "⚠️"}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">
                    {productoAEliminar.venta.productos.length > 1 ? "Eliminar Producto" : "Eliminar Venta"}
                  </h2>
                  <p className={`text-sm ${
                    productoAEliminar.venta.productos.length > 1 ? "text-orange-100" : "text-red-100"
                  }`}>
                    {productoAEliminar.venta.productos.length > 1 
                      ? "¿Confirmar eliminación del producto?" 
                      : "Esta acción eliminará toda la venta"
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <div className={`border-2 rounded-lg p-3 sm:p-4 ${
                productoAEliminar.venta.productos.length > 1 
                  ? "bg-orange-50 border-[#f39c12]" 
                  : "bg-red-50 border-[#e74c3c]"
              }`}>
                <p className={`font-medium text-sm sm:text-base ${
                  productoAEliminar.venta.productos.length > 1 ? "text-[#f39c12]" : "text-[#e74c3c]"
                }`}>
                  {productoAEliminar.venta.productos.length > 1 
                    ? "¿Estás seguro que querés eliminar este producto de la venta?"
                    : "¿Estás seguro que querés eliminar esta venta completa?"
                  }
                </p>
                <div className="mt-2 text-xs sm:text-sm text-[#7f8c8d]">
                  <strong>Cliente:</strong> {productoAEliminar.venta.cliente}<br/>
                  <strong>Producto:</strong> {productoAEliminar.producto.producto || productoAEliminar.producto.descripcion}<br/>
                  <strong>Cantidad:</strong> {productoAEliminar.producto.cantidad}<br/>
                  <strong>Categoría:</strong> {productoAEliminar.producto.categoria}
                  {productoAEliminar.venta.productos.length === 1 && (
                    <>
                      <br/><strong>⚠️ Es el último producto de la venta</strong>
                    </>
                  )}
                </div>
                <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                  <p className="text-xs text-[#7f8c8d]">
                    <strong>📦 El producto será repuesto al stock automáticamente</strong>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setMostrarConfirmarEliminarProducto(false);
                    setProductoAEliminar(null);
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarProducto}
                  className={`px-4 sm:px-6 py-2 sm:py-3 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg text-sm ${
                    productoAEliminar.venta.productos.length > 1 
                      ? "bg-[#f39c12] hover:bg-[#e67e22]" 
                      : "bg-[#e74c3c] hover:bg-[#c0392b]"
                  }`}
                >
                  {productoAEliminar.venta.productos.length > 1 
                    ? "Sí, eliminar producto" 
                    : "Sí, eliminar venta"
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarRemito && (
        <ModalRemitoImpresion
          mostrar={mostrarRemito}
          venta={ventaParaRemito}
          onClose={() => {
            setMostrarRemito(false);
            setVentaParaRemito(null);
          }}
          nombreNegocio="Tu Negocio"
          direccionNegocio="Dirección del negocio"
          telefonoNegocio="Tel: XXX-XXXX"
        />
      )}
      
      {mostrarModal && ventaSeleccionada && (
        <ModalEditarVenta
          mostrar={mostrarModal}
          venta={ventaSeleccionada}
          onClose={() => {
            setMostrarModal(false);
            setVentaSeleccionada(null);
          }}
          onVentaActualizada={async () => {
            await refrescarVentas();
          }}
          negocioID={rol?.negocioID || ""}
          cotizacion={cotizacion}
        />
      )}
    </div>
  );
}