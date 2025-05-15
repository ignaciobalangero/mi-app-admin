// Componente con botones Editar y Eliminar producto
"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useRol } from "@/lib/useRol";
import ModalAdvertencia from "./ModalAdvertencia"; // o la ruta correcta según dónde lo tengas

export default function AccionesProducto({ producto, sheetID, hoja, onRecargar }: {
  producto: any;
  sheetID: string;
  hoja: string;
  onRecargar: () => void;
}) {
  const { rol } = useRol();
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({
    producto: producto.producto || "",
    cantidad: producto.cantidad || 0,
    precioUSD: producto.precioUSD || 0,
    precio: producto.precio || 0,
    proveedor: producto.proveedor || "",
    precioCosto: producto.precioCosto || 0,
    stockMinimo: producto.stockMinimo || 0,
    stockIdeal: producto.stockIdeal || 0,
  
  });
  const [mensaje, setMensaje] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState("");


  const guardarCambios = async () => {
    try {
      const ref = doc(db, `negocios/${rol.negocioID}/stockExtra/${producto.codigo}`);
      const { precioUSD, precioCosto } = formData;
      const cotizacion = 1000; // si no estás usando cotización variable, ponelo fijo
      const precioARS = precioUSD * cotizacion;
      const ganancia = precioARS - precioCosto;

     await updateDoc(ref, {
       ...formData,
       precio: precioARS,
       ganancia,
    });


      await fetch("/api/actualizar-precios-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja }),
      });

      setMensaje("✅ Guardado exitosamente");
      setTimeout(() => {
        setMensaje("");
        setEditando(false);
        onRecargar();
      }, 1000);
    } catch (err) {
      console.error("❌ Error al guardar cambios:", err);
      setMensaje("❌ Error al guardar");
    }
  };
  const eliminarProducto = async () => {
    try {
      const ref = doc(db, `negocios/${rol.negocioID}/stockExtra/${producto.codigo}`);
      await deleteDoc(ref);
  
      const res = await fetch("/api/eliminar-del-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, codigo: producto.codigo }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        if (data.error?.includes("no se encontró el código")) {
          setMensajeAdvertencia("Este producto fue eliminado de Firebase, pero no se encontró en el Sheet.");
          setMostrarAdvertencia(true);
          return;
        } else {
          setMensajeAdvertencia("Ocurrió un error inesperado al intentar eliminar el producto del Sheet.");
          setMostrarAdvertencia(true);
          return;
        }
      }
  
      setMensaje("🗑️ Eliminado");
      setTimeout(() => {
        setMensaje("");
        onRecargar();
      }, 1000);
    } catch (err) {
      console.error("❌ Error al eliminar:", err);
      setMensaje("❌ Error al eliminar");
    }
  };  

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setEditando(true)}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
      >
        Editar
      </button>
      <button
        onClick={() => setConfirmarEliminar(true)}
        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
      >
        Eliminar
      </button>
  
      {editando && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4">✏️ Editar producto</h2>
  
            <label className="text-sm font-medium">Producto</label>
            <input
              value={formData.producto}
              onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              placeholder="Producto"
            />
  
            <label className="text-sm font-medium">Stock disponible</label>
            <input
              type="number"
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
              className="w-full p-2 border rounded mb-2"
              placeholder="Cantidad"
            />
  
            <label className="text-sm font-medium">Precio USD</label>
            <input
              type="number"
              value={formData.precioUSD}
              onChange={(e) => setFormData({ ...formData, precioUSD: Number(e.target.value) })}
              className="w-full p-2 border rounded mb-2"
              placeholder="Precio USD"
            />
  
            <label className="text-sm font-medium">Proveedor</label>
            <input
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              placeholder="Proveedor"
            />

  <label className="text-sm font-medium">Stock mínimo</label>
<input
  type="number"
  value={formData.stockMinimo}
  onChange={(e) => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
  className="w-full p-2 border rounded mb-2"
  placeholder="Stock mínimo"
/>

<label className="text-sm font-medium">Stock ideal</label>
<input
  type="number"
  value={formData.stockIdeal}
  onChange={(e) => setFormData({ ...formData, stockIdeal: Number(e.target.value) })}
  className="w-full p-2 border rounded mb-2"
  placeholder="Stock ideal"
/>

            <label className="text-sm font-medium">Precio de costo</label>
            <input
              type="number"
              value={formData.precioCosto}
              onChange={(e) => setFormData({ ...formData, precioCosto: Number(e.target.value) })}
              className="w-full p-2 border rounded mb-2"
              placeholder="Precio costo"
            />

            {mensaje && <p className="text-sm text-center my-2">{mensaje}</p>}
  
            <div className="flex justify-between mt-4">
              <button
                onClick={guardarCambios}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditando(false)}
                className="text-gray-600 hover:text-black px-4 py-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
  
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow max-w-xs text-center">
            <p className="mb-4">¿Eliminar <strong>{producto.producto}</strong>?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={eliminarProducto}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmarEliminar(false)}
                className="text-gray-600 hover:text-black px-4 py-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
  
      {mostrarAdvertencia && (
        <ModalAdvertencia
          mensaje={mensajeAdvertencia}
          onClose={() => setMostrarAdvertencia(false)}
        />
      )}
    </div>
  );
}