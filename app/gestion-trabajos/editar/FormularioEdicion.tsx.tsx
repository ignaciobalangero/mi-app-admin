"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "../../Header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";

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
  const id = searchParams.get("id");

  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
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
      if (!user || !id) return;

      const snapUsuario = await getDocs(
        query(collection(db, "usuarios"), where("email", "==", user.email))
      );

      let idNegocio = "";
      snapUsuario.forEach((docu) => {
        const data = docu.data();
        if (data.negocioID) idNegocio = data.negocioID;
      });

      if (!idNegocio) return;
      setNegocioID(idNegocio);

      const snap = await getDoc(doc(db, `negocios/${idNegocio}/trabajos/${id}`));
      if (snap.exists()) {
        const data = snap.data();
        let fechaFormateada = "";

if (data.fecha?.seconds) {
  fechaFormateada = data.fecha.toDate().toISOString().split("T")[0];
} else if (typeof data.fecha === "string") {
  fechaFormateada = data.fecha;
} else {
  fechaFormateada = new Date().toISOString().split("T")[0];
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

    cargarDatos();
  }, [user, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const guardarCambios = async () => {
    if (!id || !negocioID) return;
    await updateDoc(doc(db, `negocios/${negocioID}/trabajos/${id}`), {
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
          <input type="date" name="fecha" value={formulario.fecha} onChange={handleChange} className="p-2 border rounded" placeholder="Fecha" />
          <input name="cliente" value={formulario.cliente} onChange={handleChange} className="p-2 border rounded" placeholder="Cliente" />
          <input name="modelo" value={formulario.modelo} onChange={handleChange} className="p-2 border rounded" placeholder="Modelo" />
          <input name="trabajo" value={formulario.trabajo} onChange={handleChange} className="p-2 border rounded" placeholder="Trabajo" />
          <input name="clave" value={formulario.clave} onChange={handleChange} className="p-2 border rounded" placeholder="Clave" />
          <input type="number" name="precio" value={formulario.precio} onChange={handleChange} className="p-2 border rounded" placeholder="Precio" />
          <input name="imei" value={formulario.imei} onChange={handleChange} className="p-2 border rounded" placeholder="IMEI" />
          <textarea name="observaciones" value={formulario.observaciones} onChange={handleChange} className="p-2 border rounded col-span-1 md:col-span-2" placeholder="Observaciones" />
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