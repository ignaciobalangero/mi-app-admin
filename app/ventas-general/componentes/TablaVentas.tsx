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
      {/* Header de filtros y controles - Estilo GestiOne */}
      <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Filtros principales */}
          <div className="flex flex-col gap-4 min-w-[300px]">
            {/* Fila 1: Estados */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#2c3e50] flex items-center gap-2">
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
                  Pendientes
                </button>
                <button
                  onClick={() => setFiltroEstado("pagado")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                    filtroEstado === "pagado" 
                      ? "bg-[#27ae60] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  Pagadas
                </button>
              </div>
            </div>

            {/* Fila 2: Categorías */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">🏷️</span>
                Categoría:
              </span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFiltroCategoria("todas")}
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                    filtroCategoria === "todas" 
                      ? "bg-[#2c3e50] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  📊 Todas
                </button>
                <button
                  onClick={() => setFiltroCategoria("telefono")}
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                    filtroCategoria === "telefono" 
                      ? "bg-[#27ae60] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  📱 Teléfonos
                </button>
                <button
                  onClick={() => setFiltroCategoria("accesorio")}
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                    filtroCategoria === "accesorio" 
                      ? "bg-[#3498db] text-white shadow-md" 
                      : "bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50]"
                  }`}
                >
                  🔌 Accesorios
                </button>
                <button
                  onClick={() => setFiltroCategoria("repuesto")}
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
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

          {/* Buscador de cliente - Estilo GestiOne */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-[#2c3e50] block mb-3 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
              Buscar cliente:
            </label>
            <input
              type="text"
              placeholder="🔍 Filtrar por nombre de cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
            />
          </div>

          {/* Control de cotización USD - Estilo GestiOne */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <span className="text-xs font-semibold text-[#2c3e50] flex items-center gap-2">
              <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
              Cotización USD:
            </span>
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] px-3 py-3 rounded-lg border-2 border-[#f39c12]">
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
                className="w-20 px-2 py-2 border-2 border-[#f39c12] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] text-center font-medium text-sm text-[#2c3e50]"
              />
              <div className="text-xs text-[#f39c12]">
                <div className="font-medium">ARS</div>
                <div className="text-[#7f8c8d]">(Solo pendientes)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla principal - Estilo GestiOne */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Ventas Registradas</h3>
              <p className="text-blue-100 text-sm">
                {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'} encontradas
              </p>
            </div>
          </div>
        </div>

        {/* Contenedor con scroll horizontal */}
        <div className="overflow-x-auto border border-[#bdc3c7]">
          <table className="w-full min-w-[1400px] border-collapse">
            <thead className="bg-[#ecf0f1]">
              <tr>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-20">
                  📋 Nro Venta
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-24">
                  📅 Fecha
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  👤 Cliente
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  🏷️ Categoría
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📱 Producto
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  🏭 Marca
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📱 Modelo
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  🎨 Color
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  📦 Cantidad
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-24">
                  💰 Precio ARS/USD
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  💵 Total
                </th>
                <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                  ⚙️ Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                        <span className="text-3xl">📊</span>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-[#7f8c8d]">
                          {ventas.length === 0 ? "No hay ventas registradas" : "No se encontraron resultados"}
                        </p>
                        <p className="text-sm text-[#bdc3c7]">
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
                          {/* Nro Venta - Solo en la primera fila del grupo */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white">
                                #{venta.nroVenta || venta.id.slice(-6)}
                              </span>
                            ) : (
                              <span className="text-[#bdc3c7] text-sm">↳</span>
                            )}
                          </td>
                          
                          {/* Fecha - Solo en la primera fila del grupo */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <span className="text-sm font-medium text-[#2c3e50]">{venta.fecha}</span>
                            ) : ""}
                          </td>
                          
                          {/* Cliente - Solo en la primera fila del grupo */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            {esProductoPrincipal ? (
                              <span className="text-sm font-medium text-[#2c3e50]">{venta.cliente}</span>
                            ) : ""}
                          </td>
                          
                          {/* Categoría */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              p.categoria === "Teléfono" 
                                ? 'bg-[#27ae60] text-white'
                                : p.categoria === "Accesorio"
                                ? 'bg-[#3498db] text-white'
                                : p.categoria === "Repuesto"
                                ? 'bg-[#f39c12] text-white'
                                : 'bg-[#7f8c8d] text-white'
                            }`}>
                              {p.categoria === "Repuesto" && p.hoja ? p.hoja : p.categoria}
                            </span>
                          </td>
                          
                          {/* Producto */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className="text-sm text-[#2c3e50]">
                              {p.producto || p.descripcion || "—"}
                              {p.hoja ? ` (${p.hoja})` : ""}
                            </span>
                          </td>
                          
                          {/* Marca */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className="text-sm text-[#7f8c8d]">{p.marca || "—"}</span>
                          </td>
                          
                          {/* Modelo */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className="text-sm text-[#7f8c8d]">{p.modelo || "—"}</span>
                          </td>
                          
                          {/* Color */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50]">
                              {p.color || "—"}
                            </span>
                          </td>
                          
                          {/* Cantidad */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white">
                              {p.cantidad}
                            </span>
                          </td>
                          
                          {/* Precio ARS */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className="text-sm font-medium text-[#2c3e50]">
                              {p.moneda?.toUpperCase() === "USD"
                                ? `$${(p.precioUnitario * cotizacion).toLocaleString("es-AR")}`
                                : `$${p.precioUnitario.toLocaleString("es-AR")}`}
                            </span>
                          </td>

                          {/* Total en ARS */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
                            <span className="text-sm font-bold text-[#27ae60]">
                              {venta.moneda === "USD"
                                ? `USD $${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`
                                : `$${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="p-3 text-center border border-[#bdc3c7]">
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
                                  className={`text-xs px-2 py-1 border-2 rounded-lg w-full text-center font-medium transition-all ${
                                    (venta.estado || "pendiente") === "pagado"
                                      ? "bg-[#27ae60] text-white border-[#27ae60]"
                                      : "bg-[#f39c12] text-white border-[#f39c12]"
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
                                      className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
                                    >
                                      ✏️ Editar
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setVentaParaRemito(venta);
                                        setMostrarRemito(true);
                                      }}
                                      className="bg-[#3498db] hover:bg-[#2980b9] text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
                                    >
                                      🖨️ Remito
                                    </button>
                                  </>
                                )}

                                {venta.productos.length > 1 ? (
                                  <button
                                    onClick={() => eliminarProducto(venta.id, i)}
                                    className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
                                  >
                                    🗑️
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => pedirConfirmacionEliminar(venta)}
                                    className="bg-[#c0392b] hover:bg-[#a93226] text-white px-2 py-1 rounded-lg text-xs flex-1 font-medium transition-all duration-200"
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

        {/* Footer de la tabla - Estilo GestiOne */}
        {ventasFiltradas.length > 0 && (
          <div className="bg-[#f8f9fa] px-6 py-4 border-t border-[#bdc3c7]">
            <div className="flex justify-between items-center text-sm text-[#7f8c8d]">
              <span>
                Mostrando {ventasFiltradas.length} de {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
              </span>
              <div className="flex gap-6">
                <span>
                  Total productos: <strong className="text-[#3498db]">
                    {ventasFiltradas.reduce((sum, v) => sum + v.productos.length, 0)}
                  </strong>
                </span>
                <span>
                  Valor total: <strong className="text-[#27ae60]">
                    ${ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0).toLocaleString("es-AR")}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación - Estilo GestiOne */}
      {mostrarConfirmarEliminar && ventaAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-2 border-[#e74c3c] rounded-lg p-4">
                <p className="text-[#e74c3c] font-medium">
                  ¿Estás seguro que querés eliminar esta venta?
                </p>
                <div className="mt-2 text-sm text-[#7f8c8d]">
                  <strong>Cliente:</strong> {ventaAEliminar.cliente}<br/>
                  <strong>Productos:</strong> {ventaAEliminar.productos.length}
                </div>
              </div>
              
              {/* Botones */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setMostrarConfirmarEliminar(false)}
                  className="px-6 py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarVenta}
                  className="px-6 py-3 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
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
    </div>
  );
}