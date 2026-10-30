export type MonedaPreventa = "ARS" | "USD";

export type DestinoStockPreventa = "stockExtra" | "stockAccesorios" | "stockRepuestos";

export type EstadoPreventa = "abierta" | "cancelada" | "migrada";

export type ProductoPreventa = {
  id: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  precioCosto: number;
  moneda: MonedaPreventa;
  destinoStock: DestinoStockPreventa;
  /** Ya estaba en accesorios o repuestos. No se vuelve a crear al stockear. */
  desdeStock: boolean;
  stockeado: boolean;
  stockDocId?: string;
  codigo?: string;
};

export type Preventa = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  estado: EstadoPreventa;
  productos: ProductoPreventa[];
  sena: number;
  senaMoneda: MonedaPreventa;
  notas: string;
  creadoEn: number;
  actualizadoEn: number;
};

export const STORAGE_PREVENTA_VENTA = "preventaParaVenta";

export function productoParaGuardar(p: ProductoPreventa) {
  return {
    id: p.id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    precioUnitario: p.precioUnitario,
    precioCosto: Math.round(Math.max(0, Number(p.precioCosto) || 0) * 100) / 100,
    moneda: p.moneda,
    destinoStock: p.destinoStock,
    desdeStock: p.desdeStock === true,
    stockeado: p.stockeado === true,
    ...(p.stockDocId ? { stockDocId: p.stockDocId } : {}),
    ...(p.codigo ? { codigo: p.codigo } : {}),
  };
}

