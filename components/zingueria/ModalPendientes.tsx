"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Trabajo } from "@/lib/zingueria/types";
import { ESTADOS_TRABAJO } from "@/lib/zingueria/types";
import { formatDate } from "@/lib/zingueria/format";
import { estadoColor, zBtnGhost, zBtnPrimary, zColors } from "@/lib/zingueria/ui";

interface Props {
  open: boolean;
  atrasados: Trabajo[];
  hoy: Trabajo[];
  onClose: () => void;
}

export default function ModalPendientes({
  open,
  atrasados,
  hoy,
  onClose,
}: Props) {
  if (!open) return null;
  const total = atrasados.length + hoy.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(2, 6, 23, 0.72)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: zColors.card,
          border: `1px solid ${zColors.border}`,
          borderRadius: 16,
          padding: 18,
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
          Pendientes de hoy
        </div>
        <p style={{ margin: "0 0 14px", color: zColors.muted, fontSize: 13 }}>
          Tenés {total} trabajo{total === 1 ? "" : "s"} para atender (atrasados
          o de hoy).
        </p>

        {atrasados.length > 0 && (
          <Section title={`Atrasados (${atrasados.length})`} warn>
            {atrasados.map((t) => (
              <Item key={t.id} t={t} onClose={onClose} />
            ))}
          </Section>
        )}
        {hoy.length > 0 && (
          <Section title={`Hoy (${hoy.length})`}>
            {hoy.map((t) => (
              <Item key={t.id} t={t} onClose={onClose} />
            ))}
          </Section>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Link
            href="/zingueria/app/cronograma"
            onClick={onClose}
            style={{ ...zBtnPrimary, textDecoration: "none", textAlign: "center", flex: 1 }}
          >
            Ver calendario
          </Link>
          <button type="button" style={zBtnGhost} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  warn,
}: {
  title: string;
  children: ReactNode;
  warn?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.04,
          color: warn ? zColors.warn : zColors.muted,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function Item({ t, onClose }: { t: Trabajo; onClose: () => void }) {
  return (
    <Link
      href={`/zingueria/app/trabajos/${t.id}`}
      onClick={onClose}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${zColors.border}`,
        background: "#0f172a",
      }}
    >
      <div style={{ fontWeight: 700 }}>{t.titulo}</div>
      <div style={{ fontSize: 12, color: zColors.muted }}>
        {t.clienteNombre} · {formatDate(t.fechaInicio)}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 700,
          color: estadoColor(t.estado),
        }}
      >
        {ESTADOS_TRABAJO.find((e) => e.value === t.estado)?.label}
      </div>
    </Link>
  );
}
