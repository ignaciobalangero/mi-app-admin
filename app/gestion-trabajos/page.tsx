"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import Header from "../Header";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import TablaTrabajos from "./componentes/TablaTrabajos";
import FiltroTrabajos from "./componentes/FiltroTrabajos";
import ModalPago from "./componentes/ModalPago";

interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  imei?: string;
  trabajo: string;
  clave?: string;
  observaciones?: string;
  estado: string;
  estadoCuentaCorriente?: string;
  precio?: number;
  costo?: number;
  repuestosUsados?: any[];
  fechaModificacion?: string;
}

export default function GestionTrabajosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [filtroIMEI, setFiltroIMEI] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroTrabajo, setFiltroTrabajo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "PENDIENTE" | "REPARADO" | "ENTREGADO" | "PAGADO">("TODOS");
  
  // Estados actualizados para el nuevo modal
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [trabajoSeleccionadoPago, setTrabajoSeleccionadoPago] = useState<Trabajo | null>(null);
  
  const router = useRouter();

  const parsearFecha = (fechaStr: string) => {
    if (!fechaStr.includes("/")) {
      return new Date(fechaStr.split("T")[0]);
    }
    const [dia, mes, anio] = fechaStr.split("/").map((x) => parseInt(x));
    return new Date(anio, mes - 1, dia);
  };

  const formatearFecha = (fechaStr: string) => {
    const fecha = parsearFecha(fechaStr);
    return fecha.toLocaleDateString("es-AR");
  };
  
  const { rol } = useRol();
  
  const cargarTrabajos = async () => {
    if (!negocioID) return;
    try {
      const snap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const lista: Trabajo[] = snap.docs.map((docSnap) => ({
        firebaseId: docSnap.id,
        ...(docSnap.data() as Omit<Trabajo, "firebaseId">),
      }));
      lista.sort((a, b) => parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime());
      setTrabajos(lista);
    } catch (error) {
      console.error("Error cargando trabajos:", error);
    }
  };

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);  

  useEffect(() => {
    const listener = () => cargarTrabajos();
    window.addEventListener("trabajosActualizados", listener);
    return () => window.removeEventListener("trabajosActualizados", listener);
  }, []);

  useEffect(() => {
    if (!negocioID) return;
    cargarTrabajos();
  }, [negocioID]);

  // Esta función ahora no se usa más, pero la mantengo por compatibilidad con TablaTrabajos
  const cambiarEstado = async (firebaseId: string, nuevoEstado: string) => {
    // La lógica de cambio de estado ahora está directamente en TablaTrabajos
    // Esta función puede eliminarse en el futuro si no se usa en otros lugares
    console.log("cambiarEstado legacy called:", firebaseId, nuevoEstado);
  };

  const eliminarTrabajo = async (firebaseId: string) => {
    if (!firebaseId || !negocioID) return;
    
    const confirmar = window.confirm("¿Estás seguro que querés eliminar este trabajo? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`));
      setTrabajos((prev) => prev.filter((t) => t.firebaseId !== firebaseId));
      console.log("✅ Trabajo eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando trabajo:", error);
      alert("No se pudo eliminar el trabajo. Intenta nuevamente.");
    }
  };

  // Función actualizada para abrir el modal con el trabajo seleccionado
  const onPagar = (trabajo: Trabajo) => {
    setTrabajoSeleccionadoPago(trabajo);
    setModalPagoVisible(true);
  };

  // Función para cerrar el modal y limpiar el estado
  const cerrarModalPago = () => {
    setModalPagoVisible(false);
    setTrabajoSeleccionadoPago(null);
  };

  // Función que se ejecuta después de guardar un pago exitosamente
  const onPagoGuardado = async () => {
    await cargarTrabajos(); // Recargar todos los trabajos
    console.log("🔄 Trabajos recargados después del pago");
  };

  const trabajosFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    const textoTrabajo = filtroTrabajo.trim().toLowerCase();
    const textoIMEI = filtroIMEI.trim().toLowerCase();

    return trabajos
      .filter((t) =>
        (!texto || [t.cliente, t.modelo, t.fecha].some((campo) =>
          campo?.toLowerCase().includes(texto)
        ))
        &&
        (!textoTrabajo || t.trabajo?.toLowerCase().includes(textoTrabajo)) &&
        (!textoIMEI || t.imei?.toLowerCase().includes(textoIMEI))
      )  
      .filter((t) => {
        if (filtroEstado === "TODOS") return true;
        if (filtroEstado === "PENDIENTE") return t.estado === "PENDIENTE" && (t.estadoCuentaCorriente !== "PAGADO");
        if (filtroEstado === "ENTREGADO") return t.estado === "ENTREGADO" && (t.estadoCuentaCorriente !== "PAGADO");
        if (filtroEstado === "REPARADO") return t.estado === "REPARADO" && (t.estadoCuentaCorriente !== "PAGADO");
        if (filtroEstado === "PAGADO") {
          // Filtro corregido como en ResumenPage
          return t.estadoCuentaCorriente === "PAGADO" || t.estado === "PAGADO";
        }
        return true;
      })
      .sort((a, b) => parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime());
  }, [trabajos, filtroTexto, filtroEstado, filtroTrabajo, filtroIMEI]);

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1800px] mx-auto">
          
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-6 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🔧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1/2">
                  Gestión de Trabajos
                </h1>
                <p className="text-blue-100 text-sm">
                  {trabajosFiltrados.length} {trabajosFiltrados.length === 1 ? 'trabajo encontrado' : 'trabajos encontrados'}
                </p>
              </div>
            </div>
          </div>

          {/* Filtros y controles - Estilo GestiOne */}
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-8 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2c3e50]">Filtros de Búsqueda</h2>
            </div>
            
            <div className="flex flex-wrap justify-between items-center gap-4">
              {/* Filtros a la izquierda */}
              <div className="flex gap-3 items-center flex-wrap">
                <FiltroTrabajos
                  filtroTexto={filtroTexto}
                  setFiltroTexto={setFiltroTexto}
                  filtroTrabajo={filtroTrabajo}
                  setFiltroTrabajo={setFiltroTrabajo}
                />
                <input
                  type="text"
                  placeholder="🔍 Buscar por IMEI"
                  value={filtroIMEI}
                  onChange={(e) => setFiltroIMEI(e.target.value)}
                  className="px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>

              {/* Botones de estado a la derecha */}
              <div className="flex gap-2 flex-wrap">
                {["TODOS", "PENDIENTE", "REPARADO", "ENTREGADO", "PAGADO"].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(estado as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                      filtroEstado === estado 
                        ? "bg-[#3498db] text-white shadow-md" 
                        : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb]"
                    }`}
                  >
                    {estado === "TODOS" ? "📋 TODOS" :
                     estado === "PENDIENTE" ? "⏳ PENDIENTE" :
                     estado === "REPARADO" ? "🔧 REPARADO" :
                     estado === "ENTREGADO" ? "📦 ENTREGADO" :
                     "💰 PAGADO"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#e74c3c]">
                  {trabajosFiltrados.filter(t => t.estado === "PENDIENTE" && t.estadoCuentaCorriente !== "PAGADO").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#f39c12]">
                  {trabajosFiltrados.filter(t => t.estado === "REPARADO" && t.estadoCuentaCorriente !== "PAGADO").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Reparados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#27ae60]">
                  {trabajosFiltrados.filter(t => t.estado === "ENTREGADO" && t.estadoCuentaCorriente !== "PAGADO").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Entregados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#3498db]">
                  {trabajosFiltrados.filter(t => t.estadoCuentaCorriente === "PAGADO" || t.estado === "PAGADO").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Pagados</div>
              </div>
            </div>
          </div>

          {/* Componente Tabla */}
          <TablaTrabajos
            trabajos={trabajosFiltrados.map(t => ({ ...t, fecha: formatearFecha(t.fecha) }))}
            cambiarEstado={cambiarEstado}
            eliminarTrabajo={eliminarTrabajo}
            onPagar={onPagar}
            router={router}
            negocioID={negocioID}
            recargarTrabajos={cargarTrabajos}
          />

          {/* Modal de pago - Nuevo ModalPago */}
          <ModalPago
            mostrar={modalPagoVisible}
            trabajo={trabajoSeleccionadoPago}
            negocioID={negocioID}
            onClose={cerrarModalPago}
            onPagoGuardado={onPagoGuardado}
          />
        </div>
      </main>
    </>
  );
}