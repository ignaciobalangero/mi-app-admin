"use client";

import { useState } from "react";
import type { ArqueoMedioPago, ResumenCajaDia } from "@/lib/caja/cajaTypes";
import { MEDIOS_PAGO_CAJA } from "@/lib/caja/mediosPago";
import { calcularEsperadoPorMedio, formatearPrecioCaja } from "@/lib/caja/calcularResumenDia";
import { cerrarSesionCaja } from "@/lib/caja/sesionCaja";
import { auth } from "@/lib/auth";

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
  const [contados, setContados] = useState<Record<string, string>>({});
  const [fondoManana, setFondoManana] = useState(String(resumen.saldoInicialARS || ""));
  const [justificacion, setJustificacion] = useState("");
  const [paso, setPaso] = useState<"arqueo" | "cierre">("arqueo");
  const [cerrando, setCerrando] = useState(false);

  const arqueo: ArqueoMedioPago[] = MEDIOS_PAGO_CAJA.map(({ id, label }) => {
    const esperado = esperadoPorMedio[id] || 0;
    const contado = Number(contados[id] ?? "") || 0;
    return {
      medio: id,
      label,
      esperadoARS: esperado,
      contadoARS: contado,
      diferenciaARS: contado - esperado,
    };
  }).filter((a) => a.esperadoARS !== 0 || Number(contados[a.medio] ?? "") > 0);

  const totalEsperado = arqueo.reduce((s, a) => s + a.esperadoARS, 0);
  const totalContado = arqueo.reduce((s, a) => s + a.contadoARS, 0);
  const diferenciaTotal = totalContado - totalEsperado;
  const hayDiferencia = Math.abs(diferenciaTotal) > 1;

  const efectivoContado = Number(contados.efectivo_ars ?? "") || 0;
  const fondo = Number(fondoManana) || 0;
  const enviadoMayor = Math.max(0, efectivoContado - fondo);

  const continuarACierre = () => {
    if (arqueo.length === 0) {
      alert("Completá al menos el arqueo de efectivo.");
      return;
    }
    if (hayDiferencia && !justificacion.trim()) {
      alert("Hay diferencia en el arqueo. Indicá el motivo.");
      return;
    }
    setPaso("cierre");
  };

  const confirmarCierre = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (fondo > efectivoContado) {
      alert("El fondo para mañana no puede superar el efectivo contado.");
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
          diferenciaUSD: 0,
          fondoSiguienteDiaARS: fondo,
          enviadoCajaMayorARS: enviadoMayor,
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
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al cerrar la caja.");
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
          {paso === "arqueo" ? (
            <>
              {MEDIOS_PAGO_CAJA.map(({ id, label }) => {
                const esp = esperadoPorMedio[id] || 0;
                if (esp === 0 && id !== "efectivo_ars") return null;
                const diff =
                  (Number(contados[id] ?? "") || 0) - esp;
                return (
                  <div key={id} className="border rounded-lg p-3 border-[#ecf0f1]">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{label}</span>
                      <span className="text-[#7f8c8d]">
                        Esperado: {formatearPrecioCaja(esp)}
                      </span>
                    </div>
                    <input
                      type="number"
                      placeholder="Monto contado / verificado"
                      value={contados[id] ?? ""}
                      onChange={(e) =>
                        setContados((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                      className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg"
                    />
                    {contados[id] && Math.abs(diff) > 1 && (
                      <p
                        className={`text-xs mt-1 font-bold ${diff > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        Diferencia: {diff > 0 ? "+" : ""}
                        {formatearPrecioCaja(diff)}
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
                    onChange={(e) => setJustificacion(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border-2 border-red-200 rounded-lg"
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
                  {formatearPrecioCaja(diferenciaTotal)}
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
                  className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg"
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
