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
        <div className="w-full px-6 max-w-[1800px] mx-auto">
          
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Resumen de Clientes
                </h1>
                <p className="text-blue-100 text-sm">
                  Gestión completa de trabajos y servicios técnicos
                </p>
              </div>
            </div>
          </div>

          {/* Filtros y controles - Estilo GestiOne */}
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2c3e50]">Filtros de Búsqueda</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <input
                type="text"
                placeholder="🔍 Filtrar por cliente"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
              />
              
              <input
                type="text"
                placeholder="📱 Filtrar modelo/trabajo"
                value={filtroModelo}
                onChange={(e) => setFiltroModelo(e.target.value)}
                className="px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
              />
              
              <button
                onClick={exportarCSV}
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                📄 Exportar CSV
              </button>
            </div>

            {/* Botones de estado - Estilo GestiOne */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFiltroEstado("TODOS")}
                className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md ${
                  filtroEstado === "TODOS" 
                    ? "bg-[#3498db] text-white shadow-lg border-2 border-[#2980b9]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                📋 Todos
              </button>
              <button
                onClick={() => setFiltroEstado("PENDIENTE")}
                className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md ${
                  filtroEstado === "PENDIENTE" 
                    ? "bg-[#B71C1C] text-white shadow-lg border-2 border-[#8E0000]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                ⏳ Pendientes
              </button>
              <button
                onClick={() => setFiltroEstado("REPARADO")}
                className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md ${
                  filtroEstado === "REPARADO" 
                    ? "bg-[#D84315] text-white shadow-lg border-2 border-[#BF360C]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                🔧 Reparados
              </button>
              <button
                onClick={() => setFiltroEstado("ENTREGADO")}
                className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md ${
                  filtroEstado === "ENTREGADO" 
                    ? "bg-[#1B5E20] text-white shadow-lg border-2 border-[#0D3711]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                📦 Entregados
              </button>
              <button
                onClick={() => setFiltroEstado("PAGADO")}
                className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md ${
                  filtroEstado === "PAGADO" 
                    ? "bg-[#1565C0] text-white shadow-lg border-2 border-[#0D47A1]" 
                    : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb] border-2 border-[#bdc3c7]"
                }`}
              >
                💰 Pagados
              </button>
            </div>
          </div>

          {/* Tabla principal - Estilo GestiOne */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
            {/* Header de la tabla */}
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Lista de Trabajos</h3>
                  <p className="text-blue-100 mt-1">
                    {trabajosFiltrados.length} {trabajosFiltrados.length === 1 ? 'trabajo encontrado' : 'trabajos encontrados'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla con scroll */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1600px] border-collapse border-2 border-black">
                <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📅</span>
                        Fecha
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">👤</span>
                        Cliente
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📱</span>
                        Modelo
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔧</span>
                        Trabajo
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔑</span>
                        Clave
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📝</span>
                        Observaciones
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚦</span>
                        Estado
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💰</span>
                        Precio
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💸</span>
                        Costo
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📈</span>
                        Ganancia
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📅</span>
                        F.Mod
                      </div>
                    </th>
                    <th className="p-4 text-center text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1] w-50">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-base">⚙️</span>
                        Acciones
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trabajosPaginados.map((t, index) => {
                    const ganancia = typeof t.precio === "number" && typeof t.costo === "number"
                      ? t.precio - t.costo
                      : "";
                    const isEven = index % 2 === 0;

                    let bgClass = "";
                    if (t.estadoCuentaCorriente === "PAGADO") bgClass = "bg-blue-100 border-l-4 border-[#1565C0]";
                    else if (t.estado === "ENTREGADO") bgClass = "bg-green-100 border-l-4 border-[#1B5E20]";
                    else if (t.estado === "REPARADO") bgClass = "bg-orange-100 border-l-4 border-[#D84315]";
                    else if (t.estado === "PENDIENTE") bgClass = "bg-red-100 border-l-4 border-[#B71C1C]";
                    else bgClass = isEven ? "bg-white" : "bg-[#f8f9fa]";

                    return (
                      <tr
                        key={t.firebaseId}
                        className={`transition-all duration-200 hover:bg-[#ebf3fd] ${bgClass}`}
                      >
                        <td className="p-4 border border-black">
                          <span className="text-sm font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                            {t.fecha}
                          </span>
                        </td>
                        <td className="p-4 border border-black">
                          <span className="text-sm font-semibold text-[#3498db]">{t.cliente}</span>
                        </td>
                        <td className="p-4 border border-black">
                          <span className="text-sm text-[#2c3e50]">{t.modelo}</span>
                        </td>
                        <td className="p-4 border border-black">
                          <span className="text-sm text-[#2c3e50]">{t.trabajo}</span>
                        </td>
                        <td className="p-4 border border-black">
                          <span className="text-sm text-[#2c3e50]">{t.clave}</span>
                        </td>
                        <td className="p-4 border border-black">
                          <span className="text-sm text-[#7f8c8d]">{t.observaciones}</span>
                        </td>
                        <td className="p-4 border border-black">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-lg ${
                            t.estadoCuentaCorriente === "PAGADO" ? "bg-[#1565C0] text-white border-2 border-[#0D47A1]" :
                            t.estado === "ENTREGADO" ? "bg-[#1B5E20] text-white border-2 border-[#0D3711]" :
                            t.estado === "REPARADO" ? "bg-[#D84315] text-white border-2 border-[#BF360C]" :
                            t.estado === "PENDIENTE" ? "bg-[#B71C1C] text-white border-2 border-[#8E0000]" :
                            "bg-[#424242] text-white border-2 border-[#212121]"
                          }`}>
                            {t.estadoCuentaCorriente === "PAGADO" ? "PAGADO" : t.estado}
                          </span>
                        </td>
                        <td className="p-4 border border-black">
                          <input
                            type="number"
                            defaultValue={typeof t.precio === "number" ? t.precio : ""}
                            onBlur={(e) => actualizarCampo(t.firebaseId, "precio", Number(e.target.value))}
                            className="w-24 bg-white border-2 border-[#bdc3c7] rounded-lg p-2 text-[#2c3e50] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all"
                          />
                        </td>
                        <td className="p-4 border border-black">
                          <input
                            type="number"
                            defaultValue={typeof t.costo === "number" && !isNaN(t.costo) ? t.costo : ""}
                            onBlur={(e) => actualizarCampo(t.firebaseId, "costo", Number(e.target.value))}
                            className="w-24 bg-white border-2 border-[#bdc3c7] rounded-lg p-2 text-[#2c3e50] focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all"
                          />
                        </td>
                        <td className="p-4 border border-black">
                          <span className={`font-bold px-3 py-1 rounded-lg ${
                            typeof ganancia === "number" && ganancia > 0 ? "bg-green-50 text-[#27ae60]" :
                            typeof ganancia === "number" && ganancia < 0 ? "bg-red-50 text-[#e74c3c]" :
                            "text-[#7f8c8d]"
                          }`}>
                            {typeof ganancia === "number" ? `$${ganancia}` : "—"}
                          </span>
                        </td>
                        <td className="p-4 border border-black">
                          <span className="text-sm font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                            {t.fechaModificacion || "—"}
                          </span>
                        </td>
                        <td className="p-4 border border-black w-40">
                          <div className="flex flex-col gap-2">
                            
                            {/* ✅ SELECTOR DE ESTADO - IGUAL QUE TABLA TRABAJOS */}
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
                                  setTrabajoSeleccionado(t.firebaseId);
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
                                onClick={() => editarTrabajo(t.firebaseId)}
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
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer con paginación - Estilo GestiOne */}
            {totalPaginas > 1 && (
              <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-6 py-4 border-t-2 border-[#bdc3c7]">
                <div className="flex justify-center items-center gap-4">
                  <button
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                    className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    ← Anterior
                  </button>
                  <span className="px-4 py-2 bg-[#3498db] text-white rounded-lg font-semibold">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <button
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                    className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de repuestos - Estilo GestiOne */}
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