import {
  collection,
  deleteDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  normalizeMonedaCuenta,
  totalesVentasPorMoneda,
} from "@/app/clientes/[nombreCliente]/ventasMonedaHelpers";

function roundSaldo(n: number): number {
  return Number(Math.round(n * 100) / 100);
}

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
export async function actualizarSaldoClienteNegocio(
  negocioID: string,
  nombreCliente: string,
  sumarARS: number,
  sumarUSD: number
): Promise<boolean> {
  const nombre = String(nombreCliente ?? "").trim();
  if (!negocioID || !nombre) return false;
  if (sumarARS === 0 && sumarUSD === 0) return true;

  try {
    const clientesSnap = await getDocs(
      query(
        collection(db, `negocios/${negocioID}/clientes`),
        where("nombre", "==", nombre),
        limit(1)
      )
    );

    if (clientesSnap.empty) {
      console.warn(`Cliente no encontrado para saldo: "${nombre}"`);
      return false;
    }

    const clienteDoc = clientesSnap.docs[0];
    const datos = clienteDoc.data();

    await updateDoc(clienteDoc.ref, {
      saldoARS: roundSaldo(Number(datos.saldoARS ?? 0) + Number(sumarARS)),
      saldoUSD: roundSaldo(Number(datos.saldoUSD ?? 0) + Number(sumarUSD)),
      ultimaActualizacion: serverTimestamp(),
    });

    console.log(
      `[saldo] ${nombre}: ARS ${sumarARS >= 0 ? "+" : ""}${sumarARS}, USD ${sumarUSD >= 0 ? "+" : ""}${sumarUSD}`
    );
    return true;
  } catch (error) {
    console.error(`Error actualizando saldo de ${nombre}:`, error);
    return false;
  }
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

  if (ant === neu) {
    await actualizarSaldoClienteNegocio(
      negocioID,
      neu,
      nuevo.totalARS - viejo.totalARS,
      nuevo.totalUSD - viejo.totalUSD
    );
    return;
  }

  if (ant) {
    await actualizarSaldoClienteNegocio(negocioID, ant, -viejo.totalARS, -viejo.totalUSD);
  }
  if (neu) {
    await actualizarSaldoClienteNegocio(negocioID, neu, nuevo.totalARS, nuevo.totalUSD);
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
 * Revierte el impacto en cuenta corriente al eliminar una venta:
 * resta la deuda de productos y devuelve los pagos registrados al guardar.
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
  let pagos = { totalARS: 0, totalUSD: 0 };

  if (venta.nroVenta) {
    pagos = await pagosColeccionDeVenta(negocioID, String(venta.nroVenta), nombre);
  }
  if (pagos.totalARS === 0 && pagos.totalUSD === 0) {
    pagos = pagosEmbebidosDeVenta(venta);
  }

  const deltaARS = -deuda.totalARS + pagos.totalARS;
  const deltaUSD = -deuda.totalUSD + pagos.totalUSD;

  console.log("[eliminar venta → saldo]", {
    cliente: nombre,
    deuda,
    pagos,
    deltaARS,
    deltaUSD,
  });

  if (deltaARS === 0 && deltaUSD === 0) {
    console.warn("[eliminar venta → saldo] Sin cambio (deuda y pagos se compensan o montos en 0).");
    return;
  }

  const ok = await actualizarSaldoClienteNegocio(negocioID, nombre, deltaARS, deltaUSD);
  if (!ok) {
    throw new Error(
      `No se pudo actualizar la cuenta corriente de "${nombre}". Verificá que el cliente exista en Clientes con el mismo nombre exacto.`
    );
  }
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
