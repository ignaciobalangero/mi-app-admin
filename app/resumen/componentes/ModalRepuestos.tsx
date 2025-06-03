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
  onGuardar?: () => void;
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
        timestamp: d.timestamp || Date.now() + Math.random(),
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
  
    const repuestoRef = doc(db, `negocios/${rol.negocioID}/stockRepuestos/${repuesto.id}`);
    await updateDoc(repuestoRef, {
      cantidad: increment(1),
    });
  
    window.location.reload();
  };  

  const guardarTodos = async () => {
    if (seleccionados.length === 0) return;
  
    const trabajoRef = doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`);
    const trabajoSnap = await getDoc(trabajoRef);
    const trabajoData = trabajoSnap.data();
  
    const previos = trabajoData?.repuestosUsados || [];
    const repuestosActualizados = [...previos, ...seleccionados];
    const costoTotal = repuestosActualizados.reduce((sum, r) => sum + (r.costoPesos || 0), 0);
  
    await updateDoc(trabajoRef, {
      repuestosUsados: repuestosActualizados,
      costo: Number(costoTotal),
    });
  
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border-2 border-[#ecf0f1]">
        
        {/* Header del modal - Estilo GestiOne */}
        <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Gestión de Repuestos</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Agregar repuestos al trabajo seleccionado
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-purple-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center hover:scale-110"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#f8f9fa] max-h-[calc(90vh-120px)] overflow-y-auto">
          
          {/* Buscador - Estilo GestiOne */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-[#2c3e50]">Buscar Repuestos</h3>
            </div>
            <input
              type="text"
              placeholder="🔍 Buscar por categoría, producto, modelo o marca"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
            />
          </div>

          {/* Tabla de resultados - Estilo GestiOne */}
          {filtro.trim() !== "" && resultados.length > 0 && (
            <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 mb-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📦</span>
                </div>
                Repuestos Disponibles
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Código</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Categoría</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Producto</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Modelo</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Marca</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Precio</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Stock</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-black">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((r, index) => {
                      const yaSeleccionado = seleccionados.some((s) => s.id === r.id);
                      const isEven = index % 2 === 0;

                      return (
                        <tr key={r.id} className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded">
                              {r.codigo}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.categoria}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50]">{r.producto}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.modelo}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.marca}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-semibold text-[#27ae60]">
                              {r.moneda} ${r.precioCosto ? Number(r.precioCosto).toFixed(2) : "—"}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                              r.cantidad > 0 ? 'bg-green-100 text-[#27ae60]' : 'bg-red-100 text-[#e74c3c]'
                            }`}>
                              {r.cantidad}
                            </span>
                          </td>
                          <td className="p-3 border border-black text-center">
                            {!yaSeleccionado ? (
                              <button
                                onClick={() => agregarASeleccionados(r)}
                                className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                              >
                                ➕ Agregar
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  eliminarDeSeleccionados(
                                    seleccionados.find((s) => s.id === r.id)?.timestamp
                                  )
                                }
                                className="text-[#e74c3c] hover:text-[#c0392b] font-medium transition-colors duration-200"
                              >
                                ❌ Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Repuestos seleccionados - Estilo GestiOne */}
          {seleccionados.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-[#27ae60] p-4 mb-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">✅</span>
                </div>
                Repuestos Seleccionados ({seleccionados.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Código</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Categoría</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Producto</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Modelo</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Marca</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Precio</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-black">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seleccionados.map((r, index) => {
                      const isEven = index % 2 === 0;
                      return (
                        <tr key={r.timestamp} className={`transition-all duration-200 ${isEven ? 'bg-white' : 'bg-green-50'}`}>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded">
                              {r.codigo}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.categoria}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50]">{r.producto}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.modelo}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.marca}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-semibold text-[#27ae60]">
                              {r.moneda} ${r.precioCosto ? Number(r.precioCosto).toFixed(2) : "—"}
                            </span>
                          </td>
                          <td className="p-3 border border-black text-center">
                            <button
                              onClick={() => eliminarDeSeleccionados(r.timestamp)}
                              className="text-[#e74c3c] hover:text-[#c0392b] font-medium transition-colors duration-200"
                            >
                              ❌ Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Repuestos ya usados - Estilo GestiOne */}
          {usadosPrevios.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 mb-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🔧</span>
                </div>
                Repuestos Ya Usados ({usadosPrevios.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#fdeaa7] to-[#f6d55c]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Código</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Categoría</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Producto</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Modelo</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Marca</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Precio</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-black">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usadosPrevios.map((r, index) => {
                      const isEven = index % 2 === 0;
                      return (
                        <tr key={r.timestamp} className={`transition-all duration-200 ${isEven ? 'bg-white' : 'bg-orange-50'}`}>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded">
                              {r.codigo}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.categoria}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50]">{r.producto}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.modelo}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.marca}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-semibold text-[#27ae60]">
                              {r.moneda} ${r.precioCosto ? Number(r.precioCosto).toFixed(2) : "—"}
                            </span>
                          </td>
                          <td className="p-3 border border-black text-center">
                            <button
                              onClick={() => eliminarPrevio(r)}
                              className="text-[#e74c3c] hover:text-[#c0392b] font-medium transition-colors duration-200"
                            >
                              ❌ Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botones de acción - Estilo GestiOne */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-6 shadow-sm">
            <div className="flex justify-between items-center">
              <button 
                onClick={onClose} 
                className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={guardarTodos}
                disabled={seleccionados.length === 0}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
                  seleccionados.length === 0
                    ? "bg-[#bdc3c7] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] hover:scale-105"
                }`}
              >
                💾 Guardar {seleccionados.length > 0 && `(${seleccionados.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}