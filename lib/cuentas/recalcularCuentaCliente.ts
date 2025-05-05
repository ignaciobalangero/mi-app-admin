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

  // 1. Traer trabajos ENTREGADOS del cliente
  const trabajosSnap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/trabajos`),
      where("cliente", "==", clienteID),
      where("estado", "==", "ENTREGADO")
    )
  );
  const trabajos = trabajosSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as any[];

  // 2. Ventas de teléfonos
  const ventasTelSnap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/ventasTelefonos`),
      where("clienteID", "==", clienteID)
    )
  );
  const ventasTel = ventasTelSnap.docs.map((d) => d.data()) as any[];

  // 3. Ventas de accesorios
  const ventasAccSnap = await getDocs(
    query(
      collection(db, `negocios/${negocioID}/ventasAccesorios`),
      where("clienteID", "==", clienteID)
    )
  );
  const ventasAcc = ventasAccSnap.docs.map((d) => d.data()) as any[];

  // 4. Pagos realizados
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

  // 5. Calcular deuda total (trabajos + ventas)
  trabajos.forEach((t) => {
    deudaTotal += Number(t.precio) || 0;
  });
  ventasTel.forEach((v) => {
    deudaTotal += Number(v.total) || 0;
  });
  ventasAcc.forEach((v) => {
    deudaTotal += Number(v.total) || 0;
  });

  const saldo = Math.round((totalPagado - deudaTotal) * 100) / 100;
  const clienteRef = doc(db, `negocios/${negocioID}/clientes/${clienteID}`);

  // 6. Guardar saldo y saldo a favor
  await updateDoc(clienteRef, {
    "cuenta.saldo": saldo,
    "cuenta.saldoAFavor": saldo > 0 ? saldo : 0,
  });

  // 7. Marcar trabajos como PAGADO si alcanza el total
  let saldoRestante = totalPagado;
  for (const t of trabajos) {
    const precio = Number(t.precio) || 0;
    console.log("⏳ Evaluando trabajo:", t.id, {
      precio,
      saldoRestante,
      estadoActual: t.estado,
      estadoCuentaCorriente: t.estadoCuentaCorriente,
    });
    
    if (saldoRestante >= precio) {
      saldoRestante -= precio;
      try {
        await updateDoc(doc(db, `negocios/${negocioID}/trabajos/${t.id}`), {
          estadoCuentaCorriente: "pagado",
          estado: "PAGADO",
        });
      } catch (e) {
        console.warn("⚠️ No se pudo actualizar el trabajo:", t.id, e);
      }
    }
  }

  // 8. Si el saldo es cero exacto, limpiar historial y marcar como pagado
  if (saldo === 0) {
    await updateDoc(clienteRef, {
      "cuenta.saldo": 0,
      "cuenta.saldoAFavor": 0,
      "cuenta.historial": [],
    });

    const trabajosPendientes = trabajos.filter((t) => t.estadoCuentaCorriente !== "pagado");
    for (const t of trabajosPendientes) {
      try {
        await updateDoc(doc(db, `negocios/${negocioID}/trabajos/${t.id}`), {
          estadoCuentaCorriente: "pagado",
        });
      } catch (e) {
        console.warn("⚠️ No se pudo actualizar estadoCuentaCorriente:", t.id, e);
      }
    }
  }

  // 9. Emitir evento para actualizar interfaz
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("trabajosActualizados"));
  }

  return saldo;
}
