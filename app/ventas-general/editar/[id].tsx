"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "../../Header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { reponerAccesoriosAlStock } from "@/app/ventas-general/componentes/reponerAccesorioEnStock";
import { reponerRepuestosAlStock } from "@/app/ventas-general/componentes/reponerRepuestosAlStock"; // si querés cubrir también repuestos

interface ProductoVenta {
  descripcion: string;
  categoria: string;
  cantidad: number;
  precioUnitario: number;
  marca?: string;
  modelo?: string;
  color?: string;
  codigo?: string;
  moneda?: string;
}

export default function FormularioEdicionVenta() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [user] = useAuthState(auth);
  const { rol } = useRol();

  const [fecha, setFecha] = useState("");
  const [cliente, setCliente] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [productos, setProductos] = useState<ProductoVenta[]>([]);
  const [mostrarConfirmarEliminar, setMostrarConfirmarEliminar] = useState(false);

  useEffect(() => {
    const obtenerVenta = async () => {
      if (!user || !id || !rol?.negocioID) return;

      const ref = doc(db, `negocios/${rol.negocioID}/ventasGeneral/${id}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setFecha(data.fecha || "");
        setCliente(data.cliente || "");
        setObservaciones(data.observaciones || "");
        setProductos(data.productos || []);
      }
    };
    obtenerVenta();
  }, [user, id, rol?.negocioID]);

  const handleChangeProducto = (index: number, campo: keyof ProductoVenta, valor: any) => {
    setProductos((prev) => {
      const copia = [...prev];
      copia[index] = {
        ...copia[index],
        [campo]: campo === "precioUnitario" || campo === "cantidad" ? Number(valor) : valor,
      };
      return copia;
    });
  };

  const eliminarProducto = (index: number) => {
    setProductos((prev) => prev.filter((_, i) => i !== index));
  };

  const guardarCambios = async () => {
    if (!id || !rol?.negocioID) return;

    const total = productos.reduce((acc, p) => acc + p.precioUnitario * p.cantidad, 0);
    await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${id}`), {
      productos,
      total,
      fecha,
      cliente,
      observaciones,
    });

    router.push("/ventas-general");
  };
  const eliminarProductoYActualizar = async (index: number) => {
    const nuevosProductos = productos.filter((_, i) => i !== index);
    setProductos(nuevosProductos);
  
    if (!id || !rol?.negocioID) return;
  
    // Si se eliminó el último producto, eliminar la venta entera
    if (nuevosProductos.length === 0) {
      await eliminarVenta();
      return;
    }
  
    const total = nuevosProductos.reduce((acc, p) => acc + p.precioUnitario * p.cantidad, 0);
  
    await updateDoc(doc(db, `negocios/${rol.negocioID}/ventasGeneral/${id}`), {
      productos: nuevosProductos,
      total,
    });
  
    // (Opcional) Si querés actualizar el sheet, lo agregamos después
  };
  
  const eliminarVenta = async () => {
    if (!rol?.negocioID || !id) return;
  
    const ref = doc(db, `negocios/${rol.negocioID}/ventasGeneral/${id}`);
    const snap = await getDoc(ref);
  
    if (!snap.exists()) return;
    const venta = snap.data();
  
    const accesorios = venta.productos.filter((p: any) => p.categoria === "Accesorio" && p.codigo);
    await reponerAccesoriosAlStock({ productos: accesorios, negocioID: rol.negocioID });
  
    const repuestos = venta.productos.filter((p: any) => p.categoria === "Repuesto" && p.codigo);
    await reponerRepuestosAlStock({ productos: repuestos, negocioID: rol.negocioID });
  
    await deleteDoc(ref);
  
    router.push("/ventas-general");
  };
  
  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-4">Editar Venta</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <input
            type="text"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="p-2 border rounded"
            placeholder="Fecha"
          />
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="p-2 border rounded"
            placeholder="Cliente"
          />
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="p-2 border rounded col-span-1 md:col-span-2"
            placeholder="Observaciones"
          />
        </div>

        <h2 className="text-xl font-semibold mt-8 mb-4 text-center">Productos</h2>

        <div className="space-y-4 max-w-6xl mx-auto">
          {productos.map((p, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center bg-white border p-2 rounded">
              <input
                value={p.descripcion}
                onChange={(e) => handleChangeProducto(i, "descripcion", e.target.value)}
                className="p-2 border rounded"
                placeholder="Descripción"
              />
              <input
                value={p.categoria}
                onChange={(e) => handleChangeProducto(i, "categoria", e.target.value)}
                className="p-2 border rounded"
                placeholder="Categoría"
              />
              <input
                value={p.marca || ""}
                onChange={(e) => handleChangeProducto(i, "marca", e.target.value)}
                className="p-2 border rounded"
                placeholder="Marca"
              />
              <input
                value={p.modelo || ""}
                onChange={(e) => handleChangeProducto(i, "modelo", e.target.value)}
                className="p-2 border rounded"
                placeholder="Modelo"
              />
              <input
                value={p.color || ""}
                onChange={(e) => handleChangeProducto(i, "color", e.target.value)}
                className="p-2 border rounded"
                placeholder="Color"
              />
              <input
                type="number"
                value={p.cantidad}
                onChange={(e) => handleChangeProducto(i, "cantidad", e.target.value)}
                className="p-2 border rounded"
                placeholder="Cantidad"
              />
              <input
                type="number"
                value={p.precioUnitario}
                onChange={(e) => handleChangeProducto(i, "precioUnitario", e.target.value)}
                className="p-2 border rounded"
                placeholder="Precio"
              />
              <div className="flex flex-col items-start md:items-center gap-1">
  <button
    onClick={() => eliminarProductoYActualizar(i)}
    className="text-red-600 hover:underline text-sm"
  >
    🗑 Eliminar producto
  </button>

  {productos.length > 1 && i === 0 && (
    <button
      onClick={() => setMostrarConfirmarEliminar(true)}
      className="text-red-800 hover:underline text-sm"
    >
      ❌ Eliminar venta completa
    </button>
  )}
</div>

            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between max-w-4xl mx-auto">
          <button
            onClick={() => setMostrarConfirmarEliminar(true)}
            className="text-red-600 hover:underline"
          >
            Eliminar venta
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => router.push("/ventas-general")}
              className="text-gray-600 hover:underline"
            >
              Cancelar
            </button>
            <button
              onClick={guardarCambios}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              Guardar cambios
            </button>
          </div>
        </div>

        {mostrarConfirmarEliminar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md text-center">
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
      </main>
    </>
  );
}
