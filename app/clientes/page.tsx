"use client";
import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
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

  useEffect(() => {
    const cargarClientes = async () => {
      const snapshot = await getDocs(collection(db, "clientes"));
      const lista: Cliente[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cliente[];
      setClientes(lista);
    };

    cargarClientes();
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

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
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="border-t hover:bg-gray-100 transition">
                    <td className="p-2 border text-blue-600 underline cursor-pointer">
                      <Link href={`/clientes/historial?nombre=${encodeURIComponent(cliente.nombre)}`}>
                        {cliente.nombre}
                      </Link>
                    </td>
                    <td className="p-2 border">{cliente.telefono}</td>
                    <td className="p-2 border">{cliente.dni}</td>
                    <td className="p-2 border">{cliente.direccion}</td>
                    <td className="p-2 border">{cliente.email}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
