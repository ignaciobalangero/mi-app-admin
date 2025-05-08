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
  query,
  where,
} from "firebase/firestore";

interface Props {
  negocioID: string;
  setPagos: React.Dispatch<React.SetStateAction<any[]>>;
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

  const guardarPago = async () => {
    if (!cliente || monto <= 0 || !forma) return;

    const clientesSnap = await getDocs(
      query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", cliente))
    );
    const clienteDoc = clientesSnap.docs[0];

    if (!clienteDoc) {
      console.error("❌ No se encontró el cliente en la base de datos.");
      setMensaje("❌ Cliente no encontrado. Verificá el nombre.");
      return;
    }

    const clienteID = clienteDoc.id;

    const nuevoPago = {
      fecha: new Date().toLocaleDateString("es-AR"),
      cliente,
      monto: moneda === "USD" ? null : monto,
      montoUSD: moneda === "USD" ? monto : null,
      forma,
      destino,
      moneda,
      cotizacion,
    };

    try {
      let docRef;
      if (editandoId) {
        docRef = doc(db, `negocios/${negocioID}/pagos`, editandoId);
        await updateDoc(docRef, nuevoPago);
        setEditandoId(null);
        setMensaje("✅ Pago actualizado con éxito");
      } else {
        docRef = await addDoc(collection(db, `negocios/${negocioID}/pagos`), nuevoPago);
        setMensaje("✅ Pago guardado con éxito");
      }

      // Recargar la tabla con el nuevo pago (como en accesorios)
      const snap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
      const pagosActualizados = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        origen: "pagos",
      }));
      setPagos(pagosActualizados);

      // Limpiar formulario
      setCliente("");
      setMonto(0);
      setForma("");
      setDestino("");
      setMoneda("ARS");

      setTimeout(() => setMensaje(""), 2000);
    } catch (error) {
      console.error("Error al guardar el pago:", error);
      setMensaje("❌ Error inesperado al guardar el pago");
    }
  };

  const eliminarPago = async (id: string, cliente: string) => {
    const confirmado = window.confirm(`¿Eliminar el pago de ${cliente}?`);
    if (!confirmado) return;

    try {
      const ref1 = doc(db, `negocios/${negocioID}/pagos`, id);
      const ref2 = doc(db, `negocios/${negocioID}/pagos`, id);

      try {
        await deleteDoc(ref1);
      } catch {
        await deleteDoc(ref2);
      }

      // Actualizar lista
      const snap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
      const pagosActualizados = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        origen: "pagos",
      }));
      setPagos(pagosActualizados);

      // Recalcular
      const clientesSnap = await getDocs(
        query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", cliente))
      );
      const clienteDoc = clientesSnap.docs[0];
      if (clienteDoc) {
        const clienteID = clienteDoc.id;
      }

      setMensaje("✅ Pago eliminado");
      setTimeout(() => setMensaje(""), 2000);
    } catch (error) {
      console.error("❌ Error eliminando pago:", error);
      setMensaje("❌ Error inesperado al eliminar");
    }
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
         value={isNaN(monto) ? "" : monto}
        onChange={(e) => setMonto(Number(e.target.value))}
         onFocus={() => {
          if (monto === 0) setMonto(NaN);
          }}
           onBlur={() => {
             if (isNaN(monto)) setMonto(0);
               }}
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
