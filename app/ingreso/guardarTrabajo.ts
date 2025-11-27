import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { imprimirEtiqueta } from "@/lib/qzPrinter";

interface TrabajoData {
  fecha: string;
  id: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  imei: string;
  precio: string;
  anticipo?: string; // ✨ NUEVO: Campo anticipo
  saldo?: string;    // ✨ NUEVO: Campo saldo
  estado?: string;
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