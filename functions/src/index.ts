import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ==========================================
// FUNCIÓN 1: Actualizar nombre de cliente en todas las colecciones
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
// FUNCIÓN 2: Actualizar estadísticas en tiempo real
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
      // En delete `despues` es null → usar fecha del doc borrado
      const fechaRef =
        despues?.fechaModificacion ||
        antes?.fechaModificacion ||
        "";

      // ✅ Detectar si cambió precio/costo sin cambio de estado
      const cambioPrecios =
        antes && despues &&
        estadoAntes === estadoDespues &&
        (antes.precio !== despues.precio || antes.costo !== despues.costo) &&
        ["REPARADO", "ENTREGADO", "PAGADO"].includes(estadoDespues);

      if (fechaRef) {
        const partesFecha = String(fechaRef).split("/");
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

            const estadosOk = ["REPARADO", "ENTREGADO", "PAGADO"];
            const antesOk = estadosOk.includes(estadoAntes);
            const despuesOk = estadosOk.includes(estadoDespues);

            // Alta / pasó a estado válido
            if (despuesOk && !antesOk) {
              stats.trabajosReparados = (stats.trabajosReparados || 0) + 1;
              stats.gananciaTrabajos = (stats.gananciaTrabajos || 0) + gananciaDespues;
            }

            // Baja / salió de estado válido (incluye delete)
            if (antesOk && !despuesOk) {
              stats.trabajosReparados = Math.max(0, (stats.trabajosReparados || 0) - 1);
              stats.gananciaTrabajos = (stats.gananciaTrabajos || 0) - gananciaAntes;
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

    // ✅ PROCESAR VENTAS CON fecha (create / update / delete)
    if (collection === "ventasGeneral") {
      const fechaAntes = String(antes?.fecha || "").trim();
      const fechaDespues = String(despues?.fecha || "").trim();
      const productosAntes = Array.isArray(antes?.productos) ? antes.productos : [];
      const productosDespues = Array.isArray(despues?.productos) ? despues.productos : [];

      const mesAnioDeFecha = (fecha: string): string | null => {
        const partes = fecha.split("/");
        if (partes.length !== 3) return null;
        return `${String(partes[1]).padStart(2, "0")}-${partes[2]}`;
      };

      const statsVacios = (mesAnio: string) => ({
        mes: mesAnio,
        trabajosReparados: 0,
        telefonosVendidos: 0,
        accesoriosVendidos: 0,
        generalesVendidos: 0,
        gananciaTrabajos: 0,
        gananciaVentasARS: 0,
        gananciaVentasUSD: 0,
        gananciaGeneralesARS: 0,
        gananciaGeneralesUSD: 0,
        cajaDelDia: {} as Record<string, number>,
      });

      const aplicarProductos = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stats: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        productos: any[],
        signo: 1 | -1,
        fechaCaja: string
      ) => {
        productos.forEach((p: any) => {
          const ganancia = Number(p.ganancia || 0) * signo;
          const cantidad = Number(p.cantidad || 1);

          if (p.tipo === "telefono") {
            stats.telefonosVendidos = Math.max(
              0,
              (stats.telefonosVendidos || 0) + signo * 1
            );
            if (p.moneda === "USD") {
              stats.gananciaVentasUSD = (stats.gananciaVentasUSD || 0) + ganancia;
            } else {
              stats.gananciaVentasARS = (stats.gananciaVentasARS || 0) + ganancia;
            }
          } else if (p.tipo === "accesorio" || p.tipo === "repuesto") {
            stats.accesoriosVendidos = Math.max(
              0,
              (stats.accesoriosVendidos || 0) + signo * cantidad
            );
            if (p.moneda === "USD") {
              stats.gananciaVentasUSD = (stats.gananciaVentasUSD || 0) + ganancia;
            } else {
              stats.gananciaVentasARS = (stats.gananciaVentasARS || 0) + ganancia;
            }
          } else if (p.tipo === "general" || p.tipo === "stockExtra") {
            stats.generalesVendidos = Math.max(
              0,
              (stats.generalesVendidos || 0) + signo * cantidad
            );
            if (p.moneda === "USD") {
              stats.gananciaGeneralesUSD = (stats.gananciaGeneralesUSD || 0) + ganancia;
            } else {
              stats.gananciaGeneralesARS = (stats.gananciaGeneralesARS || 0) + ganancia;
            }
          }

          if (fechaCaja && fechaCaja === diaActual) {
            const total = Number(p.total || 0) * signo;
            stats.cajaDelDia = stats.cajaDelDia || {};
            stats.cajaDelDia[fechaCaja] = (stats.cajaDelDia[fechaCaja] || 0) + total;
          }
        });
      };

      const actualizarMes = async (
        mesAnio: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        productosSuma: any[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        productosResta: any[],
        fechaCajaSuma: string,
        fechaCajaResta: string
      ) => {
        const estadisticasRef = db
          .collection(`negocios/${negocioID}/estadisticas`)
          .doc(mesAnio);
        try {
          const estadisticasDoc = await estadisticasRef.get();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let stats: any;
          if (estadisticasDoc.exists) {
            stats = estadisticasDoc.data();
          } else {
            stats = statsVacios(mesAnio);
          }

          aplicarProductos(stats, productosSuma, 1, fechaCajaSuma);
          aplicarProductos(stats, productosResta, -1, fechaCajaResta);

          await estadisticasRef.set(stats, {merge: true});
          console.log(`✅ Estadísticas de ventas actualizadas para ${mesAnio}`);
        } catch (error) {
          console.error("❌ Error actualizando estadísticas de ventas:", error);
        }
      };

      const mesAntes = mesAnioDeFecha(fechaAntes);
      const mesDespues = mesAnioDeFecha(fechaDespues);

      if (!antes && despues && mesDespues) {
        // Alta
        await actualizarMes(mesDespues, productosDespues, [], fechaDespues, "");
      } else if (antes && !despues && mesAntes) {
        // Baja (delete) — acá estaba el bug: no restaba porque no había fechaDespues
        await actualizarMes(mesAntes, [], productosAntes, "", fechaAntes);
      } else if (antes && despues) {
        // Update: si cambió de mes, restar en el viejo y sumar en el nuevo
        if (mesAntes && mesDespues && mesAntes === mesDespues) {
          await actualizarMes(
            mesDespues,
            productosDespues,
            productosAntes,
            fechaDespues,
            fechaAntes
          );
        } else {
          if (mesAntes) {
            await actualizarMes(mesAntes, [], productosAntes, "", fechaAntes);
          }
          if (mesDespues) {
            await actualizarMes(mesDespues, productosDespues, [], fechaDespues, "");
          }
        }
      }
    }

    return null;
  }
);

// ==========================================
// FUNCIÓN 3: Actualizar estadísticas de REPUESTOS
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
// FUNCIÓN 4: Actualizar estadísticas de ACCESORIOS
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
// FUNCIÓN 5: Actualizar estadísticas de TELÉFONOS
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
// FUNCIÓN 6: Actualizar estadísticas de STOCK EXTRA
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
// FUNCIONES AUXILIARES PARA INVENTARIO
// ==========================================

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

function calcularValorStockExtra(producto: any): {usd: number; ars: number} {
  const precioCosto = Number(producto.precioCosto || 0);
  const cantidad = Number(producto.cantidad || 0);

  return {
    usd: precioCosto * cantidad,
    ars: 0,
  };
}
