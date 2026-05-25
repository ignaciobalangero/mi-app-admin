import type { MetodoPagoTienda } from "@/lib/tiendaClienteTypes";
import {
  METODOS_PAGO,
  TRANSPORTISTAS,
  VALORES_DECLARADOS,
} from "@/lib/tiendaCheckoutOpciones";

export type TransportistaConfig = {
  id: string;
  label: string;
  activo: boolean;
};

export type MetodoPagoConfig = {
  id: MetodoPagoTienda;
  label: string;
  activo: boolean;
  recargoPct: number;
  hint?: string;
};

export type DatosTransferenciaConfig = {
  cbu: string;
  alias: string;
  titular: string;
  banco: string;
  instrucciones: string;
};

export type TiendaWebCheckoutConfig = {
  transportistas: TransportistaConfig[];
  valoresDeclarados: number[];
  metodosPago: MetodoPagoConfig[];
  transferencia: DatosTransferenciaConfig;
  actualizadoEn: string;
};

export const DEFAULT_TRANSFERENCIA: DatosTransferenciaConfig = {
  cbu: "",
  alias: "",
  titular: "",
  banco: "",
  instrucciones:
    "Al realizar el pedido recibirás estos datos. Tenés 24 hs hábiles para abonar.",
};

export const DEFAULT_TIENDA_WEB_CHECKOUT: TiendaWebCheckoutConfig = {
  transportistas: TRANSPORTISTAS.map((t) => ({ ...t, activo: true })),
  valoresDeclarados: [...VALORES_DECLARADOS],
  metodosPago: METODOS_PAGO.map((m) => ({
    id: m.id,
    label: m.label,
    activo: true,
    recargoPct: m.recargoPct,
    hint: m.hint,
  })),
  transferencia: { ...DEFAULT_TRANSFERENCIA },
  actualizadoEn: "",
};

function slugTransportista(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function nuevoTransportistaConfig(label: string): TransportistaConfig {
  const base = slugTransportista(label) || `transporte_${Date.now()}`;
  return { id: base, label: label.trim(), activo: true };
}

export function parseTiendaWebCheckout(raw: unknown): TiendaWebCheckoutConfig {
  const base = { ...DEFAULT_TIENDA_WEB_CHECKOUT };
  if (!raw || typeof raw !== "object") return base;
  const c = raw as Record<string, unknown>;

  if (Array.isArray(c.transportistas) && c.transportistas.length > 0) {
    base.transportistas = c.transportistas
      .map((t) => {
        if (!t || typeof t !== "object") return null;
        const o = t as Record<string, unknown>;
        const id = String(o.id ?? "").trim();
        const label = String(o.label ?? "").trim();
        if (!id || !label) return null;
        return { id, label, activo: o.activo !== false };
      })
      .filter((x): x is TransportistaConfig => x !== null);
  }

  if (Array.isArray(c.valoresDeclarados) && c.valoresDeclarados.length > 0) {
    const vals = c.valoresDeclarados
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);
    if (vals.length > 0) base.valoresDeclarados = vals;
  }

  if (Array.isArray(c.metodosPago) && c.metodosPago.length > 0) {
    const parsedMetodos: MetodoPagoConfig[] = [];
    for (const m of c.metodosPago) {
      if (!m || typeof m !== "object") continue;
      const o = m as Record<string, unknown>;
      const id: MetodoPagoTienda = o.id === "modo_qr" ? "modo_qr" : "transferencia";
      const def = DEFAULT_TIENDA_WEB_CHECKOUT.metodosPago.find((x) => x.id === id);
      parsedMetodos.push({
        id,
        label: String(o.label ?? def?.label ?? id).trim(),
        activo: o.activo !== false,
        recargoPct: Math.max(0, Number(o.recargoPct ?? def?.recargoPct ?? 0)),
        hint: String(o.hint ?? def?.hint ?? "").trim() || undefined,
      });
    }
    if (parsedMetodos.length > 0) base.metodosPago = parsedMetodos;
  }

  if (c.transferencia && typeof c.transferencia === "object") {
    const t = c.transferencia as Record<string, unknown>;
    base.transferencia = {
      cbu: String(t.cbu ?? "").trim(),
      alias: String(t.alias ?? "").trim(),
      titular: String(t.titular ?? "").trim(),
      banco: String(t.banco ?? "").trim(),
      instrucciones: String(t.instrucciones ?? DEFAULT_TRANSFERENCIA.instrucciones).trim(),
    };
  }

  base.actualizadoEn = String(c.actualizadoEn ?? "").trim();
  return base;
}

export function transportistasActivos(config: TiendaWebCheckoutConfig): TransportistaConfig[] {
  return config.transportistas.filter((t) => t.activo);
}

export function metodosPagoActivos(config: TiendaWebCheckoutConfig): MetodoPagoConfig[] {
  return config.metodosPago.filter((m) => m.activo);
}

export function labelTransportistaConfig(
  config: TiendaWebCheckoutConfig,
  id: string | null | undefined
): string {
  if (!id) return "—";
  return config.transportistas.find((t) => t.id === id)?.label ?? id;
}

export function recargoMetodoConfig(
  config: TiendaWebCheckoutConfig,
  metodo: MetodoPagoTienda
): number {
  return config.metodosPago.find((m) => m.id === metodo)?.recargoPct ?? 0;
}
