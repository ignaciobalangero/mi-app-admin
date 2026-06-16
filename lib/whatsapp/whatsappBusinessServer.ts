import { db } from "@/lib/firebaseAdmin";
import {
  CONFIG_WHATSAPP_DEFAULT,
  type ParametroPlantillaWhatsapp,
  type PayloadNotificarEstadoTrabajo,
  type WhatsappBusinessConfig,
} from "@/lib/whatsapp/whatsappBusinessTypes";

const GRAPH_VERSION = "v21.0";

export function normalizarTelefonoWhatsapp(raw: string): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length < 10) return null;
  if (d.startsWith("54")) return d;
  if (d.length === 10) return `549${d}`;
  if (d.startsWith("9") && d.length === 11) return `54${d}`;
  if (d.startsWith("15") && d.length === 12) return `54${d}`;
  return d;
}

function mergeConfig(raw: Record<string, unknown> | undefined): WhatsappBusinessConfig {
  if (!raw) return { ...CONFIG_WHATSAPP_DEFAULT };
  const plantillaRaw = (raw.plantilla as Record<string, unknown>) || {};
  return {
    activo: raw.activo === true,
    phoneNumberId: String(raw.phoneNumberId ?? "").trim(),
    accessToken: String(raw.accessToken ?? "").trim(),
    estadosNotificar: {
      ...CONFIG_WHATSAPP_DEFAULT.estadosNotificar,
      ...((raw.estadosNotificar as WhatsappBusinessConfig["estadosNotificar"]) || {}),
    },
    plantilla: {
      templateName: String(
        plantillaRaw.templateName ?? CONFIG_WHATSAPP_DEFAULT.plantilla.templateName
      ).trim(),
      languageCode: String(
        plantillaRaw.languageCode ?? CONFIG_WHATSAPP_DEFAULT.plantilla.languageCode
      ).trim(),
      parametros: Array.isArray(plantillaRaw.parametros)
        ? (plantillaRaw.parametros as ParametroPlantillaWhatsapp[])
        : CONFIG_WHATSAPP_DEFAULT.plantilla.parametros,
    },
    nombreNegocio: String(raw.nombreNegocio ?? "").trim() || undefined,
  };
}

export async function cargarConfigWhatsappBusiness(
  negocioID: string
): Promise<WhatsappBusinessConfig> {
  const snap = await db.doc(`negocios/${negocioID}/configuracion/whatsapp`).get();
  if (snap.exists) {
    return mergeConfig(snap.data() as Record<string, unknown>);
  }

  // Migración suave: config vieja UltraMsg en `configuracion/{negocioID}` (solo lectura).
  const legacy = await db.doc(`configuracion/${negocioID}`).get();
  if (legacy.exists) {
    const wa = legacy.data()?.whatsapp as Record<string, unknown> | undefined;
    if (wa?.instanceID || wa?.token) {
      return mergeConfig({
        activo: false,
        phoneNumberId: "",
        accessToken: "",
        estadosNotificar: CONFIG_WHATSAPP_DEFAULT.estadosNotificar,
        plantilla: CONFIG_WHATSAPP_DEFAULT.plantilla,
      });
    }
  }

  return { ...CONFIG_WHATSAPP_DEFAULT };
}

function resolverAccessToken(config: WhatsappBusinessConfig): string {
  const envGlobal = String(process.env.WHATSAPP_ACCESS_TOKEN ?? "").trim();
  if (envGlobal) return envGlobal;
  const envNegocio = String(
    process.env[`WHATSAPP_ACCESS_TOKEN_${config.phoneNumberId}`] ?? ""
  ).trim();
  if (envNegocio) return envNegocio;
  return config.accessToken;
}

function valorParametro(
  key: ParametroPlantillaWhatsapp,
  payload: PayloadNotificarEstadoTrabajo
): string {
  switch (key) {
    case "cliente":
      return String(payload.cliente ?? "").trim() || "Cliente";
    case "modelo":
      return String(payload.modelo ?? "").trim() || "equipo";
    case "estado":
      return String(payload.nuevoEstado ?? "").trim() || "—";
    case "orden":
      return String(payload.ordenId ?? payload.trabajoId ?? "").trim() || "—";
    case "trabajo":
      return String(payload.trabajo ?? "").trim() || "—";
    default:
      return "—";
  }
}

