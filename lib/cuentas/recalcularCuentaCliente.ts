import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

export async function recalcularCuentaCliente({
  clienteID,
  negocioID,
}: {
  clienteID: string;
  negocioID: string;
}) {
  let deudaTotal = 0;
  let totalPagado = 0;

  // 🔴 OMITIMOS trabajos para probar si el error viene de ahí
  // const trabajosSnap = await getDocs(
  //   query(
  //     collection(db, `negocios/${negocioID}/trabajos`),
  //     where("cliente", "==", clienteID),
  //     where("estado", "==", "ENTREGADO")
  //   )
  // );
  // const trabajos = trabajosSnap.docs.map((d) => ({
  //   id: d.id,
  //   ...d.data(),
  // })) as any[];

  // 1. Ventas de teléfonos
  const ventasTelSnap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/ventasTelefonos`),
      where("clienteID", "==", clienteID)
    )
  );
  const ventasTel = ventasTelSnap.docs.map((d) => d.data()) as any[];

  // 2. Ventas de accesorios
  const ventasAccSnap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/ventasAccesorios`),
      where("clienteID", "==", clienteID)
    )
  );
  const ventasAcc = ventasAccSnap.docs.map((d) => d.data()) as any[];

  // 3. Pagos
  const pagosSnap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/pagos`),
      where("cliente", "==", clienteID)
    )
  );
  pagosSnap.forEach((doc) => {
    const data = doc.data();
    const cotizacion = Number(data.cotizacion) || 1000;
    const montoARS = Number(data.monto) || 0;
    const montoUSD = Number(data.montoUSD) || 0;
    totalPagado += montoARS + montoUSD * cotizacion;
  });

  // 4. Sumar deuda (solo de ventas)
  // trabajos.forEach((t) => {
  //   deudaTotal += Number(t.precio) || 0;
  // });
  ventasTel.forEach((v) => {
    deudaTotal += Number(v.total) || 0;
  });
  ventasAcc.forEach((v) => {
    deudaTotal += Number(v.total) || 0;
  });

  const saldo = Math.round((totalPagado - deudaTotal) * 100) / 100;

  // 5. Guardar el saldo actualizado
  const clienteRef = doc(db, `negocios/${negocioID}/clientes/${clienteID}`);
  await updateDoc(clienteRef, {
    "cuenta.saldo": saldo,
  });

  // 6. Omitimos marcar trabajos como PAGADOS
  // let saldoRestante = totalPagado;
  // for (const t of trabajos) {
  //   const precio = Number(t.precio) || 0;
  //   if (saldoRestante >= precio) {
  //     saldoRestante -= precio;
  //     try {
  //       await updateDoc(doc(db, `negocios/${negocioID}/trabajos/${t.id}`), {
  //         estadoCuentaCorriente: "pagado",
  //         estado: "PAGADO",
  //       });
  //     } catch (e) {
  //       console.warn("⚠️ No se pudo actualizar el trabajo:", t.id, e);
  //     }
  //   }
  // }

  return saldo;
}
