/** Parámetros disponibles para plantillas de Meta (orden en el array = {{1}}, {{2}}, …). */
export type ParametroPlantillaWhatsapp =
  | "cliente"
  | "modelo"
  | "estado"
  | "orden"
  | "trabajo";

export type PlantillaWhatsappConfig = {
  templateName: string;
  languageCode: string;
  parametros: ParametroPlantillaWhatsapp[];
};

export type EstadosNotificarWhatsapp = {
  "PENDIENTE ACEPTACION"?: boolean;
  PENDIENTE?: boolean;
  REPARADO?: boolean;
  ENTREGADO?: boolean;
  PAGADO?: boolean;
};

export type WhatsappBusinessConfig = {
  activo: boolean;
  phoneNumberId: string;
  /** Token permanente de Meta (también puede usarse WHATSAPP_ACCESS_TOKEN en env del servidor). */
  accessToken: string;
  estadosNotificar: EstadosNotificarWhatsapp;
  plantilla: PlantillaWhatsappConfig;
  nombreNegocio?: string;
};

export const ESTADOS_TRABAJO_WHATSAPP = [
  "PENDIENTE ACEPTACION",
  "PENDIENTE",
  "REPARADO",
  "ENTREGADO",
  "PAGADO",
] as const;

export const CONFIG_WHATSAPP_DEFAULT: WhatsappBusinessConfig = {
  activo: false,
  phoneNumberId: "",
  accessToken: "",
  estadosNotificar: {
    REPARADO: true,
    ENTREGADO: true,
  },
  plantilla: {
    templateName: "gestione_estado_trabajo",
    languageCode: "es_AR",
    parametros: ["cliente", "modelo", "orden", "estado"],
  },
};

export type PayloadNotificarEstadoTrabajo = {
  negocioID: string;
  trabajoId: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  estadoAnterior: string;
  nuevoEstado: string;
  ordenId?: string;
};
