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
  }), // ✅ Guarda como "24/04/2025"
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
      <div className="pt-20 min-h-screen bg-gray-400 text-white p-8">
        <h2 className="text-4xl font-bold mb-8 text-center">Ingreso de trabajo</h2>

        <div className="mb-4 text-right">
          <button
            className="bg-green-600 hover:bg-green-800 text-white px-4 py-2 rounded"
            onClick={() => router.push("/clientes/agregar?origen=ingreso")}
          >
            ➕ Agregar cliente
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            {fechaManual ? (
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                className="p-3 rounded-xl bg-gray-200 border border-gray-600 w-full text-black placeholder-opacity-60"
              />
            ) : (
              <input
  type="text"
  value={form.fecha} // ✅ Ya viene con el formato correcto

                readOnly
                className="p-3 rounded-xl bg-gray-200 border border-gray-600 w-full text-black placeholder-opacity-60"
              />
            )}
            <label className="text-sm">
              <input
                type="checkbox"
                checked={fechaManual}
                onChange={() => setFechaManual(!fechaManual)}
                className="mr-1"
              />
              Editar
            </label>
          </div>

          <input type="text" value={form.id} readOnly className="p-3 rounded-xl bg-gray-200 border border-gray-600" placeholder="ID" />
          <Combobox
  value={form.cliente}
  onChange={(val) => setForm((prev) => ({ ...prev, cliente: val }))}
>
  <div className="relative">
    <Combobox.Input
      className="p-3 rounded-xl bg-gray-200 border border-gray-600 w-full text-black placeholder-opacity-60"
      onChange={(e) => setQueryCliente(e.target.value)}
      displayValue={() => form.cliente}
      placeholder="Cliente"
      autoComplete="off"
      spellCheck={false}
      autoCorrect="off"
    />
    <Combobox.Options className="absolute z-10 w-full bg-white border border-gray-400 rounded mt-1 max-h-60 overflow-y-auto text-sm shadow-xl text-black">
      {clientesGuardados
        .filter((c) =>
          c.nombre.toLowerCase().includes(queryCliente.toLowerCase())
        )
        .map((c, i) => (
          <Combobox.Option
            key={i}
            value={c.nombre}
            className={({ active }) =>
              `px-4 py-2 cursor-pointer ${
                active ? "bg-blue-600 text-white" : "text-black"
              }`
            }
          >
            {c.nombre}
          </Combobox.Option>
        ))}
      {clientesGuardados.filter((c) =>
        c.nombre.toLowerCase().includes(queryCliente.toLowerCase())
      ).length === 0 && (
        <div className="px-4 py-2 text-gray-500">Sin coincidencias</div>
      )}
    </Combobox.Options>
  </div>
</Combobox>

          <input type="text" value={form.modelo} onChange={(e) => setForm((prev) => ({ ...prev, modelo: e.target.value }))} className="p-3 rounded-xl bg-gray-200 border border-gray-600 text-black placeholder-opacity-60" placeholder="Modelo" />
          <input type="text" value={form.trabajo} onChange={(e) => setForm((prev) => ({ ...prev, trabajo: e.target.value }))} className="p-3 rounded-xl bg-gray-200 border border-gray-600 text-black placeholder-opacity-60" placeholder="Trabajo" />
          <input type="text" value={form.clave} onChange={(e) => setForm((prev) => ({ ...prev, clave: e.target.value }))} className="p-3 rounded-xl bg-gray-200 border border-gray-600 text-black placeholder-opacity-60" placeholder="Clave" />
          <input type="text" value={form.imei} onChange={(e) => setForm((prev) => ({ ...prev, imei: e.target.value }))} className="p-3 rounded-xl bg-gray-200 border border-gray-600 text-black placeholder-opacity-60" placeholder="IMEI" />
          <input type="text" value={form.precio} onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))} className="p-3 rounded-xl bg-gray-200 border border-gray-600 text-black placeholder-opacity-60" placeholder="Precio" />
          <input type="text" value={form.observaciones} onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))} className="p-3 rounded-xl bg-gray-200 border border-gray-600 text-black placeholder-opacity-60 col-span-1 md:col-span-2 " placeholder="Observaciones" />
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={() => setMostrarCheckIn(!mostrarCheckIn)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-2xl font-semibold"
          >
            {mostrarCheckIn ? "Ocultar CHECK IN" : "Agregar CHECK IN"}
          </button>
        </div>

        {mostrarCheckIn && (
          <CheckInForm checkData={checkData} setCheckData={setCheckData} />
        )}

        <div className="flex justify-center mt-8">
          <button onClick={handleGuardar} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl text-lg font-semibold transition">
            Guardar
          </button>
        </div>

        {mensajeExito && (
          <div className="text-green-400 mt-4 text-center font-semibold">{mensajeExito}</div>
        )}
      </div>
    </RequireAuth>
  );
}
