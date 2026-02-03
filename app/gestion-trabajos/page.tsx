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
  getDoc,        // ⭐ NUEVO
  updateDoc,     // ⭐ NUEVO
  query,         // ⭐ NUEVO
  where,         // ⭐ NUEVO
  limit,         // ⭐ NUEVO
  serverTimestamp, // ⭐ NUEVO
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
  
  // ✅ NUEVOS: Estados para filtros de fecha
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [tipoFecha, setTipoFecha] = useState<"ingreso" | "modificacion">("ingreso");
  
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
      // 1. ⭐ NUEVO: Obtener datos del trabajo ANTES de eliminarlo
      const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`);
      const trabajoSnap = await getDoc(trabajoRef);
      
      if (!trabajoSnap.exists()) {
        console.error("❌ Trabajo no encontrado");
        return;
      }
      
      const trabajoData = trabajoSnap.data();
      
      // 2. Eliminar el trabajo
      await deleteDoc(trabajoRef);
      setTrabajos((prev) => prev.filter((t) => t.firebaseId !== firebaseId));
      
      // 3. ⭐ NUEVO: Si estaba ENTREGADO o PAGADO, restar la deuda del saldo
      const estadosValidos = ["ENTREGADO", "PAGADO"];
      if (estadosValidos.includes(trabajoData.estado) && trabajoData.precio > 0) {
        await actualizarSaldoCliente(
          trabajoData.cliente,
          trabajoData.moneda === "ARS" ? -trabajoData.precio : 0,
          trabajoData.moneda === "USD" ? -trabajoData.precio : 0
        );
        console.log('✅ Saldo actualizado por eliminación de trabajo');
      }
      
      console.log("✅ Trabajo eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando trabajo:", error);
      alert("No se pudo eliminar el trabajo. Intenta nuevamente.");
    }
  };
  
  // ⭐ NUEVA FUNCIÓN: Actualizar saldo del cliente
  const actualizarSaldoCliente = async (nombreCliente: string, sumarARS: number, sumarUSD: number) => {
    if (!negocioID) return;
  
    try {
      const clientesSnap = await getDocs(
        query(
          collection(db, `negocios/${negocioID}/clientes`),
          where("nombre", "==", nombreCliente),
          limit(1)
        )
      );
  
      if (clientesSnap.empty) {
        console.log(`⚠️ Cliente no encontrado: ${nombreCliente}`);
        return;
      }
  
      const clienteDoc = clientesSnap.docs[0];
      const datosCliente = clienteDoc.data();
  
      const nuevoSaldoARS = (datosCliente.saldoARS || 0) + sumarARS;
      const nuevoSaldoUSD = (datosCliente.saldoUSD || 0) + sumarUSD;
  
      await updateDoc(clienteDoc.ref, {
        saldoARS: Math.round(nuevoSaldoARS * 100) / 100,
        saldoUSD: Math.round(nuevoSaldoUSD * 100) / 100,
        ultimaActualizacion: serverTimestamp()
      });
  
      console.log(`✅ Saldo actualizado: ${nombreCliente} | ARS ${sumarARS > 0 ? '+' : ''}${sumarARS} | USD ${sumarUSD > 0 ? '+' : ''}${sumarUSD}`);
    } catch (error) {
      console.error(`❌ Error actualizando saldo de ${nombreCliente}:`, error);
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

  // ✅ ACTUALIZADA: Función trabajosFiltrados con filtros de fecha
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
      // ✅ NUEVO: Filtro por fechas
      .filter((t) => {
        if (!filtroFechaDesde && !filtroFechaHasta) return true;
        
        // Elegir qué fecha usar según el tipo seleccionado
        const fechaAUsar = tipoFecha === "modificacion" 
          ? (t.fechaModificacion || t.fecha) 
          : t.fecha;
        
        if (!fechaAUsar) return true;
        
        const fechaTrabajo = parsearFecha(fechaAUsar);
        
        // Filtro fecha desde
        if (filtroFechaDesde) {
          const fechaDesde = new Date(filtroFechaDesde);
          if (fechaTrabajo < fechaDesde) return false;
        }
        
        // Filtro fecha hasta
        if (filtroFechaHasta) {
          const fechaHasta = new Date(filtroFechaHasta);
          fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
          if (fechaTrabajo > fechaHasta) return false;
        }
        
        return true;
      })
      .filter((t) => {
        if (filtroEstado === "TODOS") return true;
        if (filtroEstado === "PENDIENTE") return t.estado === "PENDIENTE";
        if (filtroEstado === "ENTREGADO") return t.estado === "ENTREGADO";
        if (filtroEstado === "REPARADO") return t.estado === "REPARADO";
        if (filtroEstado === "PAGADO") return t.estado === "PAGADO";
        return true;
      })
      .sort((a, b) => {
        // Usar la fecha según el tipo seleccionado para ordenar
        const fechaA = tipoFecha === "modificacion" 
          ? (a.fechaModificacion || a.fecha) 
          : a.fecha;
        const fechaB = tipoFecha === "modificacion" 
          ? (b.fechaModificacion || b.fecha) 
          : b.fecha;
        
        return parsearFecha(fechaB).getTime() - parsearFecha(fechaA).getTime();
      });
  }, [trabajos, filtroTexto, filtroEstado, filtroTrabajo, filtroIMEI, filtroFechaDesde, filtroFechaHasta, tipoFecha]);

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
                
                {/* ✅ NUEVO: Filtros de fecha */}
                <div className="flex gap-2 items-center bg-[#f8f9fa] p-2 rounded-lg border border-[#bdc3c7]">
                  <button
                    onClick={() => setTipoFecha(tipoFecha === "ingreso" ? "modificacion" : "ingreso")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      tipoFecha === "ingreso" 
                        ? "bg-[#3498db] text-white" 
                        : "bg-[#e74c3c] text-white"
                    }`}
                    title="Cambiar entre fecha de ingreso y fecha de modificación"
                  >
                    {tipoFecha === "ingreso" ? "📅 Ingreso" : "🔄 Modificación"}
                  </button>
                  
                  <input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    className="px-3 py-2 border border-[#bdc3c7] rounded-lg text-sm focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
                    title="Fecha desde"
                  />
                  
                  <span className="text-[#7f8c8d] text-sm">hasta</span>
                  
                  <input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    className="px-3 py-2 border border-[#bdc3c7] rounded-lg text-sm focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
                    title="Fecha hasta"
                  />
                  
                  {(filtroFechaDesde || filtroFechaHasta) && (
                    <button
                      onClick={() => {
                        setFiltroFechaDesde("");
                        setFiltroFechaHasta("");
                      }}
                      className="text-[#e74c3c] hover:text-[#c0392b] transition-colors text-sm px-2"
                      title="Limpiar filtros de fecha"
                    >
                      ❌
                    </button>
                  )}
                </div>
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
                  {trabajosFiltrados.filter(t => t.estado === "PENDIENTE").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#f39c12]">
                  {trabajosFiltrados.filter(t => t.estado === "REPARADO").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Reparados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#27ae60]">
                  {trabajosFiltrados.filter(t => t.estado === "ENTREGADO").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Entregados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#3498db]">
                  {trabajosFiltrados.filter(t => t.estado === "PAGADO").length}
                </div>
                <div className="text-sm text-[#7f8c8d]">Pagados</div>
              </div>
            </div>
          </div>

          {/* Componente Tabla */}
          <TablaTrabajos
            trabajos={trabajosFiltrados.map(t => {
              // Mostrar la fecha según el tipo seleccionado
              const fechaAMostrar = tipoFecha === "modificacion" 
                ? (t.fechaModificacion || t.fecha) 
                : t.fecha;
              return { ...t, fecha: formatearFecha(fechaAMostrar) };
            })}
            cambiarEstado={cambiarEstado}
            eliminarTrabajo={eliminarTrabajo}
            onPagar={onPagar}
            router={router}
            negocioID={negocioID}
            recargarTrabajos={cargarTrabajos}
            tipoFecha={tipoFecha}
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