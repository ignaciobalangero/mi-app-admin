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
// FUNCIÓN 5: Actualizar estadísticas en tiempo real
// ==========================================
export const actualizarEstadisticas = onDocumentWritten(
  "negocios/{negocioID}/{collection}/{docID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;
    const collection = event.params.collection as string;

    if (!["trabajos", "ventasGeneral"].includes(collection)) {
      return null;
    }

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    const diaActual = new Date().toLocaleDateString("es-AR");

    // ✅ PROCESAR TRABAJOS CON fechaModificacion
    if (collection === "trabajos") {
      const estadoAntes = antes?.estado;
      const estadoDespues = despues?.estado;
      const fechaDespues = despues?.fechaModificacion || "";

      // ✅ Detectar si cambió precio/costo sin cambio de estado
      const cambioPrecios =
        antes && despues &&
        estadoAntes === estadoDespues &&
        (antes.precio !== despues.precio || antes.costo !== despues.costo) &&
        ["REPARADO", "ENTREGADO", "PAGADO"].includes(estadoDespues);

      if (fechaDespues) {
        const partesFecha = fechaDespues.split("/");
        if (partesFecha.length === 3) {
          const mesVenta = String(partesFecha[1]).padStart(2, "0");
          const anioVenta = partesFecha[2];
          const mesAnioTrabajo = `${mesVenta}-${anioVenta}`;

          const estadisticasRef = db
            .collection(`negocios/${negocioID}/estadisticas`)
            .doc(mesAnioTrabajo);

          try {
            const estadisticasDoc = await estadisticasRef.get();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stats: any = estadisticasDoc.exists ? estadisticasDoc.data() : {
              mes: mesAnioTrabajo,
              trabajosReparados: 0,
              accesoriosVendidos: 0,
              telefonosVendidos: 0,
              gananciaTrabajos: 0,
              gananciaVentasARS: 0,
              gananciaVentasUSD: 0,
              cajaDelDia: {},
            };

            const precioAntes = Number(antes?.precio || 0);
            const costoAntes = Number(antes?.costo || 0);
            const gananciaAntes = precioAntes - costoAntes;

            const precioDespues = Number(despues?.precio || 0);
            const costoDespues = Number(despues?.costo || 0);
            const gananciaDespues = precioDespues - costoDespues;

            // Trabajo cambió a REPARADO/ENTREGADO/PAGADO
            if (
              ["REPARADO", "ENTREGADO", "PAGADO"].includes(estadoDespues) &&
              !["REPARADO", "ENTREGADO", "PAGADO"].includes(estadoAntes)
            ) {
              stats.trabajosReparados = (stats.trabajosReparados || 0) + 1;
              stats.gananciaTrabajos = (stats.gananciaTrabajos || 0) + gananciaDespues;
            }

            // Trabajo cambió de REPARADO/ENTREGADO/PAGADO a otro estado
            if (
              ["REPARADO", "ENTREGADO", "PAGADO"].includes(estadoAntes) &&
              !["REPARADO", "ENTREGADO", "PAGADO"].includes(estadoDespues)
            ) {
              stats.trabajosReparados = Math.max(0, (stats.trabajosReparados || 0) - 1);
              stats.gananciaTrabajos = Math.max(0, (stats.gananciaTrabajos || 0) - gananciaAntes);
            }

            // Trabajo en estado válido y cambió precio/costo
            if (cambioPrecios) {
              stats.gananciaTrabajos = (stats.gananciaTrabajos || 0) - gananciaAntes + gananciaDespues;
            }

            await estadisticasRef.set(stats, {merge: true});
            console.log(`✅ Estadísticas de trabajos actualizadas para ${mesAnioTrabajo}`);
          } catch (error) {
            console.error("❌ Error actualizando estadísticas de trabajos:", error);
          }
        }
      }
    }

    // ✅ PROCESAR VENTAS CON fecha
    if (collection === "ventasGeneral") {
      const fechaDespues = despues?.fecha || "";
      const productosDespues = despues?.productos || [];
      const productosAntes = antes?.productos || [];

      const parteFecha = fechaDespues.split("/");
      if (parteFecha.length === 3) {
        const mesVenta = String(parteFecha[1]).padStart(2, "0");
        const anioVenta = parteFecha[2];
        const mesAnioVenta = `${mesVenta}-${anioVenta}`;

        const estadisticasRef = db
          .collection(`negocios/${negocioID}/estadisticas`)
          .doc(mesAnioVenta);

        try {
          const estadisticasDoc = await estadisticasRef.get();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stats: any = estadisticasDoc.exists ? estadisticasDoc.data() : {
            mes: mesAnioVenta,
            trabajosReparados: 0,
            accesoriosVendidos: 0,
            telefonosVendidos: 0,
            gananciaTrabajos: 0,
            gananciaVentasARS: 0,
            gananciaVentasUSD: 0,
            cajaDelDia: {},
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          productosDespues.forEach((p: any) => {
            const ganancia = Number(p.ganancia || 0);
            const categoria = (p.categoria || p.tipo || "").toLowerCase();

            if (categoria === "teléfono" || categoria === "telefono" || p.tipo === "telefono") {
              stats.telefonosVendidos = (stats.telefonosVendidos || 0) + 1;

              if (p.moneda?.toUpperCase() === "USD") {
                stats.gananciaVentasUSD = (stats.gananciaVentasUSD || 0) + ganancia;
              } else {
                stats.gananciaVentasARS = (stats.gananciaVentasARS || 0) + ganancia;
              }
            } else if (p.tipo === "accesorio" || p.tipo === "general" || categoria === "repuesto") {
              stats.accesoriosVendidos = (stats.accesoriosVendidos || 0) + Number(p.cantidad || 0);

              if (p.moneda?.toUpperCase() === "USD") {
                stats.gananciaVentasUSD = (stats.gananciaVentasUSD || 0) + ganancia;
              } else {
                stats.gananciaVentasARS = (stats.gananciaVentasARS || 0) + ganancia;
              }
            }

            // Caja del día
            if (fechaDespues === diaActual) {
              const total = Number(p.total || 0);
              stats.cajaDelDia = stats.cajaDelDia || {};
              stats.cajaDelDia[diaActual] = (stats.cajaDelDia[diaActual] || 0) + total;
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          productosAntes.forEach((p: any) => {
            const ganancia = Number(p.ganancia || 0);
            const categoria = (p.categoria || p.tipo || "").toLowerCase();

            if (categoria === "teléfono" || categoria === "telefono" || p.tipo === "telefono") {
              stats.telefonosVendidos = Math.max(0, (stats.telefonosVendidos || 0) - 1);

              if (p.moneda?.toUpperCase() === "USD") {
                stats.gananciaVentasUSD = (stats.gananciaVentasUSD || 0) + ganancia;
              } else {
                stats.gananciaVentasARS = (stats.gananciaVentasARS || 0) + ganancia;
              }
            } else if (p.tipo === "accesorio" || p.tipo === "general" || categoria === "repuesto") {
              stats.accesoriosVendidos = Math.max(0, (stats.accesoriosVendidos || 0) - Number(p.cantidad || 0)); // ✅ RESTA


              if (p.moneda?.toUpperCase() === "USD") {
                stats.gananciaVentasUSD = (stats.gananciaVentasUSD || 0) + ganancia;
              } else {
                stats.gananciaVentasARS = (stats.gananciaVentasARS || 0) + ganancia;
              }
            }
          });

          await estadisticasRef.set(stats, {merge: true});
          console.log(`✅ Estadísticas de ventas actualizadas para ${mesAnioVenta}`);
        } catch (error) {
          console.error("❌ Error actualizando estadísticas de ventas:", error);
        }
      }
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 6: Actualizar estadísticas de REPUESTOS
// ==========================================
export const actualizarEstadisticasRepuestos = onDocumentWritten(
  "negocios/{negocioID}/stockRepuestos/{repuestoID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    try {
      const estadisticasRef = db
        .collection(`negocios/${negocioID}/estadisticas`)
        .doc("inventario");

      const estadisticasDoc = await estadisticasRef.get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats: any = estadisticasDoc.exists ? estadisticasDoc.data() : {
        repuestos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        accesorios: {totalUSD: 0, totalARS: 0, cantidad: 0},
        telefonos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        ultimaActualizacion: null,
      };

      const valorAntes = antes ? calcularValorProducto(antes) : {usd: 0, ars: 0};
      const valorDespues = despues ? calcularValorProducto(despues) : {usd: 0, ars: 0};

      stats.repuestos.totalUSD = Math.max(0, (stats.repuestos.totalUSD || 0) + valorDespues.usd - valorAntes.usd);
      stats.repuestos.totalARS = Math.max(0, (stats.repuestos.totalARS || 0) + valorDespues.ars - valorAntes.ars);

      if (despues && !antes) {
        stats.repuestos.cantidad = (stats.repuestos.cantidad || 0) + 1;
      } else if (antes && !despues) {
        stats.repuestos.cantidad = Math.max(0, (stats.repuestos.cantidad || 0) - 1);
      }

      stats.ultimaActualizacion = admin.firestore.FieldValue.serverTimestamp();

      await estadisticasRef.set(stats, {merge: true});
      console.log("✅ Estadísticas de repuestos actualizadas");
    } catch (error) {
      console.error("❌ Error actualizando estadísticas de repuestos:", error);
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 7: Actualizar estadísticas de ACCESORIOS
// ==========================================
export const actualizarEstadisticasAccesorios = onDocumentWritten(
  "negocios/{negocioID}/stockAccesorios/{accesorioID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    try {
      const estadisticasRef = db
        .collection(`negocios/${negocioID}/estadisticas`)
        .doc("inventario");

      const estadisticasDoc = await estadisticasRef.get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats: any = estadisticasDoc.exists ? estadisticasDoc.data() : {
        repuestos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        accesorios: {totalUSD: 0, totalARS: 0, cantidad: 0},
        telefonos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        ultimaActualizacion: null,
      };

      const valorAntes = antes ? calcularValorProducto(antes) : {usd: 0, ars: 0};
      const valorDespues = despues ? calcularValorProducto(despues) : {usd: 0, ars: 0};

      stats.accesorios.totalUSD = Math.max(0, (stats.accesorios.totalUSD || 0) + valorDespues.usd - valorAntes.usd);
      stats.accesorios.totalARS = Math.max(0, (stats.accesorios.totalARS || 0) + valorDespues.ars - valorAntes.ars);

      if (despues && !antes) {
        stats.accesorios.cantidad = (stats.accesorios.cantidad || 0) + 1;
      } else if (antes && !despues) {
        stats.accesorios.cantidad = Math.max(0, (stats.accesorios.cantidad || 0) - 1);
      }

      stats.ultimaActualizacion = admin.firestore.FieldValue.serverTimestamp();

      await estadisticasRef.set(stats, {merge: true});
      console.log("✅ Estadísticas de accesorios actualizadas");
    } catch (error) {
      console.error("❌ Error actualizando estadísticas de accesorios:", error);
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 8: Actualizar estadísticas de TELÉFONOS
// ==========================================
export const actualizarEstadisticasTelefonos = onDocumentWritten(
  "negocios/{negocioID}/stockTelefonos/{telefonoID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    try {
      const estadisticasRef = db
        .collection(`negocios/${negocioID}/estadisticas`)
        .doc("inventario");

      const estadisticasDoc = await estadisticasRef.get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats: any = estadisticasDoc.exists ? estadisticasDoc.data() : {
        repuestos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        accesorios: {totalUSD: 0, totalARS: 0, cantidad: 0},
        telefonos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        ultimaActualizacion: null,
      };

      const valorAntes = antes ? calcularValorTelefono(antes) : {usd: 0, ars: 0};
      const valorDespues = despues ? calcularValorTelefono(despues) : {usd: 0, ars: 0};

      stats.telefonos.totalUSD = Math.max(0, (stats.telefonos.totalUSD || 0) + valorDespues.usd - valorAntes.usd);
      stats.telefonos.totalARS = Math.max(0, (stats.telefonos.totalARS || 0) + valorDespues.ars - valorAntes.ars);

      if (despues && !antes) {
        stats.telefonos.cantidad = (stats.telefonos.cantidad || 0) + 1;
      } else if (antes && !despues) {
        stats.telefonos.cantidad = Math.max(0, (stats.telefonos.cantidad || 0) - 1);
      }

      stats.ultimaActualizacion = admin.firestore.FieldValue.serverTimestamp();

      await estadisticasRef.set(stats, {merge: true});
      console.log("✅ Estadísticas de teléfonos actualizadas");
    } catch (error) {
      console.error("❌ Error actualizando estadísticas de teléfonos:", error);
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 9: Actualizar estadísticas de STOCK EXTRA
// ==========================================
export const actualizarEstadisticasStockExtra = onDocumentWritten(
  "negocios/{negocioID}/stockExtra/{productoID}",
  async (event) => {
    const negocioID = event.params.negocioID as string;

    const antes = event.data?.before.exists ? event.data.before.data() : null;
    const despues = event.data?.after.exists ? event.data.after.data() : null;

    try {
      const estadisticasRef = db
        .collection(`negocios/${negocioID}/estadisticas`)
        .doc("inventario");

      const estadisticasDoc = await estadisticasRef.get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats: any = estadisticasDoc.exists ? estadisticasDoc.data() : {
        repuestos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        accesorios: {totalUSD: 0, totalARS: 0, cantidad: 0},
        telefonos: {totalUSD: 0, totalARS: 0, cantidad: 0},
        stockExtra: {totalUSD: 0, totalARS: 0, cantidad: 0},
        ultimaActualizacion: null,
      };

      const valorAntes = antes ? calcularValorStockExtra(antes) : {usd: 0, ars: 0};
      const valorDespues = despues ? calcularValorStockExtra(despues) : {usd: 0, ars: 0};

      stats.stockExtra = stats.stockExtra || {totalUSD: 0, totalARS: 0, cantidad: 0};
      stats.stockExtra.totalUSD = Math.max(0, (stats.stockExtra.totalUSD || 0) + valorDespues.usd - valorAntes.usd);
      stats.stockExtra.totalARS = 0;

      if (despues && !antes) {
        stats.stockExtra.cantidad = (stats.stockExtra.cantidad || 0) + 1;
      } else if (antes && !despues) {
        stats.stockExtra.cantidad = Math.max(0, (stats.stockExtra.cantidad || 0) - 1);
      }

      stats.ultimaActualizacion = admin.firestore.FieldValue.serverTimestamp();

      await estadisticasRef.set(stats, {merge: true});
      console.log("✅ Estadísticas de stockExtra actualizadas");
    } catch (error) {
      console.error("❌ Error actualizando estadísticas de stockExtra:", error);
    }

    return null;
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

  const hayTelefono = productos.some((p) => p.tipo === "telefono");

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
// ==========================================
// FUNCIONES AUXILIARES PARA INVENTARIO
// ==========================================

// ==========================================
// FUNCIONES AUXILIARES PARA INVENTARIO
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularValorProducto(producto: any): {usd: number; ars: number} {
  const precioCosto = Number(producto.precioCosto || 0);
  const cantidad = Number(producto.cantidad || 0);
  const moneda = producto.moneda || "ARS";

  if (moneda === "USD") {
    return {
      usd: precioCosto * cantidad,
      ars: 0,
    };
  } else {
    return {
      usd: 0,
      ars: precioCosto * cantidad,
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularValorTelefono(telefono: any): {usd: number; ars: number} {
  const precioCompra = Number(telefono.precioCompra || 0);
  const moneda = telefono.moneda || "ARS";

  if (moneda === "USD") {
    return {
      usd: precioCompra,
      ars: 0,
    };
  } else {
    return {
      usd: 0,
      ars: precioCompra,
    };
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularValorStockExtra(producto: any): {usd: number; ars: number} {
  const precioCosto = Number(producto.precioCosto || 0);
  const cantidad = Number(producto.cantidad || 0);

  return {
    usd: precioCosto * cantidad,
    ars: 0,
  };
}
