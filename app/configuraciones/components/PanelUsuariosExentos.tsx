// components/PanelUsuariosExentos.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';

interface Usuario {
  id: string;
  email: string;
  nombreCompleto: string;
  negocioID: string;
  planActivo: string;
  fechaVencimiento?: any;
  esExento?: boolean;
  estado: string;
}

export default function PanelUsuariosExentos() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'exentos' | 'normales'>('todos');

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      console.log('🔍 Cargando usuarios...');
      setLoading(true);
      
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, orderBy('email'));
      const snapshot = await getDocs(q);
      
      const usuariosData: Usuario[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usuariosData.push({
          id: doc.id,
          email: data.email || 'Sin email',
          nombreCompleto: data.nombreCompleto || 'Sin nombre',
          negocioID: data.negocioID || 'Sin negocio',
          planActivo: data.planActivo || 'Sin plan',
          fechaVencimiento: data.fechaVencimiento,
          esExento: data.esExento || false,
          estado: data.estado || 'activo'
        });
      });
      
      setUsuarios(usuariosData);
      console.log(`✅ ${usuariosData.length} usuarios cargados`);
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const toggleExencion = async (usuarioId: string, email: string, esExento: boolean) => {
    // Prevenir modificar super admins
    if (email === 'ignaciobalangero@gmail.com') {
      alert('No puedes modificar tu propio usuario de super admin');
      return;
    }

    try {
      setProcesando(usuarioId);
      console.log(`🔄 ${esExento ? 'Removiendo' : 'Agregando'} exención para:`, email);
      
      const userRef = doc(db, 'usuarios', usuarioId);
      await updateDoc(userRef, {
        esExento: !esExento,
        fechaModificacionExencion: new Date()
      });
      
      // Actualizar estado local
      setUsuarios(prev => 
        prev.map(user => 
          user.id === usuarioId 
            ? { ...user, esExento: !esExento }
            : user
        )
      );
      
      console.log(`✅ Exención ${!esExento ? 'agregada' : 'removida'} para:`, email);
      
    } catch (error) {
      console.error('❌ Error actualizando exención:', error);
      alert('Error al actualizar exención');
    } finally {
      setProcesando(null);
    }
  };

  const usuariosFiltrados = usuarios.filter(user => {
    if (filtro === 'exentos') return user.esExento;
    if (filtro === 'normales') return !user.esExento;
    return true;
  });

  const formatearFecha = (fecha: any) => {
    if (!fecha) return 'Sin fecha';
    try {
      const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
      return date.toLocaleDateString('es-AR');
    } catch {
      return 'Fecha inválida';
    }
  };

  const getDiasRestantes = (fechaVencimiento: any) => {
    if (!fechaVencimiento) return null;
    try {
      const fecha = fechaVencimiento.toDate ? fechaVencimiento.toDate() : new Date(fechaVencimiento);
      const ahora = new Date();
      const dias = Math.ceil((fecha.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
      return dias;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios Exentos</h2>
          <p className="text-gray-600">Administra qué usuarios tienen acceso ilimitado sin suscripción</p>
        </div>
        
        <button
          onClick={cargarUsuarios}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4">
        <div className="flex space-x-2">
          {[
            { key: 'todos', label: 'Todos', count: usuarios.length },
            { key: 'exentos', label: 'Exentos', count: usuarios.filter(u => u.esExento).length },
            { key: 'normales', label: 'Normales', count: usuarios.filter(u => !u.esExento).length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFiltro(key as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filtro === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Negocio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan Actual
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimiento
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usuariosFiltrados.map((usuario) => {
              const diasRestantes = getDiasRestantes(usuario.fechaVencimiento);
              const esVencido = diasRestantes !== null && diasRestantes <= 0;
              const esSuperAdmin = usuario.email === 'ignaciobalangero@gmail.com';
              
              return (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {usuario.nombreCompleto}
                        {esSuperAdmin && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            👑 Super Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{usuario.email}</div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usuario.negocioID}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      usuario.planActivo === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                      usuario.planActivo === 'pro' ? 'bg-green-100 text-green-800' :
                      usuario.planActivo === 'basico' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {usuario.planActivo}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {usuario.esExento ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Exento
                      </span>
                    ) : esVencido ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ❌ Vencido
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Activo
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usuario.esExento ? (
                      <span className="text-green-600 font-medium">Ilimitado</span>
                    ) : (
                      <div>
                        <div>{formatearFecha(usuario.fechaVencimiento)}</div>
                        {diasRestantes !== null && (
                          <div className={`text-xs ${esVencido ? 'text-red-600' : 'text-gray-500'}`}>
                            {esVencido ? `Vencido hace ${Math.abs(diasRestantes)} días` : `${diasRestantes} días restantes`}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    {esSuperAdmin ? (
                      <span className="text-gray-400">No modificable</span>
                    ) : (
                      <button
                        onClick={() => toggleExencion(usuario.id, usuario.email, usuario.esExento || false)}
                        disabled={procesando === usuario.id}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          usuario.esExento
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } ${procesando === usuario.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {procesando === usuario.id ? (
                          '⏳ Procesando...'
                        ) : usuario.esExento ? (
                          '❌ Quitar Exención'
                        ) : (
                          '✅ Hacer Exento'
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {usuariosFiltrados.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay usuarios para mostrar con el filtro seleccionado</p>
        </div>
      )}
    </div>
  );
}