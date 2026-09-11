"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { cuentaCorriente } from "@/lib/zingueria/calculos";
import { formatMoney } from "@/lib/zingueria/format";
import {
  zClienteRef,
  zClientesCol,
  zPagosCol,
  zTrabajosCol,
} from "@/lib/zingueria/paths";
import type { Cliente, Trabajo } from "@/lib/zingueria/types";
import {
  zBtnGhost,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

export default function ClientesPage() {
  const { user } = useZingueriaSession();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [saldos, setSaldos] = useState<
    Record<string, { saldo: number; facturado: number; pagado: number }>
  >({});
  const [q, setQ] = useState("");
  const [soloDeuda, setSoloDeuda] = useState(false);
  const [form, setForm] = useState({
    id: "",
    nombre: "",
    telefono: "",
    direccion: "",
    notas: "",
  });
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      query(zClientesCol(), where("ownerUid", "==", user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Cliente, "id">),
        }));
        list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setClientes(list);
      }
    );
    const u2 = onSnapshot(
      query(zTrabajosCol(), where("ownerUid", "==", user.uid)),
      (snap) => {
        setTrabajos(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Trabajo, "id">),
          }))
        );
      }
    );
    return () => {
      u1();
      u2();
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<
        string,
        { saldo: number; facturado: number; pagado: number }
      > = {};
      const byCliente = new Map<string, Trabajo[]>();
      for (const t of trabajos) {
        const arr = byCliente.get(t.clienteId) || [];
        arr.push(t);
        byCliente.set(t.clienteId, arr);
      }
      for (const [cid, list] of Array.from(byCliente.entries())) {
        const pagosArr = await Promise.all(
          list.map(async (t) => {
            const snap = await getDocs(zPagosCol(t.id));
            return snap.docs.map((d) => d.data() as { monto: number });
          })
        );
        const cc = cuentaCorriente(list, pagosArr);
        map[cid] = {
          saldo: cc.saldo,
          facturado: cc.totalFacturado,
          pagado: cc.totalPagado,
        };
      }
      if (!cancelled) setSaldos(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [trabajos]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clientes.filter((c) => {
      if (soloDeuda && !(saldos[c.id]?.saldo > 0)) return false;
      if (!term) return true;
      return `${c.nombre} ${c.telefono || ""} ${c.direccion || ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [clientes, q, soloDeuda, saldos]);

  const conDeuda = useMemo(
    () => clientes.filter((c) => (saldos[c.id]?.saldo || 0) > 0).length,
    [clientes, saldos]
  );

  function edit(c: Cliente) {
    setForm({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono || "",
      direccion: c.direccion || "",
      notas: c.notas || "",
    });
    setShowForm(true);
  }

  function reset() {
    setForm({ id: "", nombre: "", telefono: "", direccion: "", notas: "" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user || !form.nombre.trim()) return;
    setBusy(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        notas: form.notas.trim(),
      };
      if (form.id) {
        await updateDoc(zClienteRef(form.id), payload);
      } else {
        await addDoc(zClientesCol(), {
          ...payload,
          ownerUid: user.uid,
          creado: serverTimestamp(),
        });
      }
      reset();
      setShowForm(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este cliente?")) return;
    await deleteDoc(zClienteRef(id));
    if (form.id === id) reset();
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Clientes</h1>
        <button
          type="button"
          style={zBtnPrimary}
          onClick={() => {
            reset();
            setShowForm((v) => !v);
          }}
        >
          {showForm ? "Cerrar" : "+ Nuevo"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} style={{ ...zCard, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            {form.id ? "Editar cliente" : "Nuevo cliente"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <input
              required
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={{ ...zInput, gridColumn: "1 / -1" }}
            />
            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              style={zInput}
            />
            <input
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              style={zInput}
            />
            <input
              placeholder="Notas"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              style={{ ...zInput, gridColumn: "1 / -1" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="submit" style={zBtnPrimary} disabled={busy}>
              {form.id ? "Guardar" : "Agregar"}
            </button>
            {form.id && (
              <button
                type="button"
                style={zBtnGhost}
                onClick={() => {
                  reset();
                  setShowForm(false);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          placeholder="Buscar por nombre, teléfono o dirección…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={zInput}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: zColors.muted,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setSoloDeuda(false)}
          style={chipStyle(!soloDeuda)}
        >
          Todos ({clientes.length})
        </button>
        <button
          type="button"
          onClick={() => setSoloDeuda(true)}
          style={chipStyle(soloDeuda)}
        >
          Con deuda ({conDeuda})
        </button>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: 12, color: zColors.muted }}>
        {filtered.length} encontrado{filtered.length === 1 ? "" : "s"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((c) => {
          const cc = saldos[c.id];
          const debe = (cc?.saldo || 0) > 0;
          return (
            <div key={c.id} style={zCard}>
              <Link
                href={`/zingueria/app/clientes/${c.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                    <div style={{ color: zColors.muted, fontSize: 13 }}>
                      {[c.telefono, c.direccion].filter(Boolean).join(" · ") ||
                        "Sin datos de contacto"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: debe ? zColors.warn : zColors.ok,
                      }}
                    >
                      {debe ? "DEBE" : "AL DÍA"}
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: debe ? zColors.accent : zColors.ok,
                      }}
                    >
                      {formatMoney(cc?.saldo || 0)}
                    </div>
                    <div style={{ fontSize: 11, color: zColors.muted }}>
                      Facturado {formatMoney(cc?.facturado || 0)}
                    </div>
                  </div>
                </div>
              </Link>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Link
                  href={`/zingueria/app/clientes/${c.id}`}
                  style={{
                    ...zBtnGhost,
                    textDecoration: "none",
                    fontSize: 13,
                    padding: "8px 12px",
                  }}
                >
                  Cuenta corriente
                </Link>
                <button type="button" style={zBtnGhost} onClick={() => edit(c)}>
                  Editar
                </button>
                <button
                  type="button"
                  style={{ ...zBtnGhost, color: zColors.danger }}
                  onClick={() => remove(c.id)}
                >
                  Borrar
                </button>
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <p style={{ color: zColors.muted }}>No hay clientes.</p>
        )}
      </div>
    </div>
  );
}

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 999,
    border: active
      ? `1px solid ${zColors.accent}`
      : `1px solid ${zColors.border}`,
    background: active ? "rgba(6,182,212,0.15)" : "transparent",
    color: active ? zColors.accent : zColors.muted,
    fontWeight: active ? 700 : 500,
    fontSize: 12,
    cursor: "pointer",
  };
}
