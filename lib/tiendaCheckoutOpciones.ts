import type { MetodoPagoTienda, TransportistaTienda } from "@/lib/tiendaClienteTypes";

export const TRANSPORTISTAS: {
  id: TransportistaTienda;
  label: string;
}[] = [
  { id: "andreani", label: "Andreani" },
  { id: "oca", label: "OCA" },
  { id: "credifin", label: "Credifin" },
  { id: "sendbox", label: "Sendbox" },
  { id: "interprovincial", label: "Transporte Interprovincial" },
  { id: "jetpaq", label: "JetPaq" },
];

export const VALORES_DECLARADOS = [10, 50, 100] as const;

export const METODOS_PAGO: {
  id: MetodoPagoTienda;
  label: string;
  recargoPct: number;
  hint?: string;
}[] = [
  {
    id: "transferencia",
    label: "Transferencia Bancaria",
    recargoPct: 0,
    hint:
      "Al realizar el pedido recibirás los datos bancarios. Tenés 24 hs hábiles para abonar.",
  },
  {
    id: "modo_qr",
    label: "Modo / QR",
    recargoPct: 15,
  },
];

export function recargoMetodoPago(metodo: MetodoPagoTienda): number {
  return METODOS_PAGO.find((m) => m.id === metodo)?.recargoPct ?? 0;
}

export function labelTransportista(id: TransportistaTienda | null | undefined): string {
  if (!id) return "—";
  return TRANSPORTISTAS.find((t) => t.id === id)?.label ?? id;
}

export function labelMetodoPago(id: MetodoPagoTienda): string {
  return METODOS_PAGO.find((m) => m.id === id)?.label ?? id;
}

export function calcularTotalConRecargo(totalRef: number, metodo: MetodoPagoTienda): number {
  const pct = recargoMetodoPago(metodo);
  return Math.round(totalRef * (1 + pct / 100));
}

export function calcularValorDeclarado(totalRef: number, pct: number): number {
  return Math.round(totalRef * (pct / 100));
}

export function generarIdDireccion(): string {
  return `dir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generarNumeroPedido(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}
