"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Props {
  cliente: string;
  setCliente: (valor: string) => void;
}

export default function SelectorCliente({ cliente, setCliente }: Props) {
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const router = useRouter();

  useEffect(() => {
    const obtenerNegocio = async () => {
      if (!user) return;
      const snap = await getDocs(
        query(collection(db, "usuarios"), where("email", "==", user.email))
      );
      snap.forEach((docu) => {
        const data = docu.data();
        if (data.negocioID) {
          setNegocioID(data.negocioID);
        }
      });
    };
    obtenerNegocio();
  }, [user]);

  useEffect(() => {
    const cargarClientes = async () => {
      if (!negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
      const lista: { id: string; nombre: string }[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.nombre) lista.push({ id: doc.id, nombre: data.nombre });
      });
      setClientes(lista);
    };
    cargarClientes();
  }, [negocioID]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="w-full">
        <input
          type="text"
          name="cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          list="clientes-options"
          placeholder="Buscar cliente..."
          className="p-2 border border-gray-400 rounded w-full"
        />
        <datalist id="clientes-options">
          {clientes.map((c) => (
            <option key={c.id} value={c.nombre} />
          ))}
        </datalist>
      </div>
      <button
        type="button"
        onClick={() => router.push("/clientes/agregar?origen=ventas-accesorios")}
        className="text-sm text-blue-600 hover:underline"
      >
        ➕ Agregar cliente
      </button>
    </div>
  );
}
