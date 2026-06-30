/** Helpers para venta de teléfonos: varios equipos vendidos y en parte de pago. */

export type TelefonoComoPagoItem = {
  marca?: string;
  modelo?: string;
  valorPago: number;
  moneda: string;
  color?: string;
  estado?: string;
  imei?: string;
  observaciones?: string;
};

export type VentaTelefonoPendienteMulti = {
  telefonos: Record<string, unknown>[];
  telefonosRecibidos?: Record<string, unknown>[];
  cliente?: string;
};

export function esVentaTelefonoPendienteMulti(
  data: unknown
): data is VentaTelefonoPendienteMulti {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as VentaTelefonoPendienteMulti).telefonos)
  );
}

export function normalizarVentaTelefonoPendiente(data: unknown): {
  telefonos: Record<string, unknown>[];
  telefonosRecibidos: Record<string, unknown>[];
} {
  if (esVentaTelefonoPendienteMulti(data)) {
    return {
      telefonos: data.telefonos,
      telefonosRecibidos: data.telefonosRecibidos ?? [],
    };
  }
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    return {
      telefonos: [d],
      telefonosRecibidos: d.telefonoRecibido
        ? [d.telefonoRecibido as Record<string, unknown>]
        : [],
    };
  }
  return { telefonos: [], telefonosRecibidos: [] };
}

export function datosStockAPagoItem(
  datos: Record<string, unknown>
): TelefonoComoPagoItem {
  return {
    marca: String(datos.marca ?? ""),
    modelo: String(datos.modelo ?? ""),
    valorPago: Number(datos.precioCompra ?? datos.precioEstimado ?? datos.valorPago ?? 0),
    moneda: String(datos.moneda ?? "ARS"),
    color: String(datos.color ?? ""),
    estado: String(datos.estado ?? ""),
    imei: String(datos.imei ?? ""),
    observaciones:
      String(datos.observaciones ?? "").trim() ||
      `Teléfono recibido: ${datos.marca ?? ""} ${datos.modelo ?? ""}`.trim(),
  };
}

export function telefonoDraftAProducto(telefono: Record<string, unknown>) {
  const moneda = String(telefono.moneda ?? "USD");
  const precioVenta = Number(telefono.precioVenta ?? 0);
  return {
    categoria: "Teléfono",
    producto: `${telefono.marca ?? ""} ${telefono.modelo ?? ""}`.trim(),
    descripcion: telefono.estado,
    marca: telefono.marca || "—",
    modelo: telefono.modelo,
    color: telefono.color || "—",
    cantidad: 1,
    precioUnitario: precioVenta,
    precioARS: moneda === "ARS" ? precioVenta : null,
    precioUSD: moneda === "USD" ? precioVenta : null,
    moneda,
    codigo: telefono.stockID || telefono.modelo,
    tipo: "telefono",
    gb: telefono.gb || "",
    datosTelefonoCompletos: telefono,
  };
}

export function parsearTelefonosComoPagoLS(): TelefonoComoPagoItem[] {
  if (typeof window === "undefined") return [];
  const multi = localStorage.getItem("telefonosComoPago");
  if (multi) {
    try {
      const parsed = JSON.parse(multi);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  const single = localStorage.getItem("telefonoComoPago");
  if (single) {
    try {
      return [JSON.parse(single)];
    } catch {
      return [];
    }
  }
  return [];
}

export function totalesTelefonosVenta(telefonos: Record<string, unknown>[]) {
  let totalARS = 0;
  let totalUSD = 0;
  for (const t of telefonos) {
    const precio = Number(t.precioVenta ?? 0);
    const moneda = String(t.moneda ?? "USD").toUpperCase();
    if (moneda === "USD") totalUSD += precio;
    else totalARS += precio;
  }
  return { totalARS, totalUSD };
}
