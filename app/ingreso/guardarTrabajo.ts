import { addDoc, collection, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { imprimirEtiqueta } from "@/lib/qzPrinter";

interface TrabajoData {
  fecha: string;
  id: string;
  cliente: string;
  modelo: string;
  color?: string;
  trabajo: string;
  clave: string;
  patronDesbloqueo?: number[];
  observaciones: string;
  imei: string;
  precio: string;
  anticipo?: string;
  saldo?: string;
  estado?: string;
  nroOrden?: string;
  accesorios?: string;
  checkIn?: any;
}

export const guardarTrabajo = async (
  negocioID: string,
  datos: TrabajoData,
  configImpresion: boolean
): Promise<string | null> => {
  try {
    // 1️⃣ Guardar el trabajo
    const trabajoConMeta = {
      ...datos,
      fecha: datos.fecha,
      precio: Number(datos.precio),
      anticipo: Number(datos.anticipo || 0), // ✨ Guardar anticipo
      saldo: Number(datos.saldo || datos.precio), // ✨ Guardar saldo
      estado: datos.estado || "PENDIENTE",
      creadoEn: serverTimestamp(),
    };

    const trabajoRef = await addDoc(
      collection(db, `negocios/${negocioID}/trabajos`), 
      trabajoConMeta
    );

    // 2️⃣ ✨ NUEVO: Si hay anticipo, registrarlo como pago
    const anticipoNumerico = Number(datos.anticipo || 0);
    if (anticipoNumerico > 0) {
      const pagoAnticipo = {
        fecha: datos.fecha,
        fechaCompleta: new Date(),
        cliente: datos.cliente,
        monto: anticipoNumerico,
        montoUSD: null,
        forma: "Anticipo",
        destino: "Anticipo",
        tipoDestino: "libre",
        proveedorDestino: null,
        moneda: "ARS",
        cotizacion: 1,
        tipo: "ingreso",
        negocioID: negocioID,
        trabajoId: trabajoRef.id,
        observaciones: `Anticipo del trabajo ${datos.id}`,
        timestamp: serverTimestamp(),
      };

      await addDoc(
        collection(db, `negocios/${negocioID}/pagos`),
        pagoAnticipo
      );

      console.log(`✅ Anticipo de $${anticipoNumerico} registrado como pago`);
    }

    // 3️⃣ Impresión automática
    if (configImpresion) {
      const texto = `ID: ${datos.id}
Cliente: ${datos.cliente}
Modelo: ${datos.modelo}
Trabajo: ${datos.trabajo}
Clave: ${datos.clave}
Obs: ${datos.observaciones}`;
      
      try {
        await imprimirEtiqueta(texto);
      } catch (e) {
        console.warn("⚠️ Error al intentar imprimir con QZ Tray:", e);
      }
    }

    // 4️⃣ Mensaje de confirmación
    if (anticipoNumerico > 0) {
      return `✅ Trabajo guardado. Anticipo de $${anticipoNumerico.toLocaleString("es-AR")} registrado.`;
    }
    
    return "✅ Trabajo guardado correctamente.";

  } catch (error) {
    console.error("Error al guardar trabajo:", error);
    return null;
  }
};

export interface GuardarTrabajosBatchInput {
  nroOrden: string;
  fecha: string;
  cliente: string;
  trabajos: Omit<TrabajoData, "cliente" | "fecha" | "nroOrden">[];
}

export interface TrabajoGuardadoBatch extends TrabajoData {
  firebaseId: string;
}

/**
 * Guarda N trabajos en una sola operación (batch).
 * - Cada trabajo se crea como documento nuevo en `trabajos` con estado PENDIENTE.
 * - No registra anticipos como pagos (para no afectar la cuenta al momento del ingreso).
 * - Todos comparten el mismo `nroOrden`.
 */
export const guardarTrabajosBatch = async (
  negocioID: string,
  input: GuardarTrabajosBatchInput
): Promise<{ mensaje: string; trabajosGuardados: TrabajoGuardadoBatch[] } | null> => {
  try {
    const batch = writeBatch(db);
    const trabajosGuardados: TrabajoGuardadoBatch[] = [];

    const trabajosCol = collection(db, `negocios/${negocioID}/trabajos`);

    input.trabajos.forEach((t, idx) => {
      const ref = doc(trabajosCol); // id único
      const precioNum = Number(t.precio ?? 0);
      const anticipoNum = Number(t.anticipo ?? 0);
      const saldoNum = Number(t.saldo ?? (precioNum - anticipoNum));

      const trabajoConMeta: TrabajoData = {
        ...t,
        fecha: input.fecha,
        cliente: input.cliente,
        nroOrden: input.nroOrden,
        precio: precioNum.toString(),
        anticipo: anticipoNum.toString(),
        saldo: saldoNum.toString(),
        estado: "PENDIENTE",
        checkIn: (t as any).checkIn ?? null,
        creadoEn: serverTimestamp() as any,
      } as any;

      batch.set(ref, {
        ...trabajoConMeta,
        precio: precioNum,
        anticipo: anticipoNum,
        saldo: saldoNum,
        creadoEn: serverTimestamp(),
      });

      trabajosGuardados.push({
        ...(trabajoConMeta as any),
        firebaseId: ref.id,
      });
    });

    await batch.commit();

    return {
      mensaje: `✅ ${input.trabajos.length} trabajos guardados correctamente.`,
      trabajosGuardados,
    };
  } catch (error) {
    console.error("Error al guardar trabajos batch:", error);
    return null;
  }
};