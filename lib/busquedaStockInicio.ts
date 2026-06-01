import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizarBusqueda, tokensBusqueda } from "@/lib/stockPublicoBusqueda";

export type OrigenStockInicio =
  | "accesorio"
  | "repuesto"
  | "stock_extra"
  | "telefono";

export type ItemBusquedaStockInicio = {
  id: string;
  origen: OrigenStockInicio;
  labelOrigen: string;
  href: string;
  codigo: string;
  nombre: string;
  subtitulo: string;
  cantidad: number | null;
  precioTexto: string;
  textoBusqueda: string;
};

const ORIGEN_META: Record<
  OrigenStockInicio,
  { label: string; href: string }
> = {
  accesorio: {
    label: "Accesorio",
    href: "/ventas/stock-accesorios-repuestos/accesorios",
  },
  repuesto: {
    label: "Repuesto",
    href: "/ventas/stock-accesorios-repuestos/repuestos",
  },
  stock_extra: {
    label: "Stock Extra",
    href: "/integracion-sheet/stock-sheet",
  },
  telefono: {
    label: "Teléfono",
    href: "/ventas/stock-telefonos",
  },
};

function formatearPrecio(valor: number, moneda: "ARS" | "USD"): string {
  if (!valor || !Number.isFinite(valor)) return "Sin precio";
  const simbolo = moneda === "USD" ? "US$" : "$";
  return `${simbolo}${valor.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function armarItem(
  origen: OrigenStockInicio,
  id: string,
  campos: {
    codigo?: string;
    nombre: string;
    subtitulo?: string;
    cantidad?: number | null;
    precioTexto: string;
    extraBusqueda?: string[];
  }
): ItemBusquedaStockInicio {
  const meta = ORIGEN_META[origen];
  const textoBusqueda = normalizarBusqueda(
    [
      campos.codigo ?? id,
      campos.nombre,
      campos.subtitulo ?? "",
      meta.label,
      ...(campos.extraBusqueda ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return {
    id,
    origen,
    labelOrigen: meta.label,
    href: meta.href,
    codigo: campos.codigo ?? id,
    nombre: campos.nombre,
    subtitulo: campos.subtitulo ?? "",
    cantidad:
      campos.cantidad === undefined || campos.cantidad === null
        ? null
        : Number(campos.cantidad) || 0,
    precioTexto: campos.precioTexto,
    textoBusqueda,
  };
}

export async function cargarItemsBusquedaStockInicio(
  negocioID: string
): Promise<ItemBusquedaStockInicio[]> {
  const base = `negocios/${negocioID}`;

  const [accSnap, extraSnap, repSnap, telSnap] = await Promise.all([
    getDocs(collection(db, `${base}/stockAccesorios`)),
    getDocs(collection(db, `${base}/stockExtra`)),
    getDocs(collection(db, `${base}/stockRepuestos`)),
    getDocs(collection(db, `${base}/stockTelefonos`)),
  ]);

  const accesorios = accSnap.docs.map((docSnap) => {
    const data = docSnap.data();
    const moneda = data.moneda === "USD" ? "USD" : "ARS";
    const nombre = String(data.producto || data.modelo || "Accesorio");
    return armarItem("accesorio", docSnap.id, {
      codigo: data.codigo || docSnap.id,
      nombre,
      subtitulo: [data.marca, data.modelo, data.categoria, data.color]
        .filter(Boolean)
        .join(" · "),
      cantidad: data.cantidad,
      precioTexto: formatearPrecio(Number(data.precio1) || 0, moneda),
      extraBusqueda: [data.marca, data.modelo, data.categoria, data.color],
    });
  });

  const stockExtra = extraSnap.docs.map((docSnap) => {
    const data = docSnap.data();
    const precio = Number(data.precio1 || data.precioUSD) || 0;
    return armarItem("stock_extra", docSnap.id, {
      codigo: docSnap.id,
      nombre: String(data.producto || data.modelo || "Producto"),
      subtitulo: [data.marca, data.modelo, data.categoria, data.hoja]
        .filter(Boolean)
        .join(" · "),
      cantidad: data.cantidad,
      precioTexto: formatearPrecio(precio, "USD"),
      extraBusqueda: [data.marca, data.modelo, data.categoria, data.hoja],
    });
  });

  const repuestos = repSnap.docs.map((docSnap) => {
    const data = docSnap.data();
    const moneda = data.moneda === "USD" ? "USD" : "ARS";
    return armarItem("repuesto", docSnap.id, {
      codigo: data.codigo || docSnap.id,
      nombre: String(data.producto || data.modelo || "Repuesto"),
      subtitulo: [data.marca, data.modelo, data.categoria, data.proveedor]
        .filter(Boolean)
        .join(" · "),
      cantidad: data.cantidad,
      precioTexto: formatearPrecio(Number(data.precio1) || 0, moneda),
      extraBusqueda: [
        data.marca,
        data.modelo,
        data.categoria,
        data.proveedor,
        data.observacion,
      ],
    });
  });

  const telefonos = telSnap.docs.map((docSnap) => {
    const data = docSnap.data();
    const moneda = data.moneda === "USD" ? "USD" : "ARS";
    const nombre = [data.marca, data.modelo].filter(Boolean).join(" ") || "Teléfono";
    return armarItem("telefono", docSnap.id, {
      codigo: data.imei || docSnap.id,
      nombre,
      subtitulo: [data.color, data.estado, data.imei].filter(Boolean).join(" · "),
      cantidad: 1,
      precioTexto: formatearPrecio(Number(data.precioVenta) || 0, moneda),
      extraBusqueda: [data.color, data.estado, data.imei, data.observaciones],
    });
  });

  return [...accesorios, ...stockExtra, ...repuestos, ...telefonos];
}

export function filtrarItemsBusquedaStockInicio(
  items: ItemBusquedaStockInicio[],
  query: string,
  limite = 20
): ItemBusquedaStockInicio[] {
  const tokens = tokensBusqueda(query);
  if (tokens.length === 0) return [];

  return items
    .filter((item) => tokens.every((tok) => item.textoBusqueda.includes(tok)))
    .slice(0, limite);
}

export function badgeOrigenClass(origen: OrigenStockInicio): string {
  switch (origen) {
    case "accesorio":
      return "bg-[#ebf3fd] text-[#2980b9] border-[#3498db]/30";
    case "repuesto":
      return "bg-[#d5f4e6] text-[#229954] border-[#27ae60]/30";
    case "stock_extra":
      return "bg-[#f4ecf7] text-[#7d3c98] border-[#9b59b6]/30";
    case "telefono":
      return "bg-[#fdebd0] text-[#d35400] border-[#e67e22]/30";
  }
}
