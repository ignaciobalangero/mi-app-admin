export type LineaCapitalAccesorio = {
  id: string;
  producto: string;
  cantidad: number;
  precioCosto: number;
  moneda: "ARS" | "USD";
  consignacion: boolean;
  total: number;
};

export type CapitalAccesorios = {
  ars: number;
  usd: number;
  unidades: number;
  lineas: LineaCapitalAccesorio[];
};

export function claveProveedor(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function redondear(n: number) {
  return Math.round(n * 100) / 100;
}

function numero(valor: unknown): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

const vacio = (): CapitalAccesorios => ({ ars: 0, usd: 0, unidades: 0, lineas: [] });

/** Costo por cantidad del stock de accesorios, agrupado por el nombre del proveedor. */
export function capitalAccesoriosPorProveedor(
  items: Array<{ id: string } & Record<string, unknown>>
): Map<string, CapitalAccesorios> {
  const grupos = new Map<string, CapitalAccesorios>();

  items.forEach((item) => {
    const clave = claveProveedor(String(item.proveedor || ""));
    if (!clave) return;

    const cantidad = numero(item.cantidad);
    if (cantidad <= 0) return;
    const precioCosto = numero(item.precioCosto ?? item.precioCompra);
    const moneda = String(item.moneda || "ARS").toUpperCase() === "USD" ? "USD" : "ARS";
    const total = precioCosto > 0 ? redondear(precioCosto * cantidad) : 0;
    const grupo = grupos.get(clave) || vacio();

    grupo.unidades = redondear(grupo.unidades + cantidad);
    if (moneda === "USD") grupo.usd = redondear(grupo.usd + total);
    else grupo.ars = redondear(grupo.ars + total);

    grupo.lineas.push({
      id: item.id,
      producto: String(item.producto || "Sin nombre"),
      cantidad,
      precioCosto,
      moneda,
      consignacion: item.consignacion === true || item.consignacion === "true",
      total,
    });
    grupos.set(clave, grupo);
  });

  grupos.forEach((grupo) => {
    grupo.lineas.sort((a, b) => b.total - a.total || a.producto.localeCompare(b.producto, "es"));
  });

  return grupos;
}
