"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { formatMoney, todayISO } from "@/lib/zingueria/format";
import {
  zMaterialesCol,
  zMaterialRef,
  zMovimientosCol,
} from "@/lib/zingueria/paths";
import type { Material, MovimientoStock, TipoMovimiento } from "@/lib/zingueria/types";
import {
  zBtnGhost,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

export default function StockPage() {
  const { user } = useZingueriaSession();
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [form, setForm] = useState({
    nombre: "",
    tipo: "chapa",
    unidad: "m",
    stock: 0,
    stockMinimo: 0,
    precioCosto: 0,
    precioVenta: 0,
    notas: "",
  });
  const [mov, setMov] = useState({
    tipo: "entrada" as TipoMovimiento,
    cantidad: 0,
    notas: "",
  });

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(zMaterialesCol(), where("ownerUid", "==", user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Material, "id">),
        }));
        list.sort((a, b) =>
          `${a.tipo} ${a.nombre}`.localeCompare(`${b.tipo} ${b.nombre}`, "es")
        );
        setMateriales(list);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!selected) {
      setMovimientos([]);
      return;
    }
    return onSnapshot(zMovimientosCol(selected), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MovimientoStock, "id">),
      }));
      list.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
      setMovimientos(list);
    });
  }, [selected]);

  const byTipo = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of materiales) {
      const t = m.tipo || "Otros";
      const arr = map.get(t) || [];
      arr.push(m);
      map.set(t, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "es")
    );
  }, [materiales]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (!user || !form.nombre.trim()) return;
    await addDoc(zMaterialesCol(), {
      ownerUid: user.uid,
      nombre: form.nombre.trim(),
      tipo: form.tipo.trim() || "Otros",
      unidad: form.unidad.trim() || "u",
      stock: Number(form.stock) || 0,
      stockMinimo: Number(form.stockMinimo) || 0,
      precioCosto: Number(form.precioCosto) || 0,
      precioVenta: Number(form.precioVenta) || 0,
      notas: form.notas.trim(),
      creado: serverTimestamp(),
    });
    setForm({
      nombre: "",
      tipo: "chapa",
      unidad: "m",
      stock: 0,
      stockMinimo: 0,
      precioCosto: 0,
      precioVenta: 0,
      notas: "",
    });
  }

  async function aplicarMov(e: FormEvent) {
    e.preventDefault();
    if (!selected || !(mov.cantidad > 0)) return;
    const mat = materiales.find((m) => m.id === selected);
    if (!mat) return;

    let delta = 0;
    if (mov.tipo === "entrada") delta = mov.cantidad;
    else if (mov.tipo === "salida") delta = -mov.cantidad;
    else {
      // ajuste: cantidad = stock absoluto nuevo
      delta = mov.cantidad - (mat.stock || 0);
    }

    await updateDoc(zMaterialRef(selected), { stock: increment(delta) });
    await addDoc(zMovimientosCol(selected), {
      tipo: mov.tipo,
      cantidad: mov.cantidad,
      trabajoId: null,
      fecha: todayISO(),
      notas: mov.notas.trim(),
      creado: serverTimestamp(),
    });
    setMov({ tipo: "entrada", cantidad: 0, notas: "" });
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: 22 }}>Stock</h1>

      <form onSubmit={crear} style={{ ...zCard, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Nuevo material</div>
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
            style={zInput}
          />
          <input
            placeholder="Tipo (chapa, canaleta…)"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            style={zInput}
          />
          <input
            placeholder="Unidad"
            value={form.unidad}
            onChange={(e) => setForm({ ...form, unidad: e.target.value })}
            style={zInput}
          />
          <input
            type="number"
            placeholder="Stock inicial"
            value={form.stock || ""}
            onChange={(e) =>
              setForm({ ...form, stock: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <input
            type="number"
            placeholder="Stock mínimo"
            value={form.stockMinimo || ""}
            onChange={(e) =>
              setForm({ ...form, stockMinimo: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <input
            type="number"
            placeholder="Precio costo"
            value={form.precioCosto || ""}
            onChange={(e) =>
              setForm({ ...form, precioCosto: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <input
            type="number"
            placeholder="Precio venta"
            value={form.precioVenta || ""}
            onChange={(e) =>
              setForm({ ...form, precioVenta: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
        </div>
        <button type="submit" style={{ ...zBtnPrimary, marginTop: 10 }}>
          Agregar material
        </button>
      </form>

      {byTipo.map(([tipo, list]) => (
        <section key={tipo} style={{ marginBottom: 18 }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              color: zColors.muted,
              textTransform: "uppercase",
            }}
          >
            {tipo}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((m) => {
              const bajo = m.stock <= (m.stockMinimo || 0);
              const active = selected === m.id;
              return (
                <div
                  key={m.id}
                  style={{
                    ...zCard,
                    borderColor: active
                      ? zColors.accent
                      : bajo
                        ? zColors.warn
                        : zColors.border,
                    cursor: "pointer",
                  }}
                  onClick={() => setSelected(m.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{m.nombre}</div>
                      <div style={{ fontSize: 13, color: zColors.muted }}>
                        Costo {formatMoney(m.precioCosto)} · Venta{" "}
                        {formatMoney(m.precioVenta)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: bajo ? zColors.warn : zColors.text,
                        }}
                      >
                        {m.stock} {m.unidad}
                      </div>
                      {bajo && (
                        <div style={{ fontSize: 11, color: zColors.warn }}>
                          Bajo mínimo
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {!materiales.length && (
        <p style={{ color: zColors.muted }}>Todavía no hay materiales.</p>
      )}

      {selected && (
        <div style={{ ...zCard, marginTop: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <strong>Movimientos</strong>
            <button
              type="button"
              style={zBtnGhost}
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
          </div>
          <form
            onSubmit={aplicarMov}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <select
              value={mov.tipo}
              onChange={(e) =>
                setMov({ ...mov, tipo: e.target.value as TipoMovimiento })
              }
              style={zInput}
            >
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste (stock absoluto)</option>
            </select>
            <input
              type="number"
              min={0}
              step="any"
              placeholder="Cantidad"
              value={mov.cantidad || ""}
              onChange={(e) =>
                setMov({ ...mov, cantidad: Number(e.target.value) || 0 })
              }
              style={zInput}
            />
            <input
              placeholder="Notas"
              value={mov.notas}
              onChange={(e) => setMov({ ...mov, notas: e.target.value })}
              style={{ ...zInput, gridColumn: "1 / -1" }}
            />
            <button
              type="submit"
              style={{ ...zBtnPrimary, gridColumn: "1 / -1" }}
            >
              Registrar movimiento
            </button>
          </form>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {movimientos.map((mv) => (
              <li
                key={mv.id}
                style={{
                  padding: "6px 0",
                  borderBottom: `1px solid ${zColors.border}`,
                  fontSize: 13,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {mv.fecha} · {mv.tipo}
                  {mv.notas ? ` · ${mv.notas}` : ""}
                </span>
                <strong>{mv.cantidad}</strong>
              </li>
            ))}
            {!movimientos.length && (
              <li style={{ color: zColors.muted }}>Sin movimientos.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
