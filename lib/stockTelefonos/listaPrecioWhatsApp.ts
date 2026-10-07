import {
  estadoPideCondicion,
  etiquetaEstado,
  normalizarEstado,
} from "@/lib/stockTelefonos/estados";

export type TipoPrecioLista = "venta" | "mayorista";

export type TelefonoListaPrecio = {
  modelo?: string;
  marca?: string;
  color?: string;
  estado?: string;
  bateria?: string | number;
  gb?: string | number;
  precioVenta?: number | string;
  precioMayorista?: number | string;
  moneda?: string;
  enServicio?: boolean;
};

export function estadosDisponiblesEnStock(
  telefonos: TelefonoListaPrecio[]
): string[] {
  const vistos = new Set<string>();
  const orden: string[] = [];
  for (const t of telefonos) {
    if (t.enServicio) continue;
    const e = normalizarEstado(String(t.estado || ""));
    if (!e || vistos.has(e)) continue;
    vistos.add(e);
    orden.push(e);
  }
  const prioridad = ["nuevo", "usado", "sellado"];
  return orden.sort((a, b) => {
    const ia = prioridad.indexOf(a);
    const ib = prioridad.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return etiquetaEstado(a).localeCompare(etiquetaEstado(b), "es");
  });
}

function formatearMonto(valor: number | string | undefined, moneda?: string): string {
  const n = Number(valor) || 0;
  if (n <= 0) return "Consultar";
  const mon = String(moneda || "USD").toUpperCase() === "ARS" ? "ARS" : "USD";
  return `${mon} $${n.toLocaleString("es-AR")}`;
}

/** Título de sección en plural y “centrado” para WhatsApp. */
function tituloEstadoCentrado(estado: string): string {
  const base = etiquetaEstado(estado).toUpperCase();
  const plural =
    base === "USADO"
      ? "USADOS"
      : base === "NUEVO"
        ? "NUEVOS"
        : base === "SELLADO"
          ? "SELLADOS"
          : base.endsWith("S")
            ? base
            : `${base}S`;
  return `——— *${plural}* ———`;
}

function lineaTelefono(
  t: TelefonoListaPrecio,
  tipoPrecio: TipoPrecioLista
): string {
  const modelo = String(t.modelo || t.marca || "Sin modelo").trim();
  const color = String(t.color || "").trim();
  const modeloColor = color ? `${modelo} ${color}` : modelo;

  const gbRaw = String(t.gb ?? "").trim();
  const gb = gbRaw
    ? /gb/i.test(gbRaw)
      ? gbRaw
      : `${gbRaw}GB`
    : "—";

  let bateria = "—";
  if (estadoPideCondicion(String(t.estado || ""))) {
    const bat = String(t.bateria ?? "").trim();
    bateria = bat ? (bat.endsWith("%") ? bat : `${bat}%`) : "—";
  }

  const precio =
    tipoPrecio === "mayorista"
      ? formatearMonto(t.precioMayorista, t.moneda)
      : formatearMonto(t.precioVenta, t.moneda);

  return `• ${modeloColor} | Bat ${bateria} | ${gb} | ${precio}`;
}

/** Texto listo para pegar en WhatsApp. */
export function armarListaPrecioWhatsApp(
  telefonos: TelefonoListaPrecio[],
  opts: {
    tipoPrecio: TipoPrecioLista;
    estados: string[];
  }
): { texto: string; cantidad: number } {
  const estadosSel = new Set(
    opts.estados.map((e) => normalizarEstado(e)).filter(Boolean)
  );
  if (estadosSel.size === 0) {
    return { texto: "", cantidad: 0 };
  }

  const bloques: string[] = [];
  let cantidad = 0;

  const estadosOrden = Array.from(estadosSel).sort((a, b) => {
    const lista = estadosDisponiblesEnStock(telefonos);
    return lista.indexOf(a) - lista.indexOf(b);
  });

  for (const estado of estadosOrden) {
    const delEstado = telefonos
      .filter(
        (t) =>
          !t.enServicio &&
          normalizarEstado(String(t.estado || "")) === estado
      )
      .sort((a, b) =>
        String(a.modelo || "").localeCompare(String(b.modelo || ""), "es", {
          numeric: true,
          sensitivity: "base",
        })
      );

    if (delEstado.length === 0) continue;

    cantidad += delEstado.length;
    // Sin “Precio venta” (se entiende). Solo aclarar si es mayorista.
    if (opts.tipoPrecio === "mayorista") {
      bloques.push(tituloEstadoCentrado(estado));
      bloques.push("_Mayorista_");
    } else {
      bloques.push(tituloEstadoCentrado(estado));
    }
    for (const t of delEstado) {
      bloques.push(lineaTelefono(t, opts.tipoPrecio));
    }
    bloques.push("");
  }

  if (cantidad === 0) {
    return { texto: "", cantidad: 0 };
  }

  const texto = bloques.join("\n").trim();

  return { texto, cantidad };
}
