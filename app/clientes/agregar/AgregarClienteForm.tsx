"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "@/app/Header";

export default function AgregarClienteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("id");
  const origen = searchParams.get("origen");

  const [cliente, setCliente] = useState({
    nombre: "",
    telefono: "",
    dni: "",
    direccion: "",
    email: "",
  });

  const [usuario] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const obtenerNegocioYCliente = async () => {
      if (!usuario) return;

      const usuarioSnap = await getDoc(doc(db, "usuarios", usuario.uid));
      if (usuarioSnap.exists()) {
        const data = usuarioSnap.data();
        const idNegocio = data.negocioID;
        setNegocioID(idNegocio);

        if (clienteId) {
          const clienteRef = doc(db, `negocios/${idNegocio}/clientes`, clienteId);
          const clienteSnap = await getDoc(clienteRef);
          if (clienteSnap.exists()) {
            setCliente(clienteSnap.data() as any);
          }
        }
      }
    };

    obtenerNegocioYCliente();
  }, [usuario, clienteId]);

  const handleGuardar = async () => {
    if (!negocioID) {
      setMensaje("❌ No se pudo identificar el negocio.");
      return;
    }

    if (!cliente.nombre.trim()) {
      setMensaje("❌ El nombre del cliente es obligatorio.");
      return;
    }

    setGuardando(true);

    try {
      if (clienteId) {
        await updateDoc(doc(db, `negocios/${negocioID}/clientes`, clienteId), cliente);
        setMensaje("✅ Cliente actualizado correctamente");
        setTimeout(() => {
          router.push("/clientes");
        }, 1000);        
      } else {
        await addDoc(collection(db, `negocios/${negocioID}/clientes`), cliente);
        setMensaje("✅ Cliente guardado con éxito");

        // ✅ Redirección según el origen
        setTimeout(() => {
          if (origen === "ventas-accesorios") {
            localStorage.setItem("clienteNuevo", cliente.nombre);
            router.push("/ventas/accesorios");
          } else if (origen === "ventas-telefonos") {
            localStorage.setItem("clienteNuevo", cliente.nombre);
            router.push("/ventas/telefonos");
          } else if (origen === "ingreso") {
            localStorage.setItem("clienteNuevo", cliente.nombre);
            router.push("/ingreso");
          } else {
            router.push("/clientes");
          }
        }, 1000);        

        return;
      }
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      setMensaje("❌ Ocurrió un error al guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCliente({ ...cliente, [field]: value });
    if (mensaje) setMensaje(""); // Limpiar mensaje al escribir
  };

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[800px] mx-auto">
          
      {/* Header compacto */}
<div className="mb-6">
  <h1 className="text-2xl font-bold text-[#2c3e50] mb-2 flex items-center gap-3">
    <span className="text-2xl">➕</span>
    {clienteId ? "Editar Cliente" : "Agregar Cliente"}
  </h1>
  <div className="h-1 w-20 bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded"></div>
</div>

          {/* Formulario principal - Estilo GestiOne */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
            
            {/* Header del formulario */}
            <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Información del Cliente</h2>
                  <p className="text-orange-100 mt-1">
                    Completa todos los campos requeridos
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del formulario */}
            <div className="p-8">
              <div className="grid gap-6">
                
                {/* Campo Nombre - Obligatorio */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#2c3e50]">
                    <span className="text-lg">👤</span>
                    Nombre Completo
                    <span className="text-[#e74c3c]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ingresa el nombre completo del cliente"
                    value={cliente.nombre}
                    onChange={(e) => handleInputChange("nombre", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                    required
                  />
                </div>

                {/* Campo Teléfono */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#2c3e50]">
                    <span className="text-lg">📞</span>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: +54 9 11 1234-5678"
                    value={cliente.telefono}
                    onChange={(e) => handleInputChange("telefono", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  />
                </div>

                {/* Campo DNI */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#2c3e50]">
                    <span className="text-lg">🆔</span>
                    DNI
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 12.345.678"
                    value={cliente.dni}
                    onChange={(e) => handleInputChange("dni", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  />
                </div>

                {/* Campo Dirección */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#2c3e50]">
                    <span className="text-lg">🏠</span>
                    Dirección
                  </label>
                  <input
                    type="text"
                    placeholder="Calle, número, ciudad"
                    value={cliente.direccion}
                    onChange={(e) => handleInputChange("direccion", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  />
                </div>

                {/* Campo Email */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#2c3e50]">
                    <span className="text-lg">📧</span>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={cliente.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  />
                </div>

                {/* Nota sobre campos obligatorios */}
                <div className="bg-gradient-to-r from-[#3498db]/10 to-[#2980b9]/10 border-2 border-[#3498db] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">ℹ️</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2c3e50]">
                        Los campos marcados con <span className="text-[#e74c3c] font-bold">*</span> son obligatorios
                      </p>
                      <p className="text-xs text-[#7f8c8d] mt-1">
                        Los demás campos son opcionales pero ayudan a mantener un registro completo
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensaje de estado */}
                {mensaje && (
                  <div className={`p-4 rounded-xl border-2 ${
                    mensaje.includes("✅") 
                      ? "bg-gradient-to-r from-[#27ae60]/10 to-[#2ecc71]/10 border-[#27ae60] text-[#27ae60]"
                      : "bg-gradient-to-r from-[#e74c3c]/10 to-[#c0392b]/10 border-[#e74c3c] text-[#e74c3c]"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        mensaje.includes("✅") ? "bg-[#27ae60]" : "bg-[#e74c3c]"
                      }`}>
                        <span className="text-white text-sm">
                          {mensaje.includes("✅") ? "✅" : "❌"}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{mensaje}</p>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => window.history.back()}
                    className="flex-1 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleGuardar}
                    disabled={guardando || !cliente.nombre.trim()}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
                      guardando || !cliente.nombre.trim()
                        ? "bg-[#bdc3c7] text-[#7f8c8d] cursor-not-allowed"
                        : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white"
                    }`}
                  >
                    {guardando ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>{clienteId ? "💾" : "➕"}</span>
                        {clienteId ? "Actualizar Cliente" : "Guardar Cliente"}
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Información adicional según el origen */}
          {origen && (
            <div className="bg-gradient-to-r from-[#9b59b6]/10 to-[#8e44ad]/10 border-2 border-[#9b59b6] rounded-xl p-6 mt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#9b59b6] rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🔗</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2c3e50]">Regreso Automático</h3>
                  <p className="text-sm text-[#7f8c8d] mt-1">
                    Después de guardar, serás redirigido automáticamente a{" "}
                    <span className="font-medium text-[#9b59b6]">
                      {origen === "ventas-accesorios" ? "Ventas de Accesorios" :
                       origen === "ventas-telefonos" ? "Ventas de Teléfonos" :
                       origen === "ingreso" ? "Ingreso de Trabajos" : "Lista de Clientes"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}