"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayRemove,
} from "firebase/firestore";
import { useRol } from "@/lib/useRol";


interface Props {
    trabajoID: string;
    onClose: () => void;
    onGuardar?: () => void; // ✅ Nueva prop opcional
  }
  

export default function ModalAgregarRepuesto({ trabajoID, onClose, onGuardar }: Props) {
  const [repuestos, setRepuestos] = useState<any[]>([]);
  const [seleccionados, setSeleccionados] = useState<any[]>([]);
  const [usadosPrevios, setUsadosPrevios] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
  const { rol } = useRol();
  

  useEffect(() => {
    const cargar = async () => {
      const snap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockRepuestos`)
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRepuestos(data);
    };

    const cargarUsadosPrevios = async () => {
      const trabajoRef = doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`);
      const trabajoDoc = await getDoc(doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`));
      const usados = (trabajoDoc.data()?.repuestosUsados || []).map((d: any) => ({
        ...d,
        timestamp: d.timestamp || Date.now() + Math.random(), // por si no tiene
      }));
      setUsadosPrevios(usados);
    };

    if (rol?.negocioID) {
      cargar();
      cargarUsadosPrevios();
    }
  }, [rol, trabajoID]);

  const agregarASeleccionados = (repuesto: any) => {
    if (repuesto.cantidad <= 0) return;
  
    if (typeof repuesto.precioCostoPesos !== "number") {
      alert("Este repuesto no tiene definido el precio en pesos.");
      return;
    }
  
    const repuestoUsado = {
      ...repuesto,
      precio: repuesto.precioCosto,
      costoPesos: repuesto.precioCostoPesos,
      timestamp: Date.now() + Math.random(),
    };
  
    setSeleccionados((prev) => [...prev, repuestoUsado]);
  };
  
  const eliminarDeSeleccionados = (timestamp: number) => {
    setSeleccionados((prev) => prev.filter((r) => r.timestamp !== timestamp));
  };

  const eliminarPrevio = async (repuesto: any) => {
    const trabajoRef = doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`);
    const docSnap = await getDoc(trabajoRef);
    const data = docSnap.data();
    const repuestosActuales = data?.repuestosUsados || [];
    const costoActual = data?.costo || 0;
  
    const actualizados = repuestosActuales.filter(
      (r: any) => r.timestamp !== repuesto.timestamp
    );
  
    const nuevoCosto = costoActual - (repuesto.costoPesos || 0);
  
    await updateDoc(trabajoRef, {
      repuestosUsados: actualizados,
      costo: nuevoCosto >= 0 ? nuevoCosto : 0,
    });
  
    // ✅ devolver al stock
    const repuestoRef = doc(db, `negocios/${rol.negocioID}/stockRepuestos/${repuesto.id}`);
    await updateDoc(repuestoRef, {
      cantidad: increment(1),
    });
  
    // ✅ refrescar pantalla
    window.location.reload(); // o llamá una función refrescarDatos()
  };  
  

  const guardarTodos = async () => {
    if (seleccionados.length === 0) return;
  
    const trabajoRef = doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`);
    const trabajoSnap = await getDoc(trabajoRef);
    const trabajoData = trabajoSnap.data();
  
    const previos = trabajoData?.repuestosUsados || [];
  
    // Sumamos nuevos + previos
    const repuestosActualizados = [...previos, ...seleccionados];
  
    const costoTotal = repuestosActualizados.reduce((sum, r) => sum + (r.costoPesos || 0), 0);
  
    await updateDoc(trabajoRef, {
      repuestosUsados: repuestosActualizados,
      costo: Number(costoTotal),
    });
  
    // Descontar stock de cada repuesto nuevo
    for (const r of seleccionados) {
      const ref = doc(db, `negocios/${rol.negocioID}/stockRepuestos/${r.id}`);
      await updateDoc(ref, {
        cantidad: r.cantidad - 1,
      });
    }
  
    onClose();
    if (onGuardar) onGuardar();
  };
  

  const resultados = repuestos.filter((r) => {
    const texto = `${r.categoria} ${r.producto} ${r.modelo} ${r.marca}`.toLowerCase();
    return filtro
      .toLowerCase()
      .split(" ")
      .every((palabra) => texto.includes(palabra));
  });  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded p-6 w-full max-w-5xl">
        <h2 className="text-xl font-semibold mb-4">Agregar repuestos al trabajo</h2>

        <input
          type="text"
          placeholder="Buscar por categoría, producto, modelo o marca"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="border p-2 w-full mb-4"
        />

        {filtro.trim() !== "" && resultados.length > 0 && (
          <table className="w-full table-auto text-sm mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Código</th>
                <th className="p-2">Categoría</th>
                <th className="p-2">Producto</th>
                <th className="p-2">Modelo</th>
                <th className="p-2">Marca</th>
                <th className="p-2">Precio</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Acción</th>
              </tr>
            </thead>
            <tbody>
            {resultados.map((r) => {
  const yaSeleccionado = seleccionados.some((s) => s.id === r.id);

  return (
    <tr key={r.id}>
      <td className="p-2">{r.codigo}</td>
      <td className="p-2">{r.categoria}</td>
      <td className="p-2">{r.producto}</td>
      <td className="p-2">{r.modelo}</td>
      <td className="p-2">{r.marca}</td>
      <td className="p-2">{r.moneda} ${r.precioCosto ? Number(r.precioCosto).toFixed(2) : "—"}</td>
      <td className="p-2">{r.cantidad}</td>
      <td className="p-2">
        {!yaSeleccionado ? (
          <button
            onClick={() => agregarASeleccionados(r)}
            className="bg-blue-600 text-white px-2 py-1 rounded"
          >
            Agregar
          </button>
        ) : (
          <button
            onClick={() =>
              eliminarDeSeleccionados(
                seleccionados.find((s) => s.id === r.id)?.timestamp
              )
            }
            className="text-red-600 hover:underline"
           >
              Eliminar
              </button>
                  )}
             </td>
         </tr>
        );
    })}
            </tbody>
          </table>
        )}

        {seleccionados.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2">Repuestos seleccionados</h3>
            <table className="w-full table-auto text-sm mb-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">Código</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Producto</th>
                  <th className="p-2">Modelo</th>
                  <th className="p-2">Marca</th>
                  <th className="p-2">Precio</th>
                  <th className="p-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {seleccionados.map((r) => (
               <tr key={r.timestamp}>
               <td className="p-2">{r.codigo}</td>
               <td className="p-2">{r.categoria}</td>
               <td className="p-2">{r.producto}</td>
               <td className="p-2">{r.modelo}</td>
               <td className="p-2">{r.marca}</td>
               <td className="p-2">
                 {r.moneda} ${r.precioCosto ? Number(r.precioCosto).toFixed(2) : "—"}
               </td>
               <td className="p-2">
                 <button
                   onClick={() => eliminarDeSeleccionados(r.timestamp)}
                   className="text-red-600 hover:underline"
                 >
                   Eliminar
                 </button>
               </td>
             </tr>
             
                ))}
              </tbody>
            </table>
          </>
        )}

        {usadosPrevios.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2">Repuestos ya usados</h3>
            <table className="w-full table-auto text-sm mb-4">
              <thead>
                <tr className="bg-gray-300">
                  <th className="p-2">Código</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Producto</th>
                  <th className="p-2">Modelo</th>
                  <th className="p-2">Marca</th>
                  <th className="p-2">Precio</th>
                  <th className="p-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {usadosPrevios.map((r) => (
              <tr key={r.timestamp}>
              <td className="p-2">{r.codigo}</td>
              <td className="p-2">{r.categoria}</td>
              <td className="p-2">{r.producto}</td>
              <td className="p-2">{r.modelo}</td>
              <td className="p-2">{r.marca}</td>
              <td className="p-2">
                {r.moneda} ${r.precioCosto ? Number(r.precioCosto).toFixed(2) : "—"}
              </td>
              <td className="p-2">
                <button
                  onClick={() => eliminarPrevio(r)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
            
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="text-blue-600 hover:underline">
            Cancelar
          </button>
          <button
            onClick={guardarTodos}
            className="bg-green-600 text-white px-4 py-2 rounded"
            disabled={seleccionados.length === 0}
          >
            Guardar todos
          </button>
        </div>
      </div>
    </div>
  );
}
