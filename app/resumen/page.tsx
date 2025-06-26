"use client";
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import RequireAdmin from "@/lib/RequireAdmin";
import Header from "../Header";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";
import ModalRepuestos from "./componentes/ModalRepuestos";

interface Trabajo {
  firebaseId: string;
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

export default function ResumenPage() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroModelo, setFiltroModelo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 40;
  const [mostrarPagados, setMostrarPagados] = useState(false);

  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");
  const { rol } = useRol();
  const router = useRouter();
  const [mostrarModalRepuestos, setMostrarModalRepuestos] = useState(false);
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  useEffect(() => {
    if (!negocioID) return;
    const unsubscribe = onSnapshot(collection(db, `negocios/${negocioID}/trabajos`), (snapshot) => {
      const lista: Trabajo[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        lista.push({
          firebaseId: docSnap.id,
          fecha: data.fecha,
          cliente: data.cliente,
          modelo: data.modelo,
          trabajo: data.trabajo,
          clave: data.clave,
          observaciones: data.observaciones,
          estado: data.estado,
          estadoCuentaCorriente: data.estadoCuentaCorriente,
          precio: data.precio,
          costo: data.costo,
          repuestosUsados: data.repuestosUsados ?? [],
          fechaModificacion: data.fechaModificacion,
        });
      });

      let filtrados = lista;
      if (!mostrarPagados) {
        filtrados = lista.filter(
          (t) => !(t.estado === "ENTREGADO" && t.estadoCuentaCorriente === "PAGADO")
        );
      }

      const ordenados = filtrados.sort((a, b) => {
        if (a.estado !== b.estado) {
          return a.estado === "PENDIENTE" ? -1 : 1;
        }
        const fechaA = new Date(a.fecha.split("/").reverse().join("/")).getTime();
        const fechaB = new Date(b.fecha.split("/").reverse().join("/")).getTime();
        return fechaB - fechaA;
      });

      setTrabajos(ordenados);
    });

    return () => unsubscribe();
  }, [negocioID, mostrarPagados]);
  
  const recargarTrabajos = async () => {
    const snap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
    const lista: Trabajo[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      lista.push({
        firebaseId: docSnap.id,
        fecha: data.fecha,
        cliente: data.cliente,
        modelo: data.modelo,
        trabajo: data.trabajo,
        clave: data.clave,
        observaciones: data.observaciones,
        estado: data.estado,
        estadoCuentaCorriente: data.estadoCuentaCorriente,
        precio: data.precio,
        costo: data.costo,
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

  const actualizarCampo = async (firebaseId: string, campo: "precio" | "costo", valor: number) => {
    const ref = doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`);
    await updateDoc(ref, { [campo]: valor });
  };

  const eliminarTrabajo = async (firebaseId: string) => {
    const confirmar = confirm("¿Estás seguro de que querés eliminar este trabajo?");
    if (confirmar) {
      await deleteDoc(doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`));
    }
  };

  const editarTrabajo = (firebaseId: string) => {
    router.push(`/gestion-trabajos/editar?id=${firebaseId}&origen=resumen`);
  };

  const exportarCSV = () => {
    const encabezado = ["Fecha", "Cliente", "Modelo", "Trabajo", "Clave", "Observaciones", "Estado", "Precio", "Costo", "Ganancia"];
    const filas = trabajosFiltrados.map((t) => [
      t.fecha,
      t.cliente,
      t.modelo,
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
    .filter(
      (t) =>
        t.cliente?.toLowerCase().includes(filtroCliente.toLowerCase()) &&
        (
          t.modelo?.toLowerCase().includes(filtroModelo.toLowerCase()) ||
          t.trabajo?.toLowerCase().includes(filtroModelo.toLowerCase())
        )
    )
    .filter((t) => {
      if (filtroEstado === "TODOS") return true;
      if (filtroEstado === "PAGADO") return t.estadoCuentaCorriente === "PAGADO";
      return t.estado === filtroEstado;
    })
    .sort((a, b) => {
      const fechaA = new Date(a.fecha.split("/").reverse().join("/")).getTime();
      const fechaB = new Date(b.fecha.split("/").reverse().join("/")).getTime();
      return fechaB - fechaA;
    });  

  const totalPaginas = Math.ceil(trabajosFiltrados.length / ITEMS_POR_PAGINA);
  const trabajosPaginados = trabajosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  return (
    <RequireAdmin>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-2 sm:px-4 md:px-6 max-w-[1800px] mx-auto">
          
          {/* Header de la página - Responsive */}
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
                  Gestión completa de trabajos y servicios técnicos
                </p>
              </div>
            </div>
          </div>

          {/* Filtros y controles - Responsive */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl">🔍</span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2c3e50]">Filtros de Búsqueda</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
              <input
                type="text"
                placeholder="🔍 Filtrar por cliente"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="px-3 sm:px-4 py-2 sm:py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm sm:text-base"
              />
              
              <input
                type="text"
                placeholder="📱 Filtrar modelo/trabajo"
                value={filtroModelo}
                onChange={(e) => setFiltroModelo(e.target.value)}
                className="px-3 sm:px-4 py-2 sm:py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm sm:text-base"
              />
              
              <button
                onClick={exportarCSV}
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                📄 <span className="hidden sm:inline">Exportar</span> CSV
              </button>
            </div>

            {/* Botones de estado - Responsive */}
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

          {/* Tabla principal - Completamente responsive */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
            {/* Header de la tabla */}
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-4 md:p-6">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-lg sm:text-xl md:text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold">Lista de Trabajos</h3>
                  <p className="text-blue-100 mt-1 text-xs sm:text-sm">
                    {trabajosFiltrados.length} {trabajosFiltrados.length === 1 ? 'trabajo encontrado' : 'trabajos encontrados'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla responsive */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-black min-w-fit">
                <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                  <tr>
                    {/* Fecha - Siempre visible */}
                    <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[60px] sm:min-w-[80px] md:min-w-[100px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">📅</span>
                        <span className="hidden sm:inline text-xs">Fecha</span>
                      </div>
                    </th>
                    
                    {/* Cliente - Siempre visible */}
                    <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[80px] sm:min-w-[100px] md:min-w-[120px]">
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
                    
                    {/* Trabajo - Siempre visible */}
                    <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[100px] sm:min-w-[120px] md:min-w-[150px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">🔧</span>
                        <span className="text-xs">Trabajo</span>
                      </div>
                    </th>
                    
                    {/* Clave - Oculto en móvil */}
                    <th className="hidden sm:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[60px] md:min-w-[80px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">🔑</span>
                        <span className="hidden md:inline text-xs">Clave</span>
                      </div>
                    </th>
                    
                    {/* Observaciones - Oculto en móvil, reducido */}
                    <th className="hidden md:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] w-[60px] md:w-[80px] max-w-[80px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">📝</span>
                        <span className="text-xs">Obs</span>
                      </div>
                    </th>
                    
                    {/* Estado - Siempre visible */}
                    <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[80px] md:min-w-[90px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">🚦</span>
                        <span className="hidden sm:inline text-xs">Estado</span>
                      </div>
                    </th>
                    
                    {/* Precio - Siempre visible */}
                    <th className="p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] sm:min-w-[80px] md:min-w-[90px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">💰</span>
                        <span className="text-xs">Precio</span>
                      </div>
                    </th>
                    
                    {/* Costo - Oculto en móvil */}
                    <th className="hidden sm:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] md:min-w-[80px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">💸</span>
                        <span className="text-xs">Costo</span>
                      </div>
                    </th>
                    
                    {/* Ganancia - Oculto en móvil */}
                    <th className="hidden sm:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[70px] md:min-w-[80px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">📈</span>
                        <span className="text-xs">Ganancia</span>
                      </div>
                    </th>
                    
                    {/* F.Mod - Oculto en móvil y tablet */}
                    <th className="hidden lg:table-cell p-1 sm:p-2 md:p-3 text-left text-xs font-bold text-black border border-black bg-[#ecf0f1] min-w-[60px] md:min-w-[80px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">📅</span>
                        <span className="text-xs">F.Mod</span>
                      </div>
                    </th>
                    
                    {/* Acciones - Compacto en móvil, espacioso en desktop */}
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
                    const ganancia = typeof t.precio === "number" && typeof t.costo === "number"
                      ? t.precio - t.costo
                      : "";

                    let bgClass = "";
                    if (t.estadoCuentaCorriente === "PAGADO") bgClass = "bg-blue-100 border-l-4 border-[#1565C0]";
                    else if (t.estado === "ENTREGADO") bgClass = "bg-green-100 border-l-4 border-[#1B5E20]";
                    else if (t.estado === "REPARADO") bgClass = "bg-orange-100 border-l-4 border-[#D84315]";
                    else if (t.estado === "PENDIENTE") bgClass = "bg-red-100 border-l-4 border-[#B71C1C]";

                    return (
                      <tr
                        key={t.firebaseId}
                        className={`transition-all duration-200 hover:bg-[#ebf3fd] ${bgClass}`}
                      >
                        
                        {/* Fecha */}
                        <td className="p-1 sm:p-2 md:p-3 border border-black">
                          <span className="text-xs bg-[#ecf0f1] px-1 py-1 rounded block text-center truncate" title={t.fecha}>
                            {t.fecha}
                          </span>
                        </td>
                        
                        {/* Cliente */}
                        <td className="p-1 sm:p-2 md:p-3 border border-black">
                          <span className="text-xs truncate block font-medium text-[#3498db]" title={t.cliente}>
                            {t.cliente}
                          </span>
                        </td>
                        
                        {/* Modelo */}
                        <td className="p-1 sm:p-2 md:p-3 border border-black">
                          <span className="text-xs truncate block" title={t.modelo}>
                            {t.modelo}
                          </span>
                        </td>
                        
                        {/* Trabajo */}
                        <td className="p-1 sm:p-2 md:p-3 border border-black">
                          <span className="text-xs truncate block" title={t.trabajo}>
                            {t.trabajo}
                          </span>
                        </td>
                        
                        {/* Clave - Oculto en móvil */}
                        <td className="hidden sm:table-cell p-1 sm:p-2 md:p-3 border border-black">
                          <span className="text-xs truncate block" title={t.clave || "—"}>
                            {t.clave || "—"}
                          </span>
                        </td>
                        
                        {/* Observaciones - Oculto en móvil, texto muy corto */}
                        <td className="hidden md:table-cell p-1 sm:p-2 md:p-3 border border-black w-[60px] md:w-[80px] max-w-[80px]">
                          <span className="text-xs truncate block overflow-hidden" title={t.observaciones || "—"}>
                            {t.observaciones ? (t.observaciones.length > 5 ? t.observaciones.substring(0, 5) + "..." : t.observaciones) : "—"}
                          </span>
                        </td>
                        
                        {/* Estado */}
                        <td className="p-1 sm:p-2 md:p-3 border border-black">
                          <span className={`inline-flex items-center justify-center px-1 py-1 rounded text-xs font-bold w-full ${
                            t.estadoCuentaCorriente === "PAGADO" ? "bg-[#1565C0] text-white border-2 border-[#0D47A1]" :
                            t.estado === "ENTREGADO" ? "bg-[#1B5E20] text-white border-2 border-[#0D3711]" :
                            t.estado === "REPARADO" ? "bg-[#D84315] text-white border-2 border-[#BF360C]" :
                            t.estado === "PENDIENTE" ? "bg-[#B71C1C] text-white border-2 border-[#8E0000]" :
                            "bg-[#424242] text-white border-2 border-[#212121]"
                          }`}>
                            <span className="sm:hidden">
                              {t.estadoCuentaCorriente === "PAGADO" ? "💰" :
                               t.estado === "ENTREGADO" ? "📦" :
                               t.estado === "REPARADO" ? "🔧" :
                               t.estado === "PENDIENTE" ? "⏳" : "❓"}
                            </span>
                            <span className="hidden sm:inline">
                              {t.estadoCuentaCorriente === "PAGADO" ? "PAGADO" : t.estado}
                            </span>
                          </span>
                        </td>
                        
                        {/* Precio */}
                        <td className="p-1 sm:p-2 md:p-3 border border-black">
                          <input
                            type="number"
                            defaultValue={typeof t.precio === "number" ? t.precio : ""}
                            onBlur={(e) => actualizarCampo(t.firebaseId, "precio", Number(e.target.value))}
                            className="w-full bg-white border-2 border-[#bdc3c7] rounded p-1 text-[#2c3e50] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-xs"
                            placeholder="0"
                          />
                        </td>
                        
                        {/* Costo - Oculto en móvil */}
                        <td className="hidden sm:table-cell p-1 sm:p-2 md:p-3 border border-black">
                          <input
                            type="number"
                            defaultValue={typeof t.costo === "number" && !isNaN(t.costo) ? t.costo : ""}
                            onBlur={(e) => actualizarCampo(t.firebaseId, "costo", Number(e.target.value))}
                            className="w-full bg-white border-2 border-[#bdc3c7] rounded p-1 text-[#2c3e50] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-xs"
                            placeholder="0"
                          />
                        </td>
                        
                        {/* Ganancia - Oculto en móvil */}
                        <td className="hidden sm:table-cell p-1 sm:p-2 md:p-3 border border-black">
                          <span className={`font-bold px-1 py-1 rounded text-xs text-center block ${
                            typeof ganancia === "number" && ganancia > 0 ? "bg-green-50 text-[#27ae60]" :
                            typeof ganancia === "number" && ganancia < 0 ? "bg-red-50 text-[#e74c3c]" :
                            "text-[#7f8c8d]"
                          }`}>
                            {typeof ganancia === "number" ? `${ganancia}` : "—"}
                          </span>
                        </td>
                        
                        {/* F.Mod - Oculto en móvil y tablet */}
                        <td className="hidden lg:table-cell p-1 sm:p-2 md:p-3 border border-black">
                          <span className="text-xs bg-[#ecf0f1] px-1 py-1 rounded block text-center truncate" title={t.fechaModificacion || "—"}>
                            {t.fechaModificacion || "—"}
                          </span>
                        </td>
                        
                        {/* Acciones - Compacto en móvil, espacioso en desktop */}
                        <td className="p-1 sm:p-2 md:p-3 border border-black w-[120px] sm:w-[130px] md:w-[140px] lg:w-[180px]">
                          <div className="flex flex-col gap-1">
                            
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
                                  setTrabajoSeleccionado(t.firebaseId);
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
                                onClick={() => editarTrabajo(t.firebaseId)}
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
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer con paginación - Responsive */}
            {totalPaginas > 1 && (
              <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t-2 border-[#bdc3c7]">
                <div className="flex justify-center items-center gap-2 sm:gap-3 md:gap-4">
                  <button
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
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
                    onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                    className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xs sm:text-sm"
                  >
                    <span className="sm:hidden">→</span>
                    <span className="hidden sm:inline">Siguiente →</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de repuestos - Responsive */}
        {mostrarModalRepuestos && trabajoSeleccionado && (
          <ModalRepuestos
            trabajoID={trabajoSeleccionado}
            onClose={async () => {
              setMostrarModalRepuestos(false);
              setTrabajoSeleccionado(null);
              await recargarTrabajos();
            }}
          />
        )}
      </main>
    </RequireAdmin>
  );
}