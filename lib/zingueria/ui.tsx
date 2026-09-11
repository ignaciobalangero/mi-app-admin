import type { CSSProperties } from "react";

export const zColors = {
  bg: "#0f172a",
  card: "#1e293b",
  accent: "#06b6d4",
  border: "#334155",
  muted: "#94a3b8",
  text: "#f1f5f9",
  danger: "#f87171",
  warn: "#fbbf24",
  ok: "#34d399",
} as const;

export const zShell: CSSProperties = {
  minHeight: "100vh",
  background: zColors.bg,
  color: zColors.text,
  fontFamily:
    '"Segoe UI", "Helvetica Neue", system-ui, -apple-system, sans-serif',
};

export const zCard: CSSProperties = {
  background: zColors.card,
  border: `1px solid ${zColors.border}`,
  borderRadius: 12,
  padding: 16,
};

export const zInput: CSSProperties = {
  width: "100%",
  background: "#0f172a",
  border: `1px solid ${zColors.border}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: zColors.text,
  outline: "none",
};

export const zBtnPrimary: CSSProperties = {
  background: zColors.accent,
  color: "#0f172a",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

export const zBtnGhost: CSSProperties = {
  background: "transparent",
  color: zColors.text,
  border: `1px solid ${zColors.border}`,
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
};

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div
      style={{
        ...zShell,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: `3px solid ${zColors.border}`,
          borderTopColor: zColors.accent,
          borderRadius: "50%",
          animation: "zspin 0.8s linear infinite",
        }}
      />
      <p style={{ color: zColors.muted, margin: 0 }}>{label}</p>
      <style>{`@keyframes zspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function estadoColor(estado: string): string {
  switch (estado) {
    case "presupuesto":
      return zColors.muted;
    case "aprobado":
      return zColors.accent;
    case "en_curso":
      return zColors.warn;
    case "finalizado":
      return zColors.ok;
    case "cancelado":
      return zColors.danger;
    default:
      return zColors.muted;
  }
}
