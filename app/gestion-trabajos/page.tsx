"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import Header from "../Header";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import TablaTrabajos from "./componentes/TablaTrabajos";
import FiltroTrabajos from "./componentes/FiltroTrabajos";
import ModalPago from "./componentes/ModalPago";
import { recalcularCuentaCliente } from "@/lib/cuentas/recalcularCuentaCliente";


interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  estado: string;
  observaciones?: string;
  precio?: number;
  estadoCuentaCorriente?: "pendiente" | "pagado";
}

export default function GestionTrabajosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "PENDIENTE" | "REPARADO" | "ENTREGADO" | "PAGADO">("TODOS");
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [pagoData, setPagoData] = useState({
    cliente: "",
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "Pago cliente desde gestión de trabajos",
    observaciones: "",
  });
  const router = useRouter();

  const parsearFecha = (fechaStr: string) => {
    if (!fechaStr.includes("/")) {
      return new Date(fechaStr.split("T")[0]);
    }
    const [dia, mes, anio] = fechaStr.split("/").map((x) => parseInt(x));
    return new Date(anio, mes - 1, dia);
  };

  const formatearFecha = (fechaStr: string) => {
    const fecha = parsearFecha(fechaStr);
    return fecha.toLocaleDateString("es-AR");
  };
  const { rol } = useRol();
  // 🔥 NUEVO: función cargarTrabajos afuera
  const cargarTrabajos = async () => {
    if (!negocioID) return;
    try {
      const snap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const lista: Trabajo[] = snap.docs.map((docSnap) => ({
        firebaseId: docSnap.id,
        ...(docSnap.data() as Omit<Trabajo, "firebaseId">),
      }));
      lista.sort((a, b) => parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime());
      setTrabajos(lista);
    } catch (error) {
      console.error("Error cargando trabajos:", error);
    }
  };

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);  

  useEffect(() => {
    const listener = () => cargarTrabajos();
    window.addEventListener("trabajosActualizados", listener);
    return () => window.removeEventListener("trabajosActualizados", listener);
  }, []);
  

  useEffect(() => {
    if (!negocioID) return;
    cargarTrabajos(); // ✅ ahora llamamos a la función afuera
  }, [negocioID]);

  const cambiarEstado = async (firebaseId: string, nuevoEstado: string) => {
    if (!firebaseId || !negocioID) return;
    try {
      const ref = doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`);
      await updateDoc(ref, { estado: nuevoEstado });
      setTrabajos((prev) => prev.map((t) => (t.firebaseId === firebaseId ? { ...t, estado: nuevoEstado } : t)));
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert("No se pudo cambiar el estado del trabajo. Verificá la conexión o el ID.");
    }
  };

  const eliminarTrabajo = async (firebaseId: string) => {
    if (!firebaseId || !negocioID) return;
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`));
      setTrabajos((prev) => prev.filter((t) => t.firebaseId !== firebaseId));
    } catch (error) {
      console.error("Error eliminando trabajo:", error);
      alert("No se pudo eliminar el trabajo.");
    }
  };

  const onPagar = (trabajo: Trabajo) => {
    setPagoData({
      cliente: trabajo.cliente,
      monto: "",
      moneda: "ARS",
      formaPago: "",
      destino: "Pago cliente desde gestión de trabajos",
      observaciones: `Pago por ${trabajo.modelo} - ${trabajo.trabajo}`,
    });
    setModalPagoVisible(true);
  };

  const handlePagoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPagoData((prev) => ({ ...prev, [name]: value }));
  };

  const guardarPago = async () => {
  if (!negocioID || !pagoData.cliente || !pagoData.monto) {
    alert("Faltan datos para registrar el pago.");
    return;
  }

  // Buscar clienteID por nombre
  const clientesSnap = await getDocs(
    query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", pagoData.cliente))
  );
  const clienteDoc = clientesSnap.docs[0];

  if (!clienteDoc) {
    alert("❌ Cliente no encontrado. Verificá el nombre.");
    return;
  }

  const clienteID = clienteDoc.id;

  const pago = {
    fecha: new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    cliente: pagoData.cliente,
    monto: pagoData.moneda === "ARS" ? Number(pagoData.monto) : null,
    montoUSD: pagoData.moneda === "USD" ? Number(pagoData.monto) : null,
    forma: pagoData.formaPago,
    destino: pagoData.destino,
    moneda: pagoData.moneda,
    cotizacion: 1000,
    observaciones: pagoData.observaciones || "",
  };

  try {
    await addDoc(collection(db, `negocios/${negocioID}/pagos`), pago);

    await recalcularCuentaCliente({ clienteID, negocioID });

    alert("✅ Pago registrado correctamente");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("trabajosActualizados"));
    }

    setModalPagoVisible(false);
    setPagoData({
      cliente: "",
      monto: "",
      moneda: "ARS",
      formaPago: "",
      destino: "Pago cliente desde gestión de trabajos",
      observaciones: "",
    });
  } catch (error) {
    console.error("Error al guardar el pago:", error);
    alert("❌ No se pudo guardar el pago");
  }
};


  const trabajosFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return trabajos
      .filter((t) =>
        [t.cliente, t.modelo, t.trabajo, t.observaciones, t.estado].some((campo) =>
          campo?.toLowerCase().includes(texto)
        )
      )
      .filter((t) => {
        if (filtroEstado === "TODOS") return true;
        if (filtroEstado === "PENDIENTE") return t.estado === "PENDIENTE" && (t.estadoCuentaCorriente !== "pagado");
        if (filtroEstado === "ENTREGADO") return t.estado === "ENTREGADO" && (t.estadoCuentaCorriente !== "pagado");
        if (filtroEstado === "REPARADO") return t.estado === "REPARADO" && (t.estadoCuentaCorriente !== "pagado");
        if (filtroEstado === "PAGADO") return t.estadoCuentaCorriente === "pagado";
        return true;
      })
      
      .sort((a, b) => parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime());
  }, [trabajos, filtroTexto, filtroEstado]);

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-2xl font-bold mb-4 text-center">Gestión de Trabajos</h1>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <FiltroTrabajos filtro={filtroTexto} setFiltro={setFiltroTexto} />
          <div className="flex gap-2">
            {["TODOS", "PENDIENTE", "REPARADO", "ENTREGADO", "PAGADO"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado as any)}
                className={`px-4 py-2 rounded ${
                  filtroEstado === estado ? "bg-blue-600 text-white" : "bg-gray-300 text-black"
                }`}
              >
                {estado}
              </button>
            ))}
          </div>
        </div>

        <TablaTrabajos
          trabajos={trabajosFiltrados.map(t => ({ ...t, fecha: formatearFecha(t.fecha) }))}
          cambiarEstado={cambiarEstado}
          eliminarTrabajo={eliminarTrabajo}
          onPagar={onPagar}
          router={router}
          negocioID={negocioID}
          recargarTrabajos={cargarTrabajos} // ✅ Ahora existe
        />

        {modalPagoVisible && (
          <ModalPago
            mostrar={modalPagoVisible}
            pago={pagoData}
            onClose={() => setModalPagoVisible(false)}
            onGuardar={guardarPago}
            handlePagoChange={handlePagoChange}
          />
        )}
      </main>
    </>
  );
}
