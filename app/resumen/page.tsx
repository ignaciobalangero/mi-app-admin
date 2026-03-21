"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import RequireAdmin from "@/lib/RequireAdmin";
import Header from "../Header";
import { useRol } from "@/lib/useRol";
import TablaTrabajos from "./componentes/TablaTrabajos";
import FiltroTrabajos from "@/app/gestion-trabajos/componentes/FiltroTrabajos";

interface Trabajo {
  firebaseId: string;
  id?: string;
  fecha: string;
  cliente: string;
  modelo: string;
  color?: string;
  trabajo: string;
  imei?: string;
  clave: string;
  observaciones: string;
  reparacionRealizada?: string;
  estado: string;
  estadoCuentaCorriente?: string;
  anticipo?: number;
  saldo?: number;
  accesorios?: string;
  checkIn?: Record<string, any> | null;
  precio?: number;
  costo?: number;
  repuestosUsados?: any[];
  fechaModificacion?: string;
}

export default function ResumenPage() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroTrabajo, setFiltroTrabajo] = useState("");
  const [filtroIMEI, setFiltroIMEI] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [tipoFecha, setTipoFecha] = useState<"ingreso" | "modificacion">("ingreso");

  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");
  const { rol } = useRol();

  const parsearFecha = (fechaStr: string) => {
    if (!fechaStr.includes("/")) {
      return new Date(fechaStr.split("T")[0]);
    }
    const [dia, mes, anio] = fechaStr.split("/").map((x) => parseInt(x));
    return new Date(anio, mes - 1, dia);
  };

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  useEffect(() => {
    if (!negocioID) return;
    recargarTrabajos();
  }, [negocioID]);
  
  const recargarTrabajos = async () => {
    const snap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
    const lista: Trabajo[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      lista.push({
        firebaseId: docSnap.id,
        id: data.id,
        fecha: data.fecha,
        cliente: data.cliente,
        modelo: data.modelo,
        color: data.color,
        trabajo: data.trabajo,
        clave: data.clave,
        observaciones: data.observaciones,
        reparacionRealizada: data.reparacionRealizada,
        estado: data.estado,
        estadoCuentaCorriente: data.estadoCuentaCorriente,
        precio: data.precio,
        costo: data.costo,
        imei: data.imei,
        anticipo: data.anticipo,
        saldo: data.saldo,
        accesorios: data.accesorios,
        checkIn: data.checkIn ?? null,
        fechaModificacion: data.fechaModificacion,
      });
    });

    const ordenados = lista.sort((a, b) => {
      const fechaA = new Date(a.fecha.split("/").reverse().join("/")).getTime();
      const fechaB = new Date(b.fecha.split("/").reverse().join("/")).getTime();
      return fechaB - fechaA;
    });

    setTrabajos(ordenados);
  };

  const exportarCSV = () => {
    const encabezado = ["Fecha", "Cliente", "Modelo", "IMEI", "Color", "Trabajo", "Clave", "Observaciones", "Estado", "Precio", "Costo", "Ganancia"];
    const filas = trabajosFiltrados.map((t) => [
      t.fecha,
      t.cliente,
      t.modelo,
      t.imei ?? "",
      t.color ?? "",
      t.trabajo,
      t.clave,
      t.observaciones,
      t.estado,
      t.precio ?? "",
      t.costo ?? "",
      t.precio && t.costo ? t.precio - t.costo : ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [encabezado, ...filas].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resumen_clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const trabajosFiltrados = trabajos
    .filter((t) => {
      const texto = filtroTexto.trim().toLowerCase();
      const textoTrabajo = filtroTrabajo.trim().toLowerCase();
      const textoIMEI = filtroIMEI.trim().toLowerCase();

      return (
        (!texto || [t.cliente, t.modelo, t.fecha].some((campo) => campo?.toLowerCase().includes(texto))) &&
        (!textoTrabajo || t.trabajo?.toLowerCase().includes(textoTrabajo)) &&
        (!textoIMEI || t.imei?.toLowerCase().includes(textoIMEI)) &&
        (filtroCodigo === "" || t.id?.toLowerCase().includes(filtroCodigo.toLowerCase()))
      );
    })
    .filter((t) => {
      if (!filtroFechaDesde && !filtroFechaHasta) return true;
      
      const fechaAUsar = tipoFecha === "modificacion" 
        ? (t.fechaModificacion || t.fecha) 
        : t.fecha;
      
      if (!fechaAUsar) return true;
      
      const fechaTrabajo = parsearFecha(fechaAUsar);
      
      if (filtroFechaDesde) {
        const fechaDesde = new Date(filtroFechaDesde);
        if (fechaTrabajo < fechaDesde) return false;
      }
      
      if (filtroFechaHasta) {
        const fechaHasta = new Date(filtroFechaHasta);
        fechaHasta.setHours(23, 59, 59, 999);
        if (fechaTrabajo > fechaHasta) return false;
      }
      
      return true;
    })
    .filter((t) => {
      if (filtroEstado === "TODOS") return true;
      if (filtroEstado === "PAGADO") {
        return t.estado === "PAGADO";
      }
      return t.estado === filtroEstado;
    })
    .sort((a, b) => {
      const fechaA = tipoFecha === "modificacion" 
        ? (a.fechaModificacion || a.fecha) 
        : a.fecha;
      const fechaB = tipoFecha === "modificacion" 
        ? (b.fechaModificacion || b.fecha) 
        : b.fecha;
      
      const timeA = new Date(fechaA.split("/").reverse().join("/")).getTime();
      const timeB = new Date(fechaB.split("/").reverse().join("/")).getTime();
      return timeB - timeA;
    });

  return (
    <RequireAdmin>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-2 sm:px-4 md:px-6 max-w-[1800px] mx-auto">
          
          {/* HEADER */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-3 sm:p-4 md:p-6 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl sm:text-3xl md:text-4xl">📊</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">
                  Resumen de Clientes
                </h1>
                <p className="text-blue-100 text-xs sm:text-sm">
                  Gestión completa de trabajos con pagos integrados
                </p>
              </div>
            </div>
          </div>

          {/* PANEL DE FILTROS */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl">🔍</span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2c3e50]">Filtros de Búsqueda</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
              <div className="lg:col-span-2 sm:col-span-2">
                <FiltroTrabajos
                  filtroTexto={filtroTexto}
                  setFiltroTexto={setFiltroTexto}
                  filtroTrabajo={filtroTrabajo}
                  setFiltroTrabajo={setFiltroTrabajo}
                />
              </div>
              
              <input
                type="text"
                placeholder="🔍 Buscar por IMEI"
                value={filtroIMEI}
                onChange={(e) => setFiltroIMEI(e.target.value)}
                className="px-3 sm:px-4 py-2 sm:py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm sm:text-base"
                title="Buscar por IMEI"
              />
              
              <input
                type="text"
                placeholder="🔢 Filtrar por código"
                value={filtroCodigo}
                onChange={(e) => setFiltroCodigo(e.target.value)}
                className="px-3 sm:px-4 py-2 sm:py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm sm:text-base"
                title="Buscar por código de trabajo (ej: EO-52348)"
              />
              
              <button
                onClick={exportarCSV}
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                📄 <span className="hidden sm:inline">Exportar</span> CSV
              </button>
            </div>

            <div className="flex gap-2 items-center bg-[#f8f9fa] p-2 rounded-lg border border-[#bdc3c7] mb-4">
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

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setFiltroEstado("TODOS")}
                className={`px-2 sm:px-3 md:px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md text-xs sm:text-sm ${
                  filtroEstado === "TODOS" 
                    ? "bg-[#3498db] text-white shadow-lg border-2 border-[#2980b9]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                📋 <span className="hidden sm:inline">Todos</span>
              </button>
              <button
                onClick={() => setFiltroEstado("PENDIENTE")}
                className={`px-2 sm:px-3 md:px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md text-xs sm:text-sm ${
                  filtroEstado === "PENDIENTE" 
                    ? "bg-[#B71C1C] text-white shadow-lg border-2 border-[#8E0000]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                ⏳ <span className="hidden sm:inline">Pendientes</span>
              </button>
              <button
                onClick={() => setFiltroEstado("REPARADO")}
                className={`px-2 sm:px-3 md:px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md text-xs sm:text-sm ${
                  filtroEstado === "REPARADO" 
                    ? "bg-[#D84315] text-white shadow-lg border-2 border-[#BF360C]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                🔧 <span className="hidden sm:inline">Reparados</span>
              </button>
              <button
                onClick={() => setFiltroEstado("ENTREGADO")}
                className={`px-2 sm:px-3 md:px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md text-xs sm:text-sm ${
                  filtroEstado === "ENTREGADO" 
                    ? "bg-[#1B5E20] text-white shadow-lg border-2 border-[#0D3711]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                📦 <span className="hidden sm:inline">Entregados</span>
              </button>
              <button
                onClick={() => setFiltroEstado("PAGADO")}
                className={`px-2 sm:px-3 md:px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md text-xs sm:text-sm ${
                  filtroEstado === "PAGADO" 
                    ? "bg-[#1565C0] text-white shadow-lg border-2 border-[#0D47A1]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                💰 <span className="hidden sm:inline">Pagados</span>
              </button>
            </div>
          </div>

          {/* TABLA DE TRABAJOS */}
          <TablaTrabajos
            trabajos={trabajosFiltrados}
            negocioID={negocioID}
            onRecargar={recargarTrabajos}
            tipoFecha={tipoFecha}
            paginaActual={paginaActual}
            setPaginaActual={setPaginaActual}
            setTrabajos={setTrabajos}
          />
        </div>
      </main>
    </RequireAdmin>
  );
}