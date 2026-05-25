import type { LineaPedidoTienda, PedidoTienda } from "@/lib/tiendaClienteTypes";
import { labelMetodoPago } from "@/lib/tiendaCheckoutOpciones";

export type ProductoVentaDesdePedido = {
  categoria: string;
  producto: string;
  descripcion?: string;
  marca: string;
  modelo: string;
  color: string;
  cantidad: number;
  precioUnitario: number;
  precioARS: number | null;
  precioUSD: number | null;
  moneda: "ARS" | "USD";
  codigo: string;
  tipo: "accesorio" | "repuesto" | "general";
  /** Firestore doc id en stockRepuestos / stockAccesorios / stockExtra */
  id?: string;
  origenStock?: string;
};

export function observacionesDesdePedido(p: PedidoTienda): string {
  const lineas: string[] = [`Pedido tienda web #${p.numero}`];
  lineas.push(`Cliente: ${p.cliente.nombre} · ${p.cliente.email} · ${p.cliente.telefono}`);
  if (p.cliente.dniCuit) lineas.push(`DNI/CUIT: ${p.cliente.dniCuit}`);

  if (p.envio.tipo === "retiro_deposito") {
    lineas.push("Retiro en depósito");
  } else {
    lineas.push(`Envío: ${p.envio.transportista ?? "—"}`);
    if (p.envio.valorDeclaradoPct != null) {
      lineas.push(
        `Valor declarado: ${p.envio.valorDeclaradoPct}% ($${(p.envio.valorDeclaradoARS ?? 0).toLocaleString("es-AR")})`
      );
    }
    const d = p.envio.direccion;
    if (d) {
      lineas.push(
        `Dirección: ${d.calle} ${d.numero}${d.pisoDepto ? ` ${d.pisoDepto}` : ""}, ${d.localidad}, ${d.provincia} CP ${d.codigoPostal}`
      );
      lineas.push(`Recibe: ${d.nombreRecepcion} · ${d.telefono}`);
    }
  }

  lineas.push(
    `Pago tienda: ${labelMetodoPago(p.pago.metodo)} · Total ref $${p.totalRefARS.toLocaleString("es-AR")} · Cobrar $${p.pago.totalConRecargoARS.toLocaleString("es-AR")}`
  );
  return lineas.join("\n");
}

export function lineaPedidoAProductoVenta(
  linea: LineaPedidoTienda,
  stock?: {
    id?: string;
    categoria?: string;
    tipo?: "accesorio" | "repuesto" | "general";
    producto?: string;
    marca?: string;
    modelo?: string;
    color?: string;
  } | null
): ProductoVentaDesdePedido {
  const precioUnitario =
    linea.cantidad > 0 ? Math.round(linea.subtotalRefARS / linea.cantidad) : linea.precioRefARS;

  return {
    categoria: stock?.categoria || "Repuesto",
    producto: stock?.producto || linea.producto,
    descripcion: linea.producto,
    marca: stock?.marca || linea.marca || "—",
    modelo: stock?.modelo || "—",
    color: stock?.color || "—",
    cantidad: linea.cantidad,
    precioUnitario,
    precioARS: precioUnitario,
    precioUSD: null,
    moneda: "ARS",
    codigo: linea.codigo,
    tipo: stock?.tipo || "repuesto",
    id: stock?.id,
    origenStock:
      stock?.tipo === "accesorio"
        ? "stockAccesorios"
        : stock?.tipo === "general"
          ? "stockExtra"
          : "stockRepuestos",
  };
}

export function pagoInicialDesdePedido(p: PedidoTienda) {
  const forma =
    p.pago.metodo === "transferencia" ? "Transferencia" : "Modo / QR / Tarjeta";
  return {
    monto: String(p.pago.totalConRecargoARS),
    montoUSD: "",
    moneda: "ARS" as const,
    formaPago: forma,
    destino: "",
    observaciones: `Pedido tienda #${p.numero}`,
  };
}
