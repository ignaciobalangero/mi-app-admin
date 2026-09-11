"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onSnapshot, query, where } from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import {
  agruparCronograma,
  countUrgentes,
  diasDelMes,
  LABELS_CRONOGRAMA,
  trabajosPorFecha,
  type GrupoCronograma,
} from "@/lib/zingueria/cronograma";
import { formatDate, formatMoney, toISODate, todayISO } from "@/lib/zingueria/format";
import { totalTrabajo } from "@/lib/zingueria/calculos";
import { zTrabajosCol } from "@/lib/zingueria/paths";
import type { Trabajo } from "@/lib/zingueria/types";
import { ESTADOS_TRABAJO } from "@/lib/zingueria/types";
import { estadoColor, zBtnGhost, zCard, zColors } from "@/lib/zingueria/ui";

const ORDEN: GrupoCronograma[] = [
  "atrasados",
  "hoy",
  "manana",
  "semana",
  "proximos",
  "sin_fecha",
];

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CronogramaPage() {
  const { user } = useZingueriaSession();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [vista, setVista] = useState<"calendario" | "lista">("calendario");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [diaSel, setDiaSel] = useState(todayISO());

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
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
  }, [user]);

  const grupos = useMemo(() => agruparCronograma(trabajos), [trabajos]);
  const urgentes = countUrgentes(grupos);
  const porFecha = useMemo(() => trabajosPorFecha(trabajos), [trabajos]);
  const dias = useMemo(
    () => diasDelMes(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const delDia = porFecha.get(diaSel) || [];
  const mesLabel = cursor.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Agenda</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            style={vista === "calendario" ? activeTab : zBtnGhost}
            onClick={() => setVista("calendario")}
          >
            Calendario
          </button>
          <button
            type="button"
            style={vista === "lista" ? activeTab : zBtnGhost}
            onClick={() => setVista("lista")}
          >
            Lista
          </button>
        </div>
      </div>

      {urgentes > 0 ? (
        <div
          style={{
            ...zCard,
            marginBottom: 16,
            borderColor: zColors.warn,
            background: "#422006",
          }}
        >
          <strong style={{ color: zColors.warn }}>
            {urgentes} trabajo{urgentes === 1 ? "" : "s"} urgente
            {urgentes === 1 ? "" : "s"}
          </strong>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#fde68a" }}>
            Hay pendientes para hoy o atrasados.
          </p>
        </div>
      ) : (
        <div style={{ ...zCard, marginBottom: 16 }}>
          <span style={{ color: zColors.ok }}>Sin urgentes por ahora.</span>
        </div>
      )}

      {vista === "calendario" ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              style={zBtnGhost}
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                )
              }
            >
              ‹
            </button>
            <div style={{ fontWeight: 700, textTransform: "capitalize" }}>
              {mesLabel}
            </div>
            <button
              type="button"
              style={zBtnGhost}
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                )
              }
            >
              ›
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 6,
            }}
          >
            {DOW.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: zColors.muted,
                  fontWeight: 700,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 16,
            }}
          >
            {dias.map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const n = (porFecha.get(iso) || []).length;
              const selected = iso === diaSel;
              const isHoy = iso === todayISO();
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDiaSel(iso)}
                  style={{
                    minHeight: 52,
                    borderRadius: 10,
                    border: selected
                      ? `2px solid ${zColors.accent}`
                      : `1px solid ${zColors.border}`,
                    background: selected
                      ? "rgba(6,182,212,0.12)"
                      : isHoy
                        ? "#1e293b"
                        : "#0f172a",
                    color: inMonth ? zColors.text : zColors.muted,
                    cursor: "pointer",
                    padding: 4,
                    opacity: inMonth ? 1 : 0.45,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: isHoy ? 800 : 500 }}>
                    {d.getDate()}
                  </div>
                  {n > 0 && (
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        fontWeight: 800,
                        color: zColors.accent,
                      }}
                    >
                      {n}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <h2 style={{ fontSize: 14, margin: "0 0 8px", color: zColors.muted }}>
            {formatDate(diaSel)} · {delDia.length} trabajo
            {delDia.length === 1 ? "" : "s"}
          </h2>
          <ListaTrabajos list={delDia} empty="Nada agendado ese día." />
        </>
      ) : (
        ORDEN.map((key) => {
          const list = grupos[key];
          if (!list.length) return null;
          return (
            <section key={key} style={{ marginBottom: 18 }}>
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: 14,
                  color:
                    key === "atrasados" || key === "hoy"
                      ? zColors.warn
                      : zColors.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.04,
                }}
              >
                {LABELS_CRONOGRAMA[key]} ({list.length})
              </h2>
              <ListaTrabajos list={list} />
            </section>
          );
        })
      )}
    </div>
  );
}

function ListaTrabajos({
  list,
  empty,
}: {
  list: Trabajo[];
  empty?: string;
}) {
  if (!list.length) {
    return <p style={{ color: zColors.muted }}>{empty || "Sin ítems."}</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.map((t) => (
        <Link
          key={t.id}
          href={`/zingueria/app/trabajos/${t.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div style={zCard}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{t.titulo}</div>
                <div style={{ fontSize: 13, color: zColors.muted }}>
                  {t.clienteNombre} · {formatDate(t.fechaInicio)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: estadoColor(t.estado),
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {ESTADOS_TRABAJO.find((e) => e.value === t.estado)?.label}
                </div>
                <div style={{ fontWeight: 700 }}>
                  {formatMoney(totalTrabajo(t))}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

const activeTab = {
  ...zBtnGhost,
  background: "rgba(6,182,212,0.15)",
  borderColor: zColors.accent,
  color: zColors.accent,
  fontWeight: 700,
};
