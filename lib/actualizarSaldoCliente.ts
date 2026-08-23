import {
  collection,
  deleteDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  normalizeMonedaCuenta,
  totalesVentasPorMoneda,
} from "@/app/clientes/[nombreCliente]/ventasMonedaHelpers";

function roundSaldo(n: number): number {
  return Number(Math.round(n * 100) / 100);
}

/** Comparación tolerante: espacios, mayúsculas y tildes. */
export function normalizarNombreCliente(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

async function encontrarDocCliente(
  negocioID: string,
  nombreCliente: string
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const nombre = String(nombreCliente ?? "").trim();
  if (!negocioID || !nombre) return null;

  const exactSnap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/clientes`),
      where("nombre", "==", nombre),
      limit(1)
    )
  );
  if (!exactSnap.empty) return exactSnap.docs[0];

  // Fallback: nombre editado / distinta capitalización / tilde / espacios dobles
  const todosSnap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
  const target = normalizarNombreCliente(nombre);
  const hit = todosSnap.docs.find(
    (d) => normalizarNombreCliente(String(d.data()?.nombre ?? "")) === target
  );
  return hit ?? null;
}

export type ResultadoActualizarSaldo = {
  ok: boolean;
  motivo?: "sin_datos" | "no_encontrado" | "error";
  detalle?: string;
};

/** Deuda de una venta en cuenta corriente (misma lógica que recalcular saldos). */
export function deudaVentaPorMoneda(venta: {
  productos?: unknown[];
  total?: number;
  totalARS?: number;
  totalUSD?: number;
  moneda?: string;
}): { totalARS: number; totalUSD: number } {
  const productos = venta?.productos;
  if (Array.isArray(productos) && productos.length > 0) {
    const desdeLineas = totalesVentasPorMoneda(productos as Parameters<typeof totalesVentasPorMoneda>[0]);
    if (desdeLineas.totalARS > 0 || desdeLineas.totalUSD > 0) {
      return desdeLineas;
    }
  }

  const totalARS = Number(venta?.totalARS ?? 0);
  const totalUSD = Number(venta?.totalUSD ?? 0);
  if (totalARS > 0 || totalUSD > 0) {
    return { totalARS, totalUSD };
  }

  const total = Number(venta?.total || 0);
  if (total > 0) {
    const moneda = normalizeMonedaCuenta(venta?.moneda);
    if (moneda === "USD") return { totalARS: 0, totalUSD: total };
    return { totalARS: total, totalUSD: 0 };
  }

  return { totalARS: 0, totalUSD: 0 };
}

/** Suma (o resta) ARS/USD al saldo del cliente en Firebase. */
export async function actualizarSaldoClienteNegocioDetalle(
  negocioID: string,
  nombreCliente: string,
  sumarARS: number,
  sumarUSD: number
): Promise<ResultadoActualizarSaldo> {
  const nombre = String(nombreCliente ?? "").trim();
  if (!negocioID || !nombre) return { ok: false, motivo: "sin_datos" };
  if (sumarARS === 0 && sumarUSD === 0) return { ok: true };

  try {
    const clienteDoc = await encontrarDocCliente(negocioID, nombre);
    if (!clienteDoc) {
      console.warn(`Cliente no encontrado para saldo: "${nombre}"`);
      return { ok: false, motivo: "no_encontrado" };
    }

    const datos = clienteDoc.data();
    const nombreDoc = String(datos.nombre ?? nombre).trim();

    await updateDoc(clienteDoc.ref, {
      saldoARS: roundSaldo(Number(datos.saldoARS ?? 0) + Number(sumarARS)),
      saldoUSD: roundSaldo(Number(datos.saldoUSD ?? 0) + Number(sumarUSD)),
      ultimaActualizacion: serverTimestamp(),
    });

    console.log(
      `[saldo] ${nombreDoc}: ARS ${sumarARS >= 0 ? "+" : ""}${sumarARS}, USD ${sumarUSD >= 0 ? "+" : ""}${sumarUSD}`
    );
    return { ok: true };
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    console.error(`Error actualizando saldo de ${nombre}:`, error);
    return { ok: false, motivo: "error", detalle };
  }
}

export async function actualizarSaldoClienteNegocio(
  negocioID: string,
  nombreCliente: string,
  sumarARS: number,
  sumarUSD: number
): Promise<boolean> {
  const r = await actualizarSaldoClienteNegocioDetalle(
    negocioID,
    nombreCliente,
    sumarARS,
    sumarUSD
  );
  return r.ok;
}

/** Ajusta cuenta corriente al editar una venta (resta lo viejo, suma lo nuevo). */
export async function ajustarSaldoPorEdicionVenta(
  negocioID: string,
  clienteAnterior: string,
  clienteNuevo: string,
  ventaAnterior: Parameters<typeof deudaVentaPorMoneda>[0],
  productosNuevos: unknown[]
): Promise<void> {
  const viejo = deudaVentaPorMoneda(ventaAnterior);
  const nuevo = totalesVentasPorMoneda(
    productosNuevos as Parameters<typeof totalesVentasPorMoneda>[0]
  );

  const ant = String(clienteAnterior ?? "").trim();
  const neu = String(clienteNuevo ?? "").trim();
  const deltaARS = nuevo.totalARS - viejo.totalARS;
  const deltaUSD = nuevo.totalUSD - viejo.totalUSD;

  console.log("[editar venta → saldo]", { cliente: neu || ant, viejo, nuevo, deltaARS, deltaUSD });

  const mensajeFalloSaldo = (nombre: string, r: ResultadoActualizarSaldo) => {
    if (r.motivo === "error") {
      return `No se pudo actualizar la cuenta corriente de "${nombre}": ${r.detalle || "error desconocido"}.`;
    }
    return `No se encontró el cliente "${nombre}" en Clientes (probá el mismo nombre, sin espacios de más).`;
  };

  if (ant === neu) {
    if (deltaARS === 0 && deltaUSD === 0) return;
    const r = await actualizarSaldoClienteNegocioDetalle(negocioID, neu, deltaARS, deltaUSD);
    if (!r.ok) throw new Error(mensajeFalloSaldo(neu, r));
    return;
  }

  if (ant) {
    const rAnt = await actualizarSaldoClienteNegocioDetalle(
      negocioID,
      ant,
      -viejo.totalARS,
      -viejo.totalUSD
    );
    if (!rAnt.ok) throw new Error(mensajeFalloSaldo(ant, rAnt));
  }
  if (neu) {
    const rNeu = await actualizarSaldoClienteNegocioDetalle(
      negocioID,
      neu,
      nuevo.totalARS,
      nuevo.totalUSD
    );
    if (!rNeu.ok) throw new Error(mensajeFalloSaldo(neu, rNeu));
  }
}

/** Pagos al guardar la venta (campo embebido `pago`), si no hay docs en `pagos`. */
export function pagosEmbebidosDeVenta(venta: {
  pago?: {
    monto?: number | null;
    montoUSD?: number | null;
  };
}): { totalARS: number; totalUSD: number } {
  const pago = venta?.pago;
  if (!pago) return { totalARS: 0, totalUSD: 0 };

  const montoARS = Number(pago.monto ?? 0);
  const montoUSD = Number(pago.montoUSD ?? 0);
  return {
    totalARS: montoARS > 0 ? montoARS : 0,
    totalUSD: montoUSD > 0 ? montoUSD : 0,
  };
}

/** Suma pagos en colección `pagos` vinculados por nroVenta. */
export async function pagosColeccionDeVenta(
  negocioID: string,
  nroVenta: string,
  nombreCliente?: string
): Promise<{ totalARS: number; totalUSD: number }> {
  const nro = String(nroVenta ?? "").trim();
  if (!negocioID || !nro) return { totalARS: 0, totalUSD: 0 };

  const snap = await getDocs(
    query(collection(db, `negocios/${negocioID}/pagos`), where("nroVenta", "==", nro))
  );

  const cliente = String(nombreCliente ?? "").trim();
  let totalARS = 0;
  let totalUSD = 0;

  for (const d of snap.docs) {
    const data = d.data();
    if (cliente && String(data.cliente ?? "").trim() !== cliente) continue;
    totalARS += Number(data.monto ?? 0);
    totalUSD += Number(data.montoUSD ?? 0);
  }

  return { totalARS, totalUSD };
}

/**
 * Revierte la deuda de la venta en cuenta corriente (devolución de productos).
 *
 * Importante: NO se anulan los pagos. Si la venta estaba pagada, al sacar la deuda
 * queda saldo a favor (mismo criterio que al borrar un ítem de una venta mixta).
 * Los docs en `pagos` se dejan para que historial y cuenta corriente coincidan.
 */
export async function revertirSaldoPorEliminarVenta(
  negocioID: string,
  venta: Parameters<typeof deudaVentaPorMoneda>[0] & {
    cliente?: string;
    nroVenta?: string;
    pago?: { monto?: number | null; montoUSD?: number | null };
  }
): Promise<void> {
  const nombre = String(venta?.cliente ?? "").trim();
  if (!negocioID) {
    throw new Error("Sin negocio para ajustar cuenta corriente.");
  }
  if (!nombre) {
    throw new Error("La venta no tiene cliente; no se puede ajustar cuenta corriente.");
  }

  const deuda = deudaVentaPorMoneda(venta);
  const deltaARS = -deuda.totalARS;
  const deltaUSD = -deuda.totalUSD;

  console.log("[eliminar venta → saldo]", {
    cliente: nombre,
    deuda,
    deltaARS,
    deltaUSD,
    nota: "Solo se revierte la deuda; los pagos quedan como crédito a favor",
  });

  if (deltaARS === 0 && deltaUSD === 0) {
    console.warn("[eliminar venta → saldo] Deuda en 0; no hay nada que acreditar.");
    return;
  }

  const r = await actualizarSaldoClienteNegocioDetalle(
    negocioID,
    nombre,
    deltaARS,
    deltaUSD
  );
  if (r.ok) return;

  // Cliente borrado/renombrado: no bloquear el delete de la venta.
  // Al guardar, si no estaba en Clientes el saldo tampoco se había sumado.
  if (r.motivo === "no_encontrado") {
    console.warn(
      `[eliminar venta → saldo] Cliente "${nombre}" no encontrado; se elimina la venta sin tocar CC.`
    );
    return;
  }

  throw new Error(
    r.motivo === "error"
      ? `No se pudo actualizar la cuenta corriente de "${nombre}": ${r.detalle || "error desconocido"}.`
      : `No se pudo actualizar la cuenta corriente de "${nombre}".`
  );
}

/** Borra documentos en `pagos` asociados a la venta (después de revertir saldo). */
export async function eliminarPagosAsociadosAVenta(
  negocioID: string,
  nroVenta: string,
  nombreCliente?: string
): Promise<void> {
  const nro = String(nroVenta ?? "").trim();
  if (!negocioID || !nro) return;

  const snap = await getDocs(
    query(collection(db, `negocios/${negocioID}/pagos`), where("nroVenta", "==", nro))
  );

  const cliente = String(nombreCliente ?? "").trim();
  await Promise.all(
    snap.docs
      .filter((d) => !cliente || String(d.data().cliente ?? "").trim() === cliente)
      .map((d) => deleteDoc(d.ref))
  );
}