export async function buscarTelefonoCliente(
  negocioID: string,
  nombreCliente: string
): Promise<string | null> {
  const nombre = String(nombreCliente ?? "").trim();
  if (!nombre) return null;

  const col = db.collection(`negocios/${negocioID}/clientes`);
  let snap = await col.where("nombre", "==", nombre).limit(1).get();

  if (snap.empty) {
    const todos = await col.limit(500).get();
    const lower = nombre.toLowerCase();
    const match = todos.docs.find((d) => {
      const n = String(d.data().nombre ?? d.data().cliente ?? "").trim();
      return n.toLowerCase() === lower;
    });
    if (!match) return null;
    return normalizarTelefonoWhatsapp(String(match.data().telefono ?? ""));
  }

  return normalizarTelefonoWhatsapp(String(snap.docs[0].data().telefono ?? ""));
}

export type ResultadoEnvioWhatsapp = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
};

export async function enviarWhatsappEstadoTrabajo(
  payload: PayloadNotificarEstadoTrabajo,
  opts?: { telefonoOverride?: string }
): Promise<ResultadoEnvioWhatsapp> {
  const negocioID = String(payload.negocioID ?? "").trim();
  if (!negocioID) {
    return { ok: false, reason: "Sin negocio." };
  }

  const estadoAnt = String(payload.estadoAnterior ?? "").trim().toUpperCase();
  const estadoNuevo = String(payload.nuevoEstado ?? "").trim().toUpperCase();
  if (!estadoNuevo || estadoAnt === estadoNuevo) {
    return { ok: true, skipped: true, reason: "Sin cambio de estado." };
  }

  const config = await cargarConfigWhatsappBusiness(negocioID);
  if (!config.activo) {
    return { ok: true, skipped: true, reason: "WhatsApp desactivado." };
  }

  const notificar = config.estadosNotificar[estadoNuevo as keyof typeof config.estadosNotificar];
  if (!notificar) {
    return { ok: true, skipped: true, reason: `Estado ${estadoNuevo} sin notificación.` };
  }

  const phoneNumberId = config.phoneNumberId;
  const accessToken = resolverAccessToken(config);
  if (!phoneNumberId || !accessToken) {
    return { ok: false, reason: "Faltan Phone Number ID o Access Token de Meta." };
  }

  const telefonoOverride = opts?.telefonoOverride
    ? normalizarTelefonoWhatsapp(opts.telefonoOverride)
    : null;
  const telefono =
    telefonoOverride ?? (await buscarTelefonoCliente(negocioID, payload.cliente));
  if (!telefono) {
    return {
      ok: false,
      reason: `Cliente "${payload.cliente}" sin teléfono en la ficha de clientes.`,
    };
  }

  const params = config.plantilla.parametros.map((p) => ({
    type: "text" as const,
    text: valorParametro(p, payload).slice(0, 1024),
  }));

  const body = {
    messaging_product: "whatsapp",
    to: telefono,
    type: "template",
    template: {
      name: config.plantilla.templateName,
      language: { code: config.plantilla.languageCode },
      components:
        params.length > 0
          ? [{ type: "body", parameters: params }]
          : undefined,
    },
  };

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string; error_user_msg?: string };
  };

  if (!res.ok) {
    const msg =
      data.error?.error_user_msg ||
      data.error?.message ||
      `Meta API HTTP ${res.status}`;
    return { ok: false, reason: msg };
  }

  const messageId = data.messages?.[0]?.id;

  try {
    await db.collection(`negocios/${negocioID}/whatsappLog`).add({
      tipo: "estado_trabajo",
      trabajoId: payload.trabajoId,
      cliente: payload.cliente,
      telefono,
      estadoAnterior: estadoAnt,
      estadoNuevo,
      templateName: config.plantilla.templateName,
      messageId: messageId ?? null,
      creadoEn: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[whatsapp] log no guardado:", e);
  }

  return { ok: true, messageId };
}
