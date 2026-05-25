import { db } from "@/lib/firebaseAdmin";
import { asegurarRaizTienda } from "@/lib/tiendaAuthServer";
import { docRaizTienda } from "@/lib/tiendaFirestorePaths";
import {
  DEFAULT_TIENDA_WEB_CHECKOUT,
  parseTiendaWebCheckout,
  type TiendaWebCheckoutConfig,
} from "@/lib/tiendaWebConfigTypes";

export async function cargarCheckoutConfigTienda(negocioId: string): Promise<TiendaWebCheckoutConfig> {
  const ref = db.doc(docRaizTienda(negocioId));
  const snap = await ref.get();
  if (!snap.exists) return { ...DEFAULT_TIENDA_WEB_CHECKOUT };
  const data = snap.data();
  return parseTiendaWebCheckout(data?.checkoutConfig);
}

export async function guardarCheckoutConfigTienda(
  negocioId: string,
  config: TiendaWebCheckoutConfig
): Promise<void> {
  await asegurarRaizTienda(negocioId);
  const ref = db.doc(docRaizTienda(negocioId));
  const checkoutConfig = {
    transportistas: config.transportistas,
    valoresDeclarados: config.valoresDeclarados,
    metodosPago: config.metodosPago.map((m) => {
      const item: Record<string, unknown> = {
        id: m.id,
        label: m.label,
        activo: m.activo,
        recargoPct: m.recargoPct,
      };
      if (m.hint?.trim()) item.hint = m.hint.trim();
      return item;
    }),
    transferencia: config.transferencia,
    actualizadoEn: new Date().toISOString(),
  };
  await ref.set({ checkoutConfig }, { merge: true });
}
