"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, doc, updateDoc, getDocs, query, where, limit, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cotizacionNegocioCaja } from "@/lib/caja/cotizacionCaja";
import { cotizacionVentaGeneral, montosPagoEnCuentaProveedor } from "@/lib/proveedores/cuentaProveedor";
import {
  impactoClienteDePago,
  listarVentasPendientesCliente,
  sincronizarVentaTrasPago,
  type VentaPendienteCliente,
} from "@/lib/ventas/vincularPagoVenta";

interface Trabajo {
  firebaseId?: string;
  cliente: string;
  precio?: number | string;
  estado: string;
  moneda?: "ARS" | "USD";
  trabajo?: string;
  modelo?: string;
  fecha?: string;
}

interface CuentaCorriente {
  cliente: string;
  saldoPesos: number;
  saldoUSD: number;
  trabajosPendientes?: Trabajo[];
}

interface Props {
  mostrar: boolean;
  clienteSeleccionado: CuentaCorriente | null;
  negocioID: string;
  onClose: () => void;
  onPagoGuardado: () => void;
}

function hoyInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convierte yyyy-mm-dd a fecha es-AR + Date (mediodía local, evita desfase de zona). */
function fechaDesdeInput(yyyyMmDd: string): { fecha: string; fechaCompleta: Date } {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) {
    const ahora = new Date();
    return { fecha: ahora.toLocaleDateString("es-AR"), fechaCompleta: ahora };
  }
  const fechaCompleta = new Date(y, m - 1, d, 12, 0, 0);
  return { fecha: fechaCompleta.toLocaleDateString("es-AR"), fechaCompleta };
}

