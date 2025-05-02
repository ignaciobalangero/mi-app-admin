import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { imprimirEtiqueta } from "@/lib/qzPrinter"; // ✅ nuevo import

interface TrabajoData {
  fecha: string;
  id: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  imei: string;
  precio: string; // sigue siendo string al recibirlo
  estado?: string;
  checkIn?: any;
}

export const guardarTrabajo = async (
  negocioID: string,
  datos: TrabajoData,
  configImpresion: boolean
): Promise<string | null> => {
  try {
    const trabajoConMeta = {
      ...datos,
      fecha: datos.fecha,
      precio: Number(datos.precio), // ✅ conversión segura a número
      estado: datos.estado || "PENDIENTE",
      creadoEn: serverTimestamp(),
    };

    await addDoc(collection(db, `negocios/${negocioID}/trabajos`), trabajoConMeta);

    // ✅ Nueva lógica para impresión automática con QZ Tray
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
        // alert("No se pudo imprimir la etiqueta automáticamente.");
      }
    }

    return "✅ Trabajo guardado correctamente.";
  } catch (error) {
    console.error("Error al guardar trabajo:", error);
    return null;
  }
};

