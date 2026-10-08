"use client";

import { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  calcularSaldosVenta,
  calcularUsdDesdeARS,
  creditoUSDVentaSoloUSD,
  esVentaSoloUSD,
  notaConversionARSaUSD,
} from "@/lib/ventas/pagoDualHelpers";

type MonedaLinea = "ARS" | "USD";

export type ItemPagoLinea = {
  moneda: MonedaLinea;
  monto: number;
  formaPago: string;
};

type BorradorPago = {
  moneda: MonedaLinea | "";
  formaPago: string;
  formaLibre: string;
  monto: string;
};

interface Props {
  mostrar: boolean;
  pago: {
    monto: string;
    montoUSD: string;
    moneda: string;
    formaPago: string;
    destino: string;
    observaciones: string;
    tipoDestino?: string;
    proveedorSeleccionado?: string;
    destinoLibre?: string;
    cotizacionPago?: number;
    lineas?: ItemPagoLinea[];
  } | null;
  totalesVenta?: {
    totalARS: number;
    totalUSD: number;
    cotizacion: number;
  };
  telefonoComoPago?: {
    marca: string;
    modelo: string;
    valorPago: number;
    moneda: string;
  } | null;
  telefonosComoPago?: {
    marca: string;
    modelo: string;
    valorPago: number;
    moneda: string;
  }[];
  negocioID: string;
  onClose: () => void;
  handlePagoChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onGuardarPago: (nuevoPago: any) => void;
  guardadoConExito: boolean;
}

const FORMAS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Tarjeta",
  "MercadoPago",
  "Cripto",
  "Otros",
] as const;

function itemsDesdePago(pago: Props["pago"]): ItemPagoLinea[] {
  const guardadas = Array.isArray(pago?.lineas) ? pago!.lineas : [];
  if (guardadas.length > 0) {
    return guardadas
      .filter(
        (l) =>
          (l.moneda === "ARS" || l.moneda === "USD") &&
          Number(l.monto) > 0
      )
      .map((l) => ({
        moneda: l.moneda,
        monto: Number(l.monto) || 0,
        formaPago: String(l.formaPago || pago?.formaPago || "Efectivo").trim() || "Efectivo",
      }));
  }
  const ars = parseFloat(pago?.monto || "") || 0;
  const usd = parseFloat(pago?.montoUSD || "") || 0;
  const forma = String(pago?.formaPago || "Efectivo").trim() || "Efectivo";
  const items: ItemPagoLinea[] = [];
  if (ars > 0) items.push({ moneda: "ARS", monto: ars, formaPago: forma });
  if (usd > 0) items.push({ moneda: "USD", monto: usd, formaPago: forma });
  return items;
}

const borradorVacio = (): BorradorPago => ({
  moneda: "",
  formaPago: "",
  formaLibre: "",
  monto: "",
});

function formaEfectiva(b: BorradorPago): string {
  if (b.formaPago === "Otros") {
    return b.formaLibre.trim() || "Otros";
  }
  return b.formaPago.trim();
}

