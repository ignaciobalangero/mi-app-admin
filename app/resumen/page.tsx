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
import PanelFiltrosOrdenes, {
  ESTADOS_RESUMEN,
} from "@/components/PanelFiltrosOrdenes";

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
        (!textoIMEI ||
          t.imei?.toLowerCase().includes(textoIMEI) ||
          t.modelo?.toLowerCase().includes(textoIMEI)) &&
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
      <main className="pt-16 bg-[#f8f9fa] overflow-x-hidden min-h-screen text-black w-full">
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

          {/* PANEL DE FILTROS UNIFICADO */}
          <PanelFiltrosOrdenes
            filtroTexto={filtroTexto}
            setFiltroTexto={setFiltroTexto}
            filtroTrabajo={filtroTrabajo}
            setFiltroTrabajo={setFiltroTrabajo}
            filtroIMEI={filtroIMEI}
            setFiltroIMEI={setFiltroIMEI}
            filtroCodigo={filtroCodigo}
            setFiltroCodigo={setFiltroCodigo}
            mostrarCodigo
            filtroFechaDesde={filtroFechaDesde}
            setFiltroFechaDesde={setFiltroFechaDesde}
            filtroFechaHasta={filtroFechaHasta}
            setFiltroFechaHasta={setFiltroFechaHasta}
            tipoFecha={tipoFecha}
            setTipoFecha={setTipoFecha}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            estados={ESTADOS_RESUMEN}
            accionExtra={
              <button
                type="button"
                onClick={exportarCSV}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Exportar CSV
              </button>
            }
          />

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