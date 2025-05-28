"use client";

import { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useRol } from "@/lib/useRol";
import { descontarAccesorioDelStock } from "@/app/ventas-general/componentes/descontarAccesorioDelStock";
import { descontarRepuestoDelStock } from "@/app/ventas-general/componentes/descontarRepuestoDelStock";
import { obtenerUltimoNumeroVenta } from "@/lib/ventas/contadorVentas";

interface Props {
  productos: any[];
  cliente: string;
  fecha: string;
  observaciones: string;
  pago: any;
  onGuardar?: () => void;
}

export default function BotonGuardarVenta({ productos, cliente, fecha, observaciones, pago, onGuardar }: Props) {
  const router = useRouter();
  const { rol } = useRol();
  const [guardando, setGuardando] = useState(false);
  const [nroVenta, setNroVenta] = useState("00000");

  useEffect(() => {
    const cargarNumero = async () => {
      if (rol?.negocioID) {
        const nro = await obtenerUltimoNumeroVenta(rol.negocioID);
        setNroVenta(nro);
      }
    };
    cargarNumero();
  }, [rol?.negocioID]);

  const guardarVenta = async () => {
    if (!rol?.negocioID || productos.length === 0 || !cliente) return;
    setGuardando(true);

    try {
      // Descontar stock
      for (const producto of productos) {
        if (producto.categoria === "Accesorio") {
          await descontarAccesorioDelStock(rol.negocioID, producto.codigo, producto.cantidad);
        }
        if (producto.categoria === "Repuesto") {
          await descontarRepuestoDelStock(rol.negocioID, producto.codigo, producto.cantidad);
        }
      }

      // Guardar venta en Firestore
      await addDoc(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), {
        productos,
        cliente,
        fecha,
        observaciones,
        pago,
        estado: "pendiente",
        nroVenta,
        timestamp: serverTimestamp(),
      });

      if (onGuardar) onGuardar();
      router.push("/ventas-general");
    } catch (error) {
      console.error("Error al guardar la venta:", error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="mb-4 text-right">
        <p className="text-base font-semibold text-gray-700">
          🧾 Remito / Venta N°: <span className="text-blue-600">{nroVenta}</span>
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={guardarVenta}
          disabled={guardando}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
        >
          {guardando ? "Guardando..." : "Guardar Venta"}
        </button>
      </div>
    </div>
  );
}
