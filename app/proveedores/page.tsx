"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { useRol } from "@/lib/useRol"; // 🆕 IMPORTAR EL HOOK
import DetalleProveedor from "./DetalleProveedor"; // Ajusta la ruta según tu estructura

interface Proveedor {
  id: string;
  nombre: string;
  categoria: string;
  contacto: string;
  email: string;
  cbu: string;
  alias: string;
  notas: string;
  cuentaUSD?: boolean;
}

export default function ProveedoresPage() {
  // 🆕 USAR EL HOOK PARA OBTENER EL NEGOCIO ID DINÁMICAMENTE
  const { rol } = useRol();
  const negocioID = rol?.negocioID; // Obtener el negocioID del usuario actual

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  
  // Estados del formulario
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [cbu, setCbu] = useState("");
  const [alias, setAlias] = useState("");
  const [notas, setNotas] = useState("");
  const [cuentaUSD, setCuentaUSD] = useState(false);

  const categorias = [
    "Distribuidores",
    "Repuestos",
    "Accesorios", 
    "Servicios",
    "Tecnología",
    "Otros"
  ];

  // 🆕 CARGAR PROVEEDORES SOLO CUANDO TENGAMOS EL NEGOCIO ID
  useEffect(() => {
    if (negocioID) {
      cargarProveedores();
    }
  }, [negocioID]);

  const cargarProveedores = async () => {
    // 🆕 VERIFICAR QUE TENGAMOS EL NEGOCIO ID ANTES DE HACER LA CONSULTA
    if (!negocioID) {
      console.log("No hay negocioID disponible");
      return;
    }

    try {
      console.log(`🔍 Cargando proveedores para negocio: ${negocioID}`);
      const q = query(
        collection(db, `negocios/${negocioID}/proveedores`), // ✅ RUTA CORRECTA
        orderBy("nombre", "asc")
      );
      const snap = await getDocs(q);
      const proveedoresData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Proveedor[];
      
      console.log(`✅ ${proveedoresData.length} proveedores cargados`);
      setProveedores(proveedoresData);
    } catch (error) {
      console.error("❌ Error cargando proveedores:", error);
      setMensaje("❌ Error al cargar proveedores");
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const limpiarFormulario = () => {
    setNombre("");
    setCategoria("");
    setContacto("");
    setEmail("");
    setCbu("");
    setAlias("");
    setNotas("");
    setCuentaUSD(false);
    setEditandoId(null);
  };

  const guardarProveedor = async () => {
    // 🆕 VERIFICAR QUE TENGAMOS EL NEGOCIO ID
    if (!negocioID) {
      setMensaje("❌ Error: No se pudo identificar el negocio");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    if (!nombre.trim()) {
      setMensaje("❌ El nombre es obligatorio");
      setTimeout(() => setMensaje(""), 2000);
      return;
    }

    const datosProveedor = {
      nombre: nombre.trim(),
      categoria: categoria || "Otros",
      contacto: contacto.trim(),
      email: email.trim(),
      cbu: cbu.trim(),
      alias: alias.trim(),
      notas: notas.trim(),
      cuentaUSD,
      fechaCreacion: editandoId ? undefined : new Date().toISOString(),
    };

    try {
      if (editandoId) {
        console.log(`📝 Actualizando proveedor ${editandoId} en negocio ${negocioID}`);
        await updateDoc(doc(db, `negocios/${negocioID}/proveedores`, editandoId), datosProveedor);
        setMensaje("✅ Proveedor actualizado");
      } else {
        console.log(`➕ Creando nuevo proveedor en negocio ${negocioID}`);
        await addDoc(collection(db, `negocios/${negocioID}/proveedores`), datosProveedor);
        setMensaje("✅ Proveedor creado");
      }

      limpiarFormulario();
      setMostrarFormulario(false);
      cargarProveedores();
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("❌ Error al guardar proveedor:", error);
      setMensaje("❌ Error al guardar");
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const editarProveedor = (proveedor: Proveedor) => {
    setNombre(proveedor.nombre);
    setCategoria(proveedor.categoria);
    setContacto(proveedor.contacto);
    setEmail(proveedor.email);
    setCbu(proveedor.cbu);
    setAlias(proveedor.alias);
    setNotas(proveedor.notas);
    setCuentaUSD(proveedor.cuentaUSD === true);
    setEditandoId(proveedor.id);
    setMostrarFormulario(true);
  };

  const eliminarProveedor = async (id: string, nombre: string) => {
    // 🆕 VERIFICAR QUE TENGAMOS EL NEGOCIO ID
    if (!negocioID) {
      setMensaje("❌ Error: No se pudo identificar el negocio");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    const confirmado = window.confirm(`¿Eliminar "${nombre}"?`);
    if (!confirmado) return;

    try {
      console.log(`🗑️ Eliminando proveedor ${id} del negocio ${negocioID}`);
      await deleteDoc(doc(db, `negocios/${negocioID}/proveedores`, id));
      setMensaje("✅ Proveedor eliminado");
      cargarProveedores();
      setTimeout(() => setMensaje(""), 2000);
    } catch (error) {
      console.error("❌ Error al eliminar proveedor:", error);
      setMensaje("❌ Error al eliminar");
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const verDetalleProveedor = (proveedor: Proveedor) => {
    setProveedorSeleccionado(proveedor);
  };

  // 🆕 MOSTRAR LOADING MIENTRAS CARGA EL ROL
  if (!rol || !negocioID) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-gray-600 font-medium">Cargando información del negocio...</p>
        </div>
      </div>
    );
  }

  // Si hay un proveedor seleccionado, mostrar su detalle
  if (proveedorSeleccionado) {
    return (
      <DetalleProveedor
        proveedor={proveedorSeleccionado}
        negocioID={negocioID} // ✅ PASAR EL NEGOCIO ID DINÁMICO
        onVolver={() => setProveedorSeleccionado(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🏢</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
                <p className="text-gray-600">Gestiona tu red de proveedores y lleva la cuenta de compras y pagos</p>
                {/* 🆕 MOSTRAR EL NEGOCIO ID ACTUAL PARA DEPURACIÓN */}
                <p className="text-xs text-gray-400 mt-1">Negocio: {negocioID}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                limpiarFormulario();
                setMostrarFormulario(!mostrarFormulario);
              }}
              className="bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] hover:from-[#7d3c98] hover:to-[#8e44ad] text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
            >
              {mostrarFormulario ? "❌ Cancelar" : "➕ Nuevo Proveedor"}
            </button>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`rounded-xl p-4 text-center font-semibold ${
            mensaje.includes("✅") 
              ? "bg-green-100 border-2 border-green-500 text-green-700"
              : "bg-red-100 border-2 border-red-500 text-red-700"
          }`}>
            {mensaje}
          </div>
        )}

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-800 mb-6">
              {editandoId ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏢 Nombre *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del proveedor"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-gray-900 bg-white"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📂 Categoría
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-gray-900 bg-white"
                >
                  <option value="">Seleccionar</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Contacto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📞 Contacto
                </label>
                <input
                  type="text"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="Teléfono/WhatsApp"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-gray-900 bg-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📧 Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@proveedor.com"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-gray-900 bg-white"
                />
              </div>

              {/* CBU */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏦 CBU
                </label>
                <input
                  type="text"
                  value={cbu}
                  onChange={(e) => setCbu(e.target.value)}
                  placeholder="CBU para transferencias"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-gray-900 bg-white"
                />
              </div>

              {/* Alias */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔗 Alias
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Alias para transferencias"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-gray-900 bg-white"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={cuentaUSD}
                    onChange={(e) => setCuentaUSD(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Llevar la cuenta en USD
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Un pago en pesos se convierte con la cotización de Venta general y baja la deuda en dólares.
                </p>
              </div>

              {/* Notas */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Notas
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales"
                  rows={3}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => {
                  limpiarFormulario();
                  setMostrarFormulario(false);
                }}
                className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProveedor}
                disabled={!nombre.trim()}
                className={`px-6 py-2.5 rounded-lg font-semibold text-white ${
                  !nombre.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] hover:from-[#7d3c98] hover:to-[#8e44ad]"
                }`}
              >
                {editandoId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de Proveedores */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#8e44ad] to-[#9b59b6]">
            <h2 className="text-lg font-bold text-white">
              📋 Proveedores ({proveedores.length})
            </h2>
          </div>

          {proveedores.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white">
              <div className="text-4xl mb-4">🏢</div>
              <p className="text-lg font-medium">No hay proveedores</p>
              <p className="text-sm">Agrega tu primer proveedor para comenzar a llevar la cuenta</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Proveedor</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Categoría</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Contacto</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Datos Bancarios</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {proveedores.map((proveedor) => (
                    <tr key={proveedor.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {proveedor.nombre}
                            {proveedor.cuentaUSD ? (
                              <span className="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                                Cuenta USD
                              </span>
                            ) : null}
                          </p>
                          {proveedor.email && (
                            <p className="text-sm text-gray-600">{proveedor.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs">
                          {proveedor.categoria || "Sin categoría"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-900">
                        {proveedor.contacto || "Sin contacto"}
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600">
                          {proveedor.alias && <p>🔗 {proveedor.alias}</p>}
                          {proveedor.cbu && <p>🏦 {proveedor.cbu.slice(0, 8)}...</p>}
                          {!proveedor.alias && !proveedor.cbu && <span>Sin datos</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => verDetalleProveedor(proveedor)}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium"
                          >
                            📊 Ver Cuenta
                          </button>
                          <button
                            onClick={() => editarProveedor(proveedor)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => eliminarProveedor(proveedor.id, proveedor.nombre)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tip informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💡</span>
            </div>
            <div>
              <p className="text-blue-800 font-medium">
                <strong>Tip:</strong> Haz clic en "📊 Ver Cuenta" para llevar el registro detallado de compras y pagos de cada proveedor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}