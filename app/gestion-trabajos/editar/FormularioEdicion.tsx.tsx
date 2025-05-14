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
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-4">Editar Trabajo</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <input
            type="text"
            name="fecha"
            value={formulario.fecha}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="Fecha (DD/MM/AAAA)"
          />

<Combobox
  value={formulario.cliente}
  onChange={(value) => setFormulario((prev) => ({ ...prev, cliente: value }))}
>
  <div className="relative">
    <Combobox.Input
      className="w-full border p-2 rounded"
      placeholder="Cliente"
      displayValue={(value: string) => value}
      onChange={(e) => setClienteInput(e.target.value)}
    />
    <Combobox.Options className="absolute z-10 bg-white border w-full mt-1 rounded shadow max-h-60 overflow-auto">
      {clientesFiltrados.length === 0 ? (
        <div className="p-2 text-gray-500">Sin resultados</div>
      ) : (
        clientesFiltrados.map((cli, i) => (
          <Combobox.Option
            key={i}
            value={cli}
            className="p-2 hover:bg-blue-100 cursor-pointer"
          >
            {cli}
          </Combobox.Option>
        ))
      )}
    </Combobox.Options>
  </div>
</Combobox>


          <input
            name="modelo"
            value={formulario.modelo}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="Modelo"
          />
          <input
            name="trabajo"
            value={formulario.trabajo}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="Trabajo"
          />
          <input
            name="clave"
            value={formulario.clave}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="Clave"
          />
          <input
            type="number"
            name="precio"
            value={formulario.precio}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="Precio"
          />
          <input
            name="imei"
            value={formulario.imei}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="IMEI"
          />
          <textarea
            name="observaciones"
            value={formulario.observaciones}
            onChange={handleChange}
            className="p-2 border rounded col-span-1 md:col-span-2"
            placeholder="Observaciones"
          />
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={guardarCambios}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            Guardar cambios
          </button>
        </div>
      </main>
    </>
  );
}
