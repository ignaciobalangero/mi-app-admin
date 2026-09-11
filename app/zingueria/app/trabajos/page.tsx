"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onSnapshot, query, where } from "firebase/firestore";
import ModalNuevoTrabajo from "@/components/zingueria/ModalNuevoTrabajo";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { totalTrabajo } from "@/lib/zingueria/calculos";
import { formatDate, formatMoney } from "@/lib/zingueria/format";
import { zTrabajosCol } from "@/lib/zingueria/paths";
import {
  ESTADOS_ACTIVOS,
  ESTADOS_TRABAJO,
  type EstadoTrabajo,
  type Trabajo,
} from "@/lib/zingueria/types";
import {
  estadoColor,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

type FiltroEstado = EstadoTrabajo | "" | "activos";

export default function TrabajosPage() {
  const { user } = useZingueriaSession();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("activos");
  const [modal, setModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!user) return;
    const qq = query(zTrabajosCol(), where("ownerUid", "==", user.uid));
    return onSnapshot(qq, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Trabajo, "id">),
      }));
      list.sort((a, b) => {
        const pin = (t: Trabajo) =>
          ESTADOS_ACTIVOS.includes(t.estado) ? 0 : 1;
        const p = pin(a) - pin(b);
        if (p !== 0) return p;
        return String(b.fechaInicio || "").localeCompare(
          String(a.fechaInicio || "")
        );
      });
      setTrabajos(list);
    });
  }, [user]);

  const filtered = useMemo(() => {
    return trabajos.filter((t) => {
      if (estado === "activos" && !ESTADOS_ACTIVOS.includes(t.estado))
        return false;
      if (estado && estado !== "activos" && t.estado !== estado) return false;
      if (!qDebounced) return true;
      return `${t.titulo} ${t.clienteNombre} ${t.descripcion || ""}`
        .toLowerCase()
        .includes(qDebounced);
    });
  }, [trabajos, estado, qDebounced]);

  const counts = useMemo(() => {
    const base = qDebounced
      ? trabajos.filter((t) =>
          `${t.titulo} ${t.clienteNombre} ${t.descripcion || ""}`
            .toLowerCase()
            .includes(qDebounced)
        )
      : trabajos;
    return {
      todos: base.length,
      activos: base.filter((t) => ESTADOS_ACTIVOS.includes(t.estado)).length,
      en_curso: base.filter((t) => t.estado === "en_curso").length,
      presupuesto: base.filter((t) => t.estado === "presupuesto").length,
    };
  }, [trabajos, qDebounced]);

  const chips: { value: FiltroEstado; label: string; n?: number }[] = [
    { value: "activos", label: "Activos", n: counts.activos },
    { value: "", label: "Todos", n: counts.todos },
    { value: "en_curso", label: "En curso", n: counts.en_curso },
    { value: "presupuesto", label: "Presup.", n: counts.presupuesto },
    { value: "aprobado", label: "Aprobado" },
    { value: "finalizado", label: "Fin." },
    { value: "cancelado", label: "Cancel." },
  ];

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
        <h1 style={{ margin: 0, fontSize: 22 }}>Trabajos</h1>
        <button type="button" style={zBtnPrimary} onClick={() => setModal(true)}>
          + Nuevo
        </button>
      </div>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          placeholder="Buscar por título, cliente…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={zInput}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Limpiar búsqueda"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: zColors.muted,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 10,
          marginBottom: 6,
        }}
      >
        {chips.map((c) => {
          const active = estado === c.value;
          return (
            <button
              key={String(c.value) || "todos"}
              type="button"
              onClick={() => setEstado(c.value)}
              style={{
                flex: "0 0 auto",
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
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
              {typeof c.n === "number" ? ` (${c.n})` : ""}
            </button>
          );
        })}
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 12, color: zColors.muted }}>
        {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((t) => (
          <Link
            key={t.id}
            href={`/zingueria/app/trabajos/${t.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                ...zCard,
                borderLeft: `4px solid ${estadoColor(t.estado)}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{t.titulo}</div>
                  <div style={{ color: zColors.muted, fontSize: 13 }}>
                    {t.clienteNombre} · {formatDate(t.fechaInicio)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      color: estadoColor(t.estado),
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {ESTADOS_TRABAJO.find((e) => e.value === t.estado)?.label ||
                      t.estado}
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>
                    {formatMoney(totalTrabajo(t))}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {!filtered.length && (
          <p style={{ color: zColors.muted }}>No hay trabajos para mostrar.</p>
        )}
      </div>

      <ModalNuevoTrabajo open={modal} onClose={() => setModal(false)} />
    </div>
  );
}
