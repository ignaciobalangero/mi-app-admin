"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";

const SUPER_ADMIN_UID = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";

interface Usuario {
  id: string;
  email: string;
  rol: string;
  nombre?: string;
}

interface Negocio {
  id: string;
  nombre: string;
  creadoPor?: string;
  creadoEn?: any;
  adminEmail?: string;
  adminUID?: string;
  usuarios: Usuario[];
  totalClientes: number;
  totalReparaciones: number;
  totalStock: number;
  ultimaActividad?: string;
  configuracion?: any;
  activo: boolean;
}

interface DetailModal {
  isOpen: boolean;
  negocio: Negocio | null;
}

interface EditModal {
  isOpen: boolean;
  negocio: Negocio | null;
  newEmail: string;
  newPassword: string;
}

export default function NegociosListPage() {
  const auth = getAuth();
  const router = useRouter();
  const [currentUID, setCurrentUID] = useState<string | null>(null);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "activos" | "inactivos">("todos");
  
  const [detailModal, setDetailModal] = useState<DetailModal>({
    isOpen: false,
    negocio: null
  });
  
  const [editModal, setEditModal] = useState<EditModal>({
    isOpen: false,
    negocio: null,
    newEmail: "",
    newPassword: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUID(user?.uid || null);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (currentUID && currentUID !== SUPER_ADMIN_UID) {
      router.push("/");
      return;
    }
    
    if (currentUID === SUPER_ADMIN_UID) {
      cargarTodosLosNegocios();
    }
  }, [currentUID, router]);

  const cargarTodosLosNegocios = async () => {
    try {
      setLoading(true);
      
      // Obtener TODAS las colecciones que empiecen con nombre de negocio
      const negociosSnapshot = await getDocs(collection(db, "negocios"));
      const negociosData: Negocio[] = [];

      for (const negocioDoc of negociosSnapshot.docs) {
        const negocioId = negocioDoc.id;
        const negocioData = negocioDoc.data();
        
        console.log(`Procesando negocio: ${negocioId}`, negocioData);

        // Información básica del negocio
        let usuarios: Usuario[] = [];
        let totalClientes = 0;
        let totalReparaciones = 0;
        let totalStock = 0;
        let ultimaActividad = "Sin actividad";
        let configuracion = null;
        let adminEmail = "";
        let adminUID = "";

        try {
          // Cargar usuarios
          const usuariosSnapshot = await getDocs(collection(db, `negocios/${negocioId}/usuarios`));
          usuarios = usuariosSnapshot.docs.map(userDoc => ({
            id: userDoc.id,
            ...userDoc.data() as any
          }));

          const adminUser = usuarios.find(u => u.rol === "admin");
          if (adminUser) {
            adminEmail = adminUser.email;
            adminUID = adminUser.id;
          }
        } catch (error) {
          console.log(`No se pudieron cargar usuarios para ${negocioId}`);
        }

        try {
          // Contar clientes
          const clientesSnapshot = await getDocs(collection(db, `negocios/${negocioId}/clientes`));
          totalClientes = clientesSnapshot.size;
        } catch (error) {
          console.log(`No se pudieron contar clientes para ${negocioId}`);
        }

        try {
          // Contar reparaciones/trabajos
          const reparacionesSnapshot = await getDocs(collection(db, `negocios/${negocioId}/trabajos`));
          totalReparaciones = reparacionesSnapshot.size;
          
          if (reparacionesSnapshot.docs.length > 0) {
            // Obtener la fecha más reciente
            const fechasReparaciones = reparacionesSnapshot.docs
              .map(doc => doc.data().fechaIngreso)
              .filter(fecha => fecha)
              .sort((a, b) => b.seconds - a.seconds);
            
            if (fechasReparaciones.length > 0) {
              ultimaActividad = new Date(fechasReparaciones[0].seconds * 1000).toLocaleDateString();
            }
          }
        } catch (error) {
          console.log(`No se pudieron contar reparaciones para ${negocioId}`);
        }

        try {
          // Contar stock
          const stockSnapshot = await getDocs(collection(db, `negocios/${negocioId}/stockExtra`));
          totalStock = stockSnapshot.size;
        } catch (error) {
          console.log(`No se pudo contar stock para ${negocioId}`);
        }

        try {
          // Cargar configuración
          const configSnapshot = await getDocs(collection(db, `negocios/${negocioId}/configuracion`));
          if (configSnapshot.docs.length > 0) {
            configuracion = configSnapshot.docs[0].data();
          }
        } catch (error) {
          console.log(`No se pudo cargar configuración para ${negocioId}`);
        }

        // Determinar si está activo (tiene usuarios y alguna actividad reciente)
        const activo = usuarios.length > 0 && (totalClientes > 0 || totalReparaciones > 0);

        negociosData.push({
          id: negocioId,
          nombre: negocioData.nombre || negocioId,
          creadoPor: negocioData.creadoPor,
          creadoEn: negocioData.creadoEn,
          adminEmail,
          adminUID,
          usuarios,
          totalClientes,
          totalReparaciones,
          totalStock,
          ultimaActividad,
          configuracion,
          activo
        });
      }

      // Ordenar por nombre
      negociosData.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setNegocios(negociosData);
      
    } catch (error) {
      console.error("Error al cargar negocios:", error);
      setMensaje("❌ Error al cargar los negocios");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalDetalle = (negocio: Negocio) => {
    setDetailModal({
      isOpen: true,
      negocio
    });
  };

  const abrirModalEdicion = (negocio: Negocio) => {
    setEditModal({
      isOpen: true,
      negocio,
      newEmail: negocio.adminEmail || "",
      newPassword: ""
    });
  };

  const cerrarModales = () => {
    setDetailModal({ isOpen: false, negocio: null });
    setEditModal({ isOpen: false, negocio: null, newEmail: "", newPassword: "" });
    setMensaje("");
  };

  const guardarCambios = async () => {
    if (!editModal.negocio) return;

    try {
      const { negocio, newEmail } = editModal;

      if (newEmail && newEmail !== negocio.adminEmail && negocio.adminUID) {
        await updateDoc(doc(db, `negocios/${negocio.id}/usuarios/${negocio.adminUID}`), {
          email: newEmail
        });
        
        await updateDoc(doc(db, `usuarios/${negocio.adminUID}`), {
          email: newEmail
        });
      }

      setMensaje("✅ Cambios guardados exitosamente");
      setTimeout(() => {
        cerrarModales();
        cargarTodosLosNegocios();
      }, 1500);

    } catch (error: any) {
      console.error("Error al guardar cambios:", error);
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  const eliminarNegocio = async (negocioId: string) => {
    const confirmacion = window.confirm(
      `¿Estás seguro de que quieres eliminar el negocio "${negocioId}"? Esta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      await deleteDoc(doc(db, `negocios/${negocioId}`));
      setMensaje("✅ Negocio eliminado exitosamente");
      cargarTodosLosNegocios();
    } catch (error: any) {
      console.error("Error al eliminar negocio:", error);
      setMensaje(`❌ Error al eliminar: ${error.message}`);
    }
  };

  const negociosFiltrados = negocios.filter(negocio => {
    if (filtro === "activos") return negocio.activo;
    if (filtro === "inactivos") return !negocio.activo;
    return true;
  });

  const estadisticas = {
    total: negocios.length,
    activos: negocios.filter(n => n.activo).length,
    inactivos: negocios.filter(n => !n.activo).length,
    totalClientes: negocios.reduce((sum, n) => sum + n.totalClientes, 0),
    totalReparaciones: negocios.reduce((sum, n) => sum + n.totalReparaciones, 0)
  };

  if (currentUID && currentUID !== SUPER_ADMIN_UID) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <p className="text-lg font-medium">Acceso denegado. Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUID || loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 text-[#7f8c8d]">
            <span className="animate-spin text-2xl">⏳</span>
            <p className="text-lg">Cargando todos los negocios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🏢</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  Gestión Completa de Negocios
                </h1>
                <p className="text-blue-100">
                  Vista detallada de todos los negocios en GestiOne
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push("/admin/super")}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-green-100 text-sm">Total Negocios</p>
                <p className="text-2xl font-bold text-white">{estadisticas.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Activos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.activos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⏸️</span>
              </div>
              <div>
                <p className="text-red-100 text-sm">Inactivos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.inactivos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <p className="text-purple-100 text-sm">Total Clientes</p>
                <p className="text-2xl font-bold text-white">{estadisticas.totalClientes}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <p className="text-orange-100 text-sm">Total Trabajos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.totalReparaciones}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#2c3e50] font-medium">Filtrar:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltro("todos")}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    filtro === "todos" 
                      ? "bg-[#3498db] text-white" 
                      : "bg-[#ecf0f1] text-[#7f8c8d] hover:bg-[#d5dbdb]"
                  }`}
                >
                  Todos ({estadisticas.total})
                </button>
                <button
                  onClick={() => setFiltro("activos")}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    filtro === "activos" 
                      ? "bg-[#27ae60] text-white" 
                      : "bg-[#ecf0f1] text-[#7f8c8d] hover:bg-[#d5dbdb]"
                  }`}
                >
                  Activos ({estadisticas.activos})
                </button>
                <button
                  onClick={() => setFiltro("inactivos")}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    filtro === "inactivos" 
                      ? "bg-[#e74c3c] text-white" 
                      : "bg-[#ecf0f1] text-[#7f8c8d] hover:bg-[#d5dbdb]"
                  }`}
                >
                  Inactivos ({estadisticas.inactivos})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Negocios */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
          <div className="bg-gradient-to-r from-[#34495e] to-[#2c3e50] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Lista Completa de Negocios</h2>
                <p className="text-gray-200 text-sm">Información detallada de cada negocio</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {negociosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-[#7f8c8d]">
                <span className="text-4xl mb-4 block">📦</span>
                <p className="text-lg">No hay negocios que coincidan con el filtro</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {negociosFiltrados.map((negocio) => (
                  <div
                    key={negocio.id}
                    className={`border rounded-xl p-4 hover:shadow-md transition-all duration-200 ${
                      negocio.activo ? "border-[#d5f4e6] bg-[#f8fffe]" : "border-[#fadbd8] bg-[#fef9f9]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          negocio.id === 'iphonetec' 
                            ? 'bg-gradient-to-r from-[#f39c12] to-[#e67e22]' 
                            : negocio.activo
                              ? 'bg-gradient-to-r from-[#27ae60] to-[#2ecc71]'
                              : 'bg-gradient-to-r from-[#7f8c8d] to-[#95a5a6]'
                        }`}>
                          <span className="text-white text-xl">
                            {negocio.id === 'iphonetec' ? '👑' : negocio.activo ? '🏪' : '⏸️'}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-[#2c3e50]">
                              {negocio.nombre}
                            </h3>
                            {negocio.id === 'iphonetec' && (
                              <span className="text-xs bg-[#f39c12] text-white px-2 py-1 rounded-lg">
                                TU NEGOCIO
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-lg ${
                              negocio.activo ? "bg-[#27ae60] text-white" : "bg-[#e74c3c] text-white"
                            }`}>
                              {negocio.activo ? "ACTIVO" : "INACTIVO"}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[#7f8c8d]">Admin: {negocio.adminEmail || 'No asignado'}</p>
                              <p className="text-[#95a5a6]">Usuarios: {negocio.usuarios.length}</p>
                            </div>
                            <div>
                              <p className="text-[#7f8c8d]">Clientes: {negocio.totalClientes}</p>
                              <p className="text-[#95a5a6]">Trabajos: {negocio.totalReparaciones}</p>
                            </div>
                            <div>
                              <p className="text-[#7f8c8d]">Stock: {negocio.totalStock} items</p>
                              <p className="text-[#95a5a6]">Última actividad: {negocio.ultimaActividad}</p>
                            </div>
                            <div>
                              {negocio.creadoEn && (
                                <p className="text-[#95a5a6]">
                                  Creado: {new Date(negocio.creadoEn.seconds * 1000).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => abrirModalDetalle(negocio)}
                          className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
                        >
                          👁️ Ver detalle
                        </button>
                        
                        <button
                          onClick={() => abrirModalEdicion(negocio)}
                          className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
                        >
                          ✏️ Editar
                        </button>
                        
                        {negocio.id !== 'iphonetec' && (
                          <button
                            onClick={() => eliminarNegocio(negocio.id)}
                            className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div className={`p-4 rounded-xl border ${
            mensaje.includes("✅") 
              ? "bg-[#d5f4e6] border-[#27ae60] text-[#27ae60]" 
              : "bg-[#fadbd8] border-[#e74c3c] text-[#e74c3c]"
          }`}>
            <p className="font-medium">{mensaje}</p>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {detailModal.isOpen && detailModal.negocio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">👁️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Detalle Completo</h3>
                    <p className="text-purple-100 text-sm">{detailModal.negocio.nombre}</p>
                  </div>
                </div>
                
                <button
                  onClick={cerrarModales}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#f8f9fa] rounded-xl p-4">
                  <h4 className="font-bold text-[#2c3e50] mb-3 flex items-center gap-2">
                    📊 Información General
                  </h4>
                  <div className="space-y-2 text-sm text-[#2c3e50]">
                    <p><strong className="text-[#2c3e50]">ID:</strong> <span className="text-[#34495e]">{detailModal.negocio.id}</span></p>
                    <p><strong className="text-[#2c3e50]">Nombre:</strong> <span className="text-[#34495e]">{detailModal.negocio.nombre}</span></p>
                    <p><strong className="text-[#2c3e50]">Estado:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                        detailModal.negocio.activo ? "bg-[#27ae60] text-white" : "bg-[#e74c3c] text-white"
                      }`}>
                        {detailModal.negocio.activo ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </p>
                    {detailModal.negocio.creadoEn && (
                      <p><strong className="text-[#2c3e50]">Creado:</strong> <span className="text-[#34495e]">{new Date(detailModal.negocio.creadoEn.seconds * 1000).toLocaleDateString()}</span></p>
                    )}
                    <p><strong className="text-[#2c3e50]">Última actividad:</strong> <span className="text-[#34495e]">{detailModal.negocio.ultimaActividad}</span></p>
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-xl p-4">
                  <h4 className="font-bold text-[#2c3e50] mb-3 flex items-center gap-2">
                    📈 Estadísticas
                  </h4>
                  <div className="space-y-2 text-sm text-[#2c3e50]">
                    <p><strong className="text-[#2c3e50]">Total Usuarios:</strong> <span className="text-[#34495e]">{detailModal.negocio.usuarios.length}</span></p>
                    <p><strong className="text-[#2c3e50]">Total Clientes:</strong> <span className="text-[#34495e]">{detailModal.negocio.totalClientes}</span></p>
                    <p><strong className="text-[#2c3e50]">Total Trabajos:</strong> <span className="text-[#34495e]">{detailModal.negocio.totalReparaciones}</span></p>
                    <p><strong className="text-[#2c3e50]">Items en Stock:</strong> <span className="text-[#34495e]">{detailModal.negocio.totalStock}</span></p>
                  </div>
                </div>
              </div>

              {/* Lista de Usuarios */}
              <div className="bg-[#f8f9fa] rounded-xl p-4">
                <h4 className="font-bold text-[#2c3e50] mb-3 flex items-center gap-2">
                  👥 Usuarios del Negocio
                </h4>
                {detailModal.negocio.usuarios.length === 0 ? (
                  <p className="text-[#7f8c8d] text-sm font-medium">No hay usuarios registrados</p>
                ) : (
                  <div className="space-y-2">
                    {detailModal.negocio.usuarios.map((usuario) => (
                      <div key={usuario.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-[#ecf0f1]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            usuario.rol === 'admin' 
                              ? 'bg-[#f39c12] text-white' 
                              : 'bg-[#3498db] text-white'
                          }`}>
                            {usuario.rol === 'admin' ? '👑' : '👤'}
                          </div>
                          <div>
                            <p className="font-bold text-[#2c3e50]">{usuario.email}</p>
                            <p className="text-xs text-[#7f8c8d] font-medium">ID: {usuario.id}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          usuario.rol === 'admin' 
                            ? 'bg-[#f39c12] text-white' 
                            : 'bg-[#3498db] text-white'
                        }`}>
                          {usuario.rol.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Configuración */}
              {detailModal.negocio.configuracion && (
                <div className="bg-[#f8f9fa] rounded-xl p-4">
                  <h4 className="font-bold text-[#2c3e50] mb-3 flex items-center gap-2">
                    ⚙️ Configuración
                  </h4>
                  <div className="grid text-black grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Logo URL:</strong> {detailModal.negocio.configuracion.logoURL || 'No configurado'}</p>
                      <p><strong>Imprimir Etiqueta:</strong> {detailModal.negocio.configuracion.imprimirEtiqueta ? '✅ Sí' : '❌ No'}</p>
                    </div>
                    <div>
                      <p><strong>Imprimir Ticket:</strong> {detailModal.negocio.configuracion.imprimirTicket ? '✅ Sí' : '❌ No'}</p>
                      <p><strong>Texto Garantía:</strong> {detailModal.negocio.configuracion.textoGarantia ? '✅ Configurado' : '❌ No configurado'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Acciones Rápidas */}
              <div className="flex gap-3 pt-4 border-t border-[#ecf0f1]">
                <button
                  onClick={() => {
                    cerrarModales();
                    if (detailModal.negocio) abrirModalEdicion(detailModal.negocio);
                  }}
                  className="flex-1 bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  ✏️ Editar Negocio
                </button>
                
                <button
                  onClick={cerrarModales}
                  className="flex-1 bg-gradient-to-r from-[#7f8c8d] to-[#95a5a6] hover:from-[#6c7b7d] hover:to-[#839192] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  ✅ Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {editModal.isOpen && editModal.negocio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">✏️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Editar Negocio</h3>
                    <p className="text-blue-100 text-sm">{editModal.negocio.nombre}</p>
                  </div>
                </div>
                
                <button
                  onClick={cerrarModales}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                  📧 Email del Administrador
                </label>
                <input
                  type="email"
                  value={editModal.newEmail}
                  onChange={(e) => setEditModal(prev => ({ ...prev, newEmail: e.target.value }))}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="admin@negocio.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                  🔒 Nueva Contraseña (opcional)
                </label>
                <input
                  type="password"
                  value={editModal.newPassword}
                  onChange={(e) => setEditModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="Dejar vacío para mantener actual"
                />
              </div>

              {/* Información adicional del negocio en edición */}
              <div className="bg-[#f8f9fa] rounded-lg p-3 text-sm">
                <p className="font-medium text-[#2c3e50] mb-2">📊 Información del negocio:</p>
                <div className="space-y-1 text-[#7f8c8d]">
                  <p>• Usuarios: {editModal.negocio.usuarios.length}</p>
                  <p>• Clientes: {editModal.negocio.totalClientes}</p>
                  <p>• Trabajos: {editModal.negocio.totalReparaciones}</p>
                  <p>• Estado: {editModal.negocio.activo ? "✅ Activo" : "❌ Inactivo"}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={guardarCambios}
                  className="flex-1 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  ✅ Guardar Cambios
                </button>
                
                <button
                  onClick={cerrarModales}
                  className="flex-1 bg-gradient-to-r from-[#7f8c8d] to-[#95a5a6] hover:from-[#6c7b7d] hover:to-[#839192] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}