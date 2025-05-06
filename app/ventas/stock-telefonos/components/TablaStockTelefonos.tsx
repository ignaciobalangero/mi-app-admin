"use client";

import { useState, useEffect } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";
import StockProductosPage from "../../stock-accesorios-repuestos/accesorios/page";
import { useRol } from "@/lib/useRol";

interface Props {
  negocioID: string;
  filtroProveedor?: boolean;
  telefonos: any[];
  setTelefonos: React.Dispatch<React.SetStateAction<any[]>>;
  onEditar?: (telefono: any) => void;
}

export default function TablaStockTelefonos({ negocioID, filtroProveedor = false, telefonos, setTelefonos, onEditar }: Props) {
  const [filtro, setFiltro] = useState("");
  const [filtroProveedorTexto, setFiltroProveedorTexto] = useState("");
  const [telefonoAEliminar, setTelefonoAEliminar] = useState<any | null>(null);
  const [mensaje, setMensaje] = useState("");
  const { rol } = useRol();

  useEffect(() => {
    const keys = telefonos.map(t => t.id);
    const duplicados = keys.filter((id, i, arr) => arr.indexOf(id) !== i);
    if (duplicados.length) console.warn("🚨 IDs duplicados en stock:", duplicados);

    const vacios = telefonos.filter(t => !t.id);
    if (vacios.length) console.warn("🚨 Elementos sin ID:", vacios);
  }, [telefonos]);

  const confirmarEliminacion = async () => {
    if (!telefonoAEliminar) return;
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/stockTelefonos/${telefonoAEliminar.id}`));
      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const nuevosDatos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sinDuplicados = nuevosDatos.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      setTelefonos(sinDuplicados);
      setMensaje("✅ Teléfono eliminado correctamente");
    } catch (error) {
      console.error("❌ Error al borrar el teléfono:", error);
      alert("Ocurrió un error al intentar borrar el teléfono. Revisá la consola.");
    } finally {
      setTelefonoAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  const exportarExcel = () => {
    const hoja = telefonos.map((t) => ({
      Fecha: t.fechaIngreso?.toDate?.().toLocaleDateString?.("es-AR") || "-",
      Proveedor: t.proveedor,
      Modelo: t.modelo,
      Marca: t.marca,
      Estado: t.estado,
      Bateria: t.estado === "Usado" ? `${t.bateria}%` : "-",
      Almacenamiento: t.gb,
      Color: t.color,
      IMEI: t.imei,
      Serial: t.serial,
      Compra: t.precioCompra,
      Venta: t.precioVenta,
      Moneda: t.moneda,
      Observaciones: t.observaciones,
    }));
    const ws = XLSX.utils.json_to_sheet(hoja);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockTelefonos");
    XLSX.writeFile(wb, "stock_telefonos.xlsx");
  };

  const filtrados = telefonos.filter((t) =>
    t.modelo.toLowerCase().includes(filtro.toLowerCase()) &&
    t.marca.toLowerCase().includes(filtro.toLowerCase()) &&
    t.color.toLowerCase().includes(filtro.toLowerCase()) &&
    (!filtroProveedor || t.proveedor?.toLowerCase().includes(filtroProveedorTexto.toLowerCase()))
  );

  return (
    <div className="mt-10 w-full">
      {mensaje && (
        <div className="text-green-600 text-center mb-4 font-semibold">{mensaje}</div>
      )}

      {telefonoAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-xl max-w-sm w-full text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              ¿Estás seguro que querés eliminar este teléfono del stock?
            </h2>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setTelefonoAEliminar(null)}
                className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between px-4">
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por modelo, marca o color"
          className="p-2 border border-gray-400 rounded w-full md:max-w-sm"
        />

        {filtroProveedor && (
          <input
            type="text"
            value={filtroProveedorTexto}
            onChange={(e) => setFiltroProveedorTexto(e.target.value)}
            placeholder="Filtrar por proveedor"
            className="p-2 border border-gray-400 rounded w-full md:max-w-sm"
          />
        )}

        <button
          onClick={exportarExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Descargar Excel
        </button>
      </div>

      <div className="overflow-x-auto px-4">
        <table className="w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2 border border-gray-400">Fecha</th>
              <th className="p-2 border border-gray-400">Proveedor</th>
              <th className="p-2 border border-gray-400">Modelo</th>
              <th className="p-2 border border-gray-400">Marca</th>
              <th className="p-2 border border-gray-400">Estado</th>
              <th className="p-2 border border-gray-400">Batería</th>
              <th className="p-2 border border-gray-400">Almacenamiento</th>
              <th className="p-2 border border-gray-400">Color</th>
              <th className="p-2 border border-gray-400">IMEI</th>
              <th className="p-2 border border-gray-400">Serial</th>
              {rol?.tipo === "admin" && (
              <th className="p-2 border border-gray-400">Compra</th>
               )}
              <th className="p-2 border border-gray-400">Venta</th>
              <th className="p-2 border border-gray-400">Moneda</th>
              <th className="p-2 border border-gray-400">Observaciones</th>
              <th className="p-2 border border-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => (
              <tr key={`stock-${t.id || ""}-${t.imei || Math.random()}`} className="border-t hover:bg-gray-100">
                <td className="p-2 border border-gray-300">{t.fechaIngreso?.toDate?.().toLocaleDateString?.("es-AR") || "-"}</td>
                <td className="p-2 border border-gray-300">{t.proveedor}</td>
                <td className="p-2 border border-gray-300">{t.modelo}</td>
                <td className="p-2 border border-gray-300">{t.marca}</td>
                <td className="p-2 border border-gray-300">{t.estado}</td>
                <td className="p-2 border border-gray-300">{t.estado?.toLowerCase() === "usado" ? `${t.bateria}%` : "-"}
                </td>
                <td className="p-2 border border-gray-300">
                  {t.almacenamiento ? `${t.almacenamiento} GB` : "-"}
                  </td>
                <td className="p-2 border border-gray-300">{t.color}</td>
                <td className="p-2 border border-gray-300">{t.imei}</td>
                <td className="p-2 border border-gray-300">{t.serial}</td>
                {rol?.tipo === "admin" && (
                <td className="p-2 border border-gray-300">
                    ${Number(t.precioCompra).toLocaleString("es-AR")}
                </td>
                 )}

                <td className="p-2 border border-gray-300">${Number(t.precioVenta).toLocaleString("es-AR")}</td>
                <td className="p-2 border border-gray-300">
                     {t.moneda === "USD" ? "USD" : "ARS"}
                         </td>

                <td className="p-2 border border-gray-300">{t.observaciones}</td>
                <td className="p-2 border border-gray-300 flex gap-2">
                  <button
                    onClick={() => setTelefonoAEliminar(t)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                  {onEditar && (
                    <button
                      onClick={() => onEditar(t)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
