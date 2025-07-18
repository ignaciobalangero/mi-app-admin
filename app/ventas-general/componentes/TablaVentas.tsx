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
} from "firebase/firestore";
import { reponerAccesoriosAlStock } from "./reponerAccesorioEnStock";
import { reponerRepuestosAlStock } from "./reponerRepuestosAlStock";
import React from "react";
import useCotizacion from "@/lib/hooks/useCotizacion";
import ModalRemitoImpresion from "./ModalRemitoImpresion";
import ModalEditarVenta from "./ModalEditarVenta";

// 🔥 CONSTANTE DE PAGINACIÓN
const PRODUCTOS_POR_PAGINA = 40;

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

  // 🆕 ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);

  // Estados para eliminación de productos
  const [productoAEliminar, setProductoAEliminar] = useState<{venta: any, producto: any, index: number} | null>(null);
  const [mostrarConfirmarEliminarProducto, setMostrarConfirmarEliminarProducto] = useState(false);

  // 🔥 FUNCIÓN CORREGIDA PARA OBTENER GANANCIA
  const obtenerGanancia = (producto: any, ventaId: string) => {
    const precioVenta = producto.precioUnitario || 0;
    const cantidad = producto.cantidad || 1;

    // 🔥 PRIORIDAD 1: ganancia ya calculada
    if (producto.ganancia !== undefined && producto.ganancia !== null) {
      return producto.ganancia;
    }

    // 🔥 PRIORIDAD 2: costo definido (calcular: precioVenta - costo)
    if (producto.costo !== undefined && producto.costo !== null) {
      return (precioVenta - producto.costo) * cantidad;
    }

    // 🔥 PRIORIDAD 3: precioCosto (campo legacy)
    if (producto.precioCosto !== undefined && producto.precioCosto !== null) {
      return (precioVenta - producto.precioCosto) * cantidad;
    }

    // 🔥 FALLBACK: Sin datos suficientes
    return null;
  };

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

    // Reponer al stock según el tipo
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

    // Si no quedan productos, eliminar la venta completa
    if (nuevosProductos.length === 0) {
      await eliminarVentaCompleta(venta);
      return;
    }

    // Calcular nuevo total
    const nuevoTotal = nuevosProductos.reduce(
      (acc: number, p: any) => acc + (p.precioUnitario * p.cantidad),
      0
    );

    // Actualizar la venta en Firebase
    await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${ventaId}`), {
      productos: nuevosProductos,
      total: nuevoTotal,
    });

    // Refrescar la lista
    await refrescarVentas();
  };

  const eliminarVentaCompleta = async (venta: any) => {
    if (!rol?.negocioID) return;

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
    
    // Reponer accesorios y repuestos
    if (accesorios.length > 0) {
      await reponerAccesoriosAlStock({
        productos: accesorios,
        negocioID: rol.negocioID,
      });
    }

    if (repuestos.length > 0) {
      await reponerRepuestosAlStock({
        productos: repuestos,
        negocioID: rol.negocioID,
      });
    }

    const telefono = venta.productos.find((p: any) => p.categoria === "Teléfono");

    if (telefono) {
      const refTelefono = doc(db, `negocios/${rol.negocioID}/ventaTelefonos/${venta.id}`);
      const snap = await getDoc(refTelefono);

      if (snap.exists()) {
        const data = snap.data();

        const stockSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockTelefonos`));
        const yaExiste = stockSnap.docs.some((d) => {
          const tel = d.data();
          return tel.modelo === data.modelo && tel.imei === data.imei;
        });

        if (!yaExiste) {
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
        }

        await deleteDoc(refTelefono);
      }
    }

    await deleteDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${venta.id}`));
    await refrescarVentas();
  };

  const eliminarVenta = async () => {
    if (ventaAEliminar) {
      await eliminarVentaCompleta(ventaAEliminar);
      setMostrarConfirmarEliminar(false);
    }
  };

  const refrescarVentas = async () => {
    if (!rol?.negocioID) return;
    const snap = await getDocs(
      query(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), orderBy("timestamp", "desc"))
    );
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setVentas(data);
  };
  
  useEffect(() => {
    refrescarVentas();
  }, [rol?.negocioID, refrescar]);

  // 🔥 FILTROS APLICADOS A VENTAS
  const ventasFiltradas = ventas
    .filter((v) =>
      v.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
    )
    .filter((v) =>
      filtroEstado === "todos" ? true : (v.estado || "pendiente") === filtroEstado
    )
    .filter((v) => {
      if (filtroCategoria === "todas") return true;
      
      const tieneCategoria = v.productos.some((p: any) => {
        if (filtroCategoria === "telefono") return p.categoria === "Teléfono";
        if (filtroCategoria === "accesorio") return p.categoria === "Accesorio";
        if (filtroCategoria === "repuesto") return p.categoria === "Repuesto";
        return false;
      });
      
      return tieneCategoria;
    })
    .filter((v) => {
      if (filtroMoneda === "todas") return true;
      
      const hayTelefono = v.productos.some((p: any) => p.categoria === "Teléfono");
      
      if (filtroMoneda === "USD") {
        return hayTelefono || v.productos.some((p: any) => p.moneda?.toUpperCase() === "USD");
      } else if (filtroMoneda === "ARS") {
        return !hayTelefono && v.productos.some((p: any) => p.moneda?.toUpperCase() !== "USD");
      }
      
      return true;
    });

  // 🔥 CREAR LISTA PLANA DE PRODUCTOS
  const productosPlanos = ventasFiltradas.flatMap(venta => 
    venta.productos.map((producto: any, index: number) => ({
      ...producto,
      ventaId: venta.id,
      ventaCliente: venta.cliente,
      ventaFecha: venta.fecha,
      ventaEstado: venta.estado || "pendiente",
      ventaNroVenta: venta.nroVenta || venta.id.slice(-4),
      ventaTotal: venta.total,
      ventaProductos: venta.productos,
      productoIndex: index,
      esProductoPrincipal: index === 0,
      tieneMultiplesProductos: venta.productos.length > 1,
      hayTelefonoEnVenta: venta.productos.some((p: any) => p.categoria === "Teléfono"),
      gananciaCalculada: obtenerGanancia(producto, venta.id)
    }))
  );

  // 🔥 FUNCIONES DE PAGINACIÓN
  const totalPaginas = Math.ceil(productosPlanos.length / PRODUCTOS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const indiceFin = indiceInicio + PRODUCTOS_POR_PAGINA;
  const productosPaginados = productosPlanos.slice(indiceInicio, indiceFin);

  const irAPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaActual(pagina);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const paginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1);
    }
  };

  // 🔥 RESET PAGINACIÓN AL FILTRAR
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroCliente, filtroEstado, filtroCategoria, filtroMoneda]);

  return (
    <div className="space-y-6">
      {/* HEADER DE FILTROS */}
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

                  const snap = await getDocs(
                    query(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), orderBy("timestamp", "desc"))
                  );

                  const updates = snap.docs.map(async (docu) => {
                    const data = docu.data();
                    if ((data.estado || "pendiente") === "pendiente") {
                      const productosActualizados = data.productos.map((p: any) => {
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

                      await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${docu.id}`), {
                        productos: productosActualizados,
                        total: totalVenta,
                      });
                    }
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
                {productosPlanos.length} productos en {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'}
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
              {productosPlanos.length === 0 ? (
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
                productosPaginados.map((producto) => {
                  const isEven = productosPaginados.indexOf(producto) % 2 === 0;
                  
                  return (
                    <tr
                      key={`${producto.ventaId}-${producto.productoIndex}`}
                      className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                        producto.ventaEstado === "pagado"
                          ? "bg-green-50"
                          : producto.ventaEstado === "pendiente"
                          ? "bg-yellow-50"
                          : isEven ? "bg-white" : "bg-[#f8f9fa]"
                      } ${
                        producto.tieneMultiplesProductos 
                          ? producto.esProductoPrincipal 
                            ? 'border-l-4 border-l-[#3498db]' 
                            : 'border-l-4 border-l-[#bdc3c7]' 
                          : ''
                      }`}
                    >
                      {/* Nro Venta */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        {producto.esProductoPrincipal ? (
                          <span className="inline-flex items-center justify-center px-1 py-1 rounded text-xs font-bold bg-[#3498db] text-white">
                            #{producto.ventaNroVenta}
                          </span>
                        ) : (
                          <span className="text-[#bdc3c7] text-xs">↳</span>
                        )}
                      </td>
                      
                      {/* Fecha - Solo tablet+ */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden md:table-cell">
                        {producto.esProductoPrincipal ? (
                          <span className="text-xs text-[#2c3e50]">
                            {producto.ventaFecha}
                          </span>
                        ) : ""}
                      </td>
                      
                      {/* Cliente */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        {producto.esProductoPrincipal ? (
                          <div className="text-xs text-[#2c3e50]">
                            <div className="font-medium">
                              {producto.ventaCliente}
                            </div>
                            {/* Fecha en mobile */}
                            <div className="text-xs text-[#7f8c8d] md:hidden">
                              {producto.ventaFecha}
                            </div>
                          </div>
                        ) : ""}
                      </td>
                      
                      {/* Categoría */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                          producto.categoria === "Teléfono" 
                            ? 'bg-[#27ae60] text-white'
                            : producto.categoria === "Accesorio"
                            ? 'bg-[#3498db] text-white'
                            : producto.categoria === "Repuesto"
                            ? 'bg-[#f39c12] text-white'
                            : 'bg-[#7f8c8d] text-white'
                        }`}>
                          {producto.categoria === "Teléfono" ? "📱" : producto.categoria === "Accesorio" ? "🔌" : "🔧"}
                        </span>
                      </td>
                      
                      {/* Producto */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="text-xs text-[#2c3e50]">
                          <div className="font-semibold">
                            {producto.producto || producto.descripcion || "—"}
                          </div>
                          {/* Info adicional en mobile/tablet */}
                          <div className="text-xs text-[#7f8c8d] lg:hidden">
                            <div>{producto.marca} {producto.modelo}</div>
                            <div>{producto.color}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Marca - Solo desktop */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">
                          {producto.marca || "—"}
                        </span>
                      </td>
                      
                      {/* Modelo - Solo desktop */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">
                          {producto.modelo || "—"}
                        </span>
                      </td>
                      
                      {/* Color - Solo desktop */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#7f8c8d]">
                          {producto.color || "—"}
                        </span>
                      </td>
                      
                      {/* Cantidad */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-[#3498db] text-white">
                          {producto.cantidad}
                        </span>
                      </td>
                      
                      {/* Precio - SOLO DESKTOP */}
                      <td className="p-1 text-center border border-[#bdc3c7] hidden lg:table-cell">
                        <span className="text-xs text-[#2c3e50]">
                          {(() => {
                            if (producto.hayTelefonoEnVenta) {
                              if (producto.categoria === "Teléfono") {
                                return `USD ${producto.precioUnitario.toLocaleString("es-AR")}`;
                              } else {
                                return producto.moneda?.toUpperCase() === "USD"
                                  ? `USD ${producto.precioUnitario.toLocaleString("es-AR")}`
                                  : `${producto.precioUnitario.toLocaleString("es-AR")}`;
                              }
                            } else {
                              if (producto.moneda?.toUpperCase() === "USD") {
                                return `${((producto.precioUSD || producto.precioUnitario) * cotizacion).toLocaleString("es-AR")}`;
                              } else {
                                return `${producto.precioUnitario.toLocaleString("es-AR")}`;
                              }
                            }
                          })()}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="text-xs font-bold text-[#27ae60]">
                          {(() => {
                            if (producto.hayTelefonoEnVenta) {
                              if (producto.categoria === "Teléfono") {
                                return `USD ${(producto.precioUnitario * producto.cantidad).toLocaleString("es-AR")}`;
                              } else {
                                return producto.moneda?.toUpperCase() === "USD"
                                  ? `USD ${(producto.precioUnitario * producto.cantidad).toLocaleString("es-AR")}`
                                  : `$ ${(producto.precioUnitario * producto.cantidad).toLocaleString("es-AR")}`;
                              }
                            } else {
                              if (producto.moneda?.toUpperCase() === "USD") {
                                return `$ ${((producto.precioUSD || producto.precioUnitario) * producto.cantidad * cotizacion).toLocaleString("es-AR")}`;
                              } else {
                                return `$ ${(producto.precioUnitario * producto.cantidad).toLocaleString("es-AR")}`;
                              }
                            }
                          })()}
                          {/* Precio unitario en mobile/tablet */}
                          <div className="text-xs text-[#7f8c8d] lg:hidden">
                            {(() => {
                              if (producto.hayTelefonoEnVenta) {
                                if (producto.categoria === "Teléfono") {
                                  return `@ USD ${producto.precioUnitario.toLocaleString("es-AR")}`;
                                } else {
                                  return producto.moneda?.toUpperCase() === "USD"
                                    ? `@ USD ${producto.precioUnitario.toLocaleString("es-AR")}`
                                    : `@ ${producto.precioUnitario.toLocaleString("es-AR")}`;
                                }
                              } else {
                                if (producto.moneda?.toUpperCase() === "USD") {
                                  return `@ ${((producto.precioUSD || producto.precioUnitario) * cotizacion).toLocaleString("es-AR")}`;
                                } else {
                                  return `@ ${producto.precioUnitario.toLocaleString("es-AR")}`;
                                }
                              }
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Ganancia */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="text-xs font-bold">
                          {(() => {
                            const ganancia = producto.gananciaCalculada;
                            
                            if (ganancia === null) {
                              return <span className="text-[#7f8c8d]">—</span>;
                            }
                            
                            const esPositiva = ganancia > 0;
                            const esNegativa = ganancia < 0;
                            
                            return (
                              <span className={`${
                                esPositiva ? 'text-[#27ae60]' : 
                                esNegativa ? 'text-[#e74c3c]' : 
                                'text-[#7f8c8d]'
                              }`}>
                                {producto.hayTelefonoEnVenta && producto.categoria === "Teléfono" 
                                  ? `USD ${ganancia.toLocaleString("es-AR")}` 
                                  : `$ ${ganancia.toLocaleString("es-AR")}`
                                }
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="p-1 text-center border border-[#bdc3c7]">
                        <div className="flex flex-col items-center gap-1">
                          {/* Estado compacto */}
                          {producto.esProductoPrincipal && (
                            <select
                              value={producto.ventaEstado}
                              onChange={async (e) => {
                                const nuevoEstado = e.target.value;
                                await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${producto.ventaId}`), {
                                  estado: nuevoEstado,
                                });
                                await refrescarVentas();
                              }}
                              className={`text-xs px-1 py-1 border rounded text-center w-full ${
                                producto.ventaEstado === "pagado"
                                  ? "bg-[#27ae60] text-white border-[#27ae60]"
                                  : "bg-[#f39c12] text-white border-[#f39c12]"
                              }`}
                            >
                              <option value="pendiente">Pend</option>
                              <option value="pagado">Pago</option>
                            </select>
                          )}

                          {/* Botones compactos */}
                          <div className="flex gap-1 w-full">
                            {producto.esProductoPrincipal && (
                              <>
                                <button
                                  onClick={() => {
                                    const ventaCompleta = {
                                      id: producto.ventaId,
                                      cliente: producto.ventaCliente,
                                      fecha: producto.ventaFecha,
                                      estado: producto.ventaEstado,
                                      nroVenta: producto.ventaNroVenta,
                                      total: producto.ventaTotal,
                                      productos: producto.ventaProductos
                                    };
                                    editarVenta(ventaCompleta);
                                  }}
                                  className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-1 py-1 rounded text-xs flex-1 transition-all duration-200"
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                
                                <button
                                  onClick={() => {
                                    const ventaCompleta = {
                                      id: producto.ventaId,
                                      cliente: producto.ventaCliente,
                                      fecha: producto.ventaFecha,
                                      estado: producto.ventaEstado,
                                      nroVenta: producto.ventaNroVenta,
                                      total: producto.ventaTotal,
                                      productos: producto.ventaProductos
                                    };
                                    setVentaParaRemito(ventaCompleta);
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
                              onClick={() => {
                                const ventaCompleta = {
                                  id: producto.ventaId,
                                  cliente: producto.ventaCliente,
                                  fecha: producto.ventaFecha,
                                  estado: producto.ventaEstado,
                                  nroVenta: producto.ventaNroVenta,
                                  total: producto.ventaTotal,
                                  productos: producto.ventaProductos
                                };
                                pedirConfirmacionEliminarProducto(ventaCompleta, producto, producto.productoIndex);
                              }}
                              className={`hover:bg-[#c0392b] text-white px-1 py-1 rounded text-xs flex-1 transition-all duration-200 ${
                                producto.tieneMultiplesProductos 
                                  ? "bg-[#e74c3c]" 
                                  : "bg-[#c0392b]"
                              }`}
                              title={producto.tieneMultiplesProductos ? "Eliminar producto" : "Eliminar venta"}
                            >
                              {producto.tieneMultiplesProductos ? "🗑️" : "❌"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 🔥 CONTROLES DE PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div className="bg-[#f8f9fa] px-4 py-3 border-t border-[#bdc3c7]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              
              {/* Info de página */}
              <div className="text-sm text-[#7f8c8d]">
                Página {paginaActual} de {totalPaginas} 
                <span className="hidden sm:inline">
                  ({indiceInicio + 1}-{Math.min(indiceFin, productosPlanos.length)} de {productosPlanos.length} productos)
                </span>
              </div>

              {/* Botones de navegación */}
              <div className="flex items-center gap-2">
                
                {/* Botón anterior */}
                <button
                  onClick={paginaAnterior}
                  disabled={paginaActual === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    paginaActual === 1
                      ? "bg-[#ecf0f1] text-[#bdc3c7] cursor-not-allowed"
                      : "bg-[#3498db] text-white hover:bg-[#2980b9] shadow-md transform hover:scale-105"
                  }`}
                >
                  ← Anterior
                </button>

                {/* Números de página */}
                <div className="flex gap-1">
                  {(() => {
                    const paginas = [];
                    const inicio = Math.max(1, paginaActual - 2);
                    const fin = Math.min(totalPaginas, paginaActual + 2);

                    // Primera página si no está visible
                    if (inicio > 1) {
                      paginas.push(
                        <button
                          key={1}
                          onClick={() => irAPagina(1)}
                          className="w-10 h-10 rounded-lg text-sm font-medium bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] transition-all duration-200"
                        >
                          1
                        </button>
                      );
                      if (inicio > 2) {
                        paginas.push(
                          <span key="ellipsis1" className="w-10 h-10 flex items-center justify-center text-[#7f8c8d]">
                            ...
                          </span>
                        );
                      }
                    }

                    // Páginas visibles
                    for (let i = inicio; i <= fin; i++) {
                      paginas.push(
                        <button
                          key={i}
                          onClick={() => irAPagina(i)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                            i === paginaActual
                              ? "bg-[#2c3e50] text-white shadow-md"
                              : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Última página si no está visible
                    if (fin < totalPaginas) {
                      if (fin < totalPaginas - 1) {
                        paginas.push(
                          <span key="ellipsis2" className="w-10 h-10 flex items-center justify-center text-[#7f8c8d]">
                            ...
                          </span>
                        );
                      }
                      paginas.push(
                        <button
                          key={totalPaginas}
                          onClick={() => irAPagina(totalPaginas)}
                          className="w-10 h-10 rounded-lg text-sm font-medium bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] transition-all duration-200"
                        >
                          {totalPaginas}
                        </button>
                      );
                    }

                    return paginas;
                  })()}
                </div>

                {/* Botón siguiente */}
                <button
                  onClick={paginaSiguiente}
                  disabled={paginaActual === totalPaginas}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    paginaActual === totalPaginas
                      ? "bg-[#ecf0f1] text-[#bdc3c7] cursor-not-allowed"
                      : "bg-[#3498db] text-white hover:bg-[#2980b9] shadow-md transform hover:scale-105"
                  }`}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer de la tabla */}
        {productosPlanos.length > 0 && (
          <div className="bg-[#f8f9fa] px-2 sm:px-6 py-2 sm:py-4 border-t border-[#bdc3c7]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
              <span>
                Mostrando {productosPlanos.length} productos en {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'}
              </span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                <span>
                  Total: <strong className="text-[#27ae60]">
                    ${ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0).toLocaleString("es-AR")}
                  </strong>
                </span>
                <span>
                  Ganancia: <strong className={`${
                    productosPlanos
                      .filter(p => p.gananciaCalculada !== null)
                      .reduce((sum, p) => sum + p.gananciaCalculada, 0) > 0 
                      ? 'text-[#27ae60]' : 'text-[#e74c3c]'
                  }`}>
                    ${productosPlanos
                      .filter(p => p.gananciaCalculada !== null)
                      .reduce((sum, p) => sum + p.gananciaCalculada, 0)
                      .toLocaleString("es-AR")}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación DE VENTA COMPLETA */}
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

      {/* Modal de confirmación de eliminación DE PRODUCTO INDIVIDUAL */}
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

      {/* Modal de Remito */}
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