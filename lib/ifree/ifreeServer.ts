import { db } from "@/lib/firebaseAdmin";
import {
  CONSULTAS_IFREE,
  interpretarRespuestaIfree,
  planControlImeiDesde,
  type ConsultaImeiId,
  type PlanControlImei,
  type ResultadoConsultaImei,
} from "@/lib/ifree/consultasImei";

const IFREE_URL = "https://api.ifreeicloud.co.uk";

type Envelope = {
  success?: boolean;
  error?: string;
  response?: unknown;
  object?: unknown;
};

async function postIfree(params: Record<string, string>): Promise<Envelope> {
  const res = await fetch(IFREE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(60_000),
  });
  const texto = await res.text();
  let data: Envelope = {};
  try {
    data = JSON.parse(texto) as Envelope;
  } catch {
    throw new Error(res.ok ? "iFree devolvió una respuesta inválida." : `iFree respondió HTTP ${res.status}.`);
  }
  if (!res.ok) {
    throw new Error(mensajeErrorIfree(data.error) || `iFree respondió HTTP ${res.status}.`);
  }
  return data;
}

function mensajeErrorIfree(error: unknown): string {
  const texto = String(error || "").trim();
  if (!texto) return "";
  if (/insufficient/i.test(texto) && /balance/i.test(texto)) {
    return "No hay crédito en la cuenta de iFree.";
  }
  if (/unable to check blacklist/i.test(texto)) {
    return "iFree no pudo revisar la lista negra de ese IMEI. No significa que esté robado.";
  }
  if (/ip guard|unauthorized ip/i.test(texto)) {
    return "iFree bloqueó la consulta por la dirección del servidor. Dejá IP Guard apagado.";
  }
  if (/invalid (api )?key|10234/i.test(texto)) return "La clave de iFree no es válida.";
  if (/invalid imei|invalid serial/i.test(texto)) return "iFree no aceptó ese IMEI.";
  return texto;
}

/** Clave de la cuenta iFree de Gestione. Primero el entorno, después la guardada por el superadmin. */
export async function leerClaveIfreePlataforma(): Promise<string> {
  const desdeEntorno = String(process.env.IFREE_API_KEY || "").trim();
  if (desdeEntorno) return desdeEntorno;
  const snap = await db.doc("configuracionGlobal/ifree").get();
  return String(snap.data()?.apiKey || "").trim();
}

export async function guardarClaveIfreePlataforma(apiKey: string): Promise<void> {
  await db.doc("configuracionGlobal/ifree").set({ apiKey: apiKey.trim() }, { merge: true });
}

export async function leerPlanControlImei(negocioID: string): Promise<PlanControlImei> {
  const snap = await db.doc(`negocios/${negocioID}/configuracion/datos`).get();
  return planControlImeiDesde(snap.data());
}

export async function consultarSaldoIfree(apiKey: string): Promise<number> {
  const data = await postIfree({ accountinfo: "balance", key: apiKey });
  if (data.success !== true) {
    throw new Error(mensajeErrorIfree(data.error) || "No se pudo leer el saldo de iFree.");
  }
  const objeto = data.object && typeof data.object === "object" ? (data.object as Record<string, unknown>) : {};
  const saldo = Number(objeto.account_balance ?? objeto.balance);
  if (!Number.isFinite(saldo)) throw new Error("iFree no informó el saldo.");
  return saldo;
}

export async function consultarImeiIfree(
  apiKey: string,
  consulta: ConsultaImeiId,
  imei: string
): Promise<ResultadoConsultaImei> {
  const servicio = CONSULTAS_IFREE[consulta].servicio;
  const data = await postIfree({
    key: apiKey,
    service: String(servicio),
    imei,
  });
  if (data.success !== true) {
    throw new Error(mensajeErrorIfree(data.error) || "iFree no pudo consultar ese IMEI.");
  }
  return interpretarRespuestaIfree(consulta, data.response, data.object);
}
