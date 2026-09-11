"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import ModalPendientes from "@/components/zingueria/ModalPendientes";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { ESTADOS_ACTIVOS, type Trabajo } from "@/lib/zingueria/types";
import { deudaTrabajo } from "@/lib/zingueria/calculos";
import { agruparCronograma, countUrgentes } from "@/lib/zingueria/cronograma";
import { formatMoney, todayISO } from "@/lib/zingueria/format";
import { zPagosCol, zTrabajosCol, zClientesCol } from "@/lib/zingueria/paths";
import {
  Spinner,
  zBtnGhost,
  zColors,
  zShell,
} from "@/lib/zingueria/ui";

const TABS = [
  { href: "/zingueria/app/trabajos", label: "Trabajos" },
  { href: "/zingueria/app/clientes", label: "Clientes" },
  { href: "/zingueria/app/cronograma", label: "Agenda" },
  { href: "/zingueria/app/stock", label: "Stock" },
  { href: "/zingueria/app/resumen", label: "Resumen" },
] as const;

const NOTIF_KEY = "zingueria-notif-seen";
const PENDIENTES_KEY = "zingueria-pendientes-dia";

export default function ZingueriaAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, perfil, loading, logout } = useZingueriaSession();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [clientesCount, setClientesCount] = useState(0);
  const [aCobrar, setACobrar] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [showPendientes, setShowPendientes] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/zingueria/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotifPerm("unsupported");
      return;
    }
    setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(zTrabajosCol(), where("ownerUid", "==", user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const list: Trabajo[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Trabajo, "id">),
      }));
      setTrabajos(list);
      let cobrar = 0;
      await Promise.all(
        list.map(async (t) => {
          if (t.estado === "cancelado" || t.estado === "presupuesto") return;
          const pagosSnap = await getDocs(zPagosCol(t.id));
          const pagos = pagosSnap.docs.map((p) => p.data() as { monto: number });
          cobrar += deudaTrabajo(t, pagos);
        })
      );
      setACobrar(cobrar);
    });
    const qCli = query(zClientesCol(), where("ownerUid", "==", user.uid));
    const unsubCli = onSnapshot(qCli, (snap) => setClientesCount(snap.size));
    return () => {
      unsub();
      unsubCli();
    };
  }, [user]);

  const activos = useMemo(
    () => trabajos.filter((t) => ESTADOS_ACTIVOS.includes(t.estado)).length,
    [trabajos]
  );

  const grupos = useMemo(() => agruparCronograma(trabajos), [trabajos]);
  const urgentes = useMemo(() => countUrgentes(grupos), [grupos]);

  useEffect(() => {
    if (!user || !trabajos.length) return;
    if (urgentes <= 0) return;
    const hoy = todayISO();
    try {
      if (sessionStorage.getItem(PENDIENTES_KEY) === hoy) return;
    } catch {
      /* ignore */
    }
    setShowPendientes(true);
  }, [user, trabajos, urgentes]);

  function cerrarPendientes() {
    try {
      sessionStorage.setItem(PENDIENTES_KEY, todayISO());
    } catch {
      /* ignore */
    }
    setShowPendientes(false);
  }

  useEffect(() => {
    if (!user || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const tick = () => {
      const g = agruparCronograma(trabajos);
      const ids = [...g.atrasados, ...g.hoy].map((t) => t.id);
      if (!ids.length) return;
      let seen: string[] = [];
      try {
        seen = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
      } catch {
        seen = [];
      }
      const nuevos = ids.filter((id) => !seen.includes(id));
      if (!nuevos.length) return;
      const t = trabajos.find((x) => x.id === nuevos[0]);
      new Notification("Zinguería — trabajos urgentes", {
        body: t
          ? `${nuevos.length} pendiente(s). Ej: ${t.titulo}`
          : `${nuevos.length} trabajos urgentes`,
        icon: "/zingueria/icon.svg",
      });
      localStorage.setItem(NOTIF_KEY, JSON.stringify([...seen, ...nuevos]));
    };

    tick();
    const id = window.setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user, trabajos]);

  if (loading || !user || !perfil) {
    return <Spinner label="Cargando taller…" />;
  }

  async function pedirNotif() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotifPerm(p);
  }

  return (
    <div style={{ ...zShell, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: `1px solid ${zColors.border}`,
          background: "#0b1220",
          padding: "12px 16px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              🔩 Zinguería
            </div>
            <div style={{ color: zColors.muted, fontSize: 12 }}>
              {perfil.nombreTaller}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {notifPerm === "default" && (
              <button type="button" style={zBtnGhost} onClick={pedirNotif}>
                🔔 Avisos
              </button>
            )}
            <button
              type="button"
              style={zBtnGhost}
              onClick={async () => {
                await logout();
                router.replace("/zingueria/login");
              }}
            >
              Salir
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginTop: 12,
          }}
        >
          <Stat label="Activos" value={String(activos)} />
          <Stat label="Clientes" value={String(clientesCount)} />
          <Stat label="A cobrar" value={formatMoney(aCobrar)} />
        </div>
        <nav
          style={{
            display: "flex",
            gap: 4,
            marginTop: 12,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {TABS.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const isCron = tab.href.includes("cronograma");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  background: active ? zColors.accent : "transparent",
                  color: active ? "#0f172a" : zColors.muted,
                  border: active ? "none" : `1px solid ${zColors.border}`,
                }}
              >
                {tab.label}
                {isCron && urgentes > 0 ? ` (${urgentes})` : ""}
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ flex: 1, padding: 16, maxWidth: 960, width: "100%", margin: "0 auto" }}>
        {children}
      </main>

      <ModalPendientes
        open={showPendientes}
        atrasados={grupos.atrasados}
        hoy={grupos.hoy}
        onClose={cerrarPendientes}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: zColors.card,
        border: `1px solid ${zColors.border}`,
        borderRadius: 10,
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 11, color: zColors.muted }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{value}</div>
    </div>
  );
}
