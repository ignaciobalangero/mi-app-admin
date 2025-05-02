"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  dni: string;
  direccion: string;
  email: string;
}

export default function ListaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtro, setFiltro] = useState("");
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);

  useEffect(() => {
    const obtenerNegocio = async () => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.negocioID) {
            setNegocioID(data.negocioID);
          }
        }
      }
    };
    obtenerNegocio();
  }, [user]);

  useEffect(() => {
    const cargarClientes = async () => {
      if (!negocioID) return;
      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
      const lista: Cliente[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cliente[];
      setClientes(lista);
    };

    cargarClientes();
  }, [negocioID]);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  const eliminarCliente = async () => {
    if (!clienteAEliminar || !negocioID) return;
    await deleteDoc(doc(db, `negocios/${negocioID}/clientes`, clienteAEliminar.id));
    setClientes((prev) => prev.filter((c) => c.id !== clienteAEliminar.id));
    setClienteAEliminar(null);
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-6 text-center">Clientes registrados</h1>

        <div className="max-w-md mx-auto mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Buscar cliente por nombre"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="p-2 border border-gray-400 rounded w-full"
          />
          <Link
            href="/clientes/agregar"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Agregar cliente
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white text-sm border border-gray-300">
            <thead className="bg-gray-300">
              <tr>
                <th className="p-2 border">Nombre</th>
                <th className="p-2 border">Teléfono</th>
                <th className="p-2 border">DNI</th>
                <th className="p-2 border">Dirección</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="border-t hover:bg-gray-100 transition">
                    <td className="p-2 border text-blue-600 underline cursor-pointer">
                      <Link href={`/clientes/${encodeURIComponent(cliente.nombre)}`}>
                        {cliente.nombre}
                      </Link>
                    </td>
                    <td className="p-2 border">{cliente.telefono}</td>
                    <td className="p-2 border">{cliente.dni}</td>
                    <td className="p-2 border">{cliente.direccion}</td>
                    <td className="p-2 border">{cliente.email}</td>
                    <td className="p-2 border text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clientes/agregar?id=${cliente.id}`}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => setClienteAEliminar(cliente)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {clienteAEliminar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white text-black p-6 rounded-xl max-w-sm w-full text-center">
              <h2 className="text-lg font-semibold mb-4">
                ¿Estás seguro de eliminar a <span className="text-red-600">{clienteAEliminar.nombre}</span>?
              </h2>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setClienteAEliminar(null)}
                  className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarCliente}
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
