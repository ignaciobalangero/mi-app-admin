import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MovimientoCaja } from "@/lib/caja/cajaTypes";
import { fechaCajaHoy } from "@/lib/caja/fechaCaja";

export async function registrarMovimientoCaja(
  negocioId: string,
  mov: Omit<MovimientoCaja, "id" | "fecha" | "timestamp" | "esAnulado"> & {
    fecha?: string;
  }
): Promise<string> {
  const payload: Omit<MovimientoCaja, "id"> = {
    ...mov,
    fecha: mov.fecha ?? fechaCajaHoy(),
    timestamp: serverTimestamp() as unknown as Date,
    esAnulado: false,
  };

  const ref = await addDoc(collection(db, `negocios/${negocioId}/movimientosCaja`), payload);
  return ref.id;
}

/** Contraasiento: nunca se edita el movimiento original. */
export async function anularMovimientoCaja(
  negocioId: string,
  original: MovimientoCaja,
  motivo: string,
  usuario: string,
  usuarioId: string
): Promise<string> {
  const tipoInverso = original.tipo === "ingreso" ? "egreso" : "ingreso";
  return registrarMovimientoCaja(negocioId, {
    sesionId: original.sesionId,
    tipo: tipoInverso,
    categoria: original.categoria,
    subcategoria: original.subcategoria,
    montoARS: original.montoARS,
    montoUSD: original.montoUSD,
    cotizacionUSD: original.cotizacionUSD,
    medioPago: original.medioPago,
    idReferencia: original.id,
    tablaReferencia: "pagos",
    descripcion: `Anulación: ${motivo} (ref ${original.id})`,
    usuario,
    usuarioId,
    origenSync: "manual",
  });
}