export function nuevaLineaId(): string {
  return `pre-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function monedaDe(valor: unknown): MonedaPreventa {
  return String(valor || "ARS").toUpperCase() === "USD" ? "USD" : "ARS";
}

export function destinoDe(valor: unknown): DestinoStockPreventa {
  if (valor === "stockAccesorios" || valor === "stockRepuestos") return valor;
  return "stockExtra";
}

export function etiquetaDestino(destino: DestinoStockPreventa): string {
  if (destino === "stockAccesorios") return "Accesorios";
  if (destino === "stockRepuestos") return "Repuestos";
  return "Stock general";
}

export function textoMoneda(moneda: MonedaPreventa, monto: number): string {
  const n = Math.abs(monto).toLocaleString("es-AR", {
    minimumFractionDigits: monto % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const signo = monto < 0 ? "−" : "";
  return moneda === "USD" ? `${signo}USD $${n}` : `${signo}$${n}`;
}

export function totalesPreventa(productos: ProductoPreventa[]): { ars: number; usd: number } {
  return productos.reduce(
    (acc, p) => {
      const linea = Math.round((Number(p.precioUnitario) || 0) * (Number(p.cantidad) || 0) * 100) / 100;
      if (p.moneda === "USD") acc.usd = Math.round((acc.usd + linea) * 100) / 100;
      else acc.ars = Math.round((acc.ars + linea) * 100) / 100;
      return acc;
    },
    { ars: 0, usd: 0 }
  );
}

export function saldosPreventa(
  productos: ProductoPreventa[],
  sena: number,
  senaMoneda: MonedaPreventa
): { ars: number; usd: number } {
  const tot = totalesPreventa(productos);
  const seña = Math.max(0, Number(sena) || 0);
  return {
    ars: Math.round((tot.ars - (senaMoneda === "ARS" ? seña : 0)) * 100) / 100,
    usd: Math.round((tot.usd - (senaMoneda === "USD" ? seña : 0)) * 100) / 100,
  };
}

/** Ganancia de la línea en su moneda. Sin costo cargado no se inventa. */
export function gananciaLinea(p: ProductoPreventa): number | null {
  if (!(Number(p.precioCosto) > 0)) return null;
  const cant = Number(p.cantidad) || 0;
  return Math.round((Number(p.precioUnitario) - Number(p.precioCosto)) * cant * 100) / 100;
}

export function gananciasPreventa(productos: ProductoPreventa[]): { ars: number; usd: number } {
  return productos.reduce(
    (acc, p) => {
      const g = gananciaLinea(p);
      if (g == null) return acc;
      if (p.moneda === "USD") acc.usd = Math.round((acc.usd + g) * 100) / 100;
      else acc.ars = Math.round((acc.ars + g) * 100) / 100;
      return acc;
    },
    { ars: 0, usd: 0 }
  );
}

export function textoSaldo(monto: number, moneda: MonedaPreventa): string {
  if (monto < 0) return `A favor ${textoMoneda(moneda, Math.abs(monto))}`;
  if (monto === 0) return "Cubierto";
  return textoMoneda(moneda, monto);
}

export function etiquetaEstado(preventa: Pick<Preventa, "estado" | "productos">): string {
  if (preventa.estado === "cancelada") return "Cancelada";
  if (preventa.estado === "migrada") return "Pasada a venta";
  const aIngresar = preventa.productos.filter((p) => !p.desdeStock);
  const ingresados = aIngresar.filter((p) => p.stockeado).length;
  if (aIngresar.length > 0 && ingresados === aIngresar.length) return "Ingresada";
  if (ingresados > 0) return "Ingreso parcial";
  return "Reservada";
}

export function normalizarProducto(raw: unknown): ProductoPreventa | null {
  if (!raw || typeof raw !== "object") return null;
  const fila = raw as Record<string, unknown>;
  const nombre = String(fila.nombre || fila.producto || "").trim().slice(0, 120);
  const cantidad = Math.max(0, Math.round(Number(fila.cantidad) || 0));
  const precioUnitario = Math.round(Math.max(0, Number(fila.precioUnitario) || 0) * 100) / 100;
  const precioCosto = Math.round(Math.max(0, Number(fila.precioCosto) || 0) * 100) / 100;
  if (!nombre || cantidad < 1 || !(precioUnitario > 0)) return null;
  return {
    id: String(fila.id || nuevaLineaId()).slice(0, 40),
    nombre,
    cantidad,
    precioUnitario,
    precioCosto,
    moneda: monedaDe(fila.moneda),
    destinoStock: destinoDe(fila.destinoStock),
    desdeStock: fila.desdeStock === true,
    stockeado: fila.stockeado === true,
    stockDocId: String(fila.stockDocId || "").trim() || undefined,
    codigo: String(fila.codigo || "").trim() || undefined,
  };
}

export function normalizarPreventa(id: string, raw: Record<string, unknown>): Preventa | null {
  const clienteNombre = String(raw.clienteNombre || "").trim();
  const clienteId = String(raw.clienteId || "").trim();
  if (!clienteNombre || !clienteId) return null;
  const productos = (Array.isArray(raw.productos) ? raw.productos : [])
    .map(normalizarProducto)
    .filter((p): p is ProductoPreventa => p !== null);
  const estadoRaw = String(raw.estado || "abierta");
  const estado: EstadoPreventa =
    estadoRaw === "cancelada" || estadoRaw === "migrada" ? estadoRaw : "abierta";
  return {
    id,
    clienteId,
    clienteNombre,
    estado,
    productos,
    sena: Math.round(Math.max(0, Number(raw.sena) || 0) * 100) / 100,
    senaMoneda: monedaDe(raw.senaMoneda),
    notas: String(raw.notas || "").trim().slice(0, 500),
    creadoEn: Number(raw.creadoEn) || 0,
    actualizadoEn: Number(raw.actualizadoEn) || 0,
  };
}

export function productoParaVenta(p: ProductoPreventa): Record<string, unknown> {
  const base = {
    producto: p.nombre,
    modelo: p.nombre,
    marca: "",
    color: "",
    cantidad: p.cantidad,
    precioUnitario: p.precioUnitario,
    precioCosto: p.precioCosto || 0,
    moneda: p.moneda,
    precioARS: p.moneda === "ARS" ? p.precioUnitario : null,
    precioUSD: p.moneda === "USD" ? p.precioUnitario : null,
  };
  if (!(p.desdeStock || p.stockeado) || !p.stockDocId) {
    return {
      ...base,
      id: p.id,
      tipo: "libre",
      sinStock: true,
      origenStock: "manual",
      categoria: "Sin stock",
      codigo: "",
    };
  }
  const tipo =
    p.destinoStock === "stockAccesorios"
      ? "accesorio"
      : p.destinoStock === "stockRepuestos"
        ? "repuesto"
        : "general";
  return {
    ...base,
    id: p.stockDocId,
    stockDocId: p.stockDocId,
    codigo: p.codigo || p.stockDocId,
    tipo,
    origenStock: p.destinoStock,
    categoria: tipo === "accesorio" ? "Accesorio" : tipo === "repuesto" ? "Repuesto" : "General",
    sinStock: false,
  };
}

export function pagoDesdeSena(sena: number, moneda: MonedaPreventa) {
  const monto = Math.round(Math.max(0, sena) * 100) / 100;
  if (!(monto > 0)) return null;
  return {
    monto: moneda === "ARS" ? String(monto) : "",
    montoUSD: moneda === "USD" ? String(monto) : "",
    moneda,
    formaPago: "Seña",
    destino: "",
    observaciones: "Seña de preventa",
    lineas: [{ moneda, monto, formaPago: "Seña" }],
  };
}
