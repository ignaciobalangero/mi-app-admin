import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  buscarProveedor,
  deudaSiConsignacion,
  documentoCompraConsignacion,
  ORIGEN_DEUDA_CONSIGNACION,
  planRevertir,
  type DeudaGuardada,
  type ProveedorAgenda,
} from "@/lib/proveedores/deudaConsignacion";

async function proveedoresDelNegocio(negocioID: string): Promise<ProveedorAgenda[]> {
  const snap = await getDocs(collection(db, `negocios/${negocioID}/proveedores`));
  return snap.docs.map((item) => ({
    id: item.id,
    nombre: String(item.data().nombre || ""),
  }));
}

/** Anota en la cuenta del proveedor el costo de lo que una venta sacó de consignación. */
export async function anotarDeudaConsignacionVenta(opts: {
  negocioID: string;
  coleccion: string;
  stockDocId: string;
  data: Record<string, unknown>;
  cantidad: number;
}) {
  const deuda = deudaSiConsignacion(opts.data, opts.cantidad);
  if (!deuda || !opts.negocioID || !opts.stockDocId) return;
  const lista = await proveedoresDelNegocio(opts.negocioID);
  const proveedor = buscarProveedor(lista, deuda.proveedorNombre);
  await addDoc(
    collection(db, `negocios/${opts.negocioID}/compras`),
    documentoCompraConsignacion({
      deuda,
      proveedorId: proveedor?.id || "",
      coleccion: opts.coleccion,
      stockDocId: opts.stockDocId,
    })
  );
}

/** Si la venta se anula o se devuelve stock, esa deuda sale de la cuenta. */
export async function revertirDeudaConsignacionVenta(opts: {
  negocioID: string;
  coleccion: string;
  stockDocId: string;
  cantidad: number;
}) {
  if (!opts.negocioID || !opts.stockDocId || opts.cantidad <= 0) return;
  const snap = await getDocs(
    query(collection(db, `negocios/${opts.negocioID}/compras`), where("stockDocId", "==", opts.stockDocId))
  );
  const deudas: DeudaGuardada[] = snap.docs.map((item) => {
    const data = item.data();
    const productos = Array.isArray(data.productos) ? data.productos : [];
    const primero = (productos[0] || {}) as { precio?: unknown; producto?: unknown; cantidad?: unknown };
    return {
      id: item.id,
      origen: data.origen,
      stockColeccion: data.stockColeccion,
      stockDocId: String(data.stockDocId || opts.stockDocId),
      cantidadUnidades: Number(data.cantidadUnidades ?? primero.cantidad) || 0,
      precio: Number(primero.precio) || 0,
      producto: String(primero.producto || "Consignación"),
      fechaCreacion: String(data.fechaCreacion || ""),
    };
  });
  const plan = planRevertir(
    deudas.filter((deuda) => deuda.origen === ORIGEN_DEUDA_CONSIGNACION),
    opts.coleccion,
    opts.cantidad
  );
  await Promise.all([
    ...plan.borrar.map((id) => deleteDoc(doc(db, `negocios/${opts.negocioID}/compras/${id}`))),
    ...plan.actualizar.map((cambio) =>
      updateDoc(doc(db, `negocios/${opts.negocioID}/compras/${cambio.id}`), {
        cantidadUnidades: cambio.cantidadUnidades,
        montoTotal: cambio.montoTotal,
        productos: cambio.productos,
      })
    ),
  ]);
}
