"use client";

import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useRol } from "@/lib/useRol";
import { descontarAccesorioDelStock } from "@/app/ventas-general/componentes/descontarAccesorioDelStock";
import { descontarRepuestoDelStock } from "@/app/ventas-general/componentes/descontarRepuestoDelStock";
import { obtenerUltimoNumeroVenta } from "@/lib/ventas/contadorVentas";

export default function BotonGuardarVenta({
  cliente,
  productos,
  fecha,
  observaciones,
  pago,
  moneda,
  onGuardar,
}: {
  cliente: string;
  productos: any[];
  fecha: string;
  observaciones: string;
  pago: any;
  moneda: "ARS" | "USD";
  onGuardar?: () => void;
}) {
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
      const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/datos`);
      const snap = await getDoc(configRef);
      const sheets: any[] = snap.exists() ? snap.data().googleSheets || [] : [];

      // ✅ Asegurar código en cada producto
      const productosConCodigo = productos.map((p) => ({
        ...p,
        codigo: p.codigo || p.id || "",
      }));

      for (const producto of productosConCodigo) {
        const codigo = producto.codigo;
        if (!codigo) continue;

        if (producto.tipo === "accesorio") {
          await descontarAccesorioDelStock(rol.negocioID, codigo, producto.cantidad);
        }

        if (producto.tipo === "repuesto") {
          await descontarRepuestoDelStock(rol.negocioID, codigo, producto.cantidad);

          const hojaFirebase = producto.hoja;
          const sheetConfig = sheets.find((s) => s.hoja === hojaFirebase);

          if (sheetConfig?.id) {
            await fetch("/api/actualizar-stock-sheet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sheetID: sheetConfig.id,
                hoja: hojaFirebase,
                codigo,
                cantidadVendida: producto.cantidad,
              }),
            });
          }
        }
      }

      const pagoLimpio = {
        monto: pago?.monto || 0,
        moneda: pago?.moneda || "ARS",
        forma: pago?.formaPago || "",
        destino: pago?.destino || "",
        observaciones: pago?.observaciones || "",
      };

      // ✅ Guardar venta
      await addDoc(collection(db, `negocios/${rol.negocioID}/ventasGeneral`), {
        productos: productosConCodigo,
        cliente,
        fecha,
        observaciones,
        pago: pagoLimpio,
        moneda,
        estado: "pendiente",
        nroVenta,
        timestamp: serverTimestamp(),
      });

      // ✅ Guardar pago (si existe)
      if (pagoLimpio.monto > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
          cliente,
          fecha,
          monto: Number(pagoLimpio.monto),
          moneda: pagoLimpio.moneda,
          forma: pagoLimpio.forma,
          destino: pagoLimpio.destino,
          observaciones: pagoLimpio.observaciones,
          timestamp: serverTimestamp(),
        });
      }

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
