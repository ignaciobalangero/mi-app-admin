"use client";

import { useState } from "react";
import type { ArqueoMedioPago, ResumenCajaDia } from "@/lib/caja/cajaTypes";
import { MEDIOS_PAGO_CAJA } from "@/lib/caja/mediosPago";
import {
  calcularEsperadoPorMedio,
  calcularEsperadoUsdBilleteFisico,
  formatearPrecioCaja,
  formatearUsdCaja,
} from "@/lib/caja/calcularResumenDia";
import { cerrarSesionCaja } from "@/lib/caja/sesionCaja";
import { auth } from "@/lib/auth";

function mostrarToastCaja(mensaje: string, tipo: "ok" | "error" = "ok") {
  const toast = document.createElement("div");
  const ok = tipo === "ok";
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, ${ok ? "#27ae60 0%, #2ecc71" : "#e74c3c 0%, #c0392b"} 100%);
    color: white;
    padding: 20px 28px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 100010;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 16px;
    font-weight: 600;
    max-width: min(90vw, 420px);
    text-align: left;
  `;
  toast.innerHTML = `
    <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
      ${ok ? "✓" : "!"}
    </div>
    <span>${mensaje}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) document.body.removeChild(toast);
  }, 2800);
}

interface Props {
  negocioID: string;
  sesionId: string;
  resumen: ResumenCajaDia;
  cotizacionUSD: number;
  onClose: () => void;
  onCerrado: () => void;
}

