"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  query,
  where,
  getDoc,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PagoConOrigen } from "../page";

interface TablaPagosProps {
  negocioID: string;
  pagos: PagoConOrigen[];
  setPagos: React.Dispatch<React.SetStateAction<PagoConOrigen[]>>;
}

export default function TablaPagos({ negocioID, pagos, setPagos }: TablaPagosProps) {
  const [mensaje, setMensaje] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [pagoAEliminar, setPagoAEliminar] = useState<{ id: string; origen: "pagos" | "pagos" } | null>(null);
  const [pagoEditando, setPagoEditando] = useState<PagoConOrigen | null>(null);
  const [form, setForm] = useState<any>({});

  // ⭐ Función para actualizar saldo del cliente
  const actualizarSaldoCliente = async (nombreCliente: string, sumarARS: number, sumarUSD: number) => {
    if (!negocioID) return;

    try {
      const clientesSnap = await getDocs(
        query(
          collection(db, `negocios/${negocioID}/clientes`),
          where("nombre", "==", nombreCliente),
          limit(1)
        )
      );

      if (clientesSnap.empty) {
        console.log(`⚠️ Cliente no encontrado: ${nombreCliente}`);
        return;
      }

      const clienteDoc = clientesSnap.docs[0];
      const datosCliente = clienteDoc.data();

      const nuevoSaldoARS = Number(datosCliente.saldoARS ?? 0) + Number(sumarARS);
      const nuevoSaldoUSD = Number(datosCliente.saldoUSD ?? 0) + Number(sumarUSD);

      await updateDoc(clienteDoc.ref, {
        saldoARS: Number(Math.round(nuevoSaldoARS * 100) / 100),
        saldoUSD: Number(Math.round(nuevoSaldoUSD * 100) / 100),
        ultimaActualizacion: serverTimestamp()
      });

      console.log(`✅ Saldo actualizado: ${nombreCliente} | ARS ${sumarARS > 0 ? '+' : ''}${sumarARS} | USD ${sumarUSD > 0 ? '+' : ''}${sumarUSD}`);
    } catch (error) {
      console.error(`❌ Error actualizando saldo de ${nombreCliente}:`, error);
    }
  };

  // Función para convertir fecha string a Date object
  const convertirFechaADate = (fecha: string): Date => {
    if (!fecha) return new Date(0);
    
    const [dia, mes, anio] = fecha.split("/");
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  };

  const obtenerPagos = async () => {
    if (!negocioID) return;
    try {
      const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
      const pagosCargados = pagosSnap.docs.map(doc => ({
        id: doc.id,
        origen: "pagos" as const,
        ...doc.data()
      })) as PagoConOrigen[];

      const pagosOrdenados = pagosCargados
        .filter((p) => p.fecha)
        .sort((a, b) => {
          const fechaA = convertirFechaADate(a.fecha || "");
          const fechaB = convertirFechaADate(b.fecha || "");
          return fechaB.getTime() - fechaA.getTime();
        }); 

      setPagos(pagosOrdenados);
    } catch (err) {
      console.error("❌ Error general en obtenerPagos:", err);
    }
  };

  useEffect(() => {
    obtenerPagos();
  }, [negocioID, setPagos]);

  const confirmarEliminar = async () => {
    if (!pagoAEliminar) return;
    
    try {
      // 1. 🔍 OBTENER LOS DATOS DEL PAGO ANTES DE ELIMINARLO
      const pagoDocRef = doc(db, `negocios/${negocioID}/pagos`, pagoAEliminar.id);
      const pagoDocSnap = await getDoc(pagoDocRef);
      
      if (!pagoDocSnap.exists()) {
        console.error("❌ Pago no encontrado");
        return;
      }
      
      const pagoData = pagoDocSnap.data();
      console.log("🔍 Datos del pago a eliminar:", pagoData);
  
      // 2. ✂️ ELIMINAR DE LA COLECCIÓN PRINCIPAL
      await deleteDoc(pagoDocRef);
      console.log("✅ Pago eliminado de colección principal");
  
      // 3. 🏢 SI ERA PAGO A PROVEEDOR, ELIMINARLO TAMBIÉN DE pagosProveedores
      if (pagoData && pagoData.tipoDestino === "proveedor" && pagoData.proveedorDestino) {
        console.log("🏢 Era pago a proveedor:", pagoData.proveedorDestino);
        
        const proveedoresSnap = await getDocs(collection(db, `negocios/${negocioID}/proveedores`));
        let proveedorId = null;
        
        proveedoresSnap.forEach((doc) => {
          if (doc.data().nombre === pagoData.proveedorDestino) {
            proveedorId = doc.id;
          }
        });
  
        if (proveedorId) {
          const pagosProveedorSnap = await getDocs(
            query(
              collection(db, `negocios/${negocioID}/pagosProveedores`),
              where("proveedorId", "==", proveedorId),
              where("fecha", "==", pagoData.fecha),
              where("monto", "==", pagoData.monto || 0),
              where("montoUSD", "==", pagoData.montoUSD || 0)
            )
          );
  
          console.log("🔍 Pagos de proveedor encontrados:", pagosProveedorSnap.size);
  
          const deletePromises = [];
          pagosProveedorSnap.forEach((docProveedor) => {
            console.log("🗑️ Eliminando pago de proveedor:", docProveedor.id);
            deletePromises.push(deleteDoc(docProveedor.ref));
          });
          
          await Promise.all(deletePromises);
          console.log("✅ Pagos eliminados también de pagosProveedores");
        } else {
          console.log("⚠️ No se encontró el proveedor ID para:", pagoData.proveedorDestino);
        }
      }

      // 4. ⭐ Devolver el pago al saldo del cliente (sumar porque se eliminó)
      if (pagoData && pagoData.cliente) {
        const montoARS = pagoData.monto || 0;
        const montoUSD = pagoData.montoUSD || 0;
        
        await actualizarSaldoCliente(
          pagoData.cliente,
          montoARS,  // Sumar (devolver) porque se eliminó el pago
          montoUSD
        );
        console.log('💳 Saldo actualizado por eliminación de pago');
      }
  
      setMensaje("✅ Pago eliminado completamente");
      obtenerPagos();
    } catch (err) {
      console.error("❌ Error eliminando pago:", err);
      setMensaje("❌ Error al eliminar pago");
    } finally {
      setPagoAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  const convertirFecha = (fecha: string): string => {
    const [dia, mes, anio] = fecha.split("/");
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  };
  
  const abrirEdicion = (pago: PagoConOrigen) => {
    setPagoEditando(pago);
  
    const fechaFormateada = typeof pago.fecha === "string"
      ? convertirFecha(pago.fecha)
      : "";
  
    setForm({
      cliente: pago.cliente || "",
      moneda: pago.moneda || "ARS",
      forma: pago.forma || "",
      monto: pago.monto ?? 0,
      montoUSD: pago.montoUSD ?? 0,
      destino: pago.destino || "",
      cotizacion: pago.cotizacion ?? 0,
      fecha: fechaFormateada,
    });
  };  

  const formatearFechaParaGuardar = (fecha: string): string => {
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  };
  
  const guardarEdicion = async () => {
    if (!pagoEditando) return;

    try {
      // 1. ⭐ OBTENER DATOS ORIGINALES DEL PAGO ANTES DE EDITAR
      const pagoRef = doc(db, `negocios/${negocioID}/${pagoEditando.origen}`, pagoEditando.id);
      const pagoSnap = await getDoc(pagoRef);
      
      if (!pagoSnap.exists()) {
        console.error("❌ Pago no encontrado");
        return;
      }
      
      const datosOriginales = pagoSnap.data();
      console.log("📋 Datos originales:", datosOriginales);

      // 2. PREPARAR DATOS ACTUALIZADOS
      const datosActualizados: any = {
        cliente: form.cliente,
        moneda: form.moneda,
        forma: form.forma,
        destino: form.destino,
        cotizacion: Number(form.cotizacion || 0),
      };

      if (form.moneda === "USD") {
        datosActualizados.montoUSD = Number(form.montoUSD);
        datosActualizados.monto = 0;
      } else {
        datosActualizados.monto = Number(form.monto);
        datosActualizados.montoUSD = 0;
      }

      if (form.fecha) {
        datosActualizados.fecha = formatearFechaParaGuardar(form.fecha);
      }

      // 3. ⭐ AJUSTAR SALDOS SEGÚN LOS CAMBIOS

      // PASO 3.1: Devolver el pago original al cliente original
      const clienteOriginal = datosOriginales.cliente;
      const montoOriginalARS = datosOriginales.monto || 0;
      const montoOriginalUSD = datosOriginales.montoUSD || 0;

      if (clienteOriginal) {
        await actualizarSaldoCliente(
          clienteOriginal,
          montoOriginalARS,  // Devolver (sumar) el pago original
          montoOriginalUSD
        );
        console.log(`✅ Devuelto pago original a ${clienteOriginal}: ARS ${montoOriginalARS} | USD ${montoOriginalUSD}`);
      }

      // PASO 3.2: Restar el nuevo pago al cliente nuevo (puede ser el mismo)
      const clienteNuevo = form.cliente;
      const montoNuevoARS = form.moneda === "ARS" ? Number(form.monto) : 0;
      const montoNuevoUSD = form.moneda === "USD" ? Number(form.montoUSD) : 0;

      if (clienteNuevo) {
        await actualizarSaldoCliente(
          clienteNuevo,
          -montoNuevoARS,  // Restar el nuevo pago
          -montoNuevoUSD
        );
        console.log(`✅ Restado nuevo pago a ${clienteNuevo}: ARS ${montoNuevoARS} | USD ${montoNuevoUSD}`);
      }

      // 4. GUARDAR CAMBIOS EN FIREBASE
      await updateDoc(pagoRef, datosActualizados);
      
      setMensaje("✅ Pago editado y saldos actualizados");
      setPagoEditando(null);
      obtenerPagos();
    } catch (err) {
      console.error("❌ Error editando pago:", err);
      setMensaje("❌ Error al editar pago");
    }
  };

  const pagosFiltrados = pagos.filter(p => 
    (p.cliente || "").toLowerCase().includes(filtroCliente.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Mensaje de estado */}
      {mensaje && (
        <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-[#27ae60] rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-[#27ae60] font-semibold text-lg">{mensaje}</span>
          </div>
        </div>
      )}

      {/* Modal de edición - Estilo GestiOne */}
      {pagoEditando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✏️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Editar Pago</h2>
                  <p className="text-blue-100 text-sm mt-1">Modificar información del pago</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-[#f8f9fa]">
              
              {/* Fecha */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">📅 Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">👤 Cliente</label>
                <input
                  type="text"
                  value={form.cliente}
                  onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="Nombre del cliente"
                />
              </div>

              {/* Moneda */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">💱 Moneda</label>
                <select
                  value={form.moneda}
                  onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos</option>
                  <option value="USD">🇺🇸 Dólares</option>
                </select>
              </div>

              {/* Monto según moneda */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💵 Monto {form.moneda === "USD" ? "(USD)" : "($)"}
                </label>
                {form.moneda === "USD" ? (
                  <input
                    type="number"
                    value={form.montoUSD}
                    onChange={e => setForm(f => ({ ...f, montoUSD: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                    placeholder="Monto en USD"
                  />
                ) : (
                  <input
                    type="number"
                    value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                    placeholder="Monto en pesos"
                  />
                )}
              </div>

              {/* Forma de pago */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">💳 Forma de Pago</label>
                <input
                  type="text"
                  value={form.forma}
                  onChange={e => setForm(f => ({ ...f, forma: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="Efectivo, Tarjeta, etc."
                />
              </div>

              {/* Destino */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">🎯 Destino</label>
                <input
                  type="text"
                  value={form.destino}
                  onChange={e => setForm(f => ({ ...f, destino: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="Concepto del pago"
                />
              </div>

              {/* Cotización */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">📈 Cotización</label>
                <input
                  type="number"
                  value={form.cotizacion}
                  onChange={e => setForm(f => ({ ...f, cotizacion: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="Cotización USD"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setPagoEditando(null)}
                  className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEdicion}
                  className="px-6 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  💾 Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )} 

      {/* Filtro de búsqueda - Estilo GestiOne */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">🔍</span>
          </div>
          <h3 className="text-xl font-bold text-[#2c3e50]">Buscar Pagos</h3>
        </div>
        
        <input
          type="text"
          placeholder="🔍 Filtrar por cliente"
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="w-full max-w-md px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
        />
      </div>

      {/* Tabla principal - Estilo GestiOne */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Lista de Pagos</h3>
              <p className="text-blue-100 mt-1">
                {pagosFiltrados.length} pagos registrados (ordenados por fecha - más reciente primero)
              </p>
            </div>
          </div>
        </div>

        {/* Tabla con scroll */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse border-2 border-black">
            <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    Fecha
                  </div>
                </th>
                <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    Cliente
                  </div>
                </th>
                <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💵</span>
                    Monto
                  </div>
                </th>
                <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💱</span>
                    Moneda
                  </div>
                </th>
                <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💳</span>
                    Forma
                  </div>
                </th>
                <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    Destino
                  </div>
                </th>
                <th className="p-4 text-center text-sm font-semibold text-[#2c3e50] border border-black bg-[#ecf0f1]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base">⚙️</span>
                    Acciones
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.map((pago, index) => {
                const isEven = index % 2 === 0;
                return (
                  <tr key={`${pago.id}-${pago.origen}`} className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                    <td className="p-4 border border-black">
                      <span className="text-sm font-medium text-[#2c3e50] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                        {typeof pago.fecha === "string" ? pago.fecha : "Fecha inválida"}
                      </span>
                    </td>
                    <td className="p-4 border border-black">
                      <span className="text-sm font-semibold text-[#3498db]">{pago.cliente}</span>
                    </td>
                    <td className="p-4 border border-black">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-[#27ae60] bg-green-50 px-3 py-1 rounded-lg w-fit">
                          {String(pago.moneda || "ARS").toUpperCase() === "USD"
                            ? `USD ${Number(pago.montoUSD || 0).toLocaleString("es-AR")}`
                            : `$ ${Number(pago.monto || 0).toLocaleString("es-AR")}`}
                        </span>
                        {pago?.detallesPago?.tipo === "ARS_a_USD" &&
                          Number(pago?.detallesPago?.montoARSOriginal || 0) > 0 &&
                          Number(pago?.detallesPago?.cotizacionPago || 0) > 0 && (
                            <span className="text-[11px] text-[#7f8c8d]">
                              Pagado en ARS ${Number(pago.detallesPago.montoARSOriginal).toLocaleString("es-AR")} a cotización{" "}
                              ${Number(pago.detallesPago.cotizacionPago).toLocaleString("es-AR")}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="p-4 border border-black">
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${
                        pago.moneda === 'USD' 
                          ? 'bg-[#27ae60] text-white' 
                          : 'bg-[#3498db] text-white'
                      }`}>
                        {pago.moneda}
                      </span>
                    </td>
                    <td className="p-4 border border-black">
                      <span className="text-sm text-[#2c3e50]">{pago.forma}</span>
                    </td>
                    <td className="p-4 border border-black">
                      <span className="text-sm text-[#7f8c8d]">{pago.destino}</span>
                    </td>
                    <td className="p-4 border border-black">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => abrirEdicion(pago)}
                          className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() =>
                            setPagoAEliminar({ id: pago.id, origen: pago.origen })
                          }
                          className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación de eliminación - Estilo GestiOne */}
      {pagoAEliminar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border-2 border-[#ecf0f1] transform transition-all duration-300">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm mt-1">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-[#f8f9fa]">
              <div className="bg-white border-2 border-[#e74c3c] rounded-xl p-4 shadow-sm">
                <p className="text-[#2c3e50] font-semibold text-center">
                  ¿Estás seguro que querés eliminar este pago?
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setPagoAEliminar(null)}
                  className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminar}
                  className="px-6 py-3 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}