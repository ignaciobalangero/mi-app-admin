"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "../../Header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { Combobox } from "@headlessui/react";

interface Trabajo {
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  precio: string;
  imei: string;
}

export default function FormularioEdicion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origen = searchParams.get("origen") || "gestion";
  const id = searchParams.get("id");

  const [user] = useAuthState(auth);
  const { rol } = useRol();

  const [clientes, setClientes] = useState<string[]>([]);
  const [clienteInput, setClienteInput] = useState("");
  const clientesFiltrados = clientes.filter((c) =>
    c.toLowerCase().includes(clienteInput.toLowerCase())
  );  

  const [formulario, setFormulario] = useState<Trabajo>({
    fecha: "",
    cliente: "",
    modelo: "",
    trabajo: "",
    clave: "",
    observaciones: "",
    precio: "",
    imei: "",
  });

  useEffect(() => {
    const cargarDatos = async () => {
      if (!user || !id || !rol?.negocioID) return;

      const snap = await getDoc(doc(db, `negocios/${rol.negocioID}/trabajos/${id}`));
      if (snap.exists()) {
        const data = snap.data();

        let fechaFormateada = "";
        if (data.fecha?.seconds) {
          const f = data.fecha.toDate();
          const dia = String(f.getDate()).padStart(2, "0");
          const mes = String(f.getMonth() + 1).padStart(2, "0");
          const anio = f.getFullYear();
          fechaFormateada = `${dia}/${mes}/${anio}`;
        } else if (typeof data.fecha === "string") {
          fechaFormateada = data.fecha;
        }

        setFormulario({
          fecha: fechaFormateada,
          cliente: data.cliente || "",
          modelo: data.modelo || "",
          trabajo: data.trabajo || "",
          clave: data.clave || "",
          observaciones: data.observaciones || "",
          precio: data.precio?.toString() || "",
          imei: data.imei || "",
        });
      }
    };

    const cargarClientes = async () => {
      if (!rol?.negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/clientes`));
      const lista = snap.docs.map((doc) => doc.data().nombre || "");
      setClientes(lista);
    };

    cargarDatos();
    cargarClientes();
  }, [user, id, rol?.negocioID]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const guardarCambios = async () => {
    if (!id || !rol?.negocioID) return;
    await updateDoc(doc(db, `negocios/${rol.negocioID}/trabajos/${id}`), {
      ...formulario,
      precio: formulario.precio ? parseFloat(formulario.precio) : 0,
    });
    router.push("/gestion-trabajos");
  };

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1200px] mx-auto">
          
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-8 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">✏️</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Editar Trabajo
                </h1>
                <p className="text-blue-100 text-lg">
                  Modifica la información del trabajo seleccionado
                </p>
              </div>
            </div>
          </div>

          {/* Formulario - Estilo GestiOne */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] mb-8">
            
            {/* Header del formulario */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">📝</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#2c3e50]">Información del Trabajo</h2>
                <p className="text-[#7f8c8d] mt-1">Completa todos los campos necesarios</p>
              </div>
            </div>

            {/* Grid del formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Fecha */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📅 Fecha
                </label>
                <input
                  type="text"
                  name="fecha"
                  value={formulario.fecha}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="DD/MM/AAAA"
                />
              </div>

              {/* Cliente - Combobox */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  👤 Cliente
                </label>
                <Combobox
                  value={formulario.cliente}
                  onChange={(value) => setFormulario((prev) => ({ ...prev, cliente: value }))}
                >
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                      placeholder="Seleccionar cliente"
                      displayValue={(value: string) => value}
                      onChange={(e) => setClienteInput(e.target.value)}
                    />
                    <Combobox.Options className="absolute z-10 w-full bg-white border-2 border-[#bdc3c7] rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                      {clientesFiltrados.length === 0 ? (
                        <div className="px-4 py-3 text-[#7f8c8d] text-center">Sin resultados</div>
                      ) : (
                        clientesFiltrados.map((cli, i) => (
                          <Combobox.Option
                            key={i}
                            value={cli}
                            className={({ active }) =>
                              `px-4 py-3 cursor-pointer transition-colors duration-200 ${
                                active ? "bg-[#3498db] text-white" : "text-[#2c3e50] hover:bg-[#ecf0f1]"
                              }`
                            }
                          >
                            {cli}
                          </Combobox.Option>
                        ))
                      )}
                    </Combobox.Options>
                  </div>
                </Combobox>
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📱 Modelo
                </label>
                <input
                  name="modelo"
                  value={formulario.modelo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Modelo del dispositivo"
                />
              </div>

              {/* Trabajo */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🔧 Trabajo
                </label>
                <input
                  name="trabajo"
                  value={formulario.trabajo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Descripción del trabajo"
                />
              </div>

              {/* Clave */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🔑 Clave
                </label>
                <input
                  name="clave"
                  value={formulario.clave}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Clave del dispositivo"
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💰 Precio
                </label>
                <input
                  type="number"
                  name="precio"
                  value={formulario.precio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="0.00"
                />
              </div>

              {/* IMEI */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📲 IMEI
                </label>
                <input
                  name="imei"
                  value={formulario.imei}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Número IMEI"
                />
              </div>

              {/* Observaciones - Span completo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📝 Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={formulario.observaciones}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] resize-none"
                  placeholder="Observaciones adicionales sobre el trabajo..."
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4 justify-center mt-8 pt-6 border-t border-[#ecf0f1]">
              <button
                onClick={() => router.push("/gestion-trabajos")}
                className="px-8 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={guardarCambios}
                className="px-8 py-3 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                💾 Guardar Cambios
              </button>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Tip:</strong> Todos los campos son opcionales excepto el cliente. Los cambios se guardan inmediatamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}