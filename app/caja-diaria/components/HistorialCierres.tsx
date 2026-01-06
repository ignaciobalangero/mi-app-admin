"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  observaciones?: string;
  cerradoPor: string;
  fechaCierre: any;
}

interface Props {
  negocioID: string;
  onClose: () => void;
}

export default function HistorialCierres({ negocioID, onClose }: Props) {
  const [cierres, setCierres] = useState<Cierre[]>([]);
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
      const cierresSnap = await getDocs(
        query(
          collection(db, `negocios/${negocioID}/cierresCaja`),
          orderBy("fechaCierre", "desc")
        )
      );

      const cierresData = cierresSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Cierre));

      setCierres(cierresData);
    } catch (error) {
      console.error("Error cargando cierres:", error);
    } finally {
      setCargando(false);
    }
  };

  const iniciarEdicion = (cierre: Cierre) => {
    setEditando(cierre.id);
    setEfectivoEditARS(cierre.efectivoRealARS.toString());
    setEfectivoEditUSD(cierre.efectivoRealUSD.toString());
    setObsEdit(cierre.observaciones || "");
  };

  const guardarEdicion = async (cierre: Cierre) => {
    try {
      const nuevoEfectivoRealARS = Number(efectivoEditARS);
      const nuevoEfectivoRealUSD = Number(efectivoEditUSD);
      const nuevaDiferenciaARS = nuevoEfectivoRealARS - cierre.efectivoEsperadoARS;
      const nuevaDiferenciaUSD = nuevoEfectivoRealUSD - cierre.efectivoEsperadoUSD;

      await updateDoc(doc(db, `negocios/${negocioID}/cierresCaja/${cierre.id}`), {
        efectivoRealARS: nuevoEfectivoRealARS,
        efectivoRealUSD: nuevoEfectivoRealUSD,
        diferenciaARS: nuevaDiferenciaARS,
        diferenciaUSD: nuevaDiferenciaUSD,
        observaciones: obsEdit.trim(),
        ultimaEdicion: new Date(),
      });

      // Toast de éxito
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 18px;
        font-weight: 600;
      `;
      toast.innerHTML = `
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
          ✓
        </div>
        <span>Cierre actualizado correctamente</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);

      setEditando(null);
      cargarCierres();
    } catch (error) {
      console.error("Error actualizando cierre:", error);
      alert("❌ Error al actualizar el cierre");
    }
  };

  const formatearPrecio = (valor: number) => {
    return `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8">
        
        {/* Header */}
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

        {/* Body */}
        <div className="p-6">
          {cargando ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

                return (
                  <div
                    key={cierre.id}
                    className="bg-[#f8f9fa] rounded-xl p-4 border-2 border-[#ecf0f1] hover:border-[#3498db] transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-[#2c3e50] text-lg">{cierre.fecha}</h4>
                        <p className="text-sm text-[#7f8c8d]">
                          Cerrado por {cierre.cerradoPor} • {cierre.fechaCierre?.toDate?.()?.toLocaleString("es-AR") || "N/A"}
                        </p>
                      </div>
                      
                      {!editandoEste ? (
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
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Efectivo ARS */}
                      <div className="bg-white rounded-lg p-3 border border-[#ecf0f1]">
                        <p className="text-xs text-[#7f8c8d] mb-1">💵 Efectivo ARS</p>
                        <p className="text-sm">
                          <span className="text-[#7f8c8d]">Esperado:</span>{" "}
                          <span className="font-bold text-[#2c3e50]">{formatearPrecio(cierre.efectivoEsperadoARS)}</span>
                        </p>
                        
                        {!editandoEste ? (
                          <p className="text-sm">
                            <span className="text-[#7f8c8d]">Real:</span>{" "}
                            <span className="font-bold text-[#2c3e50]">{formatearPrecio(cierre.efectivoRealARS)}</span>
                          </p>
                        ) : (
                          <input
                            type="number"
                            value={efectivoEditARS}
                            onChange={(e) => setEfectivoEditARS(e.target.value)}
                            className="w-full mt-1 px-2 py-1 border-2 border-[#3498db] rounded text-sm"
                          />
                        )}

                        <p className={`text-sm font-bold mt-1 ${
                          cierre.diferenciaARS === 0 ? "text-blue-600" :
                          cierre.diferenciaARS > 0 ? "text-green-600" :
                          "text-red-600"
                        }`}>
                          {cierre.diferenciaARS > 0 ? "+" : ""}{formatearPrecio(cierre.diferenciaARS)}
                          {cierre.diferenciaARS === 0 ? " ✓" : cierre.diferenciaARS > 0 ? " ↑" : " ↓"}
                        </p>
                      </div>

                      {/* Efectivo USD */}
                      {(cierre.efectivoEsperadoUSD > 0 || cierre.efectivoRealUSD > 0) && (
                        <div className="bg-white rounded-lg p-3 border border-[#ecf0f1]">
                          <p className="text-xs text-[#7f8c8d] mb-1">💵 Efectivo USD</p>
                          <p className="text-sm">
                            <span className="text-[#7f8c8d]">Esperado:</span>{" "}
                            <span className="font-bold text-[#2c3e50]">${cierre.efectivoEsperadoUSD}</span>
                          </p>
                          
                          {!editandoEste ? (
                            <p className="text-sm">
                              <span className="text-[#7f8c8d]">Real:</span>{" "}
                              <span className="font-bold text-[#2c3e50]">${cierre.efectivoRealUSD}</span>
                            </p>
                          ) : (
                            <input
                              type="number"
                              value={efectivoEditUSD}
                              onChange={(e) => setEfectivoEditUSD(e.target.value)}
                              className="w-full mt-1 px-2 py-1 border-2 border-[#3498db] rounded text-sm"
                            />
                          )}

                          {cierre.diferenciaUSD !== 0 && (
                            <p className={`text-sm font-bold mt-1 ${
                              cierre.diferenciaUSD > 0 ? "text-green-600" : "text-red-600"
                            }`}>
                              {cierre.diferenciaUSD > 0 ? "+" : ""}${cierre.diferenciaUSD}
                              {cierre.diferenciaUSD > 0 ? " ↑" : " ↓"}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Otros métodos */}
                      <div className="bg-white rounded-lg p-3 border border-[#ecf0f1]">
                        <p className="text-xs text-[#7f8c8d] mb-2">📊 Otros Métodos</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#7f8c8d]">Transferencias:</span>
                            <span className="font-bold text-[#2c3e50]">{formatearPrecio(cierre.transferenciasARS)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7f8c8d]">Tarjetas:</span>
                            <span className="font-bold text-[#2c3e50]">{formatearPrecio(cierre.tarjetasARS)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7f8c8d]">Cta. Corriente:</span>
                            <span className="font-bold text-[#2c3e50]">{formatearPrecio(cierre.cuentaCorrienteARS)}</span>
                          </div>
                          {cierre.gastosARS > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[#7f8c8d]">Gastos:</span>
                              <span className="font-bold text-red-600">{formatearPrecio(cierre.gastosARS)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Observaciones */}
                    {(cierre.observaciones || editandoEste) && (
                      <div className="mt-4 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <p className="text-xs text-[#7f8c8d] mb-1">📝 Observaciones:</p>
                        {!editandoEste ? (
                          <p className="text-sm text-[#2c3e50]">{cierre.observaciones || "Sin observaciones"}</p>
                        ) : (
                          <textarea
                            value={obsEdit}
                            onChange={(e) => setObsEdit(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-yellow-300 rounded text-sm resize-none"
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
        </div>

        {/* Footer */}
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