import { claveProveedor } from "@/lib/proveedores/capitalAccesorios";

export const ORIGEN_DEUDA_CONSIGNACION = "consignacion-venta";

export type ProveedorAgenda = { id: string; nombre: string };

export type DeudaConsignacion = {
  proveedorNombre: string;
  proveedorClave: string;
  producto: string;
  cantidad: number;
  precio: number;
  moneda: "ARS" | "USD";
  total: number;
};

export type DeudaGuardada = {
  id: string;
  origen?: string;
  stockColeccion?: string;
  stockDocId: string;
  cantidadUnidades: number;
  precio: number;
  producto: string;
  fechaCreacion: string;
};

export type LineaCompra = {
  id: string;
  producto: string;
  cantidad: number;
  precio: number;
  total: number;
};

export type PlanReversion = {
  borrar: string[];
  actualizar: Array<{
    id: string;
    cantidadUnidades: number;
    montoTotal: number;
    productos: LineaCompra[];
  }>;
};

function redondear(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function esConsignacion(valor: unknown): boolean {
  return valor === true || valor === "true";
}

/** Costo de lo que salió de un stock en consignación. Null si no hay que deberle al proveedor. */
export function deudaSiConsignacion(
  data: Record<string, unknown>,
  cantidadDescontada: number
): DeudaConsignacion | null {
  if (!esConsignacion(data.consignacion)) return null;
  const proveedorNombre = String(data.proveedor || "").trim();
  const proveedorClave = claveProveedor(proveedorNombre);
  if (!proveedorClave) return null;
  const cantidad = redondear(Math.max(0, Number(cantidadDescontada) || 0));
  if (cantidad <= 0) return null;
  const precio = redondear(Number(data.precioCosto ?? data.precioCompra) || 0);
  if (precio <= 0) return null;
  const moneda = String(data.moneda || "ARS").toUpperCase() === "USD" ? "USD" : "ARS";
  const producto = String(data.producto || data.modelo || data.nombre || "Consignación").trim() || "Consignación";
  return {
    proveedorNombre,
    proveedorClave,
    producto,
    cantidad,
    precio,
    moneda,
    total: redondear(precio * cantidad),
  };
}

export function buscarProveedor(lista: ProveedorAgenda[], nombre: string): ProveedorAgenda | null {
  const clave = claveProveedor(nombre);
  if (!clave) return null;
  return lista.find((item) => claveProveedor(item.nombre) === clave) || null;
}

export function documentoCompraConsignacion(opts: {
  deuda: DeudaConsignacion;
  proveedorId: string;
  coleccion: string;
  stockDocId: string;
  ahora?: Date;
}): Record<string, unknown> {
  const ahora = opts.ahora ?? new Date();
  const fecha = ahora.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  const { deuda } = opts;
  return {
    proveedorId: opts.proveedorId,
    proveedorNombre: deuda.proveedorNombre,
    proveedorClave: deuda.proveedorClave,
    fecha,
    numeroRemito: "Consignación",
    numeroPedido: "",
    productos: [
      {
        id: opts.stockDocId,
        producto: deuda.producto,
        cantidad: deuda.cantidad,
        precio: deuda.precio,
        total: deuda.total,
      },
    ],
    montoTotal: deuda.total,
    moneda: deuda.moneda,
    estado: "pendiente",
    notas: "Se vendió mercadería en consignación y se descontó del stock.",
    fechaCreacion: ahora.toISOString(),
    origen: ORIGEN_DEUDA_CONSIGNACION,
    stockDocId: opts.stockDocId,
    stockColeccion: opts.coleccion,
    cantidadUnidades: deuda.cantidad,
  };
}

/** Saca unidades de las deudas más nuevas de esa ficha. Lo que vuelve al stock deja de deberse. */
export function planRevertir(deudas: DeudaGuardada[], coleccion: string, cantidad: number): PlanReversion {
  let resto = redondear(Math.max(0, cantidad));
  const propias = deudas
    .filter(
      (deuda) =>
        deuda.origen === ORIGEN_DEUDA_CONSIGNACION &&
        deuda.stockColeccion === coleccion &&
        deuda.cantidadUnidades > 0
    )
    .sort((a, b) => {
      if (a.fechaCreacion === b.fechaCreacion) return b.id.localeCompare(a.id);
      return a.fechaCreacion < b.fechaCreacion ? 1 : -1;
    });

  const borrar: string[] = [];
  const actualizar: PlanReversion["actualizar"] = [];
  for (const deuda of propias) {
    if (resto <= 0) break;
    const quitar = Math.min(resto, deuda.cantidadUnidades);
    const queda = redondear(deuda.cantidadUnidades - quitar);
    if (queda <= 0) {
      borrar.push(deuda.id);
    } else {
      const total = redondear(deuda.precio * queda);
      actualizar.push({
        id: deuda.id,
        cantidadUnidades: queda,
        montoTotal: total,
        productos: [
          {
            id: deuda.stockDocId,
            producto: deuda.producto,
            cantidad: queda,
            precio: deuda.precio,
            total,
          },
        ],
      });
    }
    resto = redondear(resto - quitar);
  }
  return { borrar, actualizar };
}
