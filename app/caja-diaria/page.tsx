"use client";

import { useCallback, useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import Header from "@/app/Header";
import ModalAbrirCaja from "./components/ModalAbrirCaja";
import ModalAgregarGasto from "./components/ModalAgregarGasto";
import ModalArqueoCierre from "./components/ModalArqueoCierre";
import ModalMovimientoManual from "./components/ModalMovimientoManual";
import HistorialCierres from "./components/HistorialCierres";
import type { ResumenCajaDia, SesionCaja } from "@/lib/caja/cajaTypes";
import { calcularResumenCajaDia, formatearPrecioCaja, formatearUsdCaja } from "@/lib/caja/calcularResumenDia";
import { fechaCajaHoy } from "@/lib/caja/fechaCaja";
import { labelMedioPago, MEDIOS_PAGO_CAJA } from "@/lib/caja/mediosPago";
import { obtenerSesionAbierta, obtenerSesionDelDia } from "@/lib/caja/sesionCaja";
import { puedeOperarCajaDiaria, puedeOperarCajaMayor } from "@/lib/caja/permisosCaja";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function CajaDiariaPage() {
  const { rol } = useRol();
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionCaja | null>(null);
  const [resumen, setResumen] = useState<ResumenCajaDia | null>(null);
  const [cotizacionUSD, setCotizacionUSD] = useState(1000);
  const [cargando, setCargando] = useState(true);
  const [mostrarAbrir, setMostrarAbrir] = useState(false);
  const [mostrarGasto, setMostrarGasto] = useState(false);
  const [mostrarIngreso, setMostrarIngreso] = useState(false);
  const [mostrarEgreso, setMostrarEgreso] = useState(false);
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const hoy = fechaCajaHoy();

  const cargar = useCallback(async () => {
    if (!rol?.negocioID) return;
    setCargando(true);
    try {
      const cfg = await getDoc(doc(db, `negocios/${rol.negocioID}/configuracion/datos`));
      if (cfg.exists()) {
        const cot = Number(cfg.data().cotizacion ?? cfg.data().cotizacionDolar ?? 0);
        if (cot > 0) setCotizacionUSD(cot);
      }

      let s = await obtenerSesionAbierta(rol.negocioID);
      if (!s) s = await obtenerSesionDelDia(rol.negocioID, hoy);
      setSesion(s);

      if (s?.estado === "abierta" && s.id) {
        const r = await calcularResumenCajaDia({
          negocioId: rol.negocioID,
          fecha: hoy,
          sesionId: s.id,
          saldoInicialARS: s.saldoInicialARS,
          saldoInicialUSD: s.saldoInicialUSD,
        });
        setResumen(r);
      } else {
        setResumen(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [rol?.negocioID, hoy]);

  useEffect(() => {
    if (!rol) return;
    if (!puedeOperarCajaDiaria(rol.tipo)) {
      router.push("/");
      return;
    }
    cargar();
  }, [rol, router, cargar]);

  const cajaAbierta = sesion?.estado === "abierta";
  const cajaCerradaHoy = sesion?.estado === "cerrada";

  if (cargando) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-[#f8f9fa] p-4 text-[#2c3e50]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Caja Diaria</h1>
                <p className="text-blue-100 text-sm">{hoy}</p>
                <p className="text-xs mt-2 opacity-90">
                  {cajaAbierta
                    ? `Abierta · fondo ${formatearPrecioCaja(sesion?.saldoInicialARS ?? 0)} ARS${
                        (sesion?.saldoInicialUSD ?? 0) > 0
                          ? ` · ${formatearUsdCaja(sesion?.saldoInicialUSD ?? 0)} billetes`
                          : ""
                      }`
                    : cajaCerradaHoy
                      ? "Caja del día cerrada"
                      : "Sin apertura — abrí la caja para operar"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!cajaAbierta && !cajaCerradaHoy && (
                  <button
                    onClick={() => setMostrarAbrir(true)}
                    className="bg-white text-[#2c3e50] px-4 py-2 rounded-lg font-bold"
                  >
                    Abrir caja
                  </button>
                )}
                <button
                  onClick={() => setMostrarHistorial(true)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg"
                >
                  Historial
                </button>
              </div>
            </div>
          </div>

          {!cajaAbierta && !cajaCerradaHoy && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
              <p className="text-[#2c3e50] font-medium mb-3">
                Abrí la caja del día para registrar movimientos y ver el resumen en tiempo real.
              </p>
              <button
                onClick={() => setMostrarAbrir(true)}
                className="bg-[#3498db] text-white px-6 py-3 rounded-xl font-bold"
              >
                Abrir caja del día
              </button>
            </div>
          )}

          {resumen && cajaAbierta && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow border border-[#ecf0f1]">
                  <p className="text-sm text-[#7f8c8d]">Saldo inicial (apertura)</p>
                  <p className="text-2xl font-bold text-[#3498db]">
                    {formatearPrecioCaja(resumen.saldoInicialARS)}
                  </p>
                  {(resumen.saldoInicialUSD ?? 0) > 0 && (
                    <p className="text-sm font-semibold text-[#2980b9] mt-1">
                      + {formatearUsdCaja(resumen.saldoInicialUSD)} billetes
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-[#ecf0f1]">
                  <p className="text-sm text-[#7f8c8d]">Ingresos del día</p>
                  <p className="text-2xl font-bold text-[#27ae60]">
                    {formatearPrecioCaja(resumen.ingresos.total)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-[#ecf0f1]">
                  <p className="text-sm text-[#7f8c8d]">Egresos del día</p>
                  <p className="text-2xl font-bold text-[#e74c3c]">
                    {formatearPrecioCaja(resumen.egresos.total)}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow border border-[#ecf0f1] text-[#2c3e50]">
                <h2 className="text-lg font-bold text-[#2c3e50] mb-4">Ingresos del día</h2>
                <div className="space-y-3 text-sm">
                  <Row label="Cobros trabajos" value={resumen.ingresos.cobrosTrabajos} />

                  {Math.abs(resumen.ingresos.ventasContado) >= 0.01 && (
                    <div className="rounded-lg border border-[#ecf0f1] bg-[#f8f9fa] p-3 space-y-2">
                      <div className="flex justify-between gap-4">
                        <span className="font-semibold text-[#2c3e50]">Ventas al contado</span>
                        <span className="font-bold text-[#2c3e50] shrink-0">
                          {formatearPrecioCaja(resumen.ingresos.ventasContado)}
                        </span>
                      </div>
                      <div className="space-y-1 border-l-2 border-[#bdc3c7] pl-3">
                        <Row label="Teléfonos ARS" value={resumen.ingresos.ventasTelefonoARS} indent />
                        <Row
                          label="Teléfonos USD (equiv.)"
                          value={resumen.ingresos.ventasTelefonoUSDEquivARS}
                          indent
                        />
                        <Row label="Accesorios" value={resumen.ingresos.ventasAccesorios} indent />
                        <Row label="Repuestos stock" value={resumen.ingresos.ventasRepuestoStock} indent />
                        <Row label="Repuestos stockExtra" value={resumen.ingresos.ventasRepuestoExtra} indent />
                      </div>
                    </div>
                  )}

                  <Row label="Cobros cuenta corriente" value={resumen.ingresos.cobrosCuentaCorriente} highlight />
                  <Row label="Ingresos manuales" value={resumen.ingresos.ingresosManuales} />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow border border-[#ecf0f1]">
                <h2 className="text-lg font-bold text-[#2c3e50] mb-4">Cobros por moneda</h2>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#f8f9fa] rounded-lg p-3 border">
                    <p className="text-xs text-[#7f8c8d]">Cobrado en ARS</p>
                    <p className="font-bold text-[#2c3e50]">
                      {formatearPrecioCaja(resumen.totalesPorMoneda.ingresosARS)}
                    </p>
                  </div>
                  <div className="bg-[#f8f9fa] rounded-lg p-3 border">
                    <p className="text-xs text-[#7f8c8d]">Cobrado en USD</p>
                    <p className="font-bold text-[#2c3e50]">
                      USD {resumen.totalesPorMoneda.ingresosUSD.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                    {resumen.totalesPorMoneda.ingresosUSDEquivARS > 0 && (
                      <p className="text-xs text-[#7f8c8d] mt-1">
                        ≈ {formatearPrecioCaja(resumen.totalesPorMoneda.ingresosUSDEquivARS)} ARS
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow border border-[#ecf0f1]">
                <h2 className="text-lg font-bold text-[#2c3e50] mb-4">Por medio de pago</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MEDIOS_PAGO_CAJA.map(({ id }) => {
                    const v = resumen.medios[id];
                    const usdFisico = resumen.mediosFisicoUSD[id];
                    if (Math.abs(v) < 1 && Math.abs(usdFisico) < 0.01) return null;
                    return (
                      <div key={id} className="bg-[#f8f9fa] rounded-lg p-3 border">
                        <p className="text-xs text-[#7f8c8d]">{labelMedioPago(id)}</p>
                        {id === "usd_billete" && Math.abs(usdFisico) >= 0.01 ? (
                          <>
                            <p className="font-bold text-[#2c3e50]">{formatearUsdCaja(usdFisico)}</p>
                            {Math.abs(v) >= 1 && (
                              <p className="text-xs text-[#7f8c8d] mt-1">≈ {formatearPrecioCaja(v)} ARS</p>
                            )}
                          </>
                        ) : (
                          <p className="font-bold text-[#2c3e50]">{formatearPrecioCaja(v)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setMostrarIngreso(true)}
                  className="flex-1 min-w-[140px] bg-green-600 text-white py-3 rounded-xl font-bold"
                >
                  + Ingreso manual
                </button>
                <button
                  onClick={() => setMostrarGasto(true)}
                  className="flex-1 min-w-[140px] bg-red-600 text-white py-3 rounded-xl font-bold"
                >
                  + Gasto
                </button>
                <button
                  onClick={() => setMostrarEgreso(true)}
                  className="flex-1 min-w-[140px] bg-orange-600 text-white py-3 rounded-xl font-bold"
                >
                  − Egreso manual
                </button>
                <button
                  onClick={() => setMostrarCierre(true)}
                  className="flex-1 min-w-[140px] bg-[#27ae60] text-white py-3 rounded-xl font-bold"
                >
                  Arqueo y cierre
                </button>
              </div>
            </>
          )}

          {cajaCerradaHoy && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <p className="font-bold text-[#27ae60]">La caja de hoy ya fue cerrada.</p>
              <p className="text-sm text-[#7f8c8d] mt-1">
                Revisá el historial o volvé mañana para abrir una nueva sesión.
              </p>
            </div>
          )}
        </div>
      </main>

      {mostrarAbrir && rol?.negocioID && (
        <ModalAbrirCaja
          negocioID={rol.negocioID}
          onClose={() => setMostrarAbrir(false)}
          onAbierta={() => {
            setMostrarAbrir(false);
            cargar();
          }}
        />
      )}

      {mostrarGasto && rol?.negocioID && (
        <ModalAgregarGasto
          negocioID={rol.negocioID}
          onClose={() => setMostrarGasto(false)}
          onGuardado={() => {
            setMostrarGasto(false);
            cargar();
          }}
        />
      )}

      {mostrarIngreso && sesion?.id && rol && (
        <ModalMovimientoManual
          negocioID={rol.negocioID}
          sesionId={sesion.id}
          rolTipo={rol.tipo}
          tipo="ingreso"
          onClose={() => setMostrarIngreso(false)}
          onGuardado={() => {
            setMostrarIngreso(false);
            cargar();
          }}
        />
      )}

      {mostrarEgreso && sesion?.id && rol && (
        <ModalMovimientoManual
          negocioID={rol.negocioID}
          sesionId={sesion.id}
          rolTipo={rol.tipo}
          tipo="egreso"
          onClose={() => setMostrarEgreso(false)}
          onGuardado={() => {
            setMostrarEgreso(false);
            cargar();
          }}
        />
      )}

      {mostrarCierre && sesion?.id && resumen && rol?.negocioID && (
        <ModalArqueoCierre
          negocioID={rol.negocioID}
          sesionId={sesion.id}
          resumen={resumen}
          cotizacionUSD={cotizacionUSD}
          onClose={() => setMostrarCierre(false)}
          onCerrado={() => {
            setMostrarCierre(false);
            cargar();
          }}
        />
      )}

      {mostrarHistorial && rol?.negocioID && (
        <HistorialCierres negocioID={rol.negocioID} onClose={() => setMostrarHistorial(false)} />
      )}
    </>
  );
}

function Row({
  label,
  value,
  indent,
  highlight,
}: {
  label: string;
  value: number;
  indent?: boolean;
  highlight?: boolean;
}) {
  if (Math.abs(value) < 0.01) return null;
  return (
    <div className={`flex justify-between gap-4 ${indent ? "pl-4" : ""}`}>
      <span
        className={
          highlight
            ? "font-semibold !text-[#8e44ad]"
            : indent
              ? "text-[#7f8c8d]"
              : "!text-[#2c3e50]"
        }
      >
        {label}
      </span>
      <span className="font-bold !text-[#2c3e50] shrink-0">{formatearPrecioCaja(value)}</span>
    </div>
  );
}
