import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function verificarPlanActivo(usuarioID: string) {
  try {
    const usuarioDoc = await getDoc(doc(db, "usuarios", usuarioID));
    
    if (!usuarioDoc.exists()) {
      return { activo: false, motivo: "usuario_no_encontrado" };
    }

    const userData = usuarioDoc.data();
    const ahora = new Date();
    const fechaVencimiento = userData.fechaVencimiento?.toDate();

    if (fechaVencimiento && ahora > fechaVencimiento) {
      return { 
        activo: false, 
        motivo: "plan_vencido",
        fechaVencimiento 
      };
    }

    return { 
      activo: true, 
      plan: userData.planActivo,
      fechaVencimiento 
    };
  } catch (error) {
    console.error("Error verificando plan:", error);
    return { activo: false, motivo: "error_verificacion" };
  }
}

export function calcularDiasRestantes(fechaVencimiento: Date): number {
  const ahora = new Date();
  const diferencia = fechaVencimiento.getTime() - ahora.getTime();
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}