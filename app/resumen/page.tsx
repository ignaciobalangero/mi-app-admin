// Archivo: /resumen/page.tsx

"use client";
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import RequireAdmin from "@/lib/RequireAdmin";
import Header from "../Header";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";

interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  estado: string;
  estadoCuentaCorriente?: string;
  precio?: number;
  costo?: number;
}

export default function ResumenPage() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroModelo, setFiltroModelo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 40;
  const [mostrarPagados, setMostrarPagados] = useState(false);

  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");
  const { rol } = useRol();
  const router = useRouter();

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  useEffect(() => {
    if (!negocioID) return;
    const unsubscribe = onSnapshot(collection(db, `negocios/${negocioID}/trabajos`), (snapshot) => {
      const lista: Trabajo[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        lista.push({
          firebaseId: docSnap.id,
          fecha: data.fecha,
          cliente: data.cliente,
          modelo: data.modelo,
          trabajo: data.trabajo,
          clave: data.clave,
          observaciones: data.observaciones,
          estado: data.estado,
          estadoCuentaCorriente: data.estadoCuentaCorriente,
          precio: data.precio,
          costo: data.costo,
        });
      });

      let filtrados = lista;
      if (!mostrarPagados) {
        filtrados = lista.filter(
          (t) => !(t.estado === "ENTREGADO" && t.estadoCuentaCorriente === "PAGADO")
        );
      }

      const ordenados = filtrados.sort((a, b) => {
        if (a.estado !== b.estado) {
          return a.estado === "PENDIENTE" ? -1 : 1;
        }
        const fechaA = new Date(a.fecha.split("/").reverse().join("/")).getTime();
        const fechaB = new Date(b.fecha.split("/").reverse().join("/")).getTime();
        return fechaB - fechaA;
      });

      setTrabajos(ordenados);
    });

    return () => unsubscribe();
  }, [negocioID, mostrarPagados]);

  const actualizarCampo = async (firebaseId: string, campo: "precio" | "costo", valor: number) => {
    const ref = doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`);
    await updateDoc(ref, { [campo]: valor });
  };

  const eliminarTrabajo = async (firebaseId: string) => {
    const confirmar = confirm("¿Estás seguro de que querés eliminar este trabajo?");
    if (confirmar) {
      await deleteDoc(doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`));
    }
  };

  const editarTrabajo = (firebaseId: string) => {
    router.push(`/gestion-trabajos/editar?id=${firebaseId}&origen=resumen`);
  };

  const exportarCSV = () => {
    const encabezado = ["Fecha", "Cliente", "Modelo", "Trabajo", "Clave", "Observaciones", "Estado", "Precio", "Costo", "Ganancia"];
    const filas = trabajosFiltrados.map((t) => [
      t.fecha,
      t.cliente,
      t.modelo,
      t.trabajo,
      t.clave,
      t.observaciones,
      t.estado,
      t.precio ?? "",
      t.costo ?? "",
      t.precio && t.costo ? t.precio - t.costo : ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [encabezado, ...filas].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resumen_clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const trabajosFiltrados = trabajos
  .filter(
    (t) =>
      t.cliente?.toLowerCase().includes(filtroCliente.toLowerCase()) &&
      t.modelo?.toLowerCase().includes(filtroModelo.toLowerCase())
  )
  .filter((t) => {
    if (filtroEstado === "TODOS") return true;
    if (filtroEstado === "PAGADO") return t.estadoCuentaCorriente === "PAGADO";
    return t.estado === filtroEstado;
  })
  .sort((a, b) => {
    const fechaA = new Date(a.fecha.split("/").reverse().join("/")).getTime();
    const fechaB = new Date(b.fecha.split("/").reverse().join("/")).getTime();
    return fechaB - fechaA; // más reciente arriba
  });  

  const totalPaginas = Math.ceil(trabajosFiltrados.length / ITEMS_POR_PAGINA);
  const trabajosPaginados = trabajosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  return (
    <RequireAdmin>
      <Header />
      <main className="pt-20 text-black p-6 min-h-screen bg-gray-100">
        <h1 className="text-3xl font-bold mb-6 text-center">Resumen de clientes</h1>

        <div className="mb-4 flex flex-wrap gap-4 justify-center">
          <input
            type="text"
            placeholder="Filtrar por cliente"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className="bg-white border border-gray-400 p-2 rounded text-black"
          />
      
          <input
            type="text"
            placeholder="Filtrar por modelo"
            value={filtroModelo}
            onChange={(e) => setFiltroModelo(e.target.value)}
            className="bg-white border border-gray-400 p-2 rounded text-black"
          />
          <div className="flex gap-2 flex-wrap justify-center">
  <button
    onClick={() => setFiltroEstado("TODOS")}
    className={`px-3 py-1 rounded border ${
      filtroEstado === "TODOS" ? "bg-blue-600 text-white" : "bg-white"
    }`}
  >
    Todos
  </button>
  <button
    onClick={() => setFiltroEstado("PENDIENTE")}
    className={`px-3 py-1 rounded border ${
      filtroEstado === "PENDIENTE" ? "bg-red-400 text-white" : "bg-white"
    }`}
  >
    Pendientes
  </button>
  <button
    onClick={() => setFiltroEstado("REPARADO")}
    className={`px-3 py-1 rounded border ${
      filtroEstado === "REPARADO" ? "bg-yellow-400 text-white" : "bg-white"
    }`}
  >
    Reparados
  </button>
  <button
    onClick={() => setFiltroEstado("ENTREGADO")}
    className={`px-3 py-1 rounded border ${
      filtroEstado === "ENTREGADO" ? "bg-green-400 text-white" : "bg-white"
    }`}
  >
    Entregados
  </button>
  <button
    onClick={() => setFiltroEstado("PAGADO")}
    className={`px-3 py-1 rounded border ${
      filtroEstado === "PAGADO" ? "bg-blue-400 text-white" : "bg-white"
    }`}
  >
    Pagados
  </button>
</div>

          <button
            onClick={exportarCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Exportar CSV
          </button>

        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-gray-300 bg-white">
            <thead>
              <tr className="bg-gray-300 border border-gray-300">
                <th className="p-3 border-r border-gray-400 text-left">Fecha</th>
                <th className="p-3 border-r border-gray-400 text-left">Cliente</th>
                <th className="p-3 border-r border-gray-400 text-left">Modelo</th>
                <th className="p-3 border-r border-gray-400 text-left">Trabajo</th>
                <th className="p-3 border-r border-gray-400 text-left">Clave</th>
                <th className="p-3 border-r border-gray-400 text-left">Observaciones</th>
                <th className="p-3 border-r border-gray-400 text-left">Estado</th>
                <th className="p-3 border-r border-gray-400 text-left">Precio</th>
                <th className="p-3 border-r border-gray-400 text-left">Costo</th>
                <th className="p-3 border-r border-gray-400 text-left">Ganancia</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {trabajosPaginados.map((t) => {
                const ganancia = typeof t.precio === "number" && typeof t.costo === "number"
                  ? t.precio - t.costo
                  : "";

                return (
                  <tr
                    key={t.firebaseId}
                    className={`border-t border-gray-300 transition ${
                      t.estado === "PENDIENTE" ? "bg-red-100"
                      : t.estado === "REPARADO" ? "bg-yellow-100"
                      : t.estado === "ENTREGADO" ? "bg-green-100"
                      : t.estadoCuentaCorriente === "PAGADO" ? "bg-blue-100"
                      : ""
                    }`}                    
                  >
                    <td className="p-2 border-r border-gray-300 w-20">{t.fecha}</td>
                    <td className="p-2 border-r border-gray-300">{t.cliente}</td>
                    <td className="p-2 border-r border-gray-300">{t.modelo}</td>
                    <td className="p-2 border-r border-gray-300">{t.trabajo}</td>
                    <td className="p-2 border-r border-gray-300">{t.clave}</td>
                    <td className="p-2 border-r border-gray-300">{t.observaciones}</td>
                    <td className="p-2 border-r border-gray-300">{t.estado}</td>
                    <td className="p-2 border-r border-gray-300">
                      <input
                        type="number"
                        defaultValue={t.precio ?? ""}
                        onBlur={(e) => actualizarCampo(t.firebaseId, "precio", Number(e.target.value))}
                        className="w-24 bg-white border border-gray-400 rounded p-1 text-black"
                      />
                    </td>
                    <td className="p-2 border-r border-gray-300">
                      <input
                        type="number"
                        defaultValue={t.costo ?? ""}
                        onBlur={(e) => actualizarCampo(t.firebaseId, "costo", Number(e.target.value))}
                        className="w-24 bg-white border border-gray-400 rounded p-1 text-black"
                      />
                    </td>
                    <td className="p-2 border-r border-gray-300">
                      {typeof ganancia === "number" ? `$${ganancia}` : "—"}
                    </td>
                    <td className="p-2 border-r border-gray-300">
  <div className="flex gap-2">
    <button
      onClick={() => editarTrabajo(t.firebaseId)}
      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
    >
      Editar
    </button>
    <button
      onClick={() => eliminarTrabajo(t.firebaseId)}
      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
    >
      Eliminar
    </button>
  </div>
</td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="mt-6 flex justify-center gap-4">
            <button
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2">Página {paginaActual} de {totalPaginas}</span>
            <button
              disabled={paginaActual === totalPaginas}
              onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </main>
    </RequireAdmin>
  );
}
 