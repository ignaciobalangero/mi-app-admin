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
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { reponerAccesoriosAlStock } from "./reponerAccesorioEnStock";
import { reponerRepuestosAlStock } from "./reponerRepuestosAlStock";
import React from "react";


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
  
    await deleteDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${ventaAEliminar.id}`));
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

      <input
        type="text"
        placeholder="Buscar por cliente"
        value={filtroCliente}
        onChange={(e) => setFiltroCliente(e.target.value)}
        className="border px-2 py-1 w-full mb-2"
      />

      <table className="w-full text-sm border border-gray-400 divide-y divide-gray-400">
        <thead className="bg-gray-100 divide-x divide-gray-400">
          <tr>
            <th className="p-1">Fecha</th>
            <th className="p-1">Cliente</th>
            <th className="p-1">Categoría</th>
            <th className="p-1">Producto</th>
            <th className="p-1">Marca</th>
            <th className="p-1">Modelo</th>
            <th className="p-1">Color</th>
            <th className="p-1">Cantidad</th>
            <th className="p-1">Precio Unitario</th>
            <th className="p-1">Total</th>
            <th className="p-1">Acciones</th>
          </tr>
        </thead>
        <tbody>
  {ventas
    .filter((v) =>
      v.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
    )
    .map((venta) => (
      <React.Fragment key={venta.id}>
        {venta.productos.map((p: any, i: number) => (
          <tr
            key={`${venta.id}-${i}`}
            className={`divide-x divide-gray-400 border-b ${
              i === 0 ? "bg-white" : "bg-gray-50"
            }`}
          >
            <td className="p-1">{i === 0 ? venta.fecha : ""}</td>
            <td className="p-1">{i === 0 ? venta.cliente : ""}</td>
            <td className="p-1">{p.categoria === "Repuesto" && p.hoja ? p.hoja : p.categoria}</td>
            <td className="p-1">
              {p.producto || p.descripcion || "—"}
              {p.hoja ? ` (${p.hoja})` : ""}
            </td>
            <td className="p-1">{p.marca || "—"}</td>
            <td className="p-1">{p.modelo || "—"}</td>
            <td className="p-1">{p.color || "—"}</td>
            <td className="p-1">{p.cantidad}</td>
            <td className="p-1">
              ${p.precioUnitario?.toLocaleString("es-AR") || "—"}
            </td>
            <td className="p-1">
              ${((p.precioUnitario || 0) * p.cantidad).toLocaleString("es-AR")}
            </td>
            <td className="p-1 flex gap-1 justify-center">
              <button
                onClick={() => editarVenta(venta)}
                className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs"
              >
                Editar
              </button>
              {venta.productos.length > 1 ? (
  <button
    onClick={async () => {
      const productoEliminado = venta.productos[i];
      const nuevosProductos = venta.productos.filter((_, idx) => idx !== i);
      const total = nuevosProductos.reduce(
        (acc, p) => acc + p.precioUnitario * p.cantidad,
        0
      );

      // 🟢 Reponer al stock si tiene código
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

      // Refrescar la tabla
      const snap = await getDocs(
        query(
          collection(db, `negocios/${rol?.negocioID}/ventasGeneral`),
          orderBy("timestamp", "desc")
        )
      );
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVentas(data);
    }}
    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
  >
    🗑 Eliminar producto
  </button>
) : (
  <button
    onClick={() => pedirConfirmacionEliminar(venta)}
    className="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-xs"
  >
    ❌ Eliminar venta
  </button>
)}

            </td>
          </tr>
        ))}
      </React.Fragment>
    ))}
</tbody>

      </table>

      {/* Modal de edición */}
      {mostrarModal && ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Editar venta</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={ventaSeleccionada.fecha}
                onChange={(e) =>
                  setVentaSeleccionada((prev: any) => ({
                    ...prev,
                    fecha: e.target.value,
                  }))
                }
                className="p-2 border rounded"
                placeholder="Fecha"
              />
              <input
                type="text"
                value={ventaSeleccionada.cliente}
                onChange={(e) =>
                  setVentaSeleccionada((prev: any) => ({
                    ...prev,
                    cliente: e.target.value,
                  }))
                }
                className="p-2 border rounded"
                placeholder="Cliente"
              />
              <textarea
                value={ventaSeleccionada.observaciones}
                onChange={(e) =>
                  setVentaSeleccionada((prev: any) => ({
                    ...prev,
                    observaciones: e.target.value,
                  }))
                }
                className="p-2 border rounded col-span-1 md:col-span-2"
                placeholder="Observaciones"
              />
            </div>

            <div className="space-y-4 max-h-[300px] overflow-auto">
              {ventaSeleccionada.productos?.map((p: any, i: number) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                  <input
                    value={p.descripcion}
                    onChange={(e) => {
                      const copia = [...ventaSeleccionada.productos];
                      copia[i].descripcion = e.target.value;
                      setVentaSeleccionada((prev: any) => ({
                        ...prev,
                        productos: copia,
                      }));
                    }}
                    className="p-2 border rounded"
                    placeholder="Producto"
                  />
                  <input
                    value={p.categoria}
                    onChange={(e) => {
                      const copia = [...ventaSeleccionada.productos];
                      copia[i].categoria = e.target.value;
                      setVentaSeleccionada((prev: any) => ({
                        ...prev,
                        productos: copia,
                      }));
                    }}
                    className="p-2 border rounded"
                    placeholder="Categoría"
                  />
                  <input
                    type="number"
                    value={p.cantidad}
                    onChange={(e) => {
                      const copia = [...ventaSeleccionada.productos];
                      copia[i].cantidad = Number(e.target.value);
                      setVentaSeleccionada((prev: any) => ({
                        ...prev,
                        productos: copia,
                      }));
                    }}
                    className="p-2 border rounded"
                    placeholder="Cantidad"
                  />
                  <input
                    type="number"
                    value={p.precioUnitario}
                    onChange={(e) => {
                      const copia = [...ventaSeleccionada.productos];
                      copia[i].precioUnitario = Number(e.target.value);
                      setVentaSeleccionada((prev: any) => ({
                        ...prev,
                        productos: copia,
                      }));
                    }}
                    className="p-2 border rounded"
                    placeholder="Precio"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setMostrarModal(false)}
                className="text-gray-600 hover:underline"
              >
                Cancelar
              </button>
              <button
               onClick={async () => {
                const ref = doc(db, `negocios/${rol?.negocioID}/ventasGeneral/${ventaSeleccionada.id}`);
                const total = ventaSeleccionada.productos.reduce(
                  (acc: number, p: any) => acc + p.precioUnitario * p.cantidad,
                  0
                );
              
                await updateDoc(ref, {
                  ...ventaSeleccionada,
                  total,
                });
              
                setMostrarModal(false);
              
                // 🟡 ACTUALIZAMOS LAS VENTAS DESDE FIREBASE
                const snap = await getDocs(
                  query(
                    collection(db, `negocios/${rol?.negocioID}/ventasGeneral`),
                    orderBy("timestamp", "desc")
                  )
                );
                const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setVentas(data);
              }}              
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

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
