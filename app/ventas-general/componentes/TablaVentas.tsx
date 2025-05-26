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
  const { cotizacion, actualizarCotizacion } = useCotizacion(rol?.negocioID || "");

  const editarVenta = (venta: any) => {
    setVentaSeleccionada(venta);
    setMostrarModal(true);
  };

  const pedirConfirmacionEliminar = (venta: any) => {
    setVentaAEliminar(venta);
    setMostrarConfirmarEliminar(true);
  };

  const eliminarVenta = async () => {
    if (!rol?.negocioID || !ventaAEliminar) return;
  
    const accesorios = ventaAEliminar.productos.filter(
      (p: any) => p.categoria === "Accesorio" && p.codigo
    );
    const repuestos = ventaAEliminar.productos.filter(
      (p: any) => p.categoria === "Repuesto" && p.codigo
    );
  
    await reponerAccesoriosAlStock({
      productos: accesorios,
      negocioID: rol.negocioID,
    });
  
    await reponerRepuestosAlStock({
      productos: repuestos,
      negocioID: rol.negocioID,
    });
  
    // ✅ Lógica adicional si es una venta de teléfono
    if (!rol?.negocioID || !ventaAEliminar) return;

  const ventaRef = doc(db, `negocios/${rol.negocioID}/ventaTelefonos/${ventaAEliminar.id}`);
  const snap = await getDoc(ventaRef);

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

    await deleteDoc(ventaRef); // ❌ ventaTelefonos
  }

  await deleteDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${ventaAEliminar.id}`)); // ❌ ventasGeneral

  setVentas((prev) => prev.filter((v) => v.id !== ventaAEliminar.id));
  setMostrarConfirmarEliminar(false);
};
  
  
  useEffect(() => {
    const obtenerVentas = async () => {
      if (!rol?.negocioID) return;
      const snap = await getDocs(
        query(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), orderBy("timestamp", "desc"))
      );
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVentas(data);
    };
    obtenerVentas();
  }, [rol?.negocioID, refrescar]); // ✅ acá refrescar
  
  

  return (
    <div className="mt-10 space-y-2">
      <h2 className="text-xl font-semibold">Ventas registradas</h2>
      <div className="flex gap-2 items-center mb-2">
  <span className="font-medium">Estado:</span>
  <button
    onClick={() => setFiltroEstado("todos")}
    className={`px-3 py-1 rounded border ${filtroEstado === "todos" ? "bg-blue-600 text-white" : "bg-white"}`}
  >
    Todos
  </button>
  <button
    onClick={() => setFiltroEstado("pendiente")}
    className={`px-3 py-1 rounded border ${filtroEstado === "pendiente" ? "bg-yellow-400 text-white" : "bg-white"}`}
  >
    Pendientes
  </button>
  <button
    onClick={() => setFiltroEstado("pagado")}
    className={`px-3 py-1 rounded border ${filtroEstado === "pagado" ? "bg-green-600 text-white" : "bg-white"}`}
  >
    Pagadas
  </button>
</div>

   <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
  <input
    type="text"
    placeholder="Buscar por cliente"
    value={filtroCliente}
    onChange={(e) => setFiltroCliente(e.target.value)}
    className="border px-2 py-1 w-full md:max-w-sm"
  />

  <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded border border-yellow-300 text-sm">
    <span>Cotización USD:</span>
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
  className="w-20 px-2 py-1 border rounded"
/>

    <span className="text-xs text-gray-600 italic">(Cambia ventas pendeintes)</span>
  </div>
</div>


      <table className="w-full text-sm border border-gray-400 divide-y divide-gray-400">
        <thead className="bg-gray-100 divide-x divide-gray-400">
          <tr>
            <th className="p-1 w-24">Fecha</th>
            <th className="p-1">Cliente</th>
            <th className="p-1">Categoría</th>
            <th className="p-1">Producto</th>
            <th className="p-1">Marca</th>
            <th className="p-1">Modelo</th>
            <th className="p-1">Color</th>
            <th className="p-1">Cantidad</th>
            <th className="p-1 w-24">Precio ARS</th>
            <th className="p-1">Precio USD</th>
            <th className="p-1">Total</th>
            <th className="p-1">Acciones</th>
          </tr>
        </thead>
        <tbody>
  {ventas
    .filter((v) =>
      v.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
    )
    .filter((v) =>
      filtroEstado === "todos" ? true : (v.estado || "pendiente") === filtroEstado
    )
    .map((venta) => (
  
      <React.Fragment key={venta.id}>
        {venta.productos.map((p: any, i: number) => (
         <tr
         key={`${venta.id}-${i}`}
         className={`divide-x divide-gray-400 border-b ${
           (venta.estado || "pendiente") === "pagado"
             ? "bg-green-100"
             : (venta.estado || "pendiente") === "pendiente"
             ? "bg-yellow-100"
             : "bg-white"
         }`}
       >
       
            <td className="p-1 text-center">{i === 0 ? venta.fecha : ""}</td>
            <td className="p-1 text-center">{i === 0 ? venta.cliente : ""}</td>
            <td className="p-1 text-center">{p.categoria === "Repuesto" && p.hoja ? p.hoja : p.categoria}</td>
            <td className="p-1 text-center">
              {p.producto || p.descripcion || "—"}
              {p.hoja ? ` (${p.hoja})` : ""}
            </td>
            <td className="p-1 text-center">{p.marca || "—"}</td>
            <td className="p-1  text-center">{p.modelo || "—"}</td>
            <td className="p-1 text-center">{p.color || "—"}</td>
            <td className="p-1 text-center">{p.cantidad}</td>
            {/* Precio ARS */}
<td className="p-1 text-center">
  {p.moneda?.toUpperCase() === "USD"
    ? `$${(p.precioUnitario * cotizacion).toLocaleString("es-AR")}`
    : `$${p.precioUnitario.toLocaleString("es-AR")}`}
</td>

{/* Precio USD */}
<td className="p-1 text-center">
  {p.moneda?.toUpperCase() === "USD"
    ? `USD $${(p.precioUnitario).toLocaleString("es-AR")}`
    : "—"}
</td>

{/* Total en ARS */}
<td className="p-1 text-center">
  {p.moneda?.toUpperCase() === "USD"
    ? `$${(p.precioUnitario * p.cantidad * cotizacion).toLocaleString("es-AR")}`
    : `$${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`}
</td>



<td className="p-1 align-top">
  <div className="flex flex-col items-center gap-1">
    {/* Select de estado */}
    <select
      value={venta.estado || "pendiente"}
      onChange={async (e) => {
        const nuevoEstado = e.target.value;
        await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${venta.id}`), {
          estado: nuevoEstado,
        });

        const snap = await getDocs(
          query(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), orderBy("timestamp", "desc"))
        );
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setVentas(data);
      }}
      className={`text-xs px-2 py-1 border rounded w-full text-center ${
        (venta.estado || "pendiente") === "pagado"
          ? "bg-green-100"
          : "bg-yellow-100"
      }`}
    >
      <option value="pendiente">Pendiente</option>
      <option value="pagado">Pagado</option>
    </select>

    {/* Botones horizontal */}
    <div className="flex gap-1 w-full">
      <button
        onClick={() => editarVenta(venta)}
        className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs flex-1"
      >
        Editar
      </button>

      {venta.productos.length > 1 ? (
        <button
          onClick={async () => {
            const productoEliminado = venta.productos[i];
            const nuevosProductos = venta.productos.filter((_, idx) => idx !== i);
            const total = nuevosProductos.reduce(
              (acc, p) => acc + (p.precioUnitario * (p.moneda === "USD" ? cotizacion : 1)) * p.cantidad,
              0
            );

            if (productoEliminado.codigo) {
              if (productoEliminado.categoria === "Accesorio") {
                await reponerAccesoriosAlStock({
                  productos: [productoEliminado],
                  negocioID: rol.negocioID,
                });
              } else if (productoEliminado.categoria === "Repuesto") {
                await reponerRepuestosAlStock({
                  productos: [productoEliminado],
                  negocioID: rol.negocioID,
                });
              }
            }

            await updateDoc(doc(db, `negocios/${rol?.negocioID}/ventasGeneral/${venta.id}`), {
              productos: nuevosProductos,
              total,
            });

            const snap = await getDocs(
              query(
                collection(db, `negocios/${rol?.negocioID}/ventasGeneral`),
                orderBy("timestamp", "desc")
              )
            );
            const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setVentas(data);
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex-1"
        >
          🗑 Eliminar
        </button>
      ) : (
        <button
          onClick={() => pedirConfirmacionEliminar(venta)}
          className="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-xs flex-1"
        >
          ❌Eliminar
        </button>
      )}
    </div>
  </div>
</td>


          </tr>
        ))}
      </React.Fragment>
    ))}
</tbody>

      </table>

      {/* Modal de confirmación de eliminación */}
      {mostrarConfirmarEliminar && ventaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md text-center">
            <h3 className="text-lg font-bold mb-4">¿Eliminar esta venta?</h3>
            <p className="text-gray-600 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setMostrarConfirmarEliminar(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarVenta}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
