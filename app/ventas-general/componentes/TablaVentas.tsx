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

  const editarVenta = (venta: any) => {
    setVentaSeleccionada(venta);
    setMostrarModal(true);
  };

  const pedirConfirmacionEliminar = (venta: any) => {
    setVentaAEliminar(venta);
    setMostrarConfirmarEliminar(true);
  };

  // Función para eliminar un producto individual de una venta
  const eliminarProducto = async (ventaId: string, productoIndex: number) => {
    if (!rol?.negocioID) return;

    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;

    const productoEliminado = venta.productos[productoIndex];
    const nuevosProductos = venta.productos.filter((_: any, idx: number) => idx !== productoIndex);

    // Reponer al stock según el tipo de producto
    if (productoEliminado.codigo) {
      if (productoEliminado.tipo === "accesorio" || productoEliminado.categoria === "Accesorio") {
        await reponerAccesoriosAlStock({
          productos: [productoEliminado],
          negocioID: rol.negocioID,
        });
      } else if (productoEliminado.tipo === "repuesto" || productoEliminado.categoria === "Repuesto") {
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

  // Función para eliminar una venta completa
  const eliminarVentaCompleta = async (venta: any) => {
    if (!rol?.negocioID) return;

    const accesorios = venta.productos.filter(
      (p: any) => (p.tipo === "accesorio" || p.categoria === "Accesorio") && p.codigo
    );
    
    const repuestos = venta.productos.filter(
      (p: any) => (p.tipo === "repuesto" || p.categoria === "Repuesto") && p.codigo
    );
    
    // Reponer accesorios y repuestos
    await reponerAccesoriosAlStock({
      productos: accesorios,
      negocioID: rol.negocioID,
    });

    await reponerRepuestosAlStock({
      productos: repuestos,
      negocioID: rol.negocioID,
    });

    // Si es una venta de teléfono, reponerlo al stock
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
      {/* Header de filtros y controles */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filtros principales - Ahora en 2 filas compactas */}
          <div className="flex flex-col gap-3 min-w-[300px]">
            {/* Fila 1: Estados */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-gray-600">Estado:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFiltroEstado("todos")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    filtroEstado === "todos" 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroEstado("pendiente")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    filtroEstado === "pendiente" 
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setFiltroEstado("pagado")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    filtroEstado === "pagado" 
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Pagadas
                </button>
              </div>
            </div>

            {/* Fila 2: Categorías */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-gray-600">Categoría:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFiltroCategoria("todas")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    filtroCategoria === "todas" 
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  📊 Todas
                </button>
                <button
                  onClick={() => setFiltroCategoria("telefono")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    filtroCategoria === "telefono" 
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  📱 Teléfonos
                </button>
                <button
                  onClick={() => setFiltroCategoria("accesorio")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    filtroCategoria === "accesorio" 
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  🔌 Accesorios
                </button>
                <button
                  onClick={() => setFiltroCategoria("repuesto")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    filtroCategoria === "repuesto" 
                      ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  🔧 Repuestos
                </button>
              </div>
            </div>
          </div>

          {/* Buscador de cliente */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 block mb-2">
              Buscar cliente:
            </label>
            <input
              type="text"
              placeholder="🔍 Filtrar por nombre de cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Control de cotización USD */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <span className="text-xs font-semibold text-gray-600">Cotización USD:</span>
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-2.5 rounded-lg border border-yellow-300">
              <span className="text-sm font-medium">$</span>
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
                className="w-20 px-2 py-1.5 border border-yellow-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center font-medium text-sm"
              />
              <div className="text-xs text-yellow-700">
                <div className="font-medium">ARS</div>
                <div className="text-yellow-600">(Solo pendientes)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            📊 Ventas Registradas
          </h3>
          <p className="text-purple-100 mt-1 text-sm">
            {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'} encontradas
          </p>
        </div>

        {/* Contenedor con scroll horizontal */}
        <div className="overflow-x-auto border border-gray-300">
          <table className="w-full min-w-[1400px] border-collapse">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-20">
                  📋 Nro Venta
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-24">
                  📅 Fecha
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  👤 Cliente
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏷️ Categoría
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📱 Producto
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🏭 Marca
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📱 Modelo
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  🎨 Color
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  📦 Cantidad
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-24">
                  💰 Precio ARS/USD
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  💵 Total
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200">
                  ⚙️ Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-gray-500 border border-gray-300">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">📊</span>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-600">
                          {ventas.length === 0 ? "No hay ventas registradas" : "No se encontraron resultados"}
                        </p>
                        <p className="text-sm text-gray-400">
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
                          className={`transition-colors duration-200 hover:bg-purple-50 border border-gray-300 ${
                            (venta.estado || "pendiente") === "pagado"
                              ? "bg-green-50"
                              : (venta.estado || "pendiente") === "pendiente"
                              ? "bg-yellow-50"
                              : isEven ? "bg-white" : "bg-gray-50"
                          } ${
                            tieneMultiplesProductos 
                              ? esProductoPrincipal 
                                ? 'border-l-4 border-l-blue-500' 
                                : 'border-l-4 border-l-blue-300' 
                              : ''
                          }`}
                        >
                          {/* Nro Venta - Solo en la primera fila del grupo */}
                          <td className="p-3 text-center border border-gray-300">
                            {esProductoPrincipal ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                #{venta.nroVenta || venta.id.slice(-6)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">↳</span>
                            )}
                          </td>
                          
                          {/* Fecha - Solo en la primera fila del grupo */}
                          <td className="p-3 text-center border border-gray-300">
                            {esProductoPrincipal ? (
                              <span className="text-sm font-medium text-gray-800">{venta.fecha}</span>
                            ) : ""}
                          </td>
                          
                          {/* Cliente - Solo en la primera fila del grupo */}
                          <td className="p-3 text-center border border-gray-300">
                            {esProductoPrincipal ? (
                              <span className="text-sm font-medium text-gray-800">{venta.cliente}</span>
                            ) : ""}
                          </td>
                          
                          {/* Categoría */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              p.categoria === "Teléfono" 
                                ? 'bg-green-100 text-green-700'
                                : p.categoria === "Accesorio"
                                ? 'bg-blue-100 text-blue-700'
                                : p.categoria === "Repuesto"
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {p.categoria === "Repuesto" && p.hoja ? p.hoja : p.categoria}
                            </span>
                          </td>
                          
                          {/* Producto */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className="text-sm text-gray-700">
                              {p.producto || p.descripcion || "—"}
                              {p.hoja ? ` (${p.hoja})` : ""}
                            </span>
                          </td>
                          
                          {/* Marca */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className="text-sm text-gray-700">{p.marca || "—"}</span>
                          </td>
                          
                          {/* Modelo */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className="text-sm text-gray-700">{p.modelo || "—"}</span>
                          </td>
                          
                          {/* Color */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {p.color || "—"}
                            </span>
                          </td>
                          
                          {/* Cantidad */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                              {p.cantidad}
                            </span>
                          </td>
                          
                          {/* Precio ARS */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className="text-sm font-medium text-gray-800">
                              {p.moneda?.toUpperCase() === "USD"
                                ? `$${(p.precioUnitario * cotizacion).toLocaleString("es-AR")}`
                                : `$${p.precioUnitario.toLocaleString("es-AR")}`}
                            </span>
                          </td>

                          {/* Total en ARS */}
                          <td className="p-3 text-center border border-gray-300">
                            <span className="text-sm font-bold text-green-700">
                              {venta.moneda === "USD"
                                ? `USD $${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`
                                : `$${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="p-3 text-center border border-gray-300">
                            <div className="flex flex-col items-center gap-2">
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
                                  className={`text-xs px-2 py-1 border rounded-lg w-full text-center font-medium transition-all ${
                                    (venta.estado || "pendiente") === "pagado"
                                      ? "bg-green-100 text-green-700 border-green-300"
                                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                                  }`}
                                >
                                  <option value="pendiente">Pendiente</option>
                                  <option value="pagado">Pagado</option>
                                </select>
                              )}

                              {/* Botones */}
                              <div className="flex gap-1 w-full">
                              {esProductoPrincipal && (
  <>
    <button
      onClick={() => editarVenta(venta)}
      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
    >
      ✏️ Editar
    </button>
    
    <button
      onClick={() => {
        setVentaParaRemito(venta);
        setMostrarRemito(true);
      }}
      className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
    >
      🖨️ Remito
    </button>
  </>
)}

                                {venta.productos.length > 1 ? (
                                  <button
                                    onClick={() => eliminarProducto(venta.id, i)}
                                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
                                  >
                                    🗑️
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => pedirConfirmacionEliminar(venta)}
                                    className="bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
                                  >
                                    ❌
                                  </button>
                                )}
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
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                Mostrando {ventasFiltradas.length} de {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
              </span>
              <div className="flex gap-6">
                <span>
                  Total productos: <strong className="text-blue-700">
                    {ventasFiltradas.reduce((sum, v) => sum + v.productos.length, 0)}
                  </strong>
                </span>
                <span>
                  Valor total: <strong className="text-green-700">
                    ${ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0).toLocaleString("es-AR")}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {mostrarConfirmarEliminar && ventaAEliminar && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 transform transition-all duration-300">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  ¿Estás seguro que querés eliminar esta venta?
                </p>
                <div className="mt-2 text-sm text-red-600">
                  <strong>Cliente:</strong> {ventaAEliminar.cliente}<br/>
                  <strong>Productos:</strong> {ventaAEliminar.productos.length}
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setMostrarConfirmarEliminar(false)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarVenta}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Sí, eliminar
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
</div>  // 👈 No tocar esta línea
);
}