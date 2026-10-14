export type ConsultaImeiId = "fmi" | "icloud" | "blacklist";

export type NivelChequeoImei = "ok" | "alerta" | "peligro" | "info";

export type ResultadoConsultaImei = {
  consulta: ConsultaImeiId;
  nivel: NivelChequeoImei;
  titulo: string;
  detalle: string;
  consultadoEn: string;
};

export type ChequeoImei = {
  imei: string;
  fmi?: ResultadoConsultaImei;
  icloud?: ResultadoConsultaImei;
  blacklist?: ResultadoConsultaImei;
};

export type FlagsIfree = {
  fmi: boolean;
  icloud: boolean;
  blacklist: boolean;
};

export const CONSULTAS_IFREE: Record<
  ConsultaImeiId,
  { servicio: number; precio: number; nombre: string; pregunta: string; ayuda: string }
> = {
  fmi: {
    servicio: 4,
    precio: 0.01,
    nombre: "Buscar mi iPhone",
    pregunta: "¿Lo pueden bloquear?",
    ayuda: "Te dice si FMI está activado o desactivado.",
  },
  icloud: {
    servicio: 60,
    precio: 0.03,
    nombre: "Perdido",
    pregunta: "¿Lo marcaron perdido?",
    ayuda: "Si FMI está activado, te dice si lo marcaron como perdido.",
  },
  blacklist: {
    servicio: 55,
    precio: 0.02,
    nombre: "Lista negra",
    pregunta: "¿Figura como robado?",
    ayuda: "Te dice si tiene reporte de robo o pérdida.",
  },
};

export const FLAGS_IFREE_VACIAS: FlagsIfree = {
  fmi: false,
  icloud: false,
  blacklist: false,
};

/** off: no incluido. imei: solo Buscar mi iPhone. todo: FMI + perdido + lista negra. */
export type PlanControlImei = "off" | "imei" | "todo";

export function planControlImeiDesde(data: unknown): PlanControlImei {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const plan = String(raw.controlImeiPlan || "");
  if (plan === "imei" || plan === "todo") return plan;
  return "off";
}

export function flagsDesdePlan(plan: PlanControlImei): FlagsIfree {
  if (plan === "todo") return { fmi: true, icloud: true, blacklist: true };
  if (plan === "imei") return { fmi: true, icloud: false, blacklist: false };
  return FLAGS_IFREE_VACIAS;
}

export function consultaIncluida(plan: PlanControlImei, consulta: ConsultaImeiId): boolean {
  return flagsDesdePlan(plan)[consulta];
}

export function flagsIfreeDesde(data: unknown): FlagsIfree {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    fmi: raw.fmi === true,
    icloud: raw.icloud === true,
    blacklist: raw.blacklist === true,
  };
}

export function algunaConsultaIfree(flags: FlagsIfree): boolean {
  return flags.fmi || flags.icloud || flags.blacklist;
}

export function textoPlanoIfree(valor: unknown): string {
  return String(valor ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function entradas(objeto: unknown): { clave: string; valor: string }[] {
  if (!objeto || typeof objeto !== "object") return [];
  const lista: { clave: string; valor: string }[] = [];
  for (const [clave, valor] of Object.entries(objeto as Record<string, unknown>)) {
    if (valor == null) continue;
    if (typeof valor === "boolean") {
      lista.push({ clave, valor: valor ? "yes" : "no" });
    } else if (typeof valor === "string" || typeof valor === "number") {
      const texto = String(valor).trim();
      if (texto) lista.push({ clave, valor: texto });
    }
  }
  return lista;
}

function campo(objeto: unknown, claveRe: RegExp): string | null {
  const hallado = entradas(objeto).find((e) => claveRe.test(e.clave));
  return hallado ? hallado.valor : null;
}

function esAfirmativo(valor: string): boolean {
  return /^(on|yes|true|si|sí|locked|lost|blacklisted|barred|blocked)$/i.test(valor.trim());
}

function esNegativo(valor: string): boolean {
  return /^(off|no|false|clean|clear|unlocked|ok)$/i.test(valor.trim());
}

function armar(
  consulta: ConsultaImeiId,
  nivel: NivelChequeoImei,
  titulo: string,
  detalle: string
): ResultadoConsultaImei {
  return {
    consulta,
    nivel,
    titulo,
    detalle,
    consultadoEn: new Date().toISOString(),
  };
}

export function interpretarRespuestaIfree(
  consulta: ConsultaImeiId,
  response: unknown,
  object: unknown
): ResultadoConsultaImei {
  const detalle = textoPlanoIfree(response) || "iFree no devolvió un texto.";
  const modelo = campo(object, /model|marketingname|product/i);

  if (consulta === "fmi") {
    const valor = campo(object, /fmi|findmy|find_my|activationlock/i);
    const texto = `${valor || ""}\n${detalle}`;
    const off = (valor && esNegativo(valor)) || /find my iphone\s*:\s*off|\bfmi\s*[:=]\s*off/i.test(texto);
    const on = (valor && esAfirmativo(valor)) || /find my iphone\s*:\s*on|\bfmi\s*[:=]\s*on/i.test(texto);
    if (off && !on) {
      return armar("fmi", "ok", "FMI desactivado", modelo ? `${detalle}\n${modelo}` : detalle);
    }
    if (on) {
      return armar("fmi", "alerta", "FMI activado", modelo ? `${detalle}\n${modelo}` : detalle);
    }
    return armar("fmi", "info", "Buscar mi iPhone", detalle);
  }

  if (consulta === "icloud") {
    const valor = campo(object, /icloud|lostmode|lost_mode|loststatus|status/i);
    const texto = `${valor || ""}\n${detalle}`;
    const perdido = (valor && /\blost\b/i.test(valor)) || /\b(iCloud|status)\s*:\s*lost\b/i.test(detalle);
    const limpio =
      (valor && /clean|off/i.test(valor) && !/lost/i.test(valor)) ||
      /\b(iCloud|status)\s*:\s*clean\b/i.test(detalle);
    if (perdido) return armar("icloud", "peligro", "Marcado como perdido", detalle);
    if (limpio) return armar("icloud", "ok", "iCloud limpio", detalle);
    if (/\blost\b/i.test(texto) && !/\bclean\b/i.test(texto)) {
      return armar("icloud", "peligro", "Marcado como perdido", detalle);
    }
    return armar("icloud", "info", "Estado de iCloud", detalle);
  }

  const valor = campo(object, /black|blocklist|gsma|generallist/i);
  const texto = `${valor || ""}\n${detalle}`;
  const reportado =
    (valor && (esAfirmativo(valor) || /black|stolen|lost|barred/i.test(valor))) ||
    /blacklist(?:\s+status)?\s*:\s*(blacklisted|yes|stolen)/i.test(detalle);
  const limpia =
    (valor && (esNegativo(valor) || /limpio|^no$/i.test(valor.trim())) && !/blacklisted|stolen/i.test(valor)) ||
    /(?:blacklist(?:\s+status)?|estado en la lista negra)\s*:\s*(clean|no|clear|limpio)/i.test(detalle);
  if (reportado && !limpia) return armar("blacklist", "peligro", "En lista negra", detalle);
  if (limpia && !reportado) return armar("blacklist", "ok", "Lista negra limpia", detalle);
  if (/blacklisted|stolen/i.test(texto)) return armar("blacklist", "peligro", "En lista negra", detalle);
  return armar("blacklist", "info", "Lista negra", detalle);
}
