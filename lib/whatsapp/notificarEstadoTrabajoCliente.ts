import { auth } from "@/lib/auth";
import type { PayloadNotificarEstadoTrabajo } from "@/lib/whatsapp/whatsappBusinessTypes";

type TrabajoMinimo = {
  firebaseId: string;
  cliente: string;
  modelo?: string;
  trabajo?: string;
  id?: string;
};

export function payloadWhatsappDesdeTrabajo(
  negocioID: string,
  trabajo: TrabajoMinimo,
  estadoAnterior: string,
  nuevoEstado: string
): PayloadNotificarEstadoTrabajo {
  return {
    negocioID,
    trabajoId: trabajo.firebaseId,
    cliente: trabajo.cliente,
    modelo: String(trabajo.modelo ?? "").trim(),
    trabajo: String(trabajo.trabajo ?? "").trim(),
    estadoAnterior,
    nuevoEstado,
    ordenId: String(trabajo.id ?? "").trim() || undefined,
  };
}

/** Envía WhatsApp y avisa solo si falló (no bloquea el cambio de estado). */
export async function notificarWhatsappTrabajoSiConfigurado(
  negocioID: string,
  trabajo: TrabajoMinimo,
  estadoAnterior: string,
  nuevoEstado: string
): Promise<void> {
  if (!negocioID || estadoAnterior === nuevoEstado) return;

  const result = await notificarWhatsappCambioEstado(
    payloadWhatsappDesdeTrabajo(negocioID, trabajo, estadoAnterior, nuevoEstado)
  );

  if (result.skipped) return;
  if (result.ok) {
    console.log("✅ WhatsApp enviado al cliente:", trabajo.cliente);
    return;
  }
  console.warn("⚠️ WhatsApp no enviado:", result.reason);
}

export type ResultadoNotificacionWhatsapp = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
};

/**
 * Llama al servidor para enviar WhatsApp tras cambiar el estado de un trabajo.
 * No bloquea la UI si falla; devuelve el resultado para mostrar un aviso opcional.
 */
export async function notificarWhatsappCambioEstado(
  payload: PayloadNotificarEstadoTrabajo
): Promise<ResultadoNotificacionWhatsapp> {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, reason: "Sesión expirada." };
  }

  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/whatsapp/enviar-estado-trabajo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as ResultadoNotificacionWhatsapp & {
      error?: string;
    };

    if (!res.ok) {
      return { ok: false, reason: data.reason || data.error || res.statusText };
    }

    return data;
  } catch (e) {
    console.warn("[whatsapp] notificación no enviada:", e);
    return { ok: false, reason: "Error de red al enviar WhatsApp." };
  }
}
