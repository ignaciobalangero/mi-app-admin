import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ==========================================
// FUNCIÓN 1: Actualizar saldo cuando cambia un TRABAJO
// ==========================================
export const actualizarSaldoPorTrabajo = onDocumentWritten(
  "negocios/{negocioID}/trabajos/{trabajoID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    // Si se borró el trabajo
    if (!despues && antes) {
      const estadoValido = ["ENTREGADO", "PAGADO"].includes(antes.estado);
      if (estadoValido) {
        return await actualizarSaldoCliente(
          negocioID,
          antes.cliente,
          -Number(antes.precio || 0),
          antes.moneda || "ARS"
        );
      }
      return null;
    }

    // Si se creó o modificó el trabajo
    if (despues) {
      const estadoValidoAhora = ["ENTREGADO", "PAGADO"].includes(despues.estado);
      const estadoValidoAntes = antes ? ["ENTREGADO", "PAGADO"].includes(antes.estado) : false;

      // CASO 1: Estado cambió de NO válido → válido
      if (estadoValidoAhora && !estadoValidoAntes) {
        return await actualizarSaldoCliente(
          negocioID,
          despues.cliente,
          Number(despues.precio || 0),
          despues.moneda || "ARS"
        );
      }

      // CASO 2: Estado cambió de válido → NO válido
      if (!estadoValidoAhora && estadoValidoAntes && antes) {
        return await actualizarSaldoCliente(
          negocioID,
          antes.cliente,
          -Number(antes.precio || 0),
          antes.moneda || "ARS"
        );
      }

      // CASO 3: Trabajo en estado válido y cambió precio/moneda
      if (estadoValidoAhora && estadoValidoAntes && antes) {
        const precioAntes = Number(antes.precio || 0);
        const precioDespues = Number(despues.precio || 0);
        const monedaAntes = antes.moneda || "ARS";
        const monedaDespues = despues.moneda || "ARS";

        // Si cambió precio o moneda
        if (precioAntes !== precioDespues || monedaAntes !== monedaDespues) {
          // Restar precio anterior
          await actualizarSaldoCliente(
            negocioID,
            antes.cliente,
            -precioAntes,
            monedaAntes
          );

          // Sumar precio nuevo
          return await actualizarSaldoCliente(
            negocioID,
            despues.cliente,
            precioDespues,
            monedaDespues
          );
        }
      }
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 2: Actualizar saldo cuando cambia una VENTA
// ==========================================
export const actualizarSaldoPorVenta = onDocumentWritten(
  "negocios/{negocioID}/ventasGeneral/{ventaID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    if (!despues && antes) {
      const {totalARS, totalUSD} = calcularTotalVenta(antes.productos || []);
      if (totalARS > 0) {
        await actualizarSaldoCliente(negocioID, antes.cliente, -totalARS, "ARS");
      }
      if (totalUSD > 0) {
        await actualizarSaldoCliente(negocioID, antes.cliente, -totalUSD, "USD");
      }
      return null;
    }

    if (despues) {
      const {totalARS, totalUSD} = calcularTotalVenta(despues.productos || []);

      if (antes) {
        const {totalARS: antesARS, totalUSD: antesUSD} = calcularTotalVenta(antes.productos || []);
        if (antesARS > 0) {
          await actualizarSaldoCliente(negocioID, antes.cliente, -antesARS, "ARS");
        }
        if (antesUSD > 0) {
          await actualizarSaldoCliente(negocioID, antes.cliente, -antesUSD, "USD");
        }
      }

      if (totalARS > 0) {
        await actualizarSaldoCliente(negocioID, despues.cliente, totalARS, "ARS");
      }
      if (totalUSD > 0) {
        await actualizarSaldoCliente(negocioID, despues.cliente, totalUSD, "USD");
      }
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 3: Actualizar saldo cuando cambia un PAGO
// ==========================================
export const actualizarSaldoPorPago = onDocumentWritten(
  "negocios/{negocioID}/pagos/{pagoID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    if (!despues && antes) {
      const monto = antes.moneda === "USD" ? Number(antes.montoUSD || 0) : Number(antes.monto || 0);
      return await actualizarSaldoCliente(
        negocioID,
        antes.cliente,
        monto,
        antes.moneda || "ARS"
      );
    }

    if (despues) {
      const monto = despues.moneda === "USD" ? Number(despues.montoUSD || 0) : Number(despues.monto || 0);

      if (antes) {
        const montoAntes = antes.moneda === "USD" ? Number(antes.montoUSD || 0) : Number(antes.monto || 0);
        await actualizarSaldoCliente(negocioID, antes.cliente, montoAntes, antes.moneda || "ARS");
      }

      return await actualizarSaldoCliente(
        negocioID,
        despues.cliente,
        -monto,
        despues.moneda || "ARS"
      );
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 4: Actualizar nombre de cliente en todas las colecciones
// ==========================================
export const actualizarNombreCliente = onDocumentWritten(
  "negocios/{negocioID}/clientes/{clienteID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    // Solo procesar si se modificó el nombre
    if (!antes || !despues) return null;

    const nombreAntes = antes.nombre;
    const nombreDespues = despues.nombre;

    // Si el nombre no cambió, no hacer nada
    if (nombreAntes === nombreDespues) return null;

    console.log(`🔄 Actualizando nombre de cliente: "${nombreAntes}" → "${nombreDespues}"`);

    try {
      const batch = db.batch();
      let actualizaciones = 0;

      // Actualizar TRABAJOS
      const trabajosSnap = await db
        .collection(`negocios/${negocioID}/trabajos`)
        .where("cliente", "==", nombreAntes)
        .get();

      trabajosSnap.forEach((doc) => {
        batch.update(doc.ref, {cliente: nombreDespues});
        actualizaciones++;
      });

      console.log(`  📋 ${trabajosSnap.size} trabajos a actualizar`);

      // Actualizar VENTAS
      const ventasSnap = await db
        .collection(`negocios/${negocioID}/ventasGeneral`)
        .where("cliente", "==", nombreAntes)
        .get();

      ventasSnap.forEach((doc) => {
        batch.update(doc.ref, {cliente: nombreDespues});
        actualizaciones++;
      });

      console.log(`  🛒 ${ventasSnap.size} ventas a actualizar`);

      // Actualizar PAGOS
      const pagosSnap = await db
        .collection(`negocios/${negocioID}/pagos`)
        .where("cliente", "==", nombreAntes)
        .get();

      pagosSnap.forEach((doc) => {
        batch.update(doc.ref, {cliente: nombreDespues});
        actualizaciones++;
      });

      console.log(`  💰 ${pagosSnap.size} pagos a actualizar`);

      // Ejecutar todas las actualizaciones
      if (actualizaciones > 0) {
        await batch.commit();
        console.log(`✅ ${actualizaciones} documentos actualizados exitosamente`);
      } else {
        console.log("ℹ️ No había documentos para actualizar");
      }

      return null;
    } catch (error) {
      console.error("❌ Error actualizando nombre de cliente:", error);
      return null;
    }
  }
);

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

async function actualizarSaldoCliente(
  negocioID: string,
  nombreCliente: string,
  cambio: number,
  moneda: string
) {
  try {
    const clientesRef = db.collection(`negocios/${negocioID}/clientes`);
    const snapshot = await clientesRef.where("nombre", "==", nombreCliente).limit(1).get();

    if (snapshot.empty) {
      console.log(`⚠️ Cliente no encontrado: ${nombreCliente}`);
      return;
    }

    const clienteDoc = snapshot.docs[0];
    const clienteData = clienteDoc.data();

    const nuevoSaldoARS = moneda === "ARS" ?
      (clienteData.saldoARS || 0) + cambio :
      (clienteData.saldoARS || 0);

    const nuevoSaldoUSD = moneda === "USD" ?
      (clienteData.saldoUSD || 0) + cambio :
      (clienteData.saldoUSD || 0);

    await clienteDoc.ref.update({
      saldoARS: Math.round(nuevoSaldoARS * 100) / 100,
      saldoUSD: Math.round(nuevoSaldoUSD * 100) / 100,
      ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Saldo actualizado: ${nombreCliente} | ${moneda} ${cambio > 0 ? "+" : ""}${cambio}`);
  } catch (error) {
    console.error(`❌ Error actualizando saldo: ${nombreCliente}`, error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularTotalVenta(productos: any[]): {totalARS: number; totalUSD: number} {
  let totalARS = 0;
  let totalUSD = 0;

  const hayTelefono = productos.some((p) => p.categoria === "Teléfono");

  productos.forEach((p) => {
    const subtotal = p.precioUnitario * p.cantidad;

    if (hayTelefono) {
      if (p.moneda?.toUpperCase() === "USD") {
        totalUSD += subtotal;
      } else {
        totalARS += subtotal;
      }
    } else {
      totalARS += subtotal;
    }
  });

  return {totalARS, totalUSD};
}
