"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import { createPortal } from "react-dom";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Recordatorio = {
  id: string;
  titulo: string;
  /** Timestamp in Firestore */
  fechaHora: Timestamp;
  notas?: string;
  estado: "PENDIENTE" | "COMPLETADO" | "ELIMINADO";
  creadoEn?: Timestamp | null;
  creadoPorUid?: string | null;
  completadoEn?: Timestamp | null;
  eliminadoEn?: Timestamp | null;
};

const parseDateSafe = (value: unknown) => {
  const d = value instanceof Date ? value : new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
};

const formatFechaHora = (ts: Timestamp) => {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return "Fecha inválida";
  return d.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isVencido = (r: Recordatorio) => {
  if (r.estado !== "PENDIENTE") return false;
  const d = r.fechaHora?.toDate?.();
  if (!d) return false;
  return d.getTime() <= Date.now();
};

const isProximo = (r: Recordatorio) => {
  if (r.estado !== "PENDIENTE") return false;
  const d = r.fechaHora?.toDate?.();
  if (!d) return false;
  return d.getTime() > Date.now();
};

const sortByFechaAsc = (a: Recordatorio, b: Recordatorio) => {
  const da = a.fechaHora?.toMillis?.() ?? 0;
  const db = b.fechaHora?.toMillis?.() ?? 0;
  return da - db;
};

export default function RecordatoriosInicio() {
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const negocioID = rol?.negocioID;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sessionKey = useMemo(() => {
    const uid = user?.uid || "anon";
    const n = negocioID || "sin-negocio";
    return `recordatorios:autoopen:${n}:${uid}:${new Date().toLocaleDateString("es-AR")}`;
  }, [negocioID, user?.uid]);

  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Recordatorio[]>([]);

  const [titulo, setTitulo] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [notas, setNotas] = useState("");

  // Load from Firestore (realtime)
  useEffect(() => {
    if (!negocioID) return;
    const colRef = collection(db, `negocios/${negocioID}/recordatorios`);
    const q = query(colRef, orderBy("fechaHora", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Recordatorio[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            titulo: String(data.titulo ?? ""),
            notas: data.notas ? String(data.notas) : undefined,
            fechaHora: data.fechaHora as Timestamp,
            estado: (data.estado ?? "PENDIENTE") as Recordatorio["estado"],
            creadoEn: (data.creadoEn ?? null) as Timestamp | null,
            creadoPorUid: (data.creadoPorUid ?? null) as string | null,
            completadoEn: (data.completadoEn ?? null) as Timestamp | null,
            eliminadoEn: (data.eliminadoEn ?? null) as Timestamp | null,
          };
        });
        setItems(list.filter((r) => !!r.titulo && !!r.fechaHora));
      },
      (err) => {
        console.error("[RecordatoriosInicio] onSnapshot:", err);
      }
    );
    return () => unsub();
  }, [negocioID]);

  const vencidos = useMemo(() => items.filter(isVencido).sort(sortByFechaAsc), [items]);
  const proximos = useMemo(() => items.filter(isProximo).sort(sortByFechaAsc), [items]);

  // Auto-open on enter if there are due reminders and we haven't "seen" them in this session.
  useEffect(() => {
    if (vencidos.length === 0) return;
    try {
      const already = sessionStorage.getItem(sessionKey);
      if (already) return;
      sessionStorage.setItem(sessionKey, "1");
      setAbierto(true);
    } catch {
      setAbierto(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vencidos.length, sessionKey]);

  const crear = async () => {
    if (!negocioID) return alert("Negocio no disponible.");
    const t = titulo.trim();
    if (!t) return alert("Poné un título.");
    if (!fechaHora) return alert("Elegí fecha y hora.");
    const d = parseDateSafe(fechaHora);
    if (!d) return alert("Fecha/hora inválida.");
    const uid = user?.uid || null;

    try {
      const colRef = collection(db, `negocios/${negocioID}/recordatorios`);
      await addDoc(colRef, {
        titulo: t,
        notas: notas.trim() || null,
        fechaHora: Timestamp.fromDate(d),
        estado: "PENDIENTE",
        creadoEn: serverTimestamp(),
        creadoPorUid: uid,
        completadoEn: null,
        eliminadoEn: null,
      });

      setTitulo("");
      setFechaHora("");
      setNotas("");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo crear el recordatorio.");
    }
  };

  const completar = async (id: string) => {
    if (!negocioID) return;
    try {
      await updateDoc(doc(db, `negocios/${negocioID}/recordatorios/${id}`), {
        estado: "COMPLETADO",
        completadoEn: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo marcar como hecho.");
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este recordatorio?")) return;
    if (!negocioID) return;
    try {
      await updateDoc(doc(db, `negocios/${negocioID}/recordatorios/${id}`), {
        estado: "ELIMINADO",
        eliminadoEn: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo eliminar.");
    }
  };

  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const completados = useMemo(
    () => items.filter((r) => r.estado === "COMPLETADO").sort(sortByFechaAsc),
    [items]
  );

  const badge = vencidos.length > 0 ? vencidos.length : proximos.length > 0 ? proximos.length : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex-shrink-0 inline-flex items-center gap-2 bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white font-semibold px-5 py-3 rounded-xl shadow-lg border border-white/30 transition-all duration-200 hover:scale-105 hover:shadow-xl relative"
      >
        <span>🗓️</span>
        <span>Recordatorios</span>
        {badge > 0 && (
          <span className="ml-1 inline-flex items-center justify-center text-xs font-black bg-[#e74c3c] text-white rounded-full min-w-[22px] h-[22px] px-1 shadow">
            {badge}
          </span>
        )}
      </button>

      {mounted &&
        abierto &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-[2147483647] px-4 pt-24 pb-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-[#ecf0f1] max-h-[calc(100vh-7rem)] flex flex-col">
              <div className="bg-gradient-to-r from-[#f39c12] to-[#d35400] text-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🗓️</span>
                    <div>
                      <h3 className="text-xl font-bold">Recordatorios / Reuniones</h3>
                      <p className="text-white/90 text-sm">
                        Te avisa al entrar si hay vencidos
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="text-white/90 hover:text-white p-2 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-5 bg-[#f8f9fa] space-y-5 overflow-y-auto">
                {/* Crear */}
                <div className="bg-white rounded-xl border border-[#ecf0f1] p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#2c3e50] mb-1">
                      Título
                    </label>
                    <input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder='Ej: "Reunión proveedor"'
                      className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3e50] mb-1">
                      Fecha / Hora
                    </label>
                    <input
                      type="datetime-local"
                      value={fechaHora}
                      onChange={(e) => setFechaHora(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-[#2c3e50] mb-1">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Ej: Llevar lista de precios, condiciones, etc."
                      className="w-full min-h-[80px] px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50]"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-3 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setTitulo("");
                      setFechaHora("");
                      setNotas("");
                    }}
                    className="px-4 py-2 rounded-lg font-semibold bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb]"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={crear}
                    className="px-5 py-2 rounded-lg font-semibold bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#2ecc71] hover:to-[#27ae60] text-white shadow"
                  >
                    ➕ Agendar
                  </button>
                </div>
              </div>

              {/* Vencidos */}
              <div className="bg-white rounded-xl border border-[#ecf0f1] overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-pink-50 border-b border-[#ecf0f1] flex items-center justify-between">
                  <div className="font-bold text-[#c0392b] text-sm">
                    ⏰ Vencidos ({vencidos.length})
                  </div>
                <label className="text-xs font-semibold text-[#2c3e50] bg-white border border-[#ecf0f1] px-3 py-1.5 rounded-lg hover:bg-[#f8f9fa] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mr-2 align-middle"
                    checked={mostrarHistorial}
                    onChange={(e) => setMostrarHistorial(e.target.checked)}
                  />
                  Ver historial (hechos)
                </label>
                </div>
                <div className="p-3 space-y-2">
                  {vencidos.length === 0 ? (
                    <div className="text-sm text-[#7f8c8d]">No hay vencidos.</div>
                  ) : (
                    vencidos.map((r) => (
                      <div
                        key={r.id}
                        className="border border-red-200 bg-red-50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#2c3e50] truncate">{r.titulo}</div>
                          <div className="text-xs text-[#7f8c8d]">
                            {formatFechaHora(r.fechaHora)}
                          </div>
                          {r.notas && (
                            <div className="text-xs text-[#2c3e50] mt-1 whitespace-pre-wrap">
                              {r.notas}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => completar(r.id)}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-[#27ae60] text-white hover:bg-[#229954]"
                          >
                            ✅ Hecho
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(r.id)}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-[#e74c3c] text-white hover:bg-[#c0392b]"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Próximos */}
              <div className="bg-white rounded-xl border border-[#ecf0f1] overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-[#ecf0f1]">
                  <div className="font-bold text-[#2980b9] text-sm">
                    🔔 Próximos ({proximos.length})
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {proximos.length === 0 ? (
                    <div className="text-sm text-[#7f8c8d]">No hay próximos.</div>
                  ) : (
                    proximos.slice(0, 10).map((r) => (
                      <div
                        key={r.id}
                        className="border border-blue-200 bg-blue-50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#2c3e50] truncate">{r.titulo}</div>
                          <div className="text-xs text-[#7f8c8d]">
                            {formatFechaHora(r.fechaHora)}
                          </div>
                          {r.notas && (
                            <div className="text-xs text-[#2c3e50] mt-1 whitespace-pre-wrap">
                              {r.notas}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => completar(r.id)}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-[#27ae60] text-white hover:bg-[#229954]"
                          >
                            ✅ Hecho
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(r.id)}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-[#e74c3c] text-white hover:bg-[#c0392b]"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {proximos.length > 10 && (
                    <div className="text-xs text-[#7f8c8d]">
                      Mostrando 10. Hay {proximos.length - 10} más.
                    </div>
                  )}
                </div>
              </div>

              {mostrarHistorial && (
                <div className="bg-white rounded-xl border border-[#ecf0f1] overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] border-b border-[#ecf0f1]">
                    <div className="font-bold text-[#2c3e50] text-sm">
                      ✅ Historial (hechos) ({completados.length})
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {completados.length === 0 ? (
                      <div className="text-sm text-[#7f8c8d]">No hay hechos.</div>
                    ) : (
                      completados.slice(0, 20).map((r) => (
                        <div
                          key={r.id}
                          className="border border-[#ecf0f1] bg-white rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 opacity-80"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-[#2c3e50] truncate line-through">
                              {r.titulo}
                            </div>
                            <div className="text-xs text-[#7f8c8d]">
                              {formatFechaHora(r.fechaHora)}
                            </div>
                            {r.notas && (
                              <div className="text-xs text-[#2c3e50] mt-1 whitespace-pre-wrap">
                                {r.notas}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={() => eliminar(r.id)}
                              className="px-3 py-2 rounded-lg text-xs font-bold bg-[#e74c3c] text-white hover:bg-[#c0392b]"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    {completados.length > 20 && (
                      <div className="text-xs text-[#7f8c8d]">
                        Mostrando 20. Hay {completados.length - 20} más.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}

