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
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {clienteId ? "Editar cliente" : "Agregar cliente"}
        </h1>

        <div className="max-w-lg mx-auto grid gap-4">
          <input
            type="text"
            placeholder="Nombre"
            value={cliente.nombre}
            onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
            className="p-2 border border-gray-400 rounded"
          />
          <input
            type="text"
            placeholder="Teléfono"
            value={cliente.telefono}
            onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
            className="p-2 border border-gray-400 rounded"
          />
          <input
            type="text"
            placeholder="DNI"
            value={cliente.dni}
            onChange={(e) => setCliente({ ...cliente, dni: e.target.value })}
            className="p-2 border border-gray-400 rounded"
          />
          <input
            type="text"
            placeholder="Dirección"
            value={cliente.direccion}
            onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
            className="p-2 border border-gray-400 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={cliente.email}
            onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
            className="p-2 border border-gray-400 rounded"
          />

          <button
            onClick={handleGuardar}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            {clienteId ? "Actualizar cliente" : "Guardar cliente"}
          </button>

          {mensaje && (
            <p className="text-sm mt-2 text-center text-green-600">{mensaje}</p>
          )}
        </div>
      </main>
    </>
  );
}
