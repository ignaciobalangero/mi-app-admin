"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";
import {
  cargarClientesLista,
  reemplazarCacheClientes,
  type ClienteLista,
} from "@/lib/clientes/listaClientes";

type Cliente = ClienteLista;

const POR_PAGINA = 40;

export default function ListaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtro, setFiltro] = useState("");
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [usandoCache, setUsandoCache] = useState(false);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const obtenerNegocio = async () => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.negocioID) {
            setNegocioID(data.negocioID);
          }
        }
      }
    };
    obtenerNegocio();
  }, [user]);

  useEffect(() => {
    if (!negocioID) return;
    let cancelado = false;

    const cargarClientes = async () => {
      setCargando(true);
      try {
        await cargarClientesLista(negocioID, (lista) => {
          if (cancelado) return;
          setClientes(lista);
          setCargando(false);
        });
        if (!cancelado) setUsandoCache(false);
      } catch (error) {
        console.error("Error cargando clientes:", error);
        if (!cancelado) alert("Error al cargar clientes. Por favor, recarga la página.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void cargarClientes();
    return () => {
      cancelado = true;
    };
  }, [negocioID]);

  // Filtrado optimizado
  const clientesFiltrados = useMemo(() => {
    if (!filtro.trim()) return clientes;
    
    const filtroLower = filtro.toLowerCase();
    return clientes.filter((c) =>
      c.nombre.toLowerCase().includes(filtroLower)
    );
  }, [clientes, filtro]);

  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const clientesVisibles = clientesFiltrados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA
  );

  const eliminarCliente = async () => {
    if (!clienteAEliminar || !negocioID) return;
    
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/clientes`, clienteAEliminar.id));
      
      // Actualizar estado y caché local
      const nuevosClientes = clientes.filter((c) => c.id !== clienteAEliminar.id);
      setClientes(nuevosClientes);
      reemplazarCacheClientes(negocioID, nuevosClientes);
      
      setClienteAEliminar(null);
      console.log(`🗑️ Cliente eliminado. Caché actualizado.`);
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      alert("Error al eliminar el cliente");
    }
  };

  const recargarDesdeFirebase = async () => {
    if (!negocioID) return;
    
    setCargando(true);
    setUsandoCache(false);
    
    try {
      const lista = await cargarClientesLista(negocioID, undefined, true);
      setClientes(lista);
    } catch (error) {
      console.error("Error recargando:", error);
      alert("Error al recargar clientes");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-16 bg-[#f8f9fa] overflow-x-hidden min-h-screen text-black w-full">
        <div className="w-full px-2 sm:px-4 md:px-6 max-w-[1600px] mx-auto">
          
          {/* Header de la página */}
          <div className="mb-6 rounded-2xl border border-[#ecf0f1] bg-gradient-to-r from-[#2c3e50] to-[#3498db] p-4 shadow-lg sm:mb-8 sm:p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 sm:h-16 sm:w-16">
                <span className="text-3xl sm:text-4xl">👥</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="mb-1 text-2xl font-bold text-white sm:mb-2 sm:text-3xl md:text-4xl">
                  Gestión de Clientes
                </h1>
                <p className="text-sm text-blue-100 sm:text-base md:text-lg">
                  Administra toda la información de tus clientes
                </p>
              </div>
              
              {usandoCache && (
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white text-sm font-medium">Caché activo</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filtros y controles */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2c3e50]">Buscar y Gestionar</h2>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="min-w-0 flex-1 w-full sm:max-w-md">
                <input
                  type="text"
                  placeholder="🔍 Buscar cliente por nombre..."
                  value={filtro}
                  onChange={(e) => {
                    setFiltro(e.target.value);
                    setPagina(1);
                  }}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
              
              <button
                onClick={recargarDesdeFirebase}
                className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                disabled={cargando}
                title="Recargar datos desde Firebase"
              >
                {cargando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    🔄 Recargar
                  </>
                )}
              </button>

              <Link
                href="/clientes/agregar"
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                ➕ Agregar Cliente
              </Link>
            </div>

            {/* Info del caché */}
            {usandoCache && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                <span className="text-blue-600 text-sm">ℹ️</span>
                <p className="text-sm text-blue-800">
                  Usando datos en caché. Haz clic en <strong>"Recargar"</strong> para obtener los datos más recientes.
                </p>
              </div>
            )}
          </div>

          {/* Tabla principal */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Lista de Clientes</h3>
                  <p className="text-blue-100 mt-1">
                    {cargando ? "Cargando..." : (
                      `${clientesFiltrados.length} ${clientesFiltrados.length === 1 ? 'cliente' : 'clientes'} ${filtro ? 'encontrados' : 'registrados'}`
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {cargando ? (
                <div className="p-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#7f8c8d] font-medium">Cargando clientes desde Firebase...</p>
                    <p className="text-xs text-[#95a5a6]">Esto puede tardar unos segundos</p>
                  </div>
                </div>
              ) : (
                <table className="w-full min-w-[900px] border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                    <tr>
                      <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">👤</span>
                          Nombre
                        </div>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📞</span>
                          Teléfono
                        </div>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🆔</span>
                          DNI
                        </div>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏠</span>
                          Dirección
                        </div>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📧</span>
                          Email
                        </div>
                      </th>
                      <th className="p-4 text-center text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-base">⚙️</span>
                          Acciones
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesVisibles.length > 0 ? (
                      clientesVisibles.map((cliente, index) => {
                        const isEven = index % 2 === 0;
                        return (
                          <tr 
                            key={cliente.id} 
                            className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}
                          >
                            <td className="p-4 border border-black">
                              <Link 
                                href={`/clientes/${encodeURIComponent(cliente.nombre)}`}
                                className="text-[#3498db] hover:text-[#2980b9] font-semibold transition-colors duration-200 hover:underline"
                              >
                                {cliente.nombre}
                              </Link>
                            </td>
                            <td className="p-4 border border-black">
                              <span className="text-sm text-[#2c3e50]">{cliente.telefono || "—"}</span>
                            </td>
                            <td className="p-4 border border-black">
                              <span className="text-sm font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded">
                                {cliente.dni || "—"}
                              </span>
                            </td>
                            <td className="p-4 border border-black">
                              <span className="text-sm text-[#2c3e50]">{cliente.direccion || "—"}</span>
                            </td>
                            <td className="p-4 border border-black">
                              <span className="text-sm text-[#7f8c8d]">{cliente.email || "—"}</span>
                            </td>
                            <td className="p-4 border border-black">
                              <div className="flex justify-center gap-2">
                                <Link
                                  href={`/clientes/agregar?id=${cliente.id}`}
                                  className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                                >
                                  ✏️ Editar
                                </Link>
                                <button
                                  onClick={() => setClienteAEliminar(cliente)}
                                  className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-16 text-center border border-black">
                          <div className="flex flex-col items-center gap-6">
                            <div className="w-20 h-20 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
                              <span className="text-4xl">👥</span>
                            </div>
                            <div>
                              <p className="text-xl font-semibold text-[#2c3e50] mb-2">No se encontraron clientes</p>
                              <p className="text-sm text-[#7f8c8d]">
                                {filtro ? "Intenta con otro término de búsqueda" : "Comienza agregando tu primer cliente"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {!cargando && clientesFiltrados.length > 0 && (
              <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] px-6 py-4 border-t-2 border-[#bdc3c7]">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📊</span>
                    </div>
                    <span className="text-sm font-semibold text-[#2c3e50]">
                      {clientesFiltrados.length} clientes · página {paginaSegura} de {totalPaginas}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={paginaSegura <= 1}
                      onClick={() => setPagina(paginaSegura - 1)}
                      className="px-3 py-1.5 rounded-lg border border-[#bdc3c7] text-sm font-semibold text-[#2c3e50] disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={paginaSegura >= totalPaginas}
                      onClick={() => setPagina(paginaSegura + 1)}
                      className="px-3 py-1.5 rounded-lg border border-[#bdc3c7] text-sm font-semibold text-[#2c3e50] disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                    {filtro && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#7f8c8d]">Filtrado por:</span>
                        <span className="bg-[#3498db] text-white px-3 py-1 rounded-lg text-xs font-medium">
                          "{filtro}"
                        </span>
                      </div>
                    )}
                    
                    {usandoCache && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-[#7f8c8d]">Datos en caché</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de confirmación */}
        {clienteAEliminar && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1]">
              
              <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-t-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
                    <p className="text-red-100 text-sm mt-1">Esta acción no se puede deshacer</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-[#f8f9fa]">
                <div className="bg-white border-2 border-[#e74c3c] rounded-xl p-4 shadow-sm">
                  <p className="text-[#2c3e50] font-semibold text-center mb-3">
                    ¿Estás seguro de eliminar a este cliente?
                  </p>
                  <div className="text-center">
                    <span className="text-[#e74c3c] font-bold text-lg bg-red-50 px-4 py-2 rounded-lg">
                      {clienteAEliminar.nombre}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setClienteAEliminar(null)}
                    className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={eliminarCliente}
                    className="px-6 py-3 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}