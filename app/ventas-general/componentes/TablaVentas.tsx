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
  const { cotizacion, actualizarCotizacion } = useCotizacion(rol?.negocioID || "");
  const [ventaParaRemito, setVentaParaRemito] = useState<any | null>(null);
  const [mostrarRemito, setMostrarRemito] = useState(false);

  // 🆕 NUEVOS ESTADOS PARA ELIMINACIÓN DE PRODUCTOS
  const [productoAEliminar, setProductoAEliminar] = useState<{venta: any, producto: any, index: number} | null>(null);
  const [mostrarConfirmarEliminarProducto, setMostrarConfirmarEliminarProducto] = useState(false);

  const editarVenta = (venta: any) => {
    setVentaSeleccionada(venta);
    setMostrarModal(true);
  };

  const pedirConfirmacionEliminar = (venta: any) => {
    setVentaAEliminar(venta);
    setMostrarConfirmarEliminar(true);
  };

  // 🆕 NUEVA FUNCIÓN PARA CONFIRMAR ELIMINACIÓN DE PRODUCTO
  const confirmarEliminarProducto = () => {
    if (productoAEliminar) {
      eliminarProducto(productoAEliminar.venta.id, productoAEliminar.index);
      setMostrarConfirmarEliminarProducto(false);
      setProductoAEliminar(null);
    }
  };

  // 🆕 NUEVA FUNCIÓN PARA ABRIR MODAL DE CONFIRMACIÓN DE PRODUCTO
  const pedirConfirmacionEliminarProducto = (venta: any, producto: any, index: number) => {
    setProductoAEliminar({ venta, producto, index });
    setMostrarConfirmarEliminarProducto(true);
  };

  // 🔧 FUNCIÓN CORREGIDA - Eliminar un producto individual de una venta
  const eliminarProducto = async (ventaId: string, productoIndex: number) => {
    if (!rol?.negocioID) return;

    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;

    const productoEliminado = venta.productos[productoIndex];
    const nuevosProductos = venta.productos.filter((_: any, idx: number) => idx !== productoIndex);

    // 🔥 REPONER AL STOCK SEGÚN EL TIPO CORRECTO
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
        productoEliminado.hoja  // 👈 AGREGAR ESTO
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

  // 🔧 FUNCIÓN CORREGIDA - Eliminar una venta completa
  const eliminarVentaCompleta = async (venta: any) => {
    if (!rol?.negocioID) return;

    // ✅ FILTRO ACCESORIOS - Mantener como está (funciona bien)
    const accesorios = venta.productos.filter(
      (p: any) => (p.tipo === "accesorio" || p.categoria === "Accesorio") && p.codigo
    );
    
    // 🔥 FILTRO CORREGIDO - Incluir productos de stockExtra (tipo "general")
    const repuestos = venta.productos.filter(
      (p: any) => (
        p.tipo === "repuesto" || 
        p.tipo === "general" ||
        p.categoria === "Repuesto" ||
        p.hoja  // 👈 AGREGAR ESTO
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

    // ✅ LÓGICA TELÉFONOS - Mantener como está (funciona bien)
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

        // Borrar de ventaTelefonos
        await deleteDoc(refTelefono);
      }
    }

    // Eliminar de ventasGeneral
    await deleteDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${venta.id}`));

    // Refrescar estado
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
    });

  return (
    <div className="space-y-6">
      {/* Header de filtros y controles - Responsive */}
      <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          
          {/* Filtros principales */}
          <div className="flex flex-col gap-4 w-full lg:min-w-[300px]">
            {/* Estados */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">📊</span>
                Estado:
              </span>
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={() => setFiltroEstado("todos")}
                  className={`px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none ${
                    filtroEstado === "todos" 
                      ? "bg-[#3498db] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroEstado("pendiente")}
                  className={`px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none ${
                    filtroEstado === "pendiente" 
                      ? "bg-[#f39c12] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  Pendiente
                </button>
                <button
                  onClick={() => setFiltroEstado("pagado")}
                  className={`px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none ${
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
              <span className="text-xs font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">🏷️</span>
                Categoría:
              </span>
              <div className="grid grid-cols-2 sm:flex gap-1 sm:gap-2">
                <button
                  onClick={() => setFiltroCategoria("todas")}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm ${
                    filtroCategoria === "todas" 
                      ? "bg-[#2c3e50] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  📊 Todas
                </button>
                <button
                  onClick={() => setFiltroCategoria("telefono")}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm ${
                    filtroCategoria === "telefono" 
                      ? "bg-[#27ae60] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  📱 Telefonos
                </button>
                <button
                  onClick={() => setFiltroCategoria("accesorio")}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm ${
                    filtroCategoria === "accesorio" 
                      ? "bg-[#3498db] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  🔌 Accesorios
                </button>
                <button
                  onClick={() => setFiltroCategoria("repuesto")}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm ${
                    filtroCategoria === "repuesto" 
                      ? "bg-[#f39c12] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  🔧 Repuestos
                </button>
              </div>
            </div>
          </div>

          {/* Buscador y cotización */}
          <div className="flex flex-col lg:flex-row gap-4 flex-1">
            {/* Buscador */}
            <div className="w-full lg:w-52">
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
                Buscar cliente:
              </label>
              <input
                type="text"
                placeholder="🔍 Filtrar por cliente..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
              />
            </div>

            {/* Cotización USD - CORREGIDA */}
            <div className="w-full lg:w-52">
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
                Cotización USD:
              </label>
              <div className="flex items-center gap-2 bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] px-2 sm:px-3 py-2 sm:py-3 rounded-lg border-2 border-[#f39c12]">
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
                  className="flex-1 px-2 py-2 border-2 border-[#f39c12] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] text-center font-medium text-sm text-[#2c3e50] min-w-0"
                />
                <div className="text-xs text-[#f39c12] whitespace-nowrap">
                  <div className="font-medium">ARS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla principal - UNA SOLA VISTA RESPONSIVE */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Ventas Registradas</h3>
              <p className="text-blue-100 text-xs sm:text-sm">
                {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'} encontradas
              </p>
            </div>
          </div>
        </div>

        {/* Tabla responsive con scroll horizontal controlado */}
        <div className="overflow-x-auto border border-[#bdc3c7]">
          <table className="w-full min-w-[800px] lg:min-w-[1200px] border-collapse">
            <thead className="bg-[#ecf0f1]">
              <tr>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-12 sm:w-16 lg:w-20">
                  <span className="hidden sm:inline">📋 </span>Nro
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-16 sm:w-20 lg:w-24">
                  <span className="hidden sm:inline">📅 </span>Fecha
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  <span className="hidden sm:inline">👤 </span>Cliente
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  <span className="hidden sm:inline">🏷️ </span>Cat.
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  <span className="hidden sm:inline">📱 </span>Producto
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  🏭 Marca
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                  📱 Modelo
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell w-16 lg:w-20">
                  🎨 Color
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-12 sm:w-16">
                  <span className="hidden sm:inline">📦 </span>Cant.
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell w-20 lg:w-24">
                  💰 Precio
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  <span className="hidden sm:inline">💵 </span>Total
                </th>
                <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-20 sm:w-24 lg:w-32">
                  <span className="hidden sm:inline">⚙️ </span>Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 sm:p-12 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl">📊</span>
                      </div>
                      <div>
                        <p className="text-sm sm:text-lg font-medium text-[#7f8c8d]">
                          {ventas.length === 0 ? "No hay ventas registradas" : "No se encontraron resultados"}
                        </p>
                        <p className="text-xs sm:text-sm text-[#bdc3c7]">
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
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <span className="inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white">
                                #{venta.nroVenta || venta.id.slice(-6)}
                              </span>
                            ) : (
                              <span className="text-[#bdc3c7] text-sm">↳</span>
                            )}
                          </td>
                          
                          {/* Fecha */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <span className="text-xs sm:text-sm font-medium text-[#2c3e50]">{venta.fecha}</span>
                            ) : ""}
                          </td>
                          
                          {/* Cliente */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <span className="text-xs sm:text-sm font-medium text-[#2c3e50]">{venta.cliente}</span>
                            ) : ""}
                          </td>
                          
                          {/* Categoría */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                            <span className={`inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-medium ${
                              p.categoria === "Teléfono" 
                                ? 'bg-[#27ae60] text-white'
                                : p.categoria === "Accesorio"
                                ? 'bg-[#3498db] text-white'
                                : p.categoria === "Repuesto"
                                ? 'bg-[#f39c12] text-white'
                                : 'bg-[#7f8c8d] text-white'
                            }`}>
                              <span className="sm:hidden">
                                {p.categoria === "Teléfono" ? "📱" : p.categoria === "Accesorio" ? "🔌" : "🔧"}
                              </span>
                              <span className="hidden sm:inline">
                                {p.categoria === "Repuesto" && p.hoja ? p.hoja : p.categoria}
                              </span>
                            </span>
                          </td>
                          
                          {/* Producto */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                            <div className="text-xs sm:text-sm text-[#2c3e50]">
                              <div className="font-semibold">
                                {((p.producto || p.descripcion || "—").length > 15 
                                  ? (p.producto || p.descripcion || "—").substring(0, 15) + "..." 
                                  : (p.producto || p.descripcion || "—"))}
                              </div>
                              <div className="text-xs text-[#7f8c8d] lg:hidden">
                                {p.marca} {p.modelo} {p.color}
                              </div>
                            </div>
                          </td>
                          
                          {/* Marca - Solo en desktop */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell">
                            <span className="text-sm text-[#7f8c8d]">{p.marca || "—"}</span>
                          </td>
                          
                          {/* Modelo - Solo en desktop */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell">
                            <span className="text-sm text-[#7f8c8d]">{p.modelo || "—"}</span>
                          </td>
                          
                          {/* Color - Solo en desktop - CORREGIDA */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell w-16 lg:w-20">
                            <span className="inline-flex items-center px-1 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50] truncate">
                              {p.color || "—"}
                            </span>
                          </td>
                          
                          {/* Cantidad */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                            <span className="inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white">
                              {p.cantidad}
                            </span>
                          </td>
                          
                          {/* Precio - Solo en desktop */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell">
                            <span className="text-sm font-medium text-[#2c3e50]">
                              {(() => {
                                // ✅ DETECTAR SI HAY TELÉFONO EN LA VENTA
                                const hayTelefono = venta.productos.some((prod: any) => prod.categoria === "Teléfono");
                                
                                if (hayTelefono) {
                                  // 📱 CON TELÉFONO: Mostrar precio × cotización (referencia ARS)
                                 // NUEVO: Mostrar moneda original cuando hay teléfono
                              if (p.categoria === "Teléfono") {
                                return `USD ${p.precioUnitario.toLocaleString("es-AR")}`;
                              } else {
                                return p.moneda?.toUpperCase() === "USD"
                                  ? `USD ${p.precioUnitario.toLocaleString("es-AR")}`
                                  : `${p.precioUnitario.toLocaleString("es-AR")}`;
                              }
                                } else {
                                  // 🛍️ SIN TELÉFONO: Mostrar precio convertido dinámicamente
                                  if (p.moneda?.toUpperCase() === "USD") {
                                    return `${((p.precioUSD || p.precioUnitario) * cotizacion).toLocaleString("es-AR")}`;
                                  } else {
                                    return `${p.precioUnitario.toLocaleString("es-AR")}`;
                                  }
                                }
                              })()}
                            </span>
                          </td>

                           {/* Total */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                            <span className="text-xs sm:text-sm font-bold text-[#27ae60]">
                              {(() => {
                                // ✅ DETECTAR SI HAY TELÉFONO EN LA VENTA
                                const hayTelefono = venta.productos.some((prod: any) => prod.categoria === "Teléfono");
                                
                                if (hayTelefono) {
                                  // 📱 CON TELÉFONO: Mostrar moneda original
                                  if (p.categoria === "Teléfono") {
                                    return `USD ${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`;
                                  } else {
                                    // Accesorio/Repuesto: Mostrar según su moneda original
                                    return p.moneda?.toUpperCase() === "USD"
                                      ? `USD ${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`
                                      : `$ ${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`;
                                  }
                                } else {
                                  // 🛍️ SIN TELÉFONO: Conversión dinámica (NO CAMBIAR)
                                  if (p.moneda?.toUpperCase() === "USD") {
                                    return `$ ${((p.precioUSD || p.precioUnitario) * p.cantidad * cotizacion).toLocaleString("es-AR")}`;
                                  } else {
                                    return `$ ${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`;
                                  }
                                }
                              })()}
                            </span>
                          </td>

                          {/* Acciones - CORREGIDA */}
                          <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] w-20 sm:w-24 lg:w-32">
                            <div className="flex flex-col items-center gap-1">
                              {/* Select de estado - Solo en la primera fila */}
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
                                  className={`text-xs px-1 py-1 border-2 rounded text-center font-medium transition-all w-full ${
                                    (venta.estado || "pendiente") === "pagado"
                                      ? "bg-[#27ae60] text-white border-[#27ae60]"
                                      : "bg-[#f39c12] text-white border-[#f39c12]"
                                  }`}
                                >
                                  <option value="pendiente">Pend.</option>
                                  <option value="pagado">Pago</option>
                                </select>
                              )}

                              {/* Botones - SIN ICONOS DUPLICADOS */}
                              <div className="flex gap-1 w-full">
                                {esProductoPrincipal && (
                                  <>
                                    <button
                                      onClick={() => editarVenta(venta)}
                                      className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-1 py-1 rounded text-xs flex-1 font-medium transition-all duration-200"
                                      title="Editar"
                                    >
                                      ✏️
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setVentaParaRemito(venta);
                                        setMostrarRemito(true);
                                      }}
                                      className="bg-[#3498db] hover:bg-[#2980b9] text-white px-1 py-1 rounded text-xs flex-1 font-medium transition-all duration-200 hidden sm:inline-block"
                                      title="Remito"
                                    >
                                      🖨️
                                    </button>
                                  </>
                                )}

                                {/* 🔧 BOTÓN CORREGIDO - SIEMPRE usa el nuevo modal para productos */}
                                <button
                                  onClick={() => pedirConfirmacionEliminarProducto(venta, p, i)}
                                  className={`hover:bg-[#c0392b] text-white px-1 py-1 rounded text-xs flex-1 font-medium transition-all duration-200 ${
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

        {/* Footer de la tabla */}
        {ventasFiltradas.length > 0 && (
          <div className="bg-[#f8f9fa] px-3 sm:px-6 py-3 sm:py-4 border-t border-[#bdc3c7]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
              <span>
                Mostrando {ventasFiltradas.length} de {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
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
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación DE VENTA COMPLETA */}
      {mostrarConfirmarEliminar && ventaAEliminar && (
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
            
            {/* Contenido del modal */}
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
              
              {/* Botones */}
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

      {/* 🆕 Modal de confirmación de eliminación DE PRODUCTO INDIVIDUAL */}
      {mostrarConfirmarEliminarProducto && productoAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
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
            
            {/* Contenido del modal */}
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
              
              {/* Botones */}
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
    </div>
  );
}