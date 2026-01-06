"use client";

import { useState } from "react";
import { doc, updateDoc, deleteDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ModalRepuestos from "./ModalRepuestos";
import ModalPago from "./ModalPago";
import ModalEditar from "@/app/gestion-trabajos/componentes/ModalEditar";
import BotonesImpresionTrabajo from "@/app/configuraciones/impresion/components/BotonesImpresionTrabajo";

interface Trabajo {
  firebaseId: string;
  id?: string;
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  estado: string;
  estadoCuentaCorriente?: string;
  precio?: number;
  costo?: number;
  repuestosUsados?: any[];
  fechaModificacion?: string;
}

interface Props {
  trabajos: Trabajo[];
  negocioID: string;
  onRecargar: () => Promise<void>;
  tipoFecha: "ingreso" | "modificacion";
  paginaActual: number;
  setPaginaActual: (pagina: number) => void;
  setTrabajos: React.Dispatch<React.SetStateAction<Trabajo[]>>;
}

export default function TablaTrabajos({
  trabajos,
  negocioID,
  onRecargar,
  tipoFecha,
  paginaActual,
  setPaginaActual,
  setTrabajos
}: Props) {
  // ========================================
  // 💰 FUNCIONES HELPER PARA FORMATEO DE NÚMEROS
  // ========================================
  
  const formatearNumero = (numero: number | string): string => {
    if (numero === "" || numero === null || numero === undefined) return "";
    const num = typeof numero === "string" ? parseFloat(numero) : numero;
    if (isNaN(num)) return "";
    return num.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  };

  const limpiarNumero = (texto: string): number => {
    const limpio = texto.replace(/\./g, '');
    const numero = parseFloat(limpio);
    return isNaN(numero) ? 0 : numero;
  };

  // ========================================
  // ESTADOS
  // ========================================
  
  const [mostrarModalRepuestos, setMostrarModalRepuestos] = useState(false);
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<string | null>(null);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [trabajoParaPagar, setTrabajoParaPagar] = useState<Trabajo | null>(null);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [trabajoEditando, setTrabajoEditando] = useState<Trabajo | null>(null);
  const [mostrarModalImpresion, setMostrarModalImpresion] = useState(false);
  const [trabajoParaImprimir, setTrabajoParaImprimir] = useState<Trabajo | null>(null);

  const ITEMS_POR_PAGINA = 40;
  const totalPaginas = Math.ceil(trabajos.length / ITEMS_POR_PAGINA);
  const trabajosPaginados = trabajos.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  // ========================================
  // FUNCIONES
  // ========================================

  const actualizarCampo = async (firebaseId: string, campo: "precio" | "costo", valor: number) => {
    // ✅ 1. Actualizar estado local INMEDIATAMENTE
    setTrabajos(prev => prev.map(t => 
      t.firebaseId === firebaseId 
        ? { ...t, [campo]: valor }
        : t
    ));
    
    // ✅ 2. Guardar en Firebase en background
    const ref = doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`);
    await updateDoc(ref, { 
      [campo]: valor,
      ultimaActualizacion: new Date().toISOString()
    });
  };

  // Estados para modal de confirmación
const [mostrarConfirmarEliminar, setMostrarConfirmarEliminar] = useState(false);
const [trabajoAEliminar, setTrabajoAEliminar] = useState<string | null>(null);

// Función para abrir el modal de confirmación
const confirmarEliminar = (firebaseId: string) => {
  setTrabajoAEliminar(firebaseId);
  setMostrarConfirmarEliminar(true);
};

// Función para eliminar el trabajo
const eliminarTrabajo = async () => {
  if (!trabajoAEliminar) return;
  
  try {
    await deleteDoc(doc(db, `negocios/${negocioID}/trabajos/${trabajoAEliminar}`));
    
    // ✅ Actualizar estado local inmediatamente
    setTrabajos(prev => prev.filter(t => t.firebaseId !== trabajoAEliminar));
    
    // Cerrar modal
    setMostrarConfirmarEliminar(false);
    setTrabajoAEliminar(null);
    
    // Toast de confirmación
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      color: white;
      padding: 24px 32px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 18px;
      font-weight: 600;
    `;
    toast.innerHTML = `
      <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
        ✓
      </div>
      <span>Trabajo eliminado correctamente</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 1000);
    
  } catch (error) {
    console.error("Error eliminando trabajo:", error);
  }
};

  const manejarClickEditar = (trabajo: Trabajo) => {
    setTrabajoEditando(trabajo);
    setModalEditarAbierto(true);
  };

  const cerrarModalEditar = () => {
    setModalEditarAbierto(false);
    setTrabajoEditando(null);
  };

  const abrirModalImpresion = (trabajo: Trabajo) => {
    setTrabajoParaImprimir(trabajo);
    setMostrarModalImpresion(true);
  };

  const cerrarModalImpresion = () => {
    setMostrarModalImpresion(false);
    setTrabajoParaImprimir(null);
  };

  const abrirModalPago = (trabajo: Trabajo) => {
    setTrabajoParaPagar(trabajo);
    setMostrarModalPago(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-xl md:text-2xl">📋</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold">Lista de Trabajos</h3>
              <p className="text-blue-100 mt-1 text-xs sm:text-sm">
                {trabajos.length} {trabajos.length === 1 ? 'trabajo encontrado' : 'trabajos encontrados'}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black min-w-fit">
            <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
              <tr>
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[65px] sm:min-w-[70px] md:min-w-[75px] max-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📅</span>
                    <span className="hidden sm:inline text-xs">
                      {tipoFecha === "ingreso" ? "Ingreso" : "Modificación"}
                    </span>
                  </div>
                </th>
                
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[80px] sm:min-w-[90px] md:min-w-[100px] max-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">👤</span>
                    <span className="text-xs">Cliente</span>
                  </div>
                </th>
                
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[90px] md:min-w-[110px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📱</span>
                    <span className="text-xs">Modelo</span>
                  </div>
                </th>
                
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[100px] sm:min-w-[110px] md:min-w-[130px] max-w-[150px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">🔧</span>
                    <span className="text-xs">Trabajo</span>
                  </div>
                </th>
                
                <th className="hidden sm:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[60px] md:min-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">🔑</span>
                    <span className="hidden md:inline text-xs">Clave</span>
                  </div>
                </th>
                
                <th className="hidden md:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[120px] max-w-[200px] w-auto">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📝</span>
                    <span className="text-xs">Observaciones</span>
                  </div>
                </th>
                
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[80px] md:min-w-[90px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">🚦</span>
                    <span className="hidden sm:inline text-xs">Estado</span>
                  </div>
                </th>
                
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[80px] md:min-w-[90px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">💰</span>
                    <span className="text-xs">Precio</span>
                  </div>
                </th>
                
                <th className="hidden sm:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] md:min-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">💸</span>
                    <span className="text-xs">Costo</span>
                  </div>
                </th>
                
                <th className="hidden sm:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] md:min-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📈</span>
                    <span className="text-xs">Ganancia</span>
                  </div>
                </th>
                
                <th className="hidden lg:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[60px] md:min-w-[80px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm">📅</span>
                    <span className="text-xs">F.Mod</span>
                  </div>
                </th>
                
                <th className="p-1 sm:p-2 md:p-3 text-center text-xs font-bold text-black border border-black bg-[#ecf0f1] w-[150px] sm:w-[165px] md:w-[180px] lg:w-[220px]">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs sm:text-sm">⚙️</span>
                    <span className="hidden sm:inline text-xs">Acciones</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {trabajosPaginados.map((t) => {
                const ganancia = typeof t.precio === "number" && typeof t.costo === "number"
                  ? t.precio - t.costo
                  : "";

                let bgClass = "";
                if (t.estado === "PAGADO") bgClass = "bg-blue-100 border-l-4 border-[#1565C0]";
                else if (t.estado === "ENTREGADO") bgClass = "bg-green-100 border-l-4 border-[#1B5E20]";
                else if (t.estado === "REPARADO") bgClass = "bg-orange-100 border-l-4 border-[#D84315]";
                else if (t.estado === "PENDIENTE") bgClass = "bg-red-100 border-l-4 border-[#B71C1C]";

                const fechaAMostrar = tipoFecha === "modificacion" 
                  ? (t.fechaModificacion || t.fecha) 
                  : t.fecha;

                return (
                  <tr
                    key={t.firebaseId}
                    className={`transition-all duration-200 hover:bg-[#ebf3fd] ${bgClass}`}
                  >
                    
                    <td className="p-1 sm:p-1.5 md:p-2 border border-black max-w-[80px]">
                      <span className="text-xs bg-[#ecf0f1] px-1 py-1 rounded block text-center truncate" title={fechaAMostrar}>
                        {fechaAMostrar}
                      </span>
                    </td>
                    
                    <td className="p-1 sm:p-2 md:p-3 border border-black max-w-[120px]">
                      <span className="text-xs truncate block font-medium text-[#3498db]" title={t.cliente}>
                        {t.cliente}
                      </span>
                    </td>
                    
                    <td className="p-1 sm:p-2 md:p-3 border border-black">
                      <span className="text-xs truncate block" title={t.modelo}>
                        {t.modelo}
                      </span>
                    </td>
                    
                    <td className="p-1 sm:p-2 md:p-3 border border-black max-w-[150px]">
                      {t.trabajo ? (
                        <div className="relative group">
                          <span className="text-xs bg-[#ecf0f1] hover:bg-[#3498db] hover:text-white px-1 py-1 rounded truncate block w-full text-left transition-colors duration-200 cursor-pointer">
                            {t.trabajo.length > 25 ? t.trabajo.substring(0, 25) + "..." : t.trabajo}
                          </span>
                          
                          {/* Tooltip con texto completo */}
                          {t.trabajo.length > 25 && (
                            <div className="absolute left-0 top-full mt-1 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[200px] max-w-[400px] whitespace-normal">
                              {t.trabajo}
                              {/* Flechita arriba */}
                              <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs bg-[#ecf0f1] px-1 py-1 rounded block text-center">—</span>
                      )}
                    </td>
                    
                    <td className="hidden sm:table-cell p-1 sm:p-2 md:p-3 border border-black">
                      <span className="text-xs truncate block" title={t.clave || "—"}>
                        {t.clave || "—"}
                      </span>
                    </td>
                    
                    <td className="hidden md:table-cell p-1 sm:p-2 md:p-3 border border-black min-w-[120px] max-w-[200px]">
                      <div className="text-xs break-words" title={t.observaciones || "—"}>
                        {t.observaciones || "—"}
                      </div>
                    </td>
                                            
                    <td className="p-1 sm:p-2 md:p-3 border border-black">
                      <span className={`inline-flex items-center justify-center px-1 py-1 rounded text-xs font-bold w-full ${
                        t.estado === "PAGADO" ? "bg-[#1565C0] text-white border-2 border-[#0D47A1]" :
                        t.estado === "ENTREGADO" ? "bg-[#1B5E20] text-white border-2 border-[#0D3711]" :
                        t.estado === "REPARADO" ? "bg-[#D84315] text-white border-2 border-[#BF360C]" :
                        t.estado === "PENDIENTE" ? "bg-[#B71C1C] text-white border-2 border-[#8E0000]" :
                        "bg-[#424242] text-white border-2 border-[#212121]"
                      }`}>
                        <span className="sm:hidden">
                          {t.estado === "PAGADO" ? "💰" :
                           t.estado === "ENTREGADO" ? "📦" :
                           t.estado === "REPARADO" ? "🔧" :
                           t.estado === "PENDIENTE" ? "⏳" : "❓"}
                        </span>
                        <span className="hidden sm:inline">
                          {t.estado}
                        </span>
                      </span>
                    </td>
                    
                    {/* ✅ PRECIO CON FORMATEO - CORREGIDO */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black">
                      <input
                        key={`precio-${t.firebaseId}-${t.precio}`}
                        type="text"
                        defaultValue={
                          typeof t.precio === "number" 
                            ? formatearNumero(t.precio) 
                            : ""
                        }
                        onFocus={(e) => {
                          // Al hacer focus, mostrar número sin formato
                          const valorLimpio = limpiarNumero(e.target.value);
                          e.target.value = valorLimpio > 0 ? valorLimpio.toString() : "";
                        }}
                        onBlur={(e) => {
                          // Al salir, formatear y guardar
                          const valorLimpio = limpiarNumero(e.target.value);
                          actualizarCampo(t.firebaseId, "precio", valorLimpio);
                          e.target.value = valorLimpio > 0 ? formatearNumero(valorLimpio) : "";
                        }}
                        className="w-full bg-white border-2 border-[#bdc3c7] rounded p-1 text-[#2c3e50] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-xs"
                        placeholder="0"
                      />
                    </td>
                    
                    {/* ✅ COSTO CON FORMATEO - CORREGIDO */}
                    <td className="hidden sm:table-cell p-1 sm:p-2 md:p-3 border border-black">
                      <input
                        key={`costo-${t.firebaseId}-${t.costo}`}
                        type="text"
                        defaultValue={
                          typeof t.costo === "number" && !isNaN(t.costo)
                            ? formatearNumero(t.costo)
                            : ""
                        }
                        onFocus={(e) => {
                          // Al hacer focus, mostrar número sin formato
                          const valorLimpio = limpiarNumero(e.target.value);
                          e.target.value = valorLimpio > 0 ? valorLimpio.toString() : "";
                        }}
                        onBlur={(e) => {
                          // Al salir, formatear y guardar
                          const valorLimpio = limpiarNumero(e.target.value);
                          actualizarCampo(t.firebaseId, "costo", valorLimpio);
                          e.target.value = valorLimpio > 0 ? formatearNumero(valorLimpio) : "";
                        }}
                        className="w-full bg-white border-2 border-[#bdc3c7] rounded p-1 text-[#2c3e50] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-xs"
                        placeholder="0"
                      />
                    </td>
                    
                    {/* ✅ GANANCIA CON FORMATEO */}
                    <td className="hidden sm:table-cell p-1 sm:p-2 md:p-3 border border-black">
                      <span className={`font-bold px-1 py-1 rounded text-xs text-center block ${
                        typeof ganancia === "number" && ganancia > 0 ? "bg-green-50 text-[#27ae60]" :
                        typeof ganancia === "number" && ganancia < 0 ? "bg-red-50 text-[#e74c3c]" :
                        "text-[#7f8c8d]"
                      }`}>
                        {typeof ganancia === "number" ? formatearNumero(ganancia) : "—"}
                      </span>
                    </td>
                    
                    <td className="hidden lg:table-cell p-1 sm:p-1.5 md:p-2 border border-black max-w-[75px]">
                      <span className="text-xs bg-[#ecf0f1] px-1 py-1 rounded block text-center truncate" title={t.fechaModificacion || "—"}>
                        {t.fechaModificacion || "—"}
                      </span>
                    </td>
                    
                    {/* ACCIONES */}
                    <td className="p-1 sm:p-2 md:p-3 border border-black w-[150px] sm:w-[165px] md:w-[180px] lg:w-[220px]">
                      <div className="flex flex-col gap-1">
                        
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
                                }
                              } catch (error) {
                                console.error("❌ Error al recalcular cuenta:", error);
                              }
                            }
                            
                            await onRecargar();
                          }}
                          className="w-full px-1 py-1 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-black text-xs font-normal"
                        >
                          <option value="PENDIENTE">⏳ Pendiente</option>
                          <option value="REPARADO">🔧 Reparado</option>
                          <option value="ENTREGADO">📦 Entregado</option>
                          <option value="PAGADO">💰 Pagado</option>
                        </select>

                        <div className="flex gap-0.5 lg:gap-1 justify-center overflow-x-auto">
                          <button
                            onClick={() => {
                              setTrabajoSeleccionado(t.firebaseId);
                              setMostrarModalRepuestos(true);
                            }}
                            className={`text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm flex-shrink-0 ${
                              t.repuestosUsados && t.repuestosUsados.length > 0
                                ? "bg-[#9b59b6] hover:bg-[#8e44ad]"
                                : "bg-[#27ae60] hover:bg-[#229954]"
                            }`}
                            title="Repuestos"
                          >
                            ➕
                          </button>

                          <button
                            onClick={() => manejarClickEditar(t)}
                            className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm flex-shrink-0"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          
                          <button
                              onClick={() => confirmarEliminar(t.firebaseId)}
                              className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm flex-shrink-0"
                              title="Eliminar"
                             >
                              🗑️
                              </button>
                          
                          {t.estado !== "PAGADO" && t.precio && t.precio > 0 && (
                            <button
                              onClick={() => abrirModalPago(t)}
                              className="bg-[#27ae60] hover:bg-[#229954] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm flex-shrink-0"
                              title="Pagar"
                            >
                              💰
                            </button>
                          )}

                          <button
                            onClick={() => abrirModalImpresion(t)}
                            className="bg-[#3498db] hover:bg-[#2980b9] text-white px-1 lg:px-1.5 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm flex-shrink-0"
                            title="Imprimir"
                          >
                            🖨️
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

        {totalPaginas > 1 && (
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t-2 border-[#bdc3c7]">
            <div className="flex justify-center items-center gap-2 sm:gap-3 md:gap-4">
              <button
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual(Math.max(paginaActual - 1, 1))}
                className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xs sm:text-sm"
              >
                <span className="sm:hidden">←</span>
                <span className="hidden sm:inline">← Anterior</span>
              </button>
              <span className="px-2 sm:px-3 md:px-4 py-2 bg-[#3498db] text-white rounded-lg font-semibold text-xs sm:text-sm">
                <span className="sm:hidden">{paginaActual}/{totalPaginas}</span>
                <span className="hidden sm:inline">Página {paginaActual} de {totalPaginas}</span>
              </span>
              <button
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual(Math.min(paginaActual + 1, totalPaginas))}
                className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xs sm:text-sm"
              >
                <span className="sm:hidden">→</span>
                <span className="hidden sm:inline">Siguiente →</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}
      <ModalEditar
        trabajo={trabajoEditando}
        isOpen={modalEditarAbierto}
        onClose={cerrarModalEditar}
        onSave={onRecargar}
        negocioID={negocioID}
      />

{mostrarModalRepuestos && trabajoSeleccionado && (
  <ModalRepuestos
    trabajoID={trabajoSeleccionado}
    onClose={async () => {
      setMostrarModalRepuestos(false);
      setTrabajoSeleccionado(null);
      await onRecargar();
    }}
    onGuardar={async () => {
      await onRecargar();
    }}
  />
)}
{/* Modal de confirmación de eliminación */}
{mostrarConfirmarEliminar && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚠️</span>
        </div>
        <h3 className="text-xl font-bold text-[#2c3e50] mb-2">¿Eliminar trabajo?</h3>
        <p className="text-[#7f8c8d]">Esta acción no se puede deshacer</p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => {
            setMostrarConfirmarEliminar(false);
            setTrabajoAEliminar(null);
          }}
          className="flex-1 px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={eliminarTrabajo}
          className="flex-1 px-6 py-3 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-lg font-medium transition-all"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
)}
      {mostrarModalPago && trabajoParaPagar && (
        <ModalPago
          mostrar={mostrarModalPago}
          trabajo={trabajoParaPagar}
          negocioID={negocioID}
          onClose={() => {
            setMostrarModalPago(false);
            setTrabajoParaPagar(null);
          }}
          onPagoGuardado={onRecargar}
        />
      )}

      {mostrarModalImpresion && trabajoParaImprimir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
            
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🖨️</span>
                  <div>
                    <h3 className="text-2xl font-bold">Opciones de Impresión</h3>
                    <p className="text-sm opacity-90">Trabajo: {trabajoParaImprimir.cliente} - {trabajoParaImprimir.modelo}</p>
                  </div>
                </div>
                <button
                  onClick={cerrarModalImpresion}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              <BotonesImpresionTrabajo 
                trabajo={{
                  ...trabajoParaImprimir,
                  id: trabajoParaImprimir.id || trabajoParaImprimir.firebaseId,
                }}
                negocioId={negocioID}
                ocultarEtiquetasA4={true}
                onImpresionCompleta={cerrarModalImpresion}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

