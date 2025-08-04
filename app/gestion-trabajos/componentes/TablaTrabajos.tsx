"use client";

import { useRouter } from "next/navigation";
import { DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, updateDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  estado: string; // Mantener como string para compatibilidad
  repuestosUsados?: any[]; 
  fechaModificacion?: string;
  estadoCuentaCorriente?: string; // Mantener como string para compatibilidad
}

interface TablaProps {
  trabajos: Trabajo[];
  cambiarEstado: (firebaseId: string, nuevoEstado: string) => void;
  eliminarTrabajo: (firebaseId: string) => void;
  onPagar: (trabajo: Trabajo) => void;
  router: ReturnType<typeof useRouter>;
  negocioID: string;
  recargarTrabajos: () => Promise<void>; 
  tipoFecha?: "ingreso" | "modificacion";
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
    if (trabajo.estado === "PAGADO") return "bg-blue-100 border-l-4 border-[#1565C0]";
    if (trabajo.estado === "ENTREGADO") return "bg-green-100 border-l-4 border-[#1B5E20]";
    if (trabajo.estado === "REPARADO") return "bg-orange-100 border-l-4 border-[#D84315]";
    return "bg-red-100 border-l-4 border-[#B71C1C]";
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
      await updateDoc(ref, { estado: "PAGADO" });
      setModalConfirmarPagoVisible(false);
      setTrabajoAConfirmarPago(null);
      await recargarTrabajos();
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
  }, [recargarTrabajos]);

  return (
    <div className="space-y-6">
      
      {/* Tabla principal - Completamente responsive */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-2 sm:p-3 md:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-sm sm:text-lg md:text-xl lg:text-2xl">🔧</span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold">Lista de Trabajos</h3>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                {trabajos.length} {trabajos.length === 1 ? 'trabajo registrado' : 'trabajos registrados'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla completamente responsive */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black min-w-fit">
            <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
              <tr>
                {/* Fecha - Siempre visible */}
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[65px] sm:min-w-[70px] md:min-w-[75px] max-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📅</span>
                    <span className="hidden sm:inline text-xs">Fecha</span>
                  </div>
                </th>
                
                {/* Cliente - Siempre visible */}
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[80px] sm:min-w-[90px] md:min-w-[100px] max-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">👤</span>
                    <span className="text-xs">Cliente</span>
                  </div>
                </th>
                
                {/* Modelo - Siempre visible */}
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[90px] md:min-w-[110px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📱</span>
                    <span className="text-xs">Modelo</span>
                  </div>
                </th>
                
                {/* IMEI - Oculto en móvil */}
                <th className="hidden sm:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[60px] md:min-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📲</span>
                    <span className="hidden md:inline text-xs">IMEI</span>
                  </div>
                </th>
                
                {/* Trabajo - Siempre visible */}
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[100px] sm:min-w-[110px] md:min-w-[130px] max-w-[150px]">
                    <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">🔧</span>
                    <span className="text-xs">Trabajo</span>
                  </div>
                </th>
                
                {/* Clave - Oculto en móvil y tablet */}
                <th className="hidden lg:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[60px] md:min-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">🔑</span>
                    <span className="text-xs">Clave</span>
                  </div>
                </th>
                
                {/* Observaciones - Oculto en móvil, ancho reducido */}
                <th className="hidden md:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] w-[60px] md:w-[80px] max-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📝</span>
                    <span className="text-xs">Observaciones</span>
                  </div>
                </th>
                
                {/* Precio - Siempre visible */}
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[80px] md:min-w-[90px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">💰</span>
                    <span className="text-xs">Precio</span>
                  </div>
                </th>
                
                {/* Estado - Siempre visible */}
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[80px] md:min-w-[90px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">🚦</span>
                    <span className="hidden sm:inline text-xs">Estado</span>
                  </div>
                </th>
                
                {/* Fecha Modificación - Oculto en móvil y tablet */}
                <th className="hidden md:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] w-[60px] md:w-[80px] max-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📅</span>
                    <span className="text-xs">F.Mod</span>
                  </div>
                </th>
                
                {/* Acciones - Mantener compacto en móvil, más ancho en desktop */}
              <th className="p-1 sm:p-2 md:p-3 text-center text-xs font-bold text-black border border-black bg-[#ecf0f1] w-[120px] sm:w-[130px] md:w-[140px] lg:w-[180px]">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs sm:text-sm">⚙️</span>
                    <span className="hidden sm:inline text-xs">Acciones</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {trabajosPaginados.map((t, index) => {
                const bgClass = obtenerClaseEstado(t);

                return (
                  <tr
                    key={t.firebaseId}
                    className={`transition-all duration-200 hover:bg-[#ebf3fd] ${bgClass}`}
                  >
                    
                    {/* Fecha */}
                    <td className="p-1 sm:p-1.5 md:p-2 border border-black max-w-[85px]">
  <span className="text-xs bg-[#ecf0f1] px-1 py-1 rounded block text-center truncate" title={t.fecha}>
    {t.fecha}
  </span>
</td>
                    
                    {/* Cliente */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black max-w-[120px]">
                      <span className="text-xs truncate block font-medium" title={t.cliente}>
                       {t.cliente}
                       </span>
                        </td>
                    
                    {/* Modelo */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black">
                      <span className="text-xs truncate block" title={t.modelo}>
                        {t.modelo}
                      </span>
                    </td>
                    
                    {/* IMEI - Oculto en móvil */}
                    <td className="hidden sm:table-cell p-1 sm:p-2 md:p-3 border border-black">
                    {t.imei ? (
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(t.imei);
                            // Puedes agregar un mensaje temporal aquí si quieres
                            console.log(`📋 IMEI copiado: ${t.imei}`);
                          } catch (error) {
                            console.error("Error al copiar IMEI:", error);
                          }
                        }}
                        className="text-xs font-mono bg-[#ecf0f1] hover:bg-[#3498db] hover:text-white px-1 py-1 rounded truncate block w-full text-left transition-colors duration-200 cursor-pointer"
                        title={`IMEI completo: ${t.imei} (Click para copiar)`}
                        onMouseEnter={(e) => {
                          // Mostrar IMEI completo en hover
                          e.currentTarget.textContent = t.imei;
                        }}
                        onMouseLeave={(e) => {
                          // Volver a mostrar solo los últimos 4
                          e.currentTarget.textContent = `...${t.imei.slice(-4)}`;
                        }}
                      >
                        ...{t.imei.slice(-4)}
                      </button>
                    ) : (
                      <span className="text-xs font-mono bg-[#ecf0f1] px-1 py-1 rounded block text-center">
                        —
                      </span>
                    )}
                  </td>
                    
                    {/* Trabajo */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black max-w-[150px]">
                    <span className="text-xs truncate block" title={t.trabajo}>
                      {t.trabajo}
                    </span>
                    </td>
                    
                    {/* Clave - Oculto en móvil y tablet */}
                    <td className="hidden lg:table-cell p-1 sm:p-2 md:p-3 border border-black">
                      <span className="text-xs truncate block" title={t.clave || "—"}>
                        {t.clave || "—"}
                      </span>
                    </td>
                    
                    {/* Observaciones - Oculto en móvil, texto muy corto */}
                    <td className="hidden md:table-cell p-1 sm:p-2 md:p-3 border border-black min-w-[120px] max-w-[200px]">
                    <div className="text-xs break-words" title={t.observaciones || "—"}>
                      {t.observaciones || "—"}
                      </div>
                    </td>
                    
                    {/* Precio */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black">
                      <span className="text-xs text-[#1e7e34] bg-green-100 px-1 py-1 rounded block text-center truncate">
                        ${t.precio?.toLocaleString('es-AR') || '0'}
                      </span>
                    </td>
                    
                    {/* Estado */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black">
                      <span className={`inline-flex items-center justify-center px-1 py-1 rounded text-xs font-bold w-full ${
  t.estado === "PAGADO" ? "bg-[#1565C0] text-white border-2 border-[#0D47A1]" :
  t.estado === "ENTREGADO" ? "bg-[#1B5E20] text-white border-2 border-[#0D3711]" :
  t.estado === "REPARADO" ? "bg-[#D84315] text-white border-2 border-[#BF360C]" :
  t.estado === "PENDIENTE" ? "bg-[#B71C1C] text-white border-2 border-[#8E0000]" :
  "bg-[#424242] text-white border-2 border-[#212121]"
}`}>
                        {/* Solo iconos en pantallas pequeñas */}
                        <span className="sm:hidden">
  {t.estado === "PAGADO" ? "💰" : 
   t.estado === "ENTREGADO" ? "📦" :
   t.estado === "REPARADO" ? "🔧" : "⏳"}
</span>
<span className="hidden sm:inline text-xs">
  {t.estado}
</span>
                      </span>
                    </td>
                    
                    {/* Fecha Modificación - Oculto en móvil y tablet */}
                    <td className="hidden lg:table-cell p-1 sm:p-1.5 md:p-2 border border-black max-w-[80px]">
                    <span className="text-xs bg-[#ecf0f1] px-1 py-1 rounded block text-center truncate">
                      {t.fechaModificacion || "—"}
                    </span>
                  </td>
                    
                    {/* Acciones - Compacto en móvil, espacioso en desktop */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black w-[120px] sm:w-[130px] md:w-[140px] lg:w-[180px]">
                      <div className="flex flex-col gap-1">
                        
                        {/* Selector de estado */}
                        <select
                          value={t.estado}
                          onChange={async (e) => {
                            const nuevoEstado = e.target.value;
                            const ref = doc(db, `negocios/${negocioID}/trabajos/${t.firebaseId}`);
                            const updates: any = {};

                            const hoy = new Date();
const fechaModificacion = hoy.toLocaleDateString("es-AR");
updates.fechaModificacion = fechaModificacion;
updates.estado = nuevoEstado;

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
                          className="w-full px-1 py-1 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-black text-xs font-normal"
                        >
                          <option value="PENDIENTE">⏳ Pendiente</option>
                          <option value="REPARADO">🔧 Reparado</option>
                          <option value="ENTREGADO">📦 Entregado</option>
                          <option value="PAGADO">💰 Pagado</option>
                        </select>

                        {/* Botones de acción - Compacto en móvil, espacioso en desktop */}
                        <div className="flex flex-wrap gap-0.5 lg:gap-1 justify-center">
                          <button
                            onClick={() => {
                              setTrabajoIDSeleccionado(t.firebaseId);
                              setMostrarModalRepuestos(true);
                            }}
                            className={`text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm ${
                              t.repuestosUsados && t.repuestosUsados.length > 0
                                ? "bg-[#9b59b6] hover:bg-[#8e44ad]"
                                : "bg-[#27ae60] hover:bg-[#229954]"
                            }`}
                            title="Repuestos"
                          >
                            ➕
                          </button>

                          <button
                            onClick={() => manejarClickEditar(t.firebaseId)}
                            className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          
                          <button
                            onClick={() => eliminarTrabajo(t.firebaseId)}
                            className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                          
                          <button
                            onClick={() => onPagar(t)}
                            className="bg-[#27ae60] hover:bg-[#229954] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                            title="Pagar"
                          >
                            💰
                          </button>
                          
                          <button
                            onClick={() => setTrabajoSeleccionado(t)}
                            className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                            title="Ver más"
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

        {/* Footer con paginación responsive */}
        {totalPaginas > 1 && (
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 border-t-2 border-[#bdc3c7]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-[#2c3e50] font-medium order-2 sm:order-1">
                Página {pagina} de {totalPaginas} • {trabajos.length} trabajos
              </div>
              <div className="flex gap-2 order-1 sm:order-2">
                <button
                  disabled={pagina === 1}
                  onClick={() => setPagina((prev) => Math.max(prev - 1, 1))}
                  className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xs sm:text-sm"
                >
                  ← <span className="hidden sm:inline">Anterior</span>
                </button>
                <button
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina((prev) => Math.min(prev + 1, totalPaginas))}
                  className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Siguiente</span> →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ver Más - Responsive */}
      {trabajoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs sm:max-w-md md:max-w-lg w-full border-2 border-[#ecf0f1] transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-t-2xl p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-lg sm:text-xl md:text-2xl">👁️</span>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg md:text-xl font-bold">Detalle del Trabajo</h2>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1">Información completa</p>
                  </div>
                </div>
                <button
                  onClick={() => setTrabajoSeleccionado(null)}
                  className="text-white hover:text-blue-200 transition-colors p-1"
                >
                  <span className="text-lg sm:text-xl md:text-2xl">✕</span>
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-[#f8f9fa]">
              <div className="bg-white border border-[#ecf0f1] rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <strong className="text-black text-xs sm:text-sm">Cliente:</strong>
                  <span className="text-[#3498db] font-bold text-xs sm:text-sm">{trabajoSeleccionado.cliente}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <strong className="text-black text-xs sm:text-sm">Modelo:</strong>
                  <span className="text-black font-bold text-xs sm:text-sm">{trabajoSeleccionado.modelo}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <strong className="text-black text-xs sm:text-sm">Trabajo:</strong>
                  <span className="text-black font-bold text-xs sm:text-sm">{trabajoSeleccionado.trabajo}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <strong className="text-black text-xs sm:text-sm">Precio:</strong>
                  <span className="text-[#1e7e34] font-bold text-xs sm:text-sm">${trabajoSeleccionado.precio?.toLocaleString('es-AR') || '0'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <strong className="text-black text-xs sm:text-sm">Estado:</strong>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold inline-block ${
  trabajoSeleccionado.estado === "PAGADO" ? "bg-[#1565C0] text-white" :
  trabajoSeleccionado.estado === "ENTREGADO" ? "bg-[#1B5E20] text-white" :
  trabajoSeleccionado.estado === "REPARADO" ? "bg-[#D84315] text-white" :
  "bg-[#B71C1C] text-white"
}`}>
  {trabajoSeleccionado.estado}
</span>
                </div>
                <div className="pt-2 border-t border-[#ecf0f1]">
                  <p className="text-xs sm:text-sm"><strong className="text-black">Observaciones:</strong></p>
                  <p className="text-black text-xs sm:text-sm mt-1 bg-[#f8f9fa] p-2 rounded border font-bold">{trabajoSeleccionado.observaciones || "Sin observaciones"}</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setTrabajoSeleccionado(null)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md text-xs sm:text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Pago - Responsive */}
      {modalConfirmarPagoVisible && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs sm:max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white rounded-t-2xl p-3 sm:p-4 md:p-6">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-lg sm:text-xl md:text-2xl">💰</span>
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg md:text-xl font-bold">Confirmar Pago</h2>
                  <p className="text-green-100 text-xs sm:text-sm mt-1">Marcar trabajo como pagado</p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa]">
              <div className="bg-white border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 shadow-sm">
                <p className="text-black font-bold text-center text-xs sm:text-sm">
                  ¿Estás seguro que querés marcar este trabajo como pagado?
                </p>
              </div>
              
              <div className="flex gap-2 sm:gap-3 justify-center">
                <button
                  onClick={() => setModalConfirmarPagoVisible(false)}
                  className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPago}
                  className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg text-xs sm:text-sm"
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