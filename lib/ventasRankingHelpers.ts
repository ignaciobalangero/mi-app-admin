export type LineaVentaAgregada = {
  clave: string;
  nombre: string;
  codigo: string;
  categoria: string;
  cantidad: number;
  importeARS: number;
};

function parseFechaVenta(fecha: string): Date | null {
  const s = String(fecha ?? "").trim();
  if (!s) return null;
  if (s.includes("/")) {
    const [d, m, y] = s.split("/").map((x) => parseInt(x, 10));
    if (d && m && y) return new Date(y, m - 1, d);
  }
  const iso = new Date(s);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function fechaDeVenta(venta: {
  timestamp?: { toDate?: () => Date };
  fecha?: string;
}): Date | null {
  if (venta.timestamp && typeof venta.timestamp.toDate === "function") {
    return venta.timestamp.toDate();
  }
  return parseFechaVenta(String(venta.fecha ?? ""));
}

export function inicioSemanaActual(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d;
}

export function inicioMesActual(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export function agregarLineasVenta(
  mapa: Map<string, LineaVentaAgregada>,
  venta: { productos?: unknown[] },
  cotizacionUSD = 1200
) {
  const productos = Array.isArray(venta.productos) ? venta.productos : [];
  for (const raw of productos) {
    const p = raw as Record<string, unknown>;
    const cant = Number(p.cantidad ?? 1) || 1;
    const pu = Number(p.precioUnitario ?? 0);
    const moneda = String(p.moneda ?? "ARS").toUpperCase();
    const imp = pu * cant;
    const impARS = moneda === "USD" ? imp * cotizacionUSD : imp;

    const codigo = String(p.codigo ?? "").trim();
    const nombre = String(
      p.descripcion ?? p.producto ?? p.modelo ?? codigo ?? "Sin nombre"
    ).trim();
    const categoria = String(p.categoria ?? "").trim();
    const clave = codigo || `${nombre}|${categoria}`;

    const prev = mapa.get(clave);
    if (prev) {
      prev.cantidad += cant;
      prev.importeARS += impARS;
    } else {
      mapa.set(clave, {
        clave,
        nombre,
        codigo,
        categoria,
        cantidad: cant,
        importeARS: impARS,
      });
    }
  }
}

export function topVentasDesdeMapa(
  mapa: Map<string, LineaVentaAgregada>,
  limite = 10
): LineaVentaAgregada[] {
  return Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad).slice(0, limite);
}
