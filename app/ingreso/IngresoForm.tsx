"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { guardarTrabajo } from "./guardarTrabajo";
import CheckInForm from "./CheckInForm";
import { Combobox } from "@headlessui/react";

interface Cliente {
  nombre: string;
  telefono: string;
  dni: string;
  direccion: string;
  email: string;
}

const hoy = new Date();
const inicialForm = {
  fecha: hoy.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
  id: "",
  cliente: "",
  modelo: "",
  trabajo: "",
  clave: "",
  observaciones: "",
  imei: "",
  precio: "",
};

const inicialCheckData = {
  imeiEstado: "",
  color: "",
  pantalla: "",
  camaras: "",
  microfonos: "",
  cargaCable: "",
  cargaInalambrica: "",
  tapaTrasera: "",
};

export default function IngresoForm() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [form, setForm] = useState(inicialForm);
  const [fechaManual, setFechaManual] = useState(false);
  const [mostrarCheckIn, setMostrarCheckIn] = useState(false);
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([]);
  const [mensajeExito, setMensajeExito] = useState("");
  const [configImpresion, setConfigImpresion] = useState(true);
  const [checkData, setCheckData] = useState(inicialCheckData);
  const [queryCliente, setQueryCliente] = useState("");

  useEffect(() => {
    if (!user) return;

    const obtenerDatos = async () => {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const id = snap.data().negocioID || "";
        setNegocioID(id);
        await cargarClientes(id);
        await obtenerConfiguracion(id);

        const hoy = new Date();
        const idGenerado = "EQ-" + hoy.getTime().toString().slice(-5);
        const clienteNuevo = typeof window !== "undefined" ? localStorage.getItem("clienteNuevo") : null;

        setForm((prev) => ({
          ...prev,
          id: idGenerado,
          cliente: clienteNuevo || "",
        }));

        if (clienteNuevo) localStorage.removeItem("clienteNuevo");
      }
    };

    obtenerDatos();
  }, [user]);

  const cargarClientes = async (negocio: string) => {
    const snapshot = await getDocs(collection(db, `negocios/${negocio}/clientes`));
    const lista: Cliente[] = snapshot.docs.map((doc) => doc.data() as Cliente);
    setClientesGuardados(lista);
  };

  const obtenerConfiguracion = async (negocio: string) => {
    const ref = doc(db, `negocios/${negocio}/configuracion/datos`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data.imprimirEtiquetaAutomatica !== undefined) {
        setConfigImpresion(data.imprimirEtiquetaAutomatica);
      }
    }
  };

  const handleGuardar = async () => {
    if (!negocioID) {
      alert("No se encontró un negocio asociado a este usuario");
      return;
    }

    const datos = {
      ...form,
      fecha: form.fecha,
      checkIn: mostrarCheckIn ? checkData : null,
    };

    const resultado = await guardarTrabajo(negocioID, datos, configImpresion);

    if (resultado) {
      setMensajeExito(resultado);
      setForm({ ...inicialForm, id: form.id });
      setCheckData(inicialCheckData);
      setMostrarCheckIn(false);
    }
  };

  return (
    <RequireAuth>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1200px] mx-auto">
          
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-3 mb-2 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📝</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Ingreso de Trabajo
                </h2>
                <p className="text-blue-100 text-xm">
                  Registra un nuevo trabajo técnico en el sistema
                </p>
              </div>
            </div>
          </div>

       

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] mb-8">
  
  {/* Header del formulario con botón */}
  <div className="flex items-center justify-between mb-8">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-[#f39c12] rounded-xl flex items-center justify-center">
        <span className="text-white text-2xl">📋</span>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-[#2c3e50]">Información del Trabajo</h3>
        <p className="text-[#7f8c8d] mt-1">Completa todos los datos del equipo y trabajo a realizar</p>
      </div>
    </div>
    
    {/* Botón agregar cliente */}
    <button
      className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
      onClick={() => router.push("/clientes/agregar?origen=ingreso")}
    >
      ➕ Agregar Cliente
    </button>
  </div>

            {/* Grid del formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Fecha con checkbox */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📅 Fecha
                </label>
                <div className="flex items-center gap-3">
                  {fechaManual ? (
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                      className="flex-1 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form.fecha}
                      readOnly
                      className="flex-1 px-4 py-3 border-2 border-[#ecf0f1] rounded-lg bg-[#f8f9fa] text-[#7f8c8d]"
                    />
                  )}
                  <label className="flex items-center gap-2 text-sm font-medium text-[#2c3e50]">
                    <input
                      type="checkbox"
                      checked={fechaManual}
                      onChange={() => setFechaManual(!fechaManual)}
                      className="w-4 h-4 text-[#3498db] bg-white border-2 border-[#bdc3c7] rounded focus:ring-[#3498db] focus:ring-2"
                    />
                    Editar
                  </label>
                </div>
              </div>

              {/* ID */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🏷️ ID del Equipo
                </label>
                <input
                  type="text"
                  value={form.id}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-[#ecf0f1] rounded-lg bg-[#f8f9fa] text-[#7f8c8d] font-mono"
                />
              </div>

              {/* Cliente - Combobox */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  👤 Cliente
                </label>
                <Combobox
                  value={form.cliente}
                  onChange={(val) => setForm((prev) => ({ ...prev, cliente: val }))}
                >
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                      onChange={(e) => setQueryCliente(e.target.value)}
                      displayValue={() => form.cliente}
                      placeholder="Seleccionar cliente"
                      autoComplete="off"
                      spellCheck={false}
                      autoCorrect="off"
                    />
                    <Combobox.Options className="absolute z-10 w-full bg-white border-2 border-[#bdc3c7] rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                      {clientesGuardados
                        .filter((c) =>
                          c.nombre.toLowerCase().includes(queryCliente.toLowerCase())
                        )
                        .map((c, i) => (
                          <Combobox.Option
                            key={i}
                            value={c.nombre}
                            className={({ active }) =>
                              `px-4 py-3 cursor-pointer transition-colors duration-200 ${
                                active ? "bg-[#3498db] text-white" : "text-[#2c3e50] hover:bg-[#ecf0f1]"
                              }`
                            }
                          >
                            {c.nombre}
                          </Combobox.Option>
                        ))}
                      {clientesGuardados.filter((c) =>
                        c.nombre.toLowerCase().includes(queryCliente.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-3 text-[#7f8c8d] text-center">Sin coincidencias</div>
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
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm((prev) => ({ ...prev, modelo: e.target.value }))}
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
                  type="text"
                  value={form.trabajo}
                  onChange={(e) => setForm((prev) => ({ ...prev, trabajo: e.target.value }))}
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
                  type="text"
                  value={form.clave}
                  onChange={(e) => setForm((prev) => ({ ...prev, clave: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Clave del dispositivo"
                />
              </div>

              {/* IMEI */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📲 IMEI
                </label>
                <input
                  type="text"
                  value={form.imei}
                  onChange={(e) => setForm((prev) => ({ ...prev, imei: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Número IMEI"
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💰 Precio
                </label>
                <input
                  type="text"
                  value={form.precio}
                  onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="0.00"
                />
              </div>

              {/* Observaciones - Span completo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📝 Observaciones
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] resize-none"
                  placeholder="Observaciones adicionales sobre el trabajo..."
                />
              </div>
            </div>

            {/* Botón CHECK IN */}
            <div className="flex justify-center mt-8 pt-6 border-t border-[#ecf0f1]">
              <button
                onClick={() => setMostrarCheckIn(!mostrarCheckIn)}
                className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                  mostrarCheckIn
                    ? "bg-gradient-to-r from-[#e67e22] to-[#d35400] hover:from-[#d35400] hover:to-[#c0392b] text-white"
                    : "bg-gradient-to-r from-[#f39c12] to-[#e67e22] hover:from-[#e67e22] hover:to-[#d35400] text-white"
                }`}
              >
                {mostrarCheckIn ? "📋 Ocultar CHECK IN" : "📋 Agregar CHECK IN"}
              </button>
            </div>
          </div>

          {/* CheckIn Form */}
          {mostrarCheckIn && (
            <CheckInForm checkData={checkData} setCheckData={setCheckData} />
          )}

          {/* Botón guardar */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1] mb-8">
            <div className="flex justify-center">
              <button
                onClick={handleGuardar}
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-12 py-4 rounded-xl text-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-xl flex items-center gap-3"
              >
                💾 Guardar Trabajo
              </button>
            </div>
          </div>

          {/* Mensaje de éxito */}
          {mensajeExito && (
            <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] rounded-xl p-6 shadow-lg mb-8">
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-[#27ae60] rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">✓</span>
                </div>
                <span className="text-[#27ae60] font-bold text-xl">{mensajeExito}</span>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Tip:</strong> El ID del equipo se genera automáticamente. Todos los campos son opcionales excepto el cliente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}