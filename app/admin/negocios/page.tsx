"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { useRouter } from "next/navigation";

const SUPER_ADMIN_UID = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";

interface AdminSuscripcion {
  id: string;
  email: string;
  negocioID: string;
  planActivo?: string;
  fechaVencimiento?: any;
  esExento?: boolean;
  fechaRegistro?: any;
  nombre?: string;
}

interface DetailModal {
  isOpen: boolean;
  admin: AdminSuscripcion | null;
}

interface EditModal {
  isOpen: boolean;
  admin: AdminSuscripcion | null;
  newEmail: string;
  newPassword: string;
}

export default function GestionSuscripciones() {
  const auth = getAuth();
  const router = useRouter();
  const [currentUID, setCurrentUID] = useState<string | null>(null);
  const [adminsSuscripcion, setAdminsSuscripcion] = useState<AdminSuscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'vencidos' | 'por_vencer' | 'activos' | 'exentos'>('todos');
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  
  const [detailModal, setDetailModal] = useState<DetailModal>({
    isOpen: false,
    admin: null
  });
  
  const [editModal, setEditModal] = useState<EditModal>({
    isOpen: false,
    admin: null,
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
      cargarAdminsSuscripcion();
    }
  }, [currentUID, router]);

  // FUNCIÓN OPTIMIZADA - Solo carga admins
  const cargarAdminsSuscripcion = async () => {
    try {
      setLoading(true);
      
      const q = query(
        collection(db, "usuarios"),
        where("rol", "==", "admin"),
        orderBy("email")
      );
      
      const snapshot = await getDocs(q);
      const adminsData: AdminSuscripcion[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        adminsData.push({
          id: doc.id,
          email: data.email,
          negocioID: data.negocioID,
          planActivo: data.planActivo,
          fechaVencimiento: data.fechaVencimiento,
          esExento: data.esExento,
          fechaRegistro: data.fechaRegistro,
          nombre: data.nombre
        });
      });

      setAdminsSuscripcion(adminsData);
      
    } catch (error) {
      console.error("Error al cargar admins:", error);
      setMensaje("❌ Error al cargar suscripciones");
    } finally {
      setLoading(false);
    }
  };

  // Funciones para gestionar suscripciones
  const extenderSuscripcion = async (adminId: string, meses: number) => {
    setActualizando(adminId);
    try {
      const adminRef = doc(db, "usuarios", adminId);
      const ahora = new Date();
      const nuevaFecha = new Date();
      nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);

      await updateDoc(adminRef, {
        fechaVencimiento: nuevaFecha,
        planActivo: meses >= 12 ? 'anual' : 'mensual',
        ultimaActualizacion: ahora
      });

      await cargarAdminsSuscripcion();
      setMensaje(`✅ Suscripción extendida por ${meses} meses`);
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMensaje("❌ Error al actualizar suscripción");
    }
    setActualizando(null);
  };

  const marcarExento = async (adminId: string, exento: boolean) => {
    setActualizando(adminId);
    try {
      const adminRef = doc(db, "usuarios", adminId);
      await updateDoc(adminRef, {
        esExento: exento,
        fechaModificacionExencion: new Date()
      });

      await cargarAdminsSuscripcion();
      setMensaje(exento ? "✅ Negocio marcado como exento" : "✅ Exención removida");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMensaje("❌ Error al actualizar usuario");
    }
    setActualizando(null);
  };

  const eliminarNegocio = async (adminId: string, negocioID: string) => {
    const confirmacion = window.confirm(
      `¿Estás seguro de que quieres eliminar el negocio "${negocioID}"? Esta acción eliminará todos los datos del negocio y no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      // Eliminar de la colección usuarios
      await deleteDoc(doc(db, "usuarios", adminId));
      
      // Eliminar de la colección negocios
      await deleteDoc(doc(db, "negocios", negocioID));
      
      setMensaje("✅ Negocio eliminado exitosamente");
      await cargarAdminsSuscripcion();
    } catch (error: any) {
      console.error("Error al eliminar negocio:", error);
      setMensaje(`❌ Error al eliminar: ${error.message}`);
    }
  };

  // Modales
  const abrirModalDetalle = (admin: AdminSuscripcion) => {
    setDetailModal({
      isOpen: true,
      admin
    });
  };

  const abrirModalEdicion = (admin: AdminSuscripcion) => {
    setEditModal({
      isOpen: true,
      admin,
      newEmail: admin.email,
      newPassword: ""
    });
  };

  const cerrarModales = () => {
    setDetailModal({ isOpen: false, admin: null });
    setEditModal({ isOpen: false, admin: null, newEmail: "", newPassword: "" });
    setMensaje("");
  };

  const guardarCambios = async () => {
    if (!editModal.admin) return;

    try {
      const { admin, newEmail, newPassword } = editModal;
      const updates: any = {};

      if (newEmail && newEmail !== admin.email) {
        updates.email = newEmail;
      }

      if (newPassword) {
        updates.password = newPassword;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "usuarios", admin.id), updates);
        
        setMensaje("✅ Usuario actualizado exitosamente");
        setTimeout(() => {
          cerrarModales();
          cargarAdminsSuscripcion();
        }, 1500);
      } else {
        setMensaje("⚠️ No hay cambios para guardar");
      }

    } catch (error: any) {
      console.error("Error al guardar cambios:", error);
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  // Función para obtener estado de suscripción
  const obtenerEstadoSuscripcion = (admin: AdminSuscripcion) => {
    if (admin.esExento) {
      return { estado: 'exento', dias: null, color: 'text-blue-600' };
    }

    if (!admin.fechaVencimiento) {
      return { estado: 'sin_plan', dias: null, color: 'text-gray-600' };
    }

    const ahora = new Date();
    const fechaVencimiento = admin.fechaVencimiento.toDate();
    const diferencia = fechaVencimiento.getTime() - ahora.getTime();
    const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      return { estado: 'vencido', dias: Math.abs(diasRestantes), color: 'text-red-600' };
    } else if (diasRestantes <= 7) {
      return { estado: 'por_vencer', dias: diasRestantes, color: 'text-orange-600' };
    } else {
      return { estado: 'activo', dias: diasRestantes, color: 'text-green-600' };
    }
  };
  const formatearFecha = (fecha: any) => {
    if (!fecha) return 'N/A';
    return fecha.toDate().toLocaleDateString('es-AR');
  };

  // Filtrar admins
  const adminsFiltrados = adminsSuscripcion.filter(admin => {
    if (filtro === 'todos') return true;
    
    const { estado } = obtenerEstadoSuscripcion(admin);
    
    switch (filtro) {
      case 'vencidos':
        return estado === 'vencido';
      case 'por_vencer':
        return estado === 'por_vencer';
      case 'activos':
        return estado === 'activo';
      case 'exentos':
        return estado === 'exento';
      default:
        return true;
    }
  });

  // Estadísticas
  const estadisticas = {
    total: adminsSuscripcion.length,
    activos: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'activo').length,
    vencidos: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'vencido').length,
    porVencer: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'por_vencer').length,
    exentos: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'exento').length
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
            <p className="text-lg">Cargando suscripciones...</p>
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
                <span className="text-4xl">💳</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  Gestión de Suscripciones
                </h1>
                <p className="text-blue-100">
                  Administra las suscripciones de todos los negocios en GestiOne
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

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-r from-[#34495e] to-[#2c3e50] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-gray-200 text-sm">Total Negocios</p>
                <p className="text-2xl font-bold text-white">{estadisticas.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-green-100 text-sm">Activos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.activos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-orange-100 text-sm">Por Vencer</p>
                <p className="text-2xl font-bold text-white">{estadisticas.porVencer}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
              <div>
                <p className="text-red-100 text-sm">Vencidos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.vencidos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔓</span>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Exentos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.exentos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#2c3e50] font-medium">Filtrar:</span>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'todos', label: 'Todos', color: 'bg-gray-100' },
                  { key: 'activos', label: 'Activos', color: 'bg-green-100 text-green-800' },
                  { key: 'por_vencer', label: 'Por Vencer', color: 'bg-orange-100 text-orange-800' },
                  { key: 'vencidos', label: 'Vencidos', color: 'bg-red-100 text-red-800' },
                  { key: 'exentos', label: 'Exentos', color: 'bg-blue-100 text-blue-800' }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFiltro(f.key as any)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${f.color} ${
                      filtro === f.key ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Lista de Suscripciones */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
          <div className="bg-gradient-to-r from-[#34495e] to-[#2c3e50] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">💳</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Gestión de Suscripciones</h2>
                <p className="text-gray-200 text-sm">
                  Administra las suscripciones de todos los negocios ({adminsFiltrados.length} mostrados)
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Negocio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adminsFiltrados.map(admin => {
                  const { estado, dias, color } = obtenerEstadoSuscripcion(admin);
                  
                  return (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {admin.negocioID} ({admin.nombre || 'Sin nombre'})
                          </p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${color}`}>
                          {estado === 'exento' && '🔓 Exento'}
                          {estado === 'activo' && `✅ Activo (${dias}d)`}
                          {estado === 'por_vencer' && `⚠️ Por vencer (${dias}d)`}
                          {estado === 'vencido' && `❌ Vencido (${dias}d)`}
                          {estado === 'sin_plan' && '⭕ Sin plan'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {admin.planActivo || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatearFecha(admin.fechaVencimiento)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => extenderSuscripcion(admin.id, 1)}
                            disabled={actualizando === admin.id}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200 disabled:opacity-50"
                          >
                            +1M
                          </button>
                          <button
                            onClick={() => extenderSuscripcion(admin.id, 3)}
                            disabled={actualizando === admin.id}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            +3M
                          </button>
                          <button
                            onClick={() => extenderSuscripcion(admin.id, 12)}
                            disabled={actualizando === admin.id}
                            className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded hover:bg-purple-200 disabled:opacity-50"
                          >
                            +1A
                          </button>
                          <button
                            onClick={() => marcarExento(admin.id, !admin.esExento)}
                            disabled={actualizando === admin.id}
                            className={`px-2 py-1 text-xs rounded disabled:opacity-50 ${
                              admin.esExento 
                                ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            }`}
                          >
                            {admin.esExento ? 'Quitar' : 'Exento'}
                          </button>
                          <button
                            onClick={() => abrirModalDetalle(admin)}
                            className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded hover:bg-purple-200"
                          >
                            👁️ Ver
                          </button>
                          <button
                            onClick={() => abrirModalEdicion(admin)}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => eliminarNegocio(admin.id, admin.negocioID)}
                            className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200"
                          >
                            🗑️ Eliminar
                          </button>
                          {actualizando === admin.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
      {detailModal.isOpen && detailModal.admin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">👁️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Detalle de Suscripción</h3>
                    <p className="text-purple-100 text-sm">{detailModal.admin.negocioID}</p>
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
              <div className="bg-[#f8f9fa] rounded-xl p-4">
                <h4 className="font-bold text-[#2c3e50] mb-3">📊 Información del Negocio</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Negocio ID:</strong> {detailModal.admin.negocioID}</p>
                  <p><strong>Admin Email:</strong> {detailModal.admin.email}</p>
                  <p><strong>Nombre:</strong> {detailModal.admin.nombre || 'No especificado'}</p>
                  <p><strong>Plan Activo:</strong> {detailModal.admin.planActivo || 'N/A'}</p>
                  <p><strong>Estado:</strong> 
                    <span className={`ml-2 ${obtenerEstadoSuscripcion(detailModal.admin).color}`}>
                      {obtenerEstadoSuscripcion(detailModal.admin).estado.toUpperCase()}
                    </span>
                  </p>
                  <p><strong>Vencimiento:</strong> {formatearFecha(detailModal.admin.fechaVencimiento)}</p>
                  <p><strong>Es Exento:</strong> {detailModal.admin.esExento ? '✅ Sí' : '❌ No'}</p>
                </div>
              </div>

              <button
                onClick={cerrarModales}
                className="w-full bg-gradient-to-r from-[#7f8c8d] to-[#95a5a6] hover:from-[#6c7b7d] hover:to-[#839192] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
              >
                ✅ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {editModal.isOpen && editModal.admin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">✏️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Editar Usuario</h3>
                    <p className="text-blue-100 text-sm">{editModal.admin.negocioID}</p>
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
                  🔒 Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={editModal.newPassword}
                  onChange={(e) => setEditModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="Dejar vacío para mantener actual"
                />
              </div>

              <div className="bg-[#f8f9fa] rounded-lg p-3 text-sm">
                <p className="font-medium text-[#2c3e50] mb-2">📊 Información actual:</p>
                <div className="space-y-1 text-[#7f8c8d]">
                  <p>• Negocio: {editModal.admin.negocioID}</p>
                  <p>• Email actual: {editModal.admin.email}</p>
                  <p>• Plan: {editModal.admin.planActivo || 'N/A'}</p>
                  <p>• Estado: {obtenerEstadoSuscripcion(editModal.admin).estado}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={guardarCambios}
                  className="flex-1 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  ✅ Guardar
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