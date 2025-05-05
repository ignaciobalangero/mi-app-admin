// Archivo: app/pagos/componentes/FormularioPago.tsx

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { query, where } from "firebase/firestore";
import { format } from "date-fns";
import { recalcularCuentaCliente } from "@/lib/cuentas/recalcularCuentaCliente";

interface Props {
  negocioID: string;
  setPagos: React.Dispatch<React.SetStateAction<any[]>>;
}

interface Pago {
  id: string;
  fecha: any;
  cliente: string;
  monto?: number;
  montoUSD?: number;
  moneda: string;
  forma: string;
  destino?: string;
  cotizacion?: number;
}

export default function FormularioPago({ negocioID, setPagos }: Props) {
  const [cliente, setCliente] = useState("");
  const [clientes, setClientes] = useState<string[]>([]);
  const [monto, setMonto] = useState(0);
  const [forma, setForma] = useState("");
  const [destino, setDestino] = useState("");
  const [moneda, setMoneda] = useState("ARS");
  const [cotizacion, setCotizacion] = useState(1000);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!negocioID) return;

    const fetchClientes = async () => {
      const snap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
      const nombres = snap.docs.map(doc => doc.data().nombre);
      setClientes(nombres);
    };

    const fetchCotizacion = async () => {
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares/blue");
        const data = await res.json();
        if (data && data.venta) setCotizacion(Number(data.venta));
      } catch (error) {
        console.error("Error al obtener cotización:", error);
      }
    };

    fetchClientes();
    fetchCotizacion();
  }, [negocioID]);

  useEffect(() => {
    if (negocioID) {
      obtenerTodosLosPagos();
    }
  }, [negocioID]);

  const obtenerTodosLosPagos = async () => {
    const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
    const pagosExtraSnap = await getDocs(collection(db, `negocios/${negocioID}/pagoClientes`));

    const pagos: Pago[] = pagosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pago));
    const pagosExtras: Pago[] = pagosExtraSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pago));

    const todos = [...pagos, ...pagosExtras];
    const ordenados = todos.sort((a, b) => {
      const fechaA = a.fecha?.seconds ? new Date(a.fecha.seconds * 1000) : new Date(a.fecha);
      const fechaB = b.fecha?.seconds ? new Date(b.fecha.seconds * 1000) : new Date(b.fecha);
      return fechaB.getTime() - fechaA.getTime();
    });

    setPagos(ordenados);
  };

  const guardarPago = async () => {
    if (!cliente || monto <= 0 || !forma) return;
  
    const nuevoPago = {
      fecha: serverTimestamp(),
      cliente,
      monto: moneda === "USD" ? null : monto,
      montoUSD: moneda === "USD" ? monto : null,
      forma,
      destino,
      moneda,
      cotizacion,
    };
  
    try {
      if (editandoId) {
        await updateDoc(doc(db, `negocios/${negocioID}/pagos`, editandoId), nuevoPago);
        setEditandoId(null);
        setMensaje("✅ Pago actualizado con éxito");
      } else {
        await addDoc(collection(db, `negocios/${negocioID}/pagos`), nuevoPago);
        setMensaje("✅ Pago guardado con éxito");
      }
  
      // Limpiar formulario
      setCliente("");
      setMonto(0);
      setForma("");
      setDestino("");
      setMoneda("ARS");
  
      await obtenerTodosLosPagos();
  
      // Buscar ID real del cliente por su nombre antes de recalcular
      const clientesSnap = await getDocs(
        query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", cliente))
      );
      const clienteDoc = clientesSnap.docs[0];
  
      if (!clienteDoc) {
        console.error("❌ No se encontró el cliente en la base de datos.");
        return;
      }
  
      const clienteID = clienteDoc.id;
      await recalcularCuentaCliente({ clienteID, negocioID });
      window.dispatchEvent(new Event("trabajosActualizados"));
  
      setTimeout(() => setMensaje(""), 2000);
    } catch (error) {
      console.error("Error al guardar el pago:", error);
    }
  };
  

  const eliminarPago = async (id: string, cliente: string) => {
    const confirmado = window.confirm(`¿Eliminar el pago de ${cliente}?`);
    if (!confirmado) return;
  
    let eliminado = false;
  
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/pagos`, id));
      eliminado = true;
    } catch {
      try {
        await deleteDoc(doc(db, `negocios/${negocioID}/pagoClientes`, id));
        eliminado = true;
      } catch (error) {
        console.error("Error eliminando el pago de ambas colecciones:", error);
        setMensaje("❌ Error al eliminar el pago");
      }
    }
  
    await obtenerTodosLosPagos();
  
    if (eliminado) {
      setMensaje("✅ Pago eliminado");
  
      // Obtener ID real del cliente por nombre
      const clientesSnap = await getDocs(
        query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", cliente))
      );
      const clienteDoc = clientesSnap.docs[0];
  
      if (clienteDoc) {
        const clienteID = clienteDoc.id;
        await recalcularCuentaCliente({ clienteID, negocioID });
      } else {
        console.warn("⚠️ No se pudo recalcular cuenta: cliente no encontrado");
      }
    }
  
    setTimeout(() => setMensaje(""), 2000);
  };
  

  return (
    <div className="mb-6">
      {mensaje && (
        <div className="text-green-600 text-center mb-4 font-semibold">{mensaje}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          list="lista-clientes"
          placeholder="Cliente"
          className="border-2 border-gray-400 text-black p-2 rounded"
        />
        <datalist id="lista-clientes">
          {clientes.map((nombre, i) => (
            <option key={i} value={nombre} />
          ))}
        </datalist>

        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          placeholder="Monto"
          className="border-2 border-gray-400 text-black p-2 rounded"
        />

        <select
          value={moneda}
          onChange={(e) => setMoneda(e.target.value)}
          className="border-2 border-gray-400 text-black p-2 rounded"
        >
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </select>

        <input
          type="number"
          value={cotizacion}
          onChange={(e) => setCotizacion(Number(e.target.value))}
          placeholder="Cotización"
          className="border-2 border-gray-400 text-black p-2 rounded"
        />

        <input
          value={forma}
          onChange={(e) => setForma(e.target.value)}
          placeholder="Forma de pago"
          className="border-2 border-gray-400 text-black p-2 rounded"
        />

        <input
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          placeholder="Destino"
          className="border-2 border-gray-400 text-black p-2 rounded"
        />

        <button
          onClick={guardarPago}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editandoId ? "Actualizar" : "Guardar pago"}
        </button>
      </div>
    </div>
  );
}
