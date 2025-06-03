"use client";

import { useRouter } from "next/navigation";
import { DollarSign } from "lucide-react";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect } from "react";
import { getDocs, collection, query, where } from "firebase/firestore";
import ModalAgregarRepuesto from "@/app/resumen/componentes/ModalRepuestos";

interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  imei?: string;
  trabajo: string;
  clave?: string;
  observaciones?: string;
  precio?: number;
  estado: string;
  repuestosUsados?: any[]; 
  fechaModificacion?: string;
  estadoCuentaCorriente?: "PENDEINTE" | "PAGADO";
}

interface TablaProps {
  trabajos: Trabajo[];
  cambiarEstado: (firebaseId: string, nuevoEstado: string) => void;
  eliminarTrabajo: (firebaseId: string) => void;
  onPagar: (trabajo: Trabajo) => void;
  router: ReturnType<typeof useRouter>;
  negocioID: string;
  recargarTrabajos: () => Promise<void>; 
}

export default function TablaTrabajos({
  trabajos,
  cambiarEstado,
  eliminarTrabajo,
  onPagar,
  router,
  negocioID,
  recargarTrabajos,
}: TablaProps) {
  const obtenerClaseEstado = (trabajo: Trabajo) => {
    if (trabajo.estadoCuentaCorriente === "PAGADO") return "bg-blue-50";
    if (trabajo.estado === "ENTREGADO") return "bg-green-50";
    if (trabajo.estado === "REPARADO") return "bg-yellow-50";
    return "bg-red-50";
  };

  const manejarClickEditar = (id: string) => {
    router.push(`/gestion-trabajos/editar?id=${id}&origen=gestion`);
  };
  
  const [pagina, setPagina] = useState(1);
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<Trabajo | null>(null);
  const [modalConfirmarPagoVisible, setModalConfirmarPagoVisible] = useState(false);
  const [trabajoAConfirmarPago, setTrabajoAConfirmarPago] = useState<Trabajo | null>(null);
  const [mostrarModalRepuestos, setMostrarModalRepuestos] = useState(false);
  const [trabajoIDSeleccionado, setTrabajoIDSeleccionado] = useState<string | null>(null);

  const abrirModalConfirmarPago = (trabajo: Trabajo) => {
    setTrabajoAConfirmarPago(trabajo);
    setModalConfirmarPagoVisible(true);
  };

  const confirmarPago = async () => {
    if (!trabajoAConfirmarPago) return;
    try {
      const ref = doc(db, `negocios/${negocioID}/trabajos/${trabajoAConfirmarPago.firebaseId}`);
      await updateDoc(ref, { estadoCuentaCorriente: "PAGADO" });
      setModalConfirmarPagoVisible(false);
      setTrabajoAConfirmarPago(null);
      alert("✅ Trabajo marcado como pagado correctamente.");
    } catch (error) {
      console.error("Error marcando como pagado:", error);
      alert("❌ No se pudo marcar como pagado.");
    }
  };

  const itemsPorPagina = 40;
  const trabajosPaginados = trabajos.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);
  const totalPaginas = Math.ceil(trabajos.length / itemsPorPagina);

  useEffect(() => {
    const listener = () => {
      recargarTrabajos();
    };
    window.addEventListener("trabajosActualizados", listener);
    return () => window.removeEventListener("trabajosActualizados", listener);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Tabla principal - Estilo GestiOne */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Lista de Trabajos</h3>
              <p className="text-blue-100 mt-1">
                {trabajos.length} {trabajos.length === 1 ? 'trabajo registrado' : 'trabajos registrados'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla con scroll */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1600px] border-collapse border-2 border-black">
            <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
              <tr>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1] w-18">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    Fecha
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    Cliente
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    Modelo
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📲</span>
                    IMEI
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔧</span>
                    Trabajo
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔑</span>
                    Clave
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📝</span>
                    Observaciones
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1] w-28">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    Precio
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1] w-24">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚦</span>
                    Estado
                  </div>
                </th>
                <th className="p-3 text-left text-sm font-bold text-black border border-black bg-[#ecf0f1] w-24">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    F.Mod
                  </div>
                </th>
                <th className="p-3 text-center text-sm font-bold text-black border border-black bg-[#ecf0f1] w-60">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base">⚙️</span>
                    Acciones
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {trabajosPaginados.map((t, index) => {
                const isEven = index % 2 === 0;
                const bgClass = obtenerClaseEstado(t);

                return (
                  <tr
                    key={t.firebaseId}
                    className={`transition-all duration-200 hover:bg-[#ebf3fd] ${bgClass}`}
                  >
                    <td className="p-3 border border-black w-24">
                      <span className="text-sm font-normal text-black bg-[#ecf0f1] px-2 py-1 rounded text-center block">
                        {t.fecha}
                      </span>
                    </td>
                    <td className="p-3 border border-black">
                      <span className="text-sm font-normal text-black">{t.cliente}</span>
                    </td>
                    <td className="p-3 border border-black">
                      <span className="text-sm font-normal text-black">{t.modelo}</span>
                    </td>
                    <td className="p-3 border border-black">
                      <span className="text-sm font-normal text-black font-mono bg-[#ecf0f1] px-2 py-1 rounded">
                        {t.imei || "—"}
                      </span>
                    </td>
                    <td className="p-3 border border-black w-64">
                      <span className="text-sm font-normal text-black">{t.trabajo}</span>
                    </td>
                    <td className="p-3 border border-black">
                      <span className="text-sm font-normal text-black">{t.clave || "—"}</span>
                    </td>
                    <td className="p-3 border border-black">
                      <span className="text-sm font-normal text-black">{t.observaciones || "—"}</span>
                    </td>
                    <td className="p-3 border border-black w-28">
                      <span className="text-sm font-normal text-[#1e7e34] bg-green-100 px-2 py-1 rounded text-center block">
                        ${t.precio?.toLocaleString('es-AR') || '0'}
                      </span>
                    </td>
                    <td className="p-3 border border-black w-24">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-bold shadow-sm w-full ${
                        t.estadoCuentaCorriente === "PAGADO" ? "bg-[#9b59b6] text-white" :
                        t.estado === "ENTREGADO" ? "bg-[#27ae60] text-white" :
                        t.estado === "REPARADO" ? "bg-[#f39c12] text-white" :
                        t.estado === "PENDIENTE" ? "bg-[#e74c3c] text-white" :
                        "bg-[#95a5a6] text-white"
                      }`}>
                        {t.estadoCuentaCorriente === "PAGADO" ? "PAGADO" : t.estado}
                      </span>
                    </td>
                    <td className="p-3 border border-black w-24">
                      <span className="text-sm font-normal text-black bg-[#ecf0f1] px-2 py-1 rounded text-center block">
                        {t.fechaModificacion || "—"}
                      </span>
                    </td>
                    <td className="p-3 border border-black w-40">
                      <div className="flex flex-col gap-2">
                        
                        {/* Selector de estado */}
                        <select
                          value={t.estadoCuentaCorriente === "PAGADO" ? "PAGADO" : t.estado}
                          onChange={async (e) => {
                            const nuevoEstado = e.target.value;
                            const ref = doc(db, `negocios/${negocioID}/trabajos/${t.firebaseId}`);
                            const updates: any = {};

                            const hoy = new Date();
                            const fechaModificacion = hoy.toLocaleDateString("es-AR");
                            updates.fechaModificacion = fechaModificacion;

                            if (nuevoEstado === "PAGADO") {
                              updates.estadoCuentaCorriente = "PAGADO";
                              updates.estado = "PAGADO";
                            } else {
                              updates.estado = nuevoEstado;
                              if (t.estadoCuentaCorriente === "PAGADO") {
                                updates.estadoCuentaCorriente = "PENDIENTE";
                              }
                            }

                            await updateDoc(ref, updates);

                            if (nuevoEstado === "PAGADO") {
                              try {
                                const clientesSnap = await getDocs(
                                  query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", t.cliente))
                                );
                                if (!clientesSnap.empty) {
                                  const clienteID = clientesSnap.docs[0].id;
                                  console.log("🔁 Recalculando cuenta para:", clienteID);
                                } else {
                                  console.warn("⚠️ Cliente no encontrado para recalcular:", t.cliente);
                                }
                              } catch (error) {
                                console.error("❌ Error al recalcular cuenta:", error);
                              }
                            }
                            
                            await recargarTrabajos();
                          }}
                          className="w-full px-2 py-1 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-black text-xs font-normal"
                        >
                          <option value="PENDIENTE">⏳ Pendiente</option>
                          <option value="REPARADO">🔧 Reparado</option>
                          <option value="ENTREGADO">📦 Entregado</option>
                          <option value="PAGADO">💰 Pagado</option>
                        </select>

                        {/* Botones de acción */}
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => {
                              setTrabajoIDSeleccionado(t.firebaseId);
                              setMostrarModalRepuestos(true);
                            }}
                            className={`text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm ${
                              t.repuestosUsados && t.repuestosUsados.length > 0
                                ? "bg-[#9b59b6] hover:bg-[#8e44ad]"
                                : "bg-[#27ae60] hover:bg-[#229954]"
                            }`}
                          >
                            ➕
                          </button>

                          <button
                            onClick={() => manejarClickEditar(t.firebaseId)}
                            className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                          >
                            ✏️
                          </button>
                          
                          <button
                            onClick={() => eliminarTrabajo(t.firebaseId)}
                            className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                          >
                            🗑️
                          </button>
                          
                          <button
                            onClick={() => onPagar(t)}
                            className="bg-[#27ae60] hover:bg-[#229954] text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                          >
                            💰
                          </button>
                          
                          <button
                            onClick={() => setTrabajoSeleccionado(t)}
                            className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                          >
                            👁️
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer con paginación */}
        {totalPaginas > 1 && (
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-6 py-4 border-t-2 border-[#bdc3c7]">
            <div className="flex justify-center items-center gap-2 flex-wrap">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPagina(num)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                    pagina === num 
                      ? "bg-[#3498db] text-white shadow-md" 
                      : "bg-white text-[#2c3e50] hover:bg-[#ecf0f1] border border-[#bdc3c7]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Ver Más - Estilo GestiOne */}
      {trabajoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👁️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Detalle del Trabajo</h2>
                  <p className="text-blue-100 text-sm mt-1">Información completa</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-[#f8f9fa]">
              <div className="bg-white border border-[#ecf0f1] rounded-lg p-4 space-y-3">
                <p className="flex justify-between"><strong className="text-black">Cliente:</strong> <span className="text-[#3498db] font-bold">{trabajoSeleccionado.cliente}</span></p>
                <p className="flex justify-between"><strong className="text-black">Modelo:</strong> <span className="text-black font-bold">{trabajoSeleccionado.modelo}</span></p>
                <p className="flex justify-between"><strong className="text-black">Trabajo:</strong> <span className="text-black font-bold">{trabajoSeleccionado.trabajo}</span></p>
                <p className="flex justify-between"><strong className="text-black">Precio:</strong> <span className="text-[#1e7e34] font-bold">${trabajoSeleccionado.precio?.toLocaleString('es-AR') || '0'}</span></p>
                <p className="flex justify-between"><strong className="text-black">Estado:</strong> 
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    trabajoSeleccionado.estadoCuentaCorriente === "PAGADO" ? "bg-[#9b59b6] text-white" :
                    trabajoSeleccionado.estado === "ENTREGADO" ? "bg-[#27ae60] text-white" :
                    trabajoSeleccionado.estado === "REPARADO" ? "bg-[#f39c12] text-white" :
                    "bg-[#e74c3c] text-white"
                  }`}>
                    {trabajoSeleccionado.estadoCuentaCorriente === "PAGADO" ? "PAGADO" : trabajoSeleccionado.estado}
                  </span>
                </p>
                <div className="pt-2 border-t border-[#ecf0f1]">
                  <p className="text-sm"><strong className="text-black">Observaciones:</strong></p>
                  <p className="text-black text-sm mt-1 bg-[#f8f9fa] p-2 rounded border font-bold">{trabajoSeleccionado.observaciones || "Sin observaciones"}</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setTrabajoSeleccionado(null)}
                  className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Pago - Estilo GestiOne */}
      {modalConfirmarPagoVisible && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Pago</h2>
                  <p className="text-green-100 text-sm mt-1">Marcar trabajo como pagado</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-[#f8f9fa]">
              <div className="bg-white border-2 border-[#27ae60] rounded-xl p-4 shadow-sm">
                <p className="text-black font-bold text-center">
                  ¿Estás seguro que querés marcar este trabajo como pagado?
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setModalConfirmarPagoVisible(false)}
                  className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPago}
                  className="px-6 py-3 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Repuestos */}
      {mostrarModalRepuestos && trabajoIDSeleccionado && (
        <ModalAgregarRepuesto
          trabajoID={trabajoIDSeleccionado}
          onClose={() => {
            setMostrarModalRepuestos(false);
            setTrabajoIDSeleccionado(null);
          }}
          onGuardar={async () => {
            await recargarTrabajos();
          }}
        />
      )}
    </div>
  );
}