export default function ModalPago({
  mostrar,
  pago,
  totalesVenta,
  telefonoComoPago,
  telefonosComoPago = [],
  negocioID,
  onClose,
  handlePagoChange,
  onGuardarPago,
  guardadoConExito,
}: Props) {
  const idPrefix = useId();
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [items, setItems] = useState<ItemPagoLinea[]>(() => itemsDesdePago(pago));
  const [borrador, setBorrador] = useState<BorradorPago>(borradorVacio);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);

  const cotizacionInicial = () => {
    const delPago = Number(pago?.cotizacionPago);
    if (Number.isFinite(delPago) && delPago > 0) return delPago;
    return totalesVenta?.cotizacion || 1000;
  };

  const [cotizacionPago, setCotizacionPago] = useState<number>(cotizacionInicial);

  useEffect(() => {
    if (!mostrar) return;
    setItems(itemsDesdePago(pago));
    setBorrador(borradorVacio());
    setEditandoIndex(null);
    const delPago = Number(pago?.cotizacionPago);
    if (Number.isFinite(delPago) && delPago > 0) {
      setCotizacionPago(delPago);
    } else {
      setCotizacionPago(totalesVenta?.cotizacion || 1000);
    }
  }, [mostrar]); // solo al abrir

  useEffect(() => {
    if (!negocioID || !mostrar) return;

    const fetchProveedores = async () => {
      try {
        const snap = await getDocs(collection(db, `negocios/${negocioID}/proveedores`));
        const proveedoresData = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          nombre: docSnap.data().nombre,
          categoria: docSnap.data().categoria || "",
        }));
        setProveedores(proveedoresData);
      } catch (error) {
        console.error("Error al cargar proveedores:", error);
      }
    };

    fetchProveedores();
  }, [negocioID, mostrar]);

  if (!mostrar || !pago) return null;

  const pagoSeguro = {
    monto: pago.monto || "",
    montoUSD: pago.montoUSD || "",
    moneda: pago.moneda || "ARS",
    formaPago: pago.formaPago || "",
    destino: pago.destino || "",
    observaciones: pago.observaciones || "",
    tipoDestino: pago.tipoDestino || "libre",
    proveedorSeleccionado: pago.proveedorSeleccionado || "",
    destinoLibre: pago.destinoLibre || "",
  };

  const pagoARS = items
    .filter((l) => l.moneda === "ARS")
    .reduce((acc, l) => acc + (Number(l.monto) || 0), 0);
  const pagoUSD = items
    .filter((l) => l.moneda === "USD")
    .reduce((acc, l) => acc + (Number(l.monto) || 0), 0);
  const cotizacionUsada = cotizacionPago > 0 ? cotizacionPago : totalesVenta?.cotizacion || 1000;
  const hayPesos = items.some((l) => l.moneda === "ARS") || borrador.moneda === "ARS";

  const ventaSoloUSD = totalesVenta
    ? esVentaSoloUSD(totalesVenta.totalARS, totalesVenta.totalUSD)
    : false;

  const listaTelefonosPago = (
    telefonosComoPago.length > 0
      ? telefonosComoPago
      : telefonoComoPago
        ? [telefonoComoPago]
        : []
  )
    .filter((t) => Number(t.valorPago || 0) > 0)
    .map((t) => ({
      valorPago: Number(t.valorPago || 0),
      moneda: t.moneda || "ARS",
    }));

  const descuentoTelefonoPagoARS = listaTelefonosPago
    .filter((t) => String(t.moneda).toUpperCase() !== "USD")
    .reduce((acc, t) => acc + t.valorPago, 0);
  const descuentoTelefonoPagoUSD = listaTelefonosPago
    .filter((t) => String(t.moneda).toUpperCase() === "USD")
    .reduce((acc, t) => acc + t.valorPago, 0);

  const usdDesdeARS = ventaSoloUSD ? calcularUsdDesdeARS(pagoARS, cotizacionUsada) : 0;
  const creditoUSD = ventaSoloUSD
    ? creditoUSDVentaSoloUSD(pagoARS, pagoUSD, cotizacionUsada)
    : Math.max(0, pagoUSD);

  const telefonosComoPagoUI =
    telefonosComoPago.length > 0
      ? telefonosComoPago
      : telefonoComoPago
        ? [telefonoComoPago]
        : [];

  const { saldoARS, saldoUSD, totalAproximado, saldoAproximado } = calcularSaldosVenta({
    totalARS: totalesVenta?.totalARS ?? 0,
    totalUSD: totalesVenta?.totalUSD ?? 0,
    pagoARS,
    pagoUSD,
    cotizacion: cotizacionUsada,
    telefonosPago: listaTelefonosPago,
  });

  const obtenerDestino = () => {
    if (pagoSeguro.tipoDestino === "proveedor" && pagoSeguro.proveedorSeleccionado) {
      const proveedor = proveedores.find((p) => p.nombre === pagoSeguro.proveedorSeleccionado);
      return `Proveedor: ${pagoSeguro.proveedorSeleccionado}${
        proveedor?.categoria ? ` (${proveedor.categoria})` : ""
      }`;
    }
    return pagoSeguro.destinoLibre;
  };

  const handleCampo = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    handlePagoChange(e);
  };

  const montoBorrador = parseFloat(borrador.monto) || 0;
  const formaBorrador = formaEfectiva(borrador);
  const borradorCompleto =
    (borrador.moneda === "ARS" || borrador.moneda === "USD") &&
    formaBorrador !== "" &&
    montoBorrador > 0;

  const preguardarBorrador = () => {
    if (!borradorCompleto || !borrador.moneda) return;
    const nuevo: ItemPagoLinea = {
      moneda: borrador.moneda,
      monto: montoBorrador,
      formaPago: formaBorrador,
    };
    if (editandoIndex != null) {
      setItems((prev) => prev.map((it, i) => (i === editandoIndex ? nuevo : it)));
      setEditandoIndex(null);
    } else {
      setItems((prev) => [...prev, nuevo]);
    }
    setBorrador(borradorVacio());
  };

  const editarItem = (index: number) => {
    const it = items[index];
    if (!it) return;
    const esPreset = (FORMAS_PAGO as readonly string[]).includes(it.formaPago);
    setBorrador({
      moneda: it.moneda,
      formaPago: esPreset ? it.formaPago : "Otros",
      formaLibre: esPreset ? "" : it.formaPago,
      monto: String(it.monto),
    });
    setEditandoIndex(index);
  };

  const quitarItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editandoIndex === index) {
      setEditandoIndex(null);
      setBorrador(borradorVacio());
    } else if (editandoIndex != null && editandoIndex > index) {
      setEditandoIndex(editandoIndex - 1);
    }
  };

  const iniciarOtroPago = () => {
    setEditandoIndex(null);
    setBorrador(borradorVacio());
  };

  const handleGuardarPago = () => {
    // Si hay borrador completo sin preguardar, lo incluye
    let itemsFinal = [...items];
    if (borradorCompleto && borrador.moneda) {
      const nuevo: ItemPagoLinea = {
        moneda: borrador.moneda,
        monto: montoBorrador,
        formaPago: formaBorrador,
      };
      if (editandoIndex != null) {
        itemsFinal = itemsFinal.map((it, i) => (i === editandoIndex ? nuevo : it));
      } else {
        itemsFinal = [...itemsFinal, nuevo];
      }
    }

    const ars = itemsFinal
      .filter((l) => l.moneda === "ARS")
      .reduce((a, l) => a + l.monto, 0);
    const usd = itemsFinal
      .filter((l) => l.moneda === "USD")
      .reduce((a, l) => a + l.monto, 0);

    if (ars <= 0 && usd <= 0) return;

    const usdEquiv = ventaSoloUSD ? calcularUsdDesdeARS(ars, cotizacionUsada) : 0;
    const creditoTotalUSD = ventaSoloUSD
      ? creditoUSDVentaSoloUSD(ars, usd, cotizacionUsada)
      : usd;
    const notaConversion =
      ventaSoloUSD && ars > 0 && cotizacionUsada > 0
        ? notaConversionARSaUSD(ars, usdEquiv, cotizacionUsada)
        : "";

    const formasUnicas = Array.from(
      new Set(itemsFinal.map((l) => l.formaPago).filter(Boolean))
    );

    const pagoFormateado = {
      monto: ars > 0 ? String(ars) : "",
      montoUSD: usd > 0 ? String(usd) : "",
      moneda:
        usd > 0 && ars > 0
          ? "DUAL"
          : usd > 0 || (ventaSoloUSD && creditoTotalUSD > 0)
            ? "USD"
            : "ARS",
      formaPago: formasUnicas.join(" + ") || "Efectivo",
      destino: obtenerDestino(),
      tipoDestino: pagoSeguro.tipoDestino,
      proveedorDestino:
        pagoSeguro.tipoDestino === "proveedor" ? pagoSeguro.proveedorSeleccionado : null,
      observaciones: [pagoSeguro.observaciones, notaConversion].filter(Boolean).join(" • "),
      cotizacionPago: cotizacionUsada,
      pagoARSAplicadoAUSD: ventaSoloUSD && ars > 0,
      lineas: itemsFinal,
    };

    onGuardarPago(pagoFormateado);
  };

  const puedeGuardar =
    (items.length > 0 || borradorCompleto) && !guardadoConExito;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483001] bg-black/40 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full h-[100dvh] max-h-[100dvh] sm:h-[95dvh] sm:max-h-[95dvh] sm:max-w-4xl lg:max-w-5xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden flex flex-col min-h-0">
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-3 sm:p-6 flex justify-between items-center gap-2 flex-shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-lg sm:text-2xl">💳</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-2xl font-bold truncate">Registrar pago</h3>
              <p className="text-green-100 text-xs sm:text-sm truncate">
                Cada cobro con su moneda y medio (caja)
              </p>
            </div>
          </div>

          {totalesVenta && hayPesos && (
            <div className="hidden md:flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 flex-shrink-0">
              <span className="text-green-100 text-xs">💱</span>
              <span className="text-white text-sm font-medium">
                $1 USD = ${cotizacionUsada.toLocaleString()} ARS
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 flex-shrink-0"
          >
            ×
          </button>
        </div>

        {totalesVenta && hayPesos && (
          <div className="md:hidden bg-[#1e8449] text-white px-3 py-1.5 text-center text-xs font-medium flex-shrink-0">
            💱 $1 USD = ${cotizacionUsada.toLocaleString()} ARS
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-3 sm:space-y-6 bg-[#f8f9fa] min-h-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {totalesVenta && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-blue-200 p-4 sm:p-6 shadow-sm">
              <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm">📊</span>
                </div>
                <span>Resumen de Totales</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">
                      $
                    </span>
                    <span className="font-semibold text-green-800">Pesos Argentinos</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total venta:</span>
                      <span className="font-bold text-green-700">
                        ${totalesVenta.totalARS.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagando:</span>
                      <span className="font-medium text-blue-600">${pagoARS.toLocaleString()}</span>
                    </div>
                    {descuentoTelefonoPagoARS > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Teléfono{telefonosComoPagoUI.length > 1 ? "s" : ""} entregado:
                        </span>
                        <span className="font-medium text-purple-600">
                          ${descuentoTelefonoPagoARS.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">Saldo ARS:</span>
                        <span
                          className={`font-bold ${
                            saldoARS > 0
                              ? "text-red-600"
                              : saldoARS < 0
                                ? "text-blue-600"
                                : "text-green-600"
                          }`}
                        >
                          ${Math.abs(saldoARS).toLocaleString()}
                          {saldoARS < 0 && <span className="text-xs ml-1">(favor)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                      $
                    </span>
                    <span className="font-semibold text-blue-800">Dólares USD</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total venta:</span>
                      <span className="font-bold text-blue-700">
                        USD ${totalesVenta.totalUSD.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagando:</span>
                      <span className="font-medium text-green-600">
                        USD ${pagoUSD.toLocaleString()}
                        {ventaSoloUSD && usdDesdeARS > 0 && (
                          <span className="block text-xs text-blue-700 font-normal">
                            + ${pagoARS.toLocaleString()} ARS ≈ USD ${usdDesdeARS.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                    {ventaSoloUSD && creditoUSD > 0 && (
                      <div className="flex justify-between text-xs text-blue-800">
                        <span>Total aplicado a deuda USD:</span>
                        <span className="font-semibold">USD ${creditoUSD.toFixed(2)}</span>
                      </div>
                    )}
                    {descuentoTelefonoPagoUSD > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Teléfono{telefonosComoPagoUI.length > 1 ? "s" : ""} entregado:
                        </span>
                        <span className="font-medium text-purple-600">
                          USD ${descuentoTelefonoPagoUSD.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">Saldo USD:</span>
                        <span
                          className={`font-bold ${
                            saldoUSD > 0
                              ? "text-red-600"
                              : saldoUSD < 0
                                ? "text-blue-600"
                                : "text-green-600"
                          }`}
                        >
                          USD ${Math.abs(saldoUSD).toLocaleString()}
                          {saldoUSD < 0 && <span className="text-xs ml-1">(favor)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {telefonosComoPagoUI.length > 0 && (
                <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">
                      📱
                    </span>
                    <span className="font-semibold text-purple-800">
                      Teléfono{telefonosComoPagoUI.length > 1 ? "s" : ""} como Parte de Pago
                    </span>
                  </div>
                  <div className="space-y-2">
                    {telefonosComoPagoUI.map((tel, index) => (
                      <div
                        key={`modal-pago-tel-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-white/70 rounded-lg p-2"
                      >
                        <div>
                          <span className="text-gray-600">Equipo:</span>
                          <div className="font-medium text-purple-700">
                            {tel.marca} {tel.modelo}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Valor:</span>
                          <div className="font-bold text-purple-800">
                            {String(tel.moneda).toUpperCase() === "USD" ? "USD $" : "$"}
                            {Number(tel.valorPago).toLocaleString()}
                            {String(tel.moneda).toUpperCase() === "ARS" ? " ARS" : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 bg-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Total aproximado en ARS:</span>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">
                      ${totalAproximado.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Saldo: ${Math.abs(saldoAproximado).toLocaleString()}
                      {saldoAproximado < 0 && " (favor)"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de pagos preguardados */}
          {items.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-[#27ae60] p-4 sm:p-5 shadow-sm space-y-3">
              <h4 className="text-sm sm:text-base font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-7 h-7 bg-[#27ae60] rounded-lg flex items-center justify-center text-white text-xs">
                  ✓
                </span>
                Pagos en este cobro
              </h4>
              <div className="space-y-2">
                {items.map((it, index) => {
                  const esARS = it.moneda === "ARS";
                  const editando = editandoIndex === index;
                  return (
                    <div
                      key={`${idPrefix}-item-${index}`}
                      className={`rounded-xl border-2 p-3 flex flex-wrap items-center justify-between gap-2 ${
                        editando
                          ? "border-[#f39c12] bg-[#fef9e7]"
                          : "border-[#ecf0f1] bg-[#f8f9fa]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#2c3e50] text-sm">
                          {esARS ? "Pesos (ARS)" : "Dólares (USD)"} · {it.formaPago}
                        </p>
                        <p className="text-xs text-[#7f8c8d]">
                          {esARS && ventaSoloUSD && cotizacionUsada > 0
                            ? `≈ USD ${(it.monto / cotizacionUsada).toFixed(2)} a deuda`
                            : esARS
                              ? "Ingreso físico en ARS"
                              : "Ingreso físico en USD"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-sm ${
                            esARS ? "text-[#27ae60]" : "text-[#3498db]"
                          }`}
                        >
                          {esARS
                            ? `$${it.monto.toLocaleString("es-AR")} ARS`
                            : `USD $${it.monto.toLocaleString("es-AR")}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => editarItem(index)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#3498db]/10 text-[#2980b9] hover:bg-[#3498db]/20"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => quitarItem(index)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#e74c3c]/10 text-[#c0392b] hover:bg-[#e74c3c]/20"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Borrador: un pago a la vez */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm">💰</span>
                </div>
                <span className="text-sm sm:text-base">
                  {editandoIndex != null ? `Editando pago ${editandoIndex + 1}` : "Nuevo pago"}
                </span>
              </h4>
              {(items.length > 0 || editandoIndex != null) && (
                <button
                  type="button"
                  onClick={iniciarOtroPago}
                  className="text-xs sm:text-sm font-semibold text-[#2980b9] hover:underline"
                >
                  + Agregar otro pago
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2c3e50] mb-2">1. Moneda</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setBorrador((b) => ({
                      ...b,
                      moneda: "ARS",
                      formaPago: b.formaPago,
                    }))
                  }
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    borrador.moneda === "ARS"
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-white border-[#bdc3c7] text-[#2c3e50] hover:border-green-500"
                  }`}
                >
                  Pesos (ARS)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBorrador((b) => ({
                      ...b,
                      moneda: "USD",
                      formaPago: b.formaPago,
                    }))
                  }
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    borrador.moneda === "USD"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-[#bdc3c7] text-[#2c3e50] hover:border-blue-500"
                  }`}
                >
                  Dólares (USD)
                </button>
              </div>
            </div>

            {borrador.moneda ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#2c3e50] mb-2">
                    2. Medio de pago
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FORMAS_PAGO.map((forma) => (
                      <button
                        key={forma}
                        type="button"
                        onClick={() =>
                          setBorrador((b) => ({
                            ...b,
                            formaPago: forma,
                            formaLibre: forma === "Otros" ? b.formaLibre : "",
                          }))
                        }
                        className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border-2 transition-colors ${
                          borrador.formaPago === forma
                            ? "bg-[#9b59b6] border-[#9b59b6] text-white"
                            : "bg-white border-[#bdc3c7] text-[#2c3e50] hover:border-[#9b59b6]"
                        }`}
                      >
                        {forma}
                      </button>
                    ))}
                  </div>
                  {borrador.formaPago === "Otros" && (
                    <input
                      type="text"
                      value={borrador.formaLibre}
                      onChange={(e) =>
                        setBorrador((b) => ({ ...b, formaLibre: e.target.value }))
                      }
                      placeholder="Especificá el medio…"
                      className="mt-2 w-full p-2.5 border-2 border-[#bdc3c7] rounded-lg text-sm"
                    />
                  )}
                </div>

                {formaBorrador !== "" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#2c3e50]">
                      3. Monto en {borrador.moneda === "ARS" ? "pesos" : "dólares"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={borrador.monto}
                      onChange={(e) => setBorrador((b) => ({ ...b, monto: e.target.value }))}
                      placeholder={borrador.moneda === "ARS" ? "0" : "0.00"}
                      className={`w-full p-3 border-2 rounded-lg bg-white focus:ring-2 transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d] ${
                        borrador.moneda === "ARS"
                          ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                          : "border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                      }`}
                    />

                    {borrador.moneda === "ARS" &&
                      totalesVenta &&
                      totalesVenta.totalUSD > 0 && (
                        <div className="bg-[#f1f5ff] border border-blue-200 rounded-lg p-3 space-y-2">
                          {ventaSoloUSD && (
                            <p className="text-xs text-blue-900 font-medium">
                              Venta en USD: este cobro en pesos se imputa a la deuda en USD (en
                              caja figura como ARS, no como billetes USD).
                            </p>
                          )}
                          <div>
                            <div className="text-xs text-blue-800 font-medium mb-1">
                              Cotización del cobro
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              value={cotizacionPago}
                              onChange={(e) => setCotizacionPago(Number(e.target.value))}
                              className="w-full p-2 border-2 border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium text-[#2c3e50]"
                              placeholder="Ej: 1430"
                            />
                          </div>
                          {montoBorrador > 0 && cotizacionUsada > 0 && (
                            <div className="text-xs text-blue-800">
                              Este ítem ≈ USD {(montoBorrador / cotizacionUsada).toFixed(2)} al
                              cambio ${cotizacionUsada.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!borradorCompleto}
                  onClick={preguardarBorrador}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    borradorCompleto
                      ? "bg-[#3498db] hover:bg-[#2980b9] text-white"
                      : "bg-[#bdc3c7] text-white cursor-not-allowed"
                  }`}
                >
                  {editandoIndex != null ? "Actualizar pago" : "Preguardar este pago"}
                </button>
              </>
            ) : (
              <p className="text-xs text-[#7f8c8d]">
                Elegí pesos o dólares. Después el medio (efectivo, transferencia, etc.) y el
                monto.
              </p>
            )}

            {(pagoARS > 0 || pagoUSD > 0) && (
              <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-[#2c3e50] bg-[#eef6ff] rounded-lg p-3 border border-blue-100">
                {pagoARS > 0 && (
                  <span className="font-medium text-green-700">
                    Total pesos: ${pagoARS.toLocaleString("es-AR")}
                  </span>
                )}
                {pagoUSD > 0 && (
                  <span className="font-medium text-blue-700">
                    Total dólares físicos: USD ${pagoUSD.toLocaleString("es-AR")}
                  </span>
                )}
                {ventaSoloUSD && pagoARS > 0 && (
                  <span className="font-medium text-blue-800">
                    Pesos ≈ USD {usdDesdeARS.toFixed(2)} a deuda (caja: ARS)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border-2 border-[#e74c3c] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#e74c3c] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🎯</span>
              </div>
              <span className="text-sm sm:text-base">Destino del Pago</span>
            </h4>

            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Tipo de destino:{" "}
                  <span className="text-[#7f8c8d] font-normal">(opcional)</span>
                </label>
                <select
                  name="tipoDestino"
                  value={pagoSeguro.tipoDestino}
                  onChange={(e) => {
                    handleCampo(e);
                    if (e.target.value === "proveedor") {
                      handleCampo({ target: { name: "destinoLibre", value: "" } } as any);
                    } else {
                      handleCampo({
                        target: { name: "proveedorSeleccionado", value: "" },
                      } as any);
                    }
                  }}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="libre">Escribir destino</option>
                  <option value="proveedor">Pagar a proveedor</option>
                </select>
              </div>

              {pagoSeguro.tipoDestino === "proveedor" ? (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#2c3e50]">
                    Seleccionar Proveedor:{" "}
                    <span className="text-[#7f8c8d] font-normal">(opcional)</span>
                  </label>
                  <select
                    name="proveedorSeleccionado"
                    value={pagoSeguro.proveedorSeleccionado}
                    onChange={handleCampo}
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#8e44ad] focus:border-[#8e44ad] transition-all text-sm sm:text-base text-[#2c3e50]"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.nombre}>
                        {proveedor.nombre}{" "}
                        {proveedor.categoria && `(${proveedor.categoria})`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#2c3e50]">
                    Concepto del Pago:{" "}
                    <span className="text-[#7f8c8d] font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="destinoLibre"
                    value={pagoSeguro.destinoLibre}
                    onChange={handleCampo}
                    placeholder="Ej: Caja chica, Cuenta bancaria, etc."
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                  />
                </div>
              )}

              {((pagoSeguro.tipoDestino === "proveedor" && pagoSeguro.proveedorSeleccionado) ||
                (pagoSeguro.tipoDestino === "libre" && pagoSeguro.destinoLibre)) && (
                <div className="p-3 bg-gradient-to-r from-[#f8f9fa] to-[#e9ecef] rounded-lg border border-[#dee2e6]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6c757d] text-sm font-medium">Destino seleccionado:</span>
                    <span className="text-[#2c3e50] font-semibold text-sm">{obtenerDestino()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

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
                value={pagoSeguro.observaciones}
                onChange={handleCampo}
                placeholder="Cualquier información adicional sobre el pago..."
                rows={3}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
              />
            </div>
          </div>

          {guardadoConExito && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#27ae60] text-xs sm:text-sm font-bold">✓</span>
                </div>
                <span className="text-white font-semibold text-sm sm:text-lg">
                  ¡Pago registrado con éxito!
                  {pagoSeguro.tipoDestino === "proveedor" &&
                    " (También registrado para el proveedor)"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#ecf0f1] border-t-2 border-[#bdc3c7] p-3 sm:p-4 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 min-h-[48px] bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarPago}
              disabled={!puedeGuardar}
              className={`w-full sm:w-auto px-6 sm:px-8 py-3 min-h-[48px] rounded-lg font-medium text-white transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                !puedeGuardar
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#27ae60] hover:bg-[#229954]"
              }`}
            >
              Guardar pagos
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
