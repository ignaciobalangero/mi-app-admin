"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { formatMoneyExact, todayISO } from "@/lib/zingueria/format";
import {
  zChapaHistorialCol,
  zChapaRef,
  zChapasCol,
} from "@/lib/zingueria/paths";
import { seedCosteoInicial } from "@/lib/zingueria/seedCosteo";
import type { AcabadoChapa, Chapa, ChapaHistorial } from "@/lib/zingueria/types";
import {
  zBtnGhost,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

const FORM_VACIO = {
  calibre: "",
  acabado: "galva" as AcabadoChapa,
  anchoMm: 1000,
  largoMm: 2000,
  precioCosto: 0,
  stockCantidad: 0,
  precioReferencia2015: "",
};

export default function ChapasPage() {
  const { user } = useZingueriaSession();
  const [chapas, setChapas] = useState<Chapa[]>([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [precioEdit, setPrecioEdit] = useState(0);
  const [historialDe, setHistorialDe] = useState<string | null>(null);
  const [historial, setHistorial] = useState<ChapaHistorial[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(zChapasCol(), where("ownerUid", "==", user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Chapa, "id">),
        }));
        list.sort((a, b) =>
          `${a.acabado} ${a.calibre}`.localeCompare(
            `${b.acabado} ${b.calibre}`,
            "es"
          )
        );
        setChapas(list);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!historialDe) {
      setHistorial([]);
      return;
    }
    return onSnapshot(zChapaHistorialCol(historialDe), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChapaHistorial, "id">),
      }));
      list.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
      setHistorial(list);
    });
  }, [historialDe]);

  const valorTotal = useMemo(
    () =>
      chapas.reduce(
        (acc, c) =>
          acc + (Number(c.precioCosto) || 0) * (Number(c.stockCantidad) || 0),
        0
      ),
    [chapas]
  );

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (!user || !form.calibre.trim()) return;
    await addDoc(zChapasCol(), {
      ownerUid: user.uid,
      calibre: form.calibre.trim(),
      acabado: form.acabado,
      anchoMm: Number(form.anchoMm) || 0,
      largoMm: Number(form.largoMm) || 0,
      precioCosto: Number(form.precioCosto) || 0,
      fechaActualizacion: todayISO(),
      precioReferencia2015:
        form.precioReferencia2015 === ""
          ? null
          : Number(form.precioReferencia2015) || null,
      stockCantidad: Number(form.stockCantidad) || 0,
      activo: true,
      creado: serverTimestamp(),
    });
    setForm(FORM_VACIO);
  }

  async function guardarPrecio(chapa: Chapa) {
    if (!user) return;
    const nuevo = Number(precioEdit) || 0;
    const anterior = Number(chapa.precioCosto) || 0;
    setEditando(null);
    if (nuevo === anterior) return;
    await updateDoc(zChapaRef(chapa.id), {
      precioCosto: nuevo,
      fechaActualizacion: todayISO(),
    });
    await addDoc(zChapaHistorialCol(chapa.id), {
      precioAnterior: anterior,
      precioNuevo: nuevo,
      fecha: todayISO(),
      usuarioUid: user.uid,
      usuarioEmail: user.email || "",
    });
  }

  async function seed() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const r = await seedCosteoInicial(user.uid);
      if (!r.chapas && !r.materiales) {
        alert("Ya había chapas cargadas: no se cargó nada nuevo.");
      } else {
        alert(
          `Carga inicial lista:\n· ${r.chapas} chapas\n· ${r.materiales} materiales\n· Config: ${
            r.config ? "creada" : "sin cambios"
          }`
        );
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo cargar los datos iniciales.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Chapas</h1>
        <button type="button" style={zBtnGhost} onClick={seed} disabled={busy}>
          {busy ? "Cargando…" : "Cargar datos iniciales"}
        </button>
      </div>

      <form onSubmit={crear} style={{ ...zCard, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Nueva chapa</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          <input
            required
            placeholder="Calibre (25, 25C…)"
            value={form.calibre}
            onChange={(e) => setForm({ ...form, calibre: e.target.value })}
            style={zInput}
          />
          <select
            value={form.acabado}
            onChange={(e) =>
              setForm({ ...form, acabado: e.target.value as AcabadoChapa })
            }
            style={zInput}
          >
            <option value="galva">Galvanizada</option>
            <option value="color">Color</option>
          </select>
          <input
            type="number"
            placeholder="Ancho (mm)"
            value={form.anchoMm || ""}
            onChange={(e) =>
              setForm({ ...form, anchoMm: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <input
            type="number"
            placeholder="Largo (mm)"
            value={form.largoMm || ""}
            onChange={(e) =>
              setForm({ ...form, largoMm: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <input
            type="number"
            step="any"
            placeholder="Precio costo"
            value={form.precioCosto || ""}
            onChange={(e) =>
              setForm({ ...form, precioCosto: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <input
            type="number"
            step="any"
            placeholder="Stock (chapas)"
            value={form.stockCantidad || ""}
            onChange={(e) =>
              setForm({ ...form, stockCantidad: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <input
            type="number"
            step="any"
            placeholder="Ref. 2015 (opcional)"
            value={form.precioReferencia2015}
            onChange={(e) =>
              setForm({ ...form, precioReferencia2015: e.target.value })
            }
            style={zInput}
          />
        </div>
        <button type="submit" style={{ ...zBtnPrimary, marginTop: 10 }}>
          Agregar chapa
        </button>
      </form>

      {chapas.length > 0 && (
        <div style={{ ...zCard, marginBottom: 12, padding: "10px 14px" }}>
          <span style={{ color: zColors.muted, fontSize: 12 }}>
            Valor total del stock de chapas
          </span>
          <div style={{ fontWeight: 800, color: zColors.accent }}>
            {formatMoneyExact(valorTotal)}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {chapas.map((c) => {
          const valorStock =
            (Number(c.precioCosto) || 0) * (Number(c.stockCantidad) || 0);
          const enEdicion = editando === c.id;
          return (
            <div key={c.id} style={zCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    Calibre {c.calibre} ·{" "}
                    <span
                      style={{
                        color:
                          c.acabado === "color" ? zColors.warn : zColors.muted,
                      }}
                    >
                      {c.acabado === "color" ? "color" : "galva"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: zColors.muted }}>
                    {c.anchoMm} × {c.largoMm} mm · stock {c.stockCantidad}
                  </div>
                  <div style={{ fontSize: 12, color: zColors.muted }}>
                    Actualizado: {c.fechaActualizacion || "—"}
                    {c.precioReferencia2015
                      ? ` · Ref. 2015 ${formatMoneyExact(c.precioReferencia2015)}`
                      : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {enEdicion ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        step="any"
                        autoFocus
                        value={precioEdit || ""}
                        onChange={(e) =>
                          setPrecioEdit(Number(e.target.value) || 0)
                        }
                        style={{ ...zInput, width: 110 }}
                      />
                      <button
                        type="button"
                        style={{ ...zBtnPrimary, padding: "8px 12px" }}
                        onClick={() => guardarPrecio(c)}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        style={{ ...zBtnGhost, padding: "8px 12px" }}
                        onClick={() => setEditando(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(c.id);
                        setPrecioEdit(Number(c.precioCosto) || 0);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: zColors.text,
                        cursor: "pointer",
                        textAlign: "right",
                        padding: 0,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {formatMoneyExact(c.precioCosto)}
                      </div>
                      <div style={{ fontSize: 11, color: zColors.accent }}>
                        editar precio
                      </div>
                    </button>
                  )}
                  <div style={{ fontSize: 12, color: zColors.muted, marginTop: 4 }}>
                    Valor stock {formatMoneyExact(valorStock)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setHistorialDe(historialDe === c.id ? null : c.id)
                }
                style={{
                  ...zBtnGhost,
                  marginTop: 10,
                  padding: "6px 10px",
                  fontSize: 12,
                }}
              >
                {historialDe === c.id ? "Ocultar historial" : "Historial"}
              </button>
              {historialDe === c.id && (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "10px 0 0",
                    fontSize: 13,
                  }}
                >
                  {historial.map((h) => (
                    <li
                      key={h.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "5px 0",
                        borderBottom: `1px solid ${zColors.border}`,
                      }}
                    >
                      <span style={{ color: zColors.muted }}>{h.fecha}</span>
                      <span>
                        {formatMoneyExact(h.precioAnterior)} →{" "}
                        <strong>{formatMoneyExact(h.precioNuevo)}</strong>
                      </span>
                    </li>
                  ))}
                  {!historial.length && (
                    <li style={{ color: zColors.muted }}>Sin cambios aún.</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {!chapas.length && (
        <p style={{ color: zColors.muted }}>
          Todavía no hay chapas. Podés usar “Cargar datos iniciales”.
        </p>
      )}
    </div>
  );
}