/** Formato argentino al tipear: 130000 → 130.000 (USD admite ,00). */
function formatearMontoAR(valor: string, moneda: "ARS" | "USD" | string): string {
  if (moneda === "USD") {
    const limpio = valor.replace(/[^\d,]/g, "");
    const partes = limpio.split(",");
    const enteros = (partes[0] || "").replace(/^0+(?=\d)/, "") || (partes.length > 1 ? "0" : "");
    const enterosFmt = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if (partes.length > 1) return `${enterosFmt},${partes[1].slice(0, 2)}`;
    return enterosFmt;
  }
  const numero = valor.replace(/[^\d]/g, "");
  return numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parsearMontoAR(valor: string, moneda: "ARS" | "USD" | string): number {
  if (moneda === "USD") {
    return parseFloat(String(valor || "0").replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(String(valor || "0").replace(/\./g, "")) || 0;
}

function montoDesdeNumero(n: number, moneda: "ARS" | "USD" | string): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (moneda === "USD") {
    const fijo = n.toFixed(2).replace(".", ",");
    return formatearMontoAR(fijo, "USD");
  }
  return formatearMontoAR(String(Math.round(n)), "ARS");
}

export default function ModalPago({
  mostrar,
  clienteSeleccionado,
  negocioID,
  onClose,
  onPagoGuardado,
}: Props) {
  const [pago, setPago] = useState({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: "",
    fecha: hoyInputDate(),
    tipoDestino: "libre",
    proveedorSeleccionado: "",
    cotizacionProveedor: "",
  });
  
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [pagoGuardado, setPagoGuardado] = useState(false);
  const [proveedores, setProveedores] = useState<
    { id: string; nombre: string; categoria: string; cuentaUSD: boolean }[]
  >([]);
  const [ventasPendientes, setVentasPendientes] = useState<VentaPendienteCliente[]>([]);
  const [ventaIdAplicar, setVentaIdAplicar] = useState("");
  const [cargandoVentas, setCargandoVentas] = useState(false);

  useEffect(() => {
    if (!mostrar) return;
    setPago({
      monto: "",
      moneda: "ARS",
      formaPago: "",
      destino: "",
      observaciones: "",
      fecha: hoyInputDate(),
      tipoDestino: "libre",
      proveedorSeleccionado: "",
      cotizacionProveedor: "",
    });
    setPagoGuardado(false);
    setVentaIdAplicar("");
    setVentasPendientes([]);
  }, [mostrar, clienteSeleccionado?.cliente]);

  useEffect(() => {
    if (!mostrar || !negocioID) return;
    let cancelado = false;
    void (async () => {
      try {
        const [snap, cot] = await Promise.all([
          getDocs(collection(db, `negocios/${negocioID}/proveedores`)),
          cotizacionVentaGeneral(negocioID),
        ]);
        if (cancelado) return;
        setProveedores(
          snap.docs.map((d) => ({
            id: d.id,
            nombre: d.data().nombre,
            categoria: d.data().categoria || "",
            cuentaUSD: d.data().cuentaUSD === true,
          }))
        );
        if (cot) {
          setPago((prev) =>
            prev.cotizacionProveedor ? prev : { ...prev, cotizacionProveedor: String(cot) }
          );
        }
      } catch (error) {
        console.error("Error al cargar proveedores:", error);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [mostrar, negocioID]);

  useEffect(() => {
    if (!mostrar || !negocioID || !clienteSeleccionado?.cliente) return;
    let cancelado = false;
    setCargandoVentas(true);
    listarVentasPendientesCliente(negocioID, clienteSeleccionado.cliente)
      .then((lista) => {
        if (cancelado) return;
        setVentasPendientes(lista);
        setVentaIdAplicar(lista.length === 1 ? lista[0].id : "");
      })
      .catch((error) => {
        console.error("No se pudieron cargar las ventas pendientes:", error);
        if (!cancelado) setVentasPendientes([]);
      })
      .finally(() => {
        if (!cancelado) setCargandoVentas(false);
      });
    return () => {
      cancelado = true;
    };
  }, [mostrar, negocioID, clienteSeleccionado?.cliente]);

  if (!mostrar || !clienteSeleccionado) return null;

  // ⭐ NUEVO: Función para actualizar saldo del cliente
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

  const handlePagoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "monto") {
      setPago((prev) => ({
        ...prev,
        monto: formatearMontoAR(value, prev.moneda),
      }));
      return;
    }
    if (name === "moneda") {
      const moneda = value as "ARS" | "USD";
      setPago((prev) => {
        const numerico = parsearMontoAR(prev.monto, prev.moneda);
        return {
          ...prev,
          moneda,
          monto: numerico > 0 ? montoDesdeNumero(numerico, moneda) : "",
        };
      });
      return;
    }
    setPago((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const guardarPago = async () => {
    if (!pago.monto || !pago.formaPago) return;

    setGuardandoPago(true);
    try {
      const montoNumerico = parsearMontoAR(pago.monto, pago.moneda);
      if (montoNumerico <= 0) {
        alert("Ingresá un monto válido");
        setGuardandoPago(false);
        return;
      }
      const cotizacion = await cotizacionNegocioCaja(negocioID);
      const proveedor =
        pago.tipoDestino === "proveedor" && pago.proveedorSeleccionado
          ? proveedores.find((p) => p.nombre === pago.proveedorSeleccionado)
          : undefined;
      const cotizacionDeEsteProveedor =
        Number(pago.cotizacionProveedor) > 0
          ? Number(pago.cotizacionProveedor)
          : await cotizacionVentaGeneral(negocioID);
      const enCuenta = proveedor
        ? montosPagoEnCuentaProveedor({
            cuentaUSD: proveedor.cuentaUSD === true,
            moneda: pago.moneda,
            monto: montoNumerico,
            cotizacion: cotizacionDeEsteProveedor,
          })
        : null;
      if (enCuenta && "error" in enCuenta) {
        alert(enCuenta.error);
        return;
      }
      const destino =
        proveedor != null
          ? `Proveedor: ${proveedor.nombre}${proveedor.categoria ? ` (${proveedor.categoria})` : ""}`
          : pago.destino;
      const { fecha, fechaCompleta } = fechaDesdeInput(pago.fecha || hoyInputDate());
      const ventaAplicar = ventasPendientes.find((v) => v.id === ventaIdAplicar);
      const monedaPago = pago.moneda === "USD" ? "USD" : "ARS";
      const impacto = ventaAplicar
        ? impactoClienteDePago({
            moneda: monedaPago,
            monto: montoNumerico,
            cotizacion,
            totalARS: ventaAplicar.totalARS,
            totalUSD: ventaAplicar.totalUSD,
          })
        : null;
      
      const pagoData = {
        monto: pago.moneda === "USD" ? null : montoNumerico,
        montoUSD: pago.moneda === "USD" ? montoNumerico : null,
        moneda: pago.moneda,
        forma: pago.formaPago,
        destino,
        tipoDestino: pago.tipoDestino,
        proveedorDestino: proveedor ? proveedor.nombre : null,
        observaciones: pago.observaciones,
        cliente: clienteSeleccionado.cliente,
        fecha,
        fechaCompleta,
        tipo: 'ingreso',
        negocioID: negocioID,
        cotizacion,
        ...(ventaAplicar
          ? {
              nroVenta: ventaAplicar.nroVenta,
              ventaId: ventaAplicar.id,
              detallesPago: impacto?.detallesPago ?? null,
            }
          : {}),
      };

      await addDoc(collection(db, `negocios/${negocioID}/pagos`), pagoData);

      if (proveedor && enCuenta && !("error" in enCuenta)) {
        await addDoc(collection(db, `negocios/${negocioID}/pagosProveedores`), {
          proveedorId: proveedor.id,
          proveedorNombre: proveedor.nombre,
          fecha,
          monto: enCuenta.monto,
          montoUSD: enCuenta.montoUSD,
          montoARSOriginal: enCuenta.montoARSOriginal,
          cotizacion: cotizacionDeEsteProveedor,
          forma: pago.formaPago,
          referencia: `Pago desde cuenta corriente: ${clienteSeleccionado.cliente}`,
          notas: [pago.observaciones, enCuenta.notaConversion].filter(Boolean).join(" · "),
          fechaCreacion: new Date().toISOString(),
        });
      }

      await actualizarSaldoCliente(
        clienteSeleccionado.cliente,
        impacto ? impacto.ars : pago.moneda === "ARS" ? -montoNumerico : 0,
        impacto ? impacto.usd : pago.moneda === "USD" ? -montoNumerico : 0
      );
      if (ventaAplicar) {
        await sincronizarVentaTrasPago(negocioID, ventaAplicar.id);
      }
      console.log('💳 Saldo actualizado por pago desde cuenta corriente');

      // Marcar trabajos como pagados
      if (clienteSeleccionado.trabajosPendientes && clienteSeleccionado.trabajosPendientes.length > 0) {
        let montoRestante = montoNumerico;
        const trabajosOrdenados = [...clienteSeleccionado.trabajosPendientes].sort((a, b) => {
          const fechaA = new Date(a.fecha || '');
          const fechaB = new Date(b.fecha || '');
          return fechaA.getTime() - fechaB.getTime();
        });

        for (const trabajo of trabajosOrdenados) {
          if (montoRestante <= 0) break;
          
          const precioTrabajo = Number(trabajo.precio || 0);
          const monedaTrabajo = trabajo.moneda || "ARS";
          
          if (monedaTrabajo === pago.moneda && trabajo.firebaseId) {
            if (montoRestante >= precioTrabajo) {
              const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`);
              await updateDoc(trabajoRef, {
                estado: "PAGADO",
                estadoCuentaCorriente: "PAGADO",
                fechaModificacion: new Date().toLocaleDateString('es-AR')
              });
              montoRestante -= precioTrabajo;
            }
          }
        }
      }

      setPagoGuardado(true);

      setTimeout(() => {
        onPagoGuardado();
        onClose();
        setPago({
          monto: "",
          moneda: "ARS",
          formaPago: "",
          destino: "",
          observaciones: "",
          fecha: hoyInputDate(),
          tipoDestino: "libre",
          proveedorSeleccionado: "",
          cotizacionProveedor: "",
        });
        setPagoGuardado(false);
      }, 1500);

    } catch (error) {
      console.error("Error al guardar pago:", error);
      alert("Error al guardar el pago");
    } finally {
      setGuardandoPago(false);
    }
  };

  const formatPesos = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  const formatUSD = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(num);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-2xl lg:max-w-3xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden transform transition-all duration-300 flex flex-col sm:max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Registrar Pago</h3>
              <p className="text-green-100 text-xs sm:text-sm">
                Cliente: {clienteSeleccionado.cliente}
              </p>
              <p className="text-green-200 text-xs">
                Deuda: {formatPesos(clienteSeleccionado.saldoPesos)} | {formatUSD(clienteSeleccionado.saldoUSD)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={guardandoPago}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-110 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
          
          {/* Resumen de cuenta */}
          <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-xl p-4 text-white">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <span>📋</span>
              Resumen de la Cuenta
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-blue-100 text-xs">Saldo en Pesos</p>
                <p className="font-bold text-lg">{formatPesos(clienteSeleccionado.saldoPesos)}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-blue-100 text-xs">Saldo en USD</p>
                <p className="font-bold text-lg">{formatUSD(clienteSeleccionado.saldoUSD)}</p>
              </div>
            </div>
            
            {clienteSeleccionado.trabajosPendientes && clienteSeleccionado.trabajosPendientes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-blue-100 text-xs mb-2">Trabajos Pendientes:</p>
                <div className="space-y-1">
                  {clienteSeleccionado.trabajosPendientes.slice(0, 3).map((trabajo, idx) => (
                    <div key={idx} className="text-xs bg-white/10 rounded px-2 py-1">
                      {trabajo.modelo} - {trabajo.trabajo} - {trabajo.moneda === "USD" ? "USD $" : "$"}{trabajo.precio}
                    </div>
                  ))}
                  {clienteSeleccionado.trabajosPendientes.length > 3 && (
                    <div className="text-xs text-blue-200">
                      +{clienteSeleccionado.trabajosPendientes.length - 3} más...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border-2 border-[#8e44ad] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 flex items-center gap-2">
              <span>🧾</span>
              <span className="text-sm sm:text-base">Venta del remito</span>
            </h4>
            {cargandoVentas ? (
              <p className="text-sm text-[#7f8c8d]">Buscando ventas con saldo…</p>
            ) : ventasPendientes.length === 0 ? (
              <p className="text-sm text-[#7f8c8d]">
                Este cliente no tiene ventas con saldo. El pago solo baja la cuenta corriente.
              </p>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Aplicar este pago a
                </label>
                <select
                  value={ventaIdAplicar}
                  onChange={(e) => setVentaIdAplicar(e.target.value)}
                  disabled={guardandoPago}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm text-[#2c3e50]"
                >
                  <option value="">No vincular a una venta</option>
                  {ventasPendientes.map((venta) => (
                    <option key={venta.id} value={venta.id}>
                      {venta.etiqueta}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#7f8c8d]">
                  Si la elegís, al reimprimir el remito van a figurar este pago y el saldo que quede.
                </p>
              </div>
            )}
          </div>

          {/* Fecha del pago */}
          <div className="bg-white rounded-xl border-2 border-[#1abc9c] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#1abc9c] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">📅</span>
              </div>
              <span className="text-sm sm:text-base">Fecha del pago</span>
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                Fecha: *
              </label>
              <input
                type="date"
                name="fecha"
                value={pago.fecha}
                max={hoyInputDate()}
                onChange={handlePagoChange}
                disabled={guardandoPago}
                className="w-full sm:w-auto min-w-[200px] p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#1abc9c] focus:border-[#1abc9c] transition-all text-sm sm:text-base text-[#2c3e50] disabled:opacity-50"
              />
              <p className="text-xs text-[#7f8c8d]">
                Por defecto es hoy. Podés elegir una fecha anterior si el pago quedó sin cargar.
              </p>
            </div>
          </div>

          {/* Monto del pago */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">💰</span>
              </div>
              <span className="text-sm sm:text-base">Monto del Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Monto recibido: *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder={pago.moneda === "USD" ? "0,00" : "0"}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                  disabled={guardandoPago}
                />
                <p className="text-xs text-[#7f8c8d]">
                  {pago.moneda === "USD"
                    ? "Ej: 1.250,50"
                    : "Ej: 130.000"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Moneda: *
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  disabled={guardandoPago}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>

            {/* Botones rápidos */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-[#7f8c8d] w-full mb-1">Montos sugeridos:</span>
              {clienteSeleccionado.saldoPesos > 0 && (
                <button
                  type="button"
                  onClick={() => setPago(prev => ({
                    ...prev,
                    monto: montoDesdeNumero(clienteSeleccionado.saldoPesos, "ARS"),
                    moneda: "ARS"
                  }))}
                  disabled={guardandoPago}
                  className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                  Total ARS: {formatPesos(clienteSeleccionado.saldoPesos)}
                </button>
              )}
              {ventaIdAplicar && (() => {
                const venta = ventasPendientes.find((v) => v.id === ventaIdAplicar);
                if (!venta) return null;
                return (
                  <>
                    {venta.saldoUSD > 0.01 && (
                      <button
                        type="button"
                        onClick={() => setPago((prev) => ({
                          ...prev,
                          monto: montoDesdeNumero(venta.saldoUSD, "USD"),
                          moneda: "USD",
                        }))}
                        disabled={guardandoPago}
                        className="bg-[#8e44ad] hover:bg-[#7d3c98] text-white px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      >
                        Saldo de la venta USD: {formatUSD(venta.saldoUSD)}
                      </button>
                    )}
                    {venta.saldoARS > 0.01 && (
                      <button
                        type="button"
                        onClick={() => setPago((prev) => ({
                          ...prev,
                          monto: montoDesdeNumero(venta.saldoARS, "ARS"),
                          moneda: "ARS",
                        }))}
                        disabled={guardandoPago}
                        className="bg-[#8e44ad] hover:bg-[#7d3c98] text-white px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      >
                        Saldo de la venta ARS: {formatPesos(venta.saldoARS)}
                      </button>
                    )}
                  </>
                );
              })()}
              {clienteSeleccionado.saldoUSD > 0 && (
                <button
                  type="button"
                  onClick={() => setPago(prev => ({
                    ...prev,
                    monto: montoDesdeNumero(clienteSeleccionado.saldoUSD, "USD"),
                    moneda: "USD"
                  }))}
                  disabled={guardandoPago}
                  className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                  Total USD: {formatUSD(clienteSeleccionado.saldoUSD)}
                </button>
              )}
            </div>
          </div>

          {/* Método de pago */}
          <div className="bg-white rounded-xl border-2 border-[#9b59b6] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🏦</span>
              </div>
              <span className="text-sm sm:text-base">Método de Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Forma de pago: *
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="🔍 Ej: Efectivo, Transferencia..."
                  disabled={guardandoPago}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Destino (opcional):
                </label>
                <select
                  name="tipoDestino"
                  value={pago.tipoDestino}
                  onChange={(e) =>
                    setPago((prev) => ({
                      ...prev,
                      tipoDestino: e.target.value,
                      proveedorSeleccionado: e.target.value === "proveedor" ? prev.proveedorSeleccionado : "",
                      destino: e.target.value === "proveedor" ? "" : prev.destino,
                    }))
                  }
                  disabled={guardandoPago}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] disabled:opacity-50"
                >
                  <option value="libre">Escribir destino</option>
                  <option value="proveedor">Pagar a proveedor</option>
                </select>
                {pago.tipoDestino === "proveedor" ? (
                  <div className="mt-3 space-y-2">
                    <select
                      name="proveedorSeleccionado"
                      value={pago.proveedorSeleccionado}
                      onChange={handlePagoChange}
                      disabled={guardandoPago}
                      className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm sm:text-base text-[#2c3e50] disabled:opacity-50"
                    >
                      <option value="">Seleccionar proveedor</option>
                      {proveedores.map((proveedor) => (
                        <option key={proveedor.id} value={proveedor.nombre}>
                          {proveedor.nombre}
                          {proveedor.categoria ? ` (${proveedor.categoria})` : ""}
                        </option>
                      ))}
                    </select>
                    {proveedores.find((p) => p.nombre === pago.proveedorSeleccionado)?.cuentaUSD &&
                    pago.moneda === "ARS" ? (
                      <div>
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1">
                          Cotización del proveedor
                        </label>
                        <input
                          type="number"
                          name="cotizacionProveedor"
                          value={pago.cotizacionProveedor}
                          onChange={handlePagoChange}
                          disabled={guardandoPago}
                          placeholder="Ej: 1450"
                          className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white text-sm text-[#2c3e50] disabled:opacity-50"
                        />
                        <p className="text-xs text-[#7f8c8d] mt-1">
                          Solo pasa este pago de pesos a la cuenta en USD del proveedor. La caja
                          sigue en pesos
                          {Number(pago.cotizacionProveedor) > 0 && parsearMontoAR(pago.monto, "ARS") > 0
                            ? `. Impacta USD ${(Math.round((parsearMontoAR(pago.monto, "ARS") / Number(pago.cotizacionProveedor)) * 100) / 100).toLocaleString("es-AR")}`
                            : ""}
                          .
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <input
                    type="text"
                    name="destino"
                    value={pago.destino}
                    onChange={handlePagoChange}
                    placeholder="Cuenta bancaria, caja..."
                    disabled={guardandoPago}
                    className="mt-3 w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
                  />
                )}
              </div>
            </div>

            {/* Formas comunes */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-600 w-full mb-1">Formas comunes:</span>
              {['Efectivo', 'Transferencia', 'Tarjeta', 'MercadoPago'].map((forma) => (
                <button
                  key={forma}
                  type="button"
                  onClick={() => setPago(prev => ({ ...prev, formaPago: forma }))}
                  disabled={guardandoPago}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
                >
                  {forma}
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">📝</span>
              </div>
              <span className="text-sm sm:text-base">Observaciones</span>
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                Notas adicionales (opcional):
              </label>
              <textarea
                name="observaciones"
                value={pago.observaciones}
                onChange={handlePagoChange}
                placeholder="💭 Cualquier información adicional sobre el pago..."
                rows={3}
                disabled={guardandoPago}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Mensaje de éxito */}
          {pagoGuardado && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#27ae60] text-xs sm:text-sm font-bold">✓</span>
                </div>
                <span className="text-white font-semibold text-sm sm:text-lg">
                  ¡Pago registrado con éxito! Actualizando cuenta...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#ecf0f1] border-t-2 border-[#bdc3c7] p-3 sm:p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
            <button
              onClick={onClose}
              disabled={guardandoPago}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm sm:text-base disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardarPago}
              disabled={!pago.monto || !pago.formaPago || guardandoPago || pagoGuardado}
              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                !pago.monto || !pago.formaPago || guardandoPago || pagoGuardado
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#27ae60] hover:bg-[#229954] hover:scale-105"
              }`}
            >
              {guardandoPago ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar Pago</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}