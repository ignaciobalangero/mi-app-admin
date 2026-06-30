/** Filas del diseñador: izquierda + derecha (misma lógica que VistaPreviaEtiqueta). */
export const FILAS_ETIQUETA_TRABAJO: ReadonlyArray<[string, string]> = [
  ["numeroOrden", "cliente"],
  ["modelo", "clave"],
  ["trabajo", "imei"],
  ["accesorios", "anticipo"],
  ["obs", "saldo"],
];

export const LABELS_ETIQUETA_TRABAJO: Record<string, string> = {
  numeroOrden: "Código",
  cliente: "Cliente",
  modelo: "Modelo",
  clave: "Clave",
  trabajo: "Trabajo",
  imei: "IMEI",
  accesorios: "Acces",
  anticipo: "Anticipo",
  obs: "Obs",
  saldo: "Saldo",
};

function formatearMonedaEtiqueta(valor: unknown): string {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "0";
  return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function valorCampoEtiquetaTrabajo(
  campoId: string,
  datos: Record<string, unknown>
): string {
  switch (campoId) {
    case "numeroOrden":
      return String(datos.id ?? datos.numeroOrden ?? "").trim();
    case "cliente":
      return String(datos.cliente ?? "").trim();
    case "modelo":
      return String(datos.modelo ?? "").trim();
    case "clave":
      return String(datos.clave ?? "").trim();
    case "trabajo":
      return String(datos.trabajo ?? "").trim();
    case "imei":
      return String(datos.imei ?? "").trim();
    case "accesorios":
      return String(datos.accesorios ?? "").trim();
    case "anticipo": {
      const n = Number(datos.anticipo ?? 0);
      return n > 0 ? `$${formatearMonedaEtiqueta(n)}` : "";
    }
    case "obs":
      return String(datos.observaciones ?? datos.obs ?? "").trim();
    case "saldo": {
      const n = Number(datos.saldo ?? 0);
      return n > 0 ? `$${formatearMonedaEtiqueta(n)}` : "";
    }
    default:
      return "";
  }
}

export type CampoEtiquetaRender = {
  id: string;
  label: string;
  valor: string;
  mono?: boolean;
};

export function columnasEtiquetaTrabajo(
  camposSeleccionados: string[],
  datos: Record<string, unknown>
): { columnaIzq: CampoEtiquetaRender[]; columnaDer: CampoEtiquetaRender[] } {
  const columnaIzq: CampoEtiquetaRender[] = [];
  const columnaDer: CampoEtiquetaRender[] = [];
  const set = new Set(camposSeleccionados);

  for (const [idIzq, idDer] of FILAS_ETIQUETA_TRABAJO) {
    if (set.has(idIzq)) {
      columnaIzq.push({
        id: idIzq,
        label: LABELS_ETIQUETA_TRABAJO[idIzq] ?? idIzq,
        valor: valorCampoEtiquetaTrabajo(idIzq, datos),
        mono: idIzq === "imei",
      });
    }
    if (set.has(idDer)) {
      columnaDer.push({
        id: idDer,
        label: LABELS_ETIQUETA_TRABAJO[idDer] ?? idDer,
        valor: valorCampoEtiquetaTrabajo(idDer, datos),
        mono: idDer === "imei",
      });
    }
  }

  return { columnaIzq, columnaDer };
}

export const CAMPOS_ETIQUETA_TRABAJO_DEFAULT = [
  "cliente",
  "modelo",
  "clave",
  "trabajo",
];
