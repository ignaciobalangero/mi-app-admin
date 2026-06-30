"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import type { ArqueoMedioPago } from "@/lib/caja/cajaTypes";
import { puedeEditarHistorialCaja } from "@/lib/caja/permisosCaja";
import { formatearPrecioCaja, formatearUsdCaja } from "@/lib/caja/calcularResumenDia";

interface Cierre {
  id: string;
  fecha: string;
  efectivoEsperadoARS: number;
  efectivoEsperadoUSD: number;
  efectivoRealARS: number;
  efectivoRealUSD: number;
  diferenciaARS: number;
  diferenciaUSD: number;
  transferenciasARS: number;
  transferenciasUSD: number;
  tarjetasARS: number;
  cuentaCorrienteARS: number;
  cuentaCorrienteUSD: number;
  gastosARS: number;
  gastosUSD: number;
  saldoInicialUSD?: number;
  cotizacionUSDArqueo?: number;
  totalEsperadoArqueoARS?: number;
  totalContadoArqueoARS?: number;
  arqueo?: ArqueoMedioPago[];
  arqueoJustificacion?: string;
  observaciones?: string;
  cerradoPor: string;
  fechaCierre: { toDate?: () => Date };
}

interface Props {
  negocioID: string;
  onClose: () => void;
}

function datosEfectivoArs(cierre: Cierre) {
  const linea = cierre.arqueo?.find((a) => a.medio === "efectivo_ars");
  if (linea) {
    return {
      esperado: linea.esperadoARS,
      real: linea.contadoARS,
      dif: linea.diferenciaARS,
    };
  }
  return {
    esperado: cierre.efectivoEsperadoARS,
    real: cierre.efectivoRealARS,
    dif: cierre.diferenciaARS,
  };
}

function datosUsdBillete(cierre: Cierre, cotizacionNegocio: number) {
  const linea = cierre.arqueo?.find((a) => a.medio === "usd_billete");
  if (linea?.esperadoUSD != null && linea.contadoUSD != null) {
    return {
      esperado: linea.esperadoUSD,
      real: linea.contadoUSD,
      dif: linea.diferenciaUSD ?? linea.contadoUSD - linea.esperadoUSD,
    };
  }

  const cot = cierre.cotizacionUSDArqueo || cotizacionNegocio;
  if (linea && cot > 0) {
    const contadoPareceUsdDirecto =
      linea.contadoARS > 0 && linea.contadoARS < 10000 && linea.contadoARS / cot < 50;
    const real = contadoPareceUsdDirecto
      ? linea.contadoARS
      : linea.contadoARS > 0
        ? linea.contadoARS / cot
        : 0;

    let esperado = 0;
    if (linea.esperadoARS > 0) {
      const esperadoPareceUsdDirecto =
        linea.esperadoARS < 10000 && linea.esperadoARS / cot < 50;
      esperado = esperadoPareceUsdDirecto ? linea.esperadoARS : linea.esperadoARS / cot;
    }
    if (Math.abs(linea.diferenciaARS) <= cot || Math.abs(real - esperado) < 0.01) {
      esperado = real;
    } else if (esperado < (cierre.saldoInicialUSD ?? 0) && real > 0) {
      esperado = Math.max(esperado, real);
    }

    return {
      esperado,
      real,
      dif: real - esperado,
    };
  }

  if ((cierre.efectivoRealUSD ?? 0) > 0 || (cierre.efectivoEsperadoUSD ?? 0) > 0) {
    return {
      esperado: cierre.efectivoEsperadoUSD,
      real: cierre.efectivoRealUSD,
      dif: cierre.diferenciaUSD,
    };
  }

  return {
    esperado: cierre.saldoInicialUSD ?? 0,
    real: 0,
    dif: -(cierre.saldoInicialUSD ?? 0),
  };
}