export default function ModalArqueoCierre({
  negocioID,
  sesionId,
  resumen,
  cotizacionUSD,
  onClose,
  onCerrado,
}: Props) {
  const esperadoPorMedio = calcularEsperadoPorMedio(resumen, cotizacionUSD);
  const esperadoUsdBillete = calcularEsperadoUsdBilleteFisico(resumen);
  const fondoInicialARS = resumen.saldoInicialARS || 0;
  const fondoInicialUSD = resumen.saldoInicialUSD || 0;
  const efectivoDelDiaARS = resumen.medios.efectivo_ars || 0;
  const usdCobradoHoy = resumen.mediosFisicoUSD?.usd_billete ?? 0;
  const [contados, setContados] = useState<Record<string, string>>({});
  const [fondoManana, setFondoManana] = useState(String(resumen.saldoInicialARS || ""));
  const [justificacion, setJustificacion] = useState("");
  const [paso, setPaso] = useState<"arqueo" | "cierre">("arqueo");
  const [cerrando, setCerrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const esperadoEfectivoARS = esperadoPorMedio.efectivo_ars || 0;
  const esperadoUsdArsEquiv =
    cotizacionUSD > 0 ? esperadoUsdBillete * cotizacionUSD : 0;

  const contadoEfectivoARS = Number(contados.efectivo_ars ?? "") || 0;
  const contadoUsdBillete = Number(contados.usd_billete ?? "") || 0;
  const contadoUsdArsEquiv =
    cotizacionUSD > 0 ? contadoUsdBillete * cotizacionUSD : 0;

  const difEfectivoARS = contadoEfectivoARS - esperadoEfectivoARS;
  const difUsdBillete = contadoUsdBillete - esperadoUsdBillete;

  const hayDiferenciaEfectivo =
    Boolean(contados.efectivo_ars?.trim()) && Math.abs(difEfectivoARS) > 1;
  const hayDiferenciaUsd =
    Boolean(contados.usd_billete?.trim()) && Math.abs(difUsdBillete) >= 0.01;

  const hayDiferenciaOtros = MEDIOS_PAGO_CAJA.some(({ id }) => {
    if (id === "efectivo_ars" || id === "usd_billete") return false;
    const esp = esperadoPorMedio[id] || 0;
    if (esp === 0 && !contados[id]?.trim()) return false;
    const cont = Number(contados[id] ?? "") || 0;
    return Math.abs(cont - esp) > 1;
  });

  const hayDiferencia = hayDiferenciaEfectivo || hayDiferenciaUsd || hayDiferenciaOtros;

  const arqueo: ArqueoMedioPago[] = MEDIOS_PAGO_CAJA.map(({ id, label }) => {
    const esperadoARS =
      id === "usd_billete" ? esperadoUsdArsEquiv : esperadoPorMedio[id] || 0;
    const raw = Number(contados[id] ?? "") || 0;
    const contadoARS = id === "usd_billete" ? contadoUsdArsEquiv : raw;
    const base = {
      medio: id,
      label,
      esperadoARS,
      contadoARS,
      diferenciaARS: contadoARS - esperadoARS,
    };
    if (id === "usd_billete") {
      return {
        ...base,
        esperadoUSD: esperadoUsdBillete,
        contadoUSD: contadoUsdBillete,
        diferenciaUSD: difUsdBillete,
      };
    }
    return base;
  }).filter((a) => {
    if (a.medio === "efectivo_ars") return true;
    if (a.medio === "usd_billete") {
      return esperadoUsdBillete >= 0.01 || Number(contados.usd_billete ?? "") > 0;
    }
    return a.esperadoARS !== 0 || Number(contados[a.medio] ?? "") > 0;
  });

  const totalEsperado = arqueo.reduce((s, a) => s + a.esperadoARS, 0);
  const totalContado = arqueo.reduce((s, a) => s + a.contadoARS, 0);
  const diferenciaTotal = totalContado - totalEsperado;

  const efectivoContado = contadoEfectivoARS;
  const fondo = Number(fondoManana) || 0;
  const enviadoMayor = Math.max(0, efectivoContado - fondo);

  const continuarACierre = () => {
    setAviso(null);
    if (arqueo.length === 0) {
      setAviso("Completá al menos el arqueo de efectivo ARS.");
      return;
    }
    if (!contados.efectivo_ars?.trim()) {
      setAviso("Ingresá el total de efectivo ARS contado en caja.");
      return;
    }
    if (esperadoUsdBillete >= 0.01 && !contados.usd_billete?.trim()) {
      setAviso("Ingresá el total de USD billetes contados en caja.");
      return;
    }
    if (hayDiferencia && !justificacion.trim()) {
      setAviso("Hay diferencia en el arqueo. Indicá el motivo antes de continuar.");
      return;
    }
    setPaso("cierre");
  };

  const confirmarCierre = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setAviso(null);
    if (fondo > efectivoContado) {
      setAviso("El fondo para mañana no puede superar el efectivo ARS contado.");
      return;
    }
    setCerrando(true);
    try {
      await cerrarSesionCaja({
        negocioId: negocioID,
        sesionId,
        totales: {
          saldoFinalEsperadoARS: totalEsperado,
          saldoFinalContadoARS: totalContado,
          diferenciaARS: diferenciaTotal,
          diferenciaUSD: difUsdBillete,
          fondoSiguienteDiaARS: fondo,
          enviadoCajaMayorARS: enviadoMayor,
          cotizacionUSD,
          arqueo,
          arqueoJustificacion: justificacion.trim(),
          resumenCierre: {
            ingresos: resumen.ingresos,
            egresos: resumen.egresos,
            netoDiaARS: resumen.netoDiaARS,
            transferenciasARS: resumen.medios.transferencia,
            transferenciasUSD: 0,
            tarjetasARS:
              resumen.medios.tarjeta_debito + resumen.medios.tarjeta_credito,
            cuentaCorrienteARS: resumen.ingresos.cobrosCuentaCorriente,
            cuentaCorrienteUSD: 0,
            gastosARS: resumen.egresos.gastosOperativos,
            gastosUSD: 0,
          },
        },
        usuario: user.email || user.uid,
        usuarioId: user.uid,
      });
      onCerrado();
      mostrarToastCaja("Caja cerrada correctamente");
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Error al cerrar la caja.");
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6 rounded-t-2xl">
          <h3 className="text-xl font-bold">
            {paso === "arqueo" ? "Arqueo de Caja" : "Cierre de Caja"}
          </h3>
          <p className="text-sm text-green-100">
            {paso === "arqueo"
              ? "Contá/verificá cada medio de pago"
              : "Definí el fondo para mañana y confirmá el cierre"}
          </p>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {aviso && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex gap-2">
              <span className="font-bold shrink-0">!</span>
              <span>{aviso}</span>
            </div>
          )}
          {paso === "arqueo" ? (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#2c3e50]">
                <p className="font-semibold mb-1">¿Qué tenés que contar?</p>
                <p className="text-[#566573]">
                  El <strong>esperado</strong> no es solo lo cobrado hoy: es lo que debería haber
                  físicamente en caja = <strong>fondo de apertura</strong> + movimientos del día
                  (cobros − gastos en efectivo). &quot;Cobros por moneda&quot; muestra solo lo
                  ingresado hoy, sin el fondo inicial.
                </p>
              </div>

              {MEDIOS_PAGO_CAJA.map(({ id, label }) => {
                const espARS = esperadoPorMedio[id] || 0;
                const esUsdBillete = id === "usd_billete";
                const espUSD = esperadoUsdBillete;

                if (id === "efectivo_ars") {
                  // siempre visible
                } else if (esUsdBillete) {
                  if (espUSD < 0.01 && espARS < 1) return null;
                } else if (espARS === 0) {
                  return null;
                }

                const contadoRaw = Number(contados[id] ?? "") || 0;
                const diffUSD = esUsdBillete ? contadoRaw - espUSD : 0;
                const diffARS = esUsdBillete ? diffUSD * (cotizacionUSD || 0) : contadoRaw - espARS;
                const muestraDiff = esUsdBillete
                  ? Boolean(contados[id]?.trim()) && Math.abs(diffUSD) >= 0.01
                  : Boolean(contados[id]?.trim()) && Math.abs(diffARS) > 1;

                return (
                  <div key={id} className="border rounded-lg p-3 border-[#ecf0f1]">
                    <div className="flex justify-between text-sm mb-2 gap-2">
                      <span className="font-medium">{label}</span>
                      <span className="text-[#7f8c8d] text-right">
                        {esUsdBillete ? (
                          <>
                            <span className="block font-semibold text-[#2c3e50]">
                              En caja: {formatearUsdCaja(espUSD)}
                            </span>
                            {fondoInicialUSD > 0 && (
                              <span className="block text-xs">
                                Fondo apertura: {formatearUsdCaja(fondoInicialUSD)}
                              </span>
                            )}
                            {usdCobradoHoy > 0 && (
                              <span className="block text-xs">
                                Cobrado hoy: {formatearUsdCaja(usdCobradoHoy)}
                              </span>
                            )}
                          </>
                        ) : id === "efectivo_ars" ? (
                          <>
                            <span className="block font-semibold text-[#2c3e50]">
                              En caja: {formatearPrecioCaja(espARS)}
                            </span>
                            {fondoInicialARS > 0 && (
                              <span className="block text-xs">
                                Fondo apertura: {formatearPrecioCaja(fondoInicialARS)}
                              </span>
                            )}
                            <span className="block text-xs">
                              Efectivo neto del día: {formatearPrecioCaja(efectivoDelDiaARS)}
                            </span>
                          </>
                        ) : (
                          <>Esperado: {formatearPrecioCaja(espARS)}</>
                        )}
                      </span>
                    </div>
                    <input
                      type="number"
                      placeholder={
                        esUsdBillete
                          ? "Total USD billetes en caja (fondo + cobrado)"
                          : id === "efectivo_ars"
                            ? "Total efectivo ARS en caja (fondo + cobrado − gastos)"
                            : id === "transferencia"
                              ? "Monto verificado (ARS)"
                              : "Monto contado / verificado (ARS)"
                      }
                      value={contados[id] ?? ""}
                      onChange={(e) => {
                        setAviso(null);
                        setContados((prev) => ({ ...prev, [id]: e.target.value }));
                      }}
                      className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg bg-white text-[#2c3e50] [color-scheme:light]"
                    />
                    {muestraDiff && (
                      <p
                        className={`text-xs mt-1 font-bold ${(esUsdBillete ? diffUSD : diffARS) > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                          Diferencia:{" "}
                          {esUsdBillete ? (
                            <>
                              {diffUSD > 0 ? "+" : ""}
                              {formatearUsdCaja(diffUSD)}
                              {cotizacionUSD > 0 && (
                                <span className="font-normal text-[#7f8c8d]">
                                  {" "}
                                  (≈ {formatearPrecioCaja(diffARS)} ARS)
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {diffARS > 0 ? "+" : ""}
                              {formatearPrecioCaja(diffARS)}
                            </>
                          )}
                        </p>
                      )}
                  </div>
                );
              })}

              {hayDiferencia && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Motivo de la diferencia *
                  </label>
                  <textarea
                    value={justificacion}
                    onChange={(e) => {
                      setAviso(null);
                      setJustificacion(e.target.value);
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border-2 border-red-200 rounded-lg bg-white text-[#2c3e50] [color-scheme:light]"
                    placeholder="Ej: faltante por cambio mal dado…"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-[#f8f9fa] rounded-lg p-4 text-sm space-y-1">
                <p>
                  <strong>Efectivo contado:</strong> {formatearPrecioCaja(efectivoContado)}
                </p>
                <p>
                  <strong>Diferencia total arqueo:</strong>{" "}
                  {Math.abs(diferenciaTotal) <= 1
                    ? "Sin diferencia"
                    : formatearPrecioCaja(diferenciaTotal)}
                </p>
                <p>
                  <strong>Enviado a Caja Mayor:</strong>{" "}
                  {formatearPrecioCaja(enviadoMayor)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fondo fijo para mañana (ARS) *
                </label>
                <input
                  type="number"
                  value={fondoManana}
                  onChange={(e) => setFondoManana(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg bg-white text-[#2c3e50] [color-scheme:light]"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-[#f8f9fa] rounded-b-2xl flex gap-3">
          <button
            onClick={paso === "cierre" ? () => setPaso("arqueo") : onClose}
            className="flex-1 px-4 py-3 bg-[#95a5a6] text-white rounded-lg font-medium"
          >
            {paso === "cierre" ? "Volver" : "Cancelar"}
          </button>
          <button
            onClick={paso === "arqueo" ? continuarACierre : confirmarCierre}
            disabled={cerrando}
            className="flex-1 px-4 py-3 bg-[#27ae60] hover:bg-[#229954] disabled:bg-[#bdc3c7] text-white rounded-lg font-bold"
          >
            {paso === "arqueo"
              ? "Continuar al cierre"
              : cerrando
                ? "Cerrando…"
                : "Confirmar cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