function mostrarSeccionUsd(cierre: Cierre, usd: ReturnType<typeof datosUsdBillete>) {
  return (
    cierre.arqueo?.some((a) => a.medio === "usd_billete") ||
    (cierre.saldoInicialUSD ?? 0) > 0 ||
    usd.esperado > 0 ||
    usd.real > 0
  );
}

function mostrarToastHistorial(mensaje: string, ok = true) {
  const toast = document.createElement("div");
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
  `;
  toast.innerHTML = `
    <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">${ok ? "✓" : "!"}</div>
    <span>${mensaje}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) document.body.removeChild(toast);
  }, 2200);
}

export default function HistorialCierres({ negocioID, onClose }: Props) {
  const { rol } = useRol();
  const puedeEditar = puedeEditarHistorialCaja(rol?.tipo);

  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [cotizacionNegocio, setCotizacionNegocio] = useState(1000);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [efectivoEditARS, setEfectivoEditARS] = useState("");
  const [efectivoEditUSD, setEfectivoEditUSD] = useState("");
  const [obsEdit, setObsEdit] = useState("");

  useEffect(() => {
    cargarCierres();
  }, [negocioID]);

  const cargarCierres = async () => {
    setCargando(true);
    try {
      const cfgSnap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
      if (cfgSnap.exists()) {
        const cot = Number(cfgSnap.data().cotizacion ?? cfgSnap.data().cotizacionDolar ?? 0);
        if (cot > 0) setCotizacionNegocio(cot);
      }

      const cierresSnap = await getDocs(
        query(
          collection(db, `negocios/${negocioID}/cierresCaja`),
          orderBy("fechaCierre", "desc")
        )
      );

      setCierres(
        cierresSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Cierre
        )
      );
    } catch (error) {
      console.error("Error cargando cierres:", error);
    } finally {
      setCargando(false);
    }
  };

  const iniciarEdicion = (cierre: Cierre) => {
    if (!puedeEditar) return;
    const ars = datosEfectivoArs(cierre);
    const usd = datosUsdBillete(cierre, cotizacionNegocio);
    setEditando(cierre.id);
    setEfectivoEditARS(String(ars.real));
    setEfectivoEditUSD(String(usd.real));
    setObsEdit(cierre.observaciones || cierre.arqueoJustificacion || "");
  };

  const guardarEdicion = async (cierre: Cierre) => {
    if (!puedeEditar) return;
    try {
      const ars = datosEfectivoArs(cierre);
      const usd = datosUsdBillete(cierre, cotizacionNegocio);
      const nuevoRealARS = Number(efectivoEditARS);
      const nuevoRealUSD = Number(efectivoEditUSD);
      const nuevaDifARS = nuevoRealARS - ars.esperado;
      const nuevaDifUSD = nuevoRealUSD - usd.esperado;

      const arqueoActualizado = (cierre.arqueo ?? []).map((linea) => {
        if (linea.medio === "efectivo_ars") {
          return {
            ...linea,
            contadoARS: nuevoRealARS,
            diferenciaARS: nuevaDifARS,
          };
        }
        if (linea.medio === "usd_billete") {
          const cot = cierre.cotizacionUSDArqueo || cotizacionNegocio;
          return {
            ...linea,
            contadoUSD: nuevoRealUSD,
            esperadoUSD: linea.esperadoUSD ?? usd.esperado,
            diferenciaUSD: nuevaDifUSD,
            contadoARS: cot > 0 ? nuevoRealUSD * cot : linea.contadoARS,
            diferenciaARS: cot > 0 ? nuevaDifUSD * cot : linea.diferenciaARS,
          };
        }
        return linea;
      });

      await updateDoc(doc(db, `negocios/${negocioID}/cierresCaja/${cierre.id}`), {
        efectivoRealARS: nuevoRealARS,
        efectivoRealUSD: nuevoRealUSD,
        diferenciaARS: nuevaDifARS,
        diferenciaUSD: nuevaDifUSD,
        observaciones: obsEdit.trim(),
        arqueo: arqueoActualizado,
        ultimaEdicion: new Date(),
      });

      mostrarToastHistorial("Cierre actualizado correctamente");
      setEditando(null);
      cargarCierres();
    } catch (error) {
      console.error("Error actualizando cierre:", error);
      mostrarToastHistorial("Error al actualizar el cierre", false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 text-[#2c3e50]">
        <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Historial de Cierres</h3>
                <p className="text-sm text-blue-100">Cierres de caja anteriores</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {cargando ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#7f8c8d]">Cargando historial...</p>
            </div>
          ) : cierres.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-[#7f8c8d]">No hay cierres de caja registrados</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {cierres.map((cierre) => {
                const editandoEste = editando === cierre.id;
                const ars = datosEfectivoArs(cierre);
                const usd = datosUsdBillete(cierre, cotizacionNegocio);
                const muestraUsd = mostrarSeccionUsd(cierre, usd);

                return (
                  <div
                    key={cierre.id}
                    className="bg-[#f8f9fa] rounded-xl p-4 border-2 border-[#ecf0f1] hover:border-[#3498db] transition-all"
                  >
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                      <div>
                        <h4 className="font-bold text-[#2c3e50] text-lg">{cierre.fecha}</h4>
                        <p className="text-sm text-[#7f8c8d]">
                          Cerrado por {cierre.cerradoPor} •{" "}
                          {cierre.fechaCierre?.toDate?.()?.toLocaleString("es-AR") || "N/A"}
                        </p>
                      </div>

                      {puedeEditar &&
                        (!editandoEste ? (
                          <button
                            onClick={() => iniciarEdicion(cierre)}
                            className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg font-medium transition-all"
                          >
                            ✏️ Editar
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditando(null)}
                              className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => guardarEdicion(cierre)}
                              className="bg-[#27ae60] hover:bg-[#229954] text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                              ✓ Guardar
                            </button>
                          </div>
                        ))}
                    </div>

                    <div
                      className={`grid grid-cols-1 gap-4 ${muestraUsd ? "md:grid-cols-3" : "md:grid-cols-2"}`}
                    >
                      <div className="bg-white rounded-lg p-3 border border-[#ecf0f1]">
                        <p className="text-xs text-[#7f8c8d] mb-1">💵 Efectivo ARS en caja</p>
                        <p className="text-sm">
                          <span className="text-[#7f8c8d]">Esperado:</span>{" "}
                          <span className="font-bold">{formatearPrecioCaja(ars.esperado)}</span>
                        </p>
                        {!editandoEste ? (
                          <p className="text-sm">
                            <span className="text-[#7f8c8d]">Contado:</span>{" "}
                            <span className="font-bold">{formatearPrecioCaja(ars.real)}</span>
                          </p>
                        ) : (
                          <input
                            type="number"
                            value={efectivoEditARS}
                            onChange={(e) => setEfectivoEditARS(e.target.value)}
                            className="w-full mt-1 px-2 py-1 border-2 border-[#3498db] rounded text-sm bg-white text-[#2c3e50] [color-scheme:light]"
                          />
                        )}
                        <p
                          className={`text-sm font-bold mt-1 ${
                            Math.abs(ars.dif) <= 1
                              ? "text-blue-600"
                              : ars.dif > 0
                                ? "text-green-600"
                                : "text-red-600"
                          }`}
                        >
                          {ars.dif > 0 ? "+" : ""}
                          {formatearPrecioCaja(ars.dif)}
                          {Math.abs(ars.dif) <= 1 ? " ✓" : ars.dif > 0 ? " ↑" : " ↓"}
                        </p>
                      </div>

                      {muestraUsd && (
                        <div className="bg-white rounded-lg p-3 border border-[#ecf0f1]">
                          <p className="text-xs text-[#7f8c8d] mb-1">💵 USD billetes en caja</p>
                          {(cierre.saldoInicialUSD ?? 0) > 0 && (
                            <p className="text-xs text-[#7f8c8d] mb-1">
                              Incluye fondo apertura: {formatearUsdCaja(cierre.saldoInicialUSD!)}
                            </p>
                          )}
                          <p className="text-sm">
                            <span className="text-[#7f8c8d]">Esperado:</span>{" "}
                            <span className="font-bold">{formatearUsdCaja(usd.esperado)}</span>
                          </p>
                          {!editandoEste ? (
                            <p className="text-sm">
                              <span className="text-[#7f8c8d]">Contado:</span>{" "}
                              <span className="font-bold">{formatearUsdCaja(usd.real)}</span>
                            </p>
                          ) : (
                            <input
                              type="number"
                              value={efectivoEditUSD}
                              onChange={(e) => setEfectivoEditUSD(e.target.value)}
                              className="w-full mt-1 px-2 py-1 border-2 border-[#3498db] rounded text-sm bg-white text-[#2c3e50] [color-scheme:light]"
                            />
                          )}
                          <p
                            className={`text-sm font-bold mt-1 ${
                              Math.abs(usd.dif) < 0.01
                                ? "text-blue-600"
                                : usd.dif > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                            }`}
                          >
                            {usd.dif > 0 ? "+" : ""}
                            {formatearUsdCaja(usd.dif)}
                            {Math.abs(usd.dif) < 0.01 ? " ✓" : usd.dif > 0 ? " ↑" : " ↓"}
                          </p>
                        </div>
                      )}

                      <div className="bg-white rounded-lg p-3 border border-[#ecf0f1]">
                        <p className="text-xs text-[#7f8c8d] mb-2">📊 Otros métodos</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#7f8c8d]">Transferencias:</span>
                            <span className="font-bold">{formatearPrecioCaja(cierre.transferenciasARS)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7f8c8d]">Tarjetas:</span>
                            <span className="font-bold">{formatearPrecioCaja(cierre.tarjetasARS)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7f8c8d]">Cta. Corriente:</span>
                            <span className="font-bold">{formatearPrecioCaja(cierre.cuentaCorrienteARS)}</span>
                          </div>
                          {cierre.gastosARS > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[#7f8c8d]">Gastos:</span>
                              <span className="font-bold text-red-600">
                                {formatearPrecioCaja(cierre.gastosARS)}
                              </span>
                            </div>
                          )}
                        </div>
                        {(cierre.totalEsperadoArqueoARS ?? 0) > 0 && (
                          <p className="text-xs text-[#7f8c8d] mt-2 pt-2 border-t border-[#ecf0f1]">
                            Total arqueo (todos los medios):{" "}
                            {formatearPrecioCaja(cierre.totalContadoArqueoARS ?? 0)}{" "}
                            / {formatearPrecioCaja(cierre.totalEsperadoArqueoARS ?? 0)}
                          </p>
                        )}
                      </div>
                    </div>

                    {(cierre.observaciones || cierre.arqueoJustificacion || editandoEste) && (
                      <div className="mt-4 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <p className="text-xs text-[#7f8c8d] mb-1">📝 Observaciones:</p>
                        {!editandoEste ? (
                          <p className="text-sm">
                            {cierre.observaciones ||
                              cierre.arqueoJustificacion ||
                              "Sin observaciones"}
                          </p>
                        ) : (
                          <textarea
                            value={obsEdit}
                            onChange={(e) => setObsEdit(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-yellow-300 rounded text-sm resize-none bg-white text-[#2c3e50] [color-scheme:light]"
                            rows={2}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!puedeEditar && cierres.length > 0 && (
            <p className="text-xs text-[#7f8c8d] mt-4 text-center">
              Solo el administrador puede editar un cierre guardado.
            </p>
          )}
        </div>

        <div className="p-6 bg-[#f8f9fa] rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[#3498db] hover:bg-[#2980b9] text-white rounded-lg font-medium transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